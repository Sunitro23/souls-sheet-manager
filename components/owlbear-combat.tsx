"use client";
import { useEffect, useState } from "react";
import type { Item } from "@owlbear-rodeo/sdk";
import { participantsFromTokens } from "../lib/obr/core/combat-tokens";
import type { Character } from "../lib/rules";
import { workspaceCall } from "../lib/workspace-client";
import { participantsByPlayer, readCombat } from "../lib/obr/core/combat";
import type { CombatPlayer, CombatPreparation } from "../lib/obr/core/combat";
import { sharedLink } from "../lib/obr/core/links";
import OwlbearInitiative from "./owlbear-initiative";

type Props = {
  campaignId: string; canAssign: boolean; characters: (Character & { playerId?: string | null })[];
};
type RoomPlayer = CombatPlayer & { role: "GM" | "PLAYER"; connectionId: string };

export default function OwlbearCombat({ campaignId, canAssign, characters }: Props) {
  const [self, setSelf] = useState<RoomPlayer | null>(null);
  const [others, setOthers] = useState<CombatPlayer[]>([]);
  const [combat, setCombat] = useState<CombatPreparation | null>(null);
  const [ready, setReady] = useState(false), [error, setError] = useState("");
  const [tokens, setTokens] = useState<Item[]>([]);
  const [choices, setChoices] = useState<Record<string, {camp?: string; tokenId?: string}>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true, selfChanged = false, partyChanged = false, roomChanged = false;
    const stops: (() => void)[] = [];
    let sceneVersion = 0;
    const applyMetadata = (metadata: Record<string, unknown>) => {
      if (!live) return;
      try { setCombat(readCombat(metadata)); setReady(true); setError(""); }
      catch (failure) { setReady(false); setError((failure as Error).message); }
    };
    void (async () => {
      const { default: OBR } = await import("@owlbear-rodeo/sdk");
      if (!live) return;
      const refreshTokens = async () => {
        const version = ++sceneVersion;
        const items = await OBR.scene.isReady() ? await OBR.scene.items.getItems() : [];
        if (live && version === sceneVersion) setTokens(items);
      };
      const refresh = () => { void refreshTokens().catch(failure => { if (live) { setTokens([]); setError((failure as Error).message); } }); };
      stops.push(OBR.scene.items.onChange(refresh), OBR.scene.onReadyChange(refresh));
      refresh();
      stops.push(OBR.player.onChange(player => { selfChanged = true; if (live) setSelf(player); }));
      stops.push(OBR.party.onChange(players => { partyChanged = true; if (live) setOthers(players); }));
      stops.push(OBR.room.onMetadataChange(metadata => { roomChanged = true; applyMetadata(metadata); }));
      const [id, name, role, players, metadata, connectionId] = await Promise.all([
        OBR.player.getId(), OBR.player.getName(), OBR.player.getRole(), OBR.party.getPlayers(), OBR.room.getMetadata(), OBR.player.getConnectionId(),
      ]);
      if (!live) return;
      if (!selfChanged) setSelf({ id, name, role, connectionId });
      if (!partyChanged) setOthers(players);
      if (!roomChanged) applyMetadata(metadata);
    })().catch(failure => { if (live) setError((failure as Error).message); });
    return () => { live = false; stops.forEach(stop => stop()); };
  }, []);
  const players = [...new Map([...others, ...(self ? [self] : [])].map(player => [player.id, player])).values()];
  const canManage = self?.role === "GM" && canAssign && !!campaignId && (!combat || combat.campaignId === campaignId);
  const detected = self ? participantsFromTokens(tokens, characters, players, self) : [];
  async function createOrOpen() {
    if (!self || busy) return;
    setBusy(true); setError("");
    try {
      const [{ default: OBR }, { saveCombatPreparation, updateInitiative }, workspace] = await Promise.all([
        import("@owlbear-rodeo/sdk"), import("../lib/obr/owlbear/combat"), workspaceCall({ op: "campaign", campaignId }),
      ]);
      if (!workspace.campaign?.isGM) throw Error("Accès GM requis.");
      if (!await OBR.scene.isReady()) throw Error("Ouvrez une carte Owlbear.");
      const [items, party] = await Promise.all([OBR.scene.items.getItems(), OBR.party.getPlayers()]);
      const participants = participantsFromTokens(items, workspace.characters as Character[], [...party, self], self).map(p => ({...p, ...combat?.participants.find(old=>old.id===p.id), ...choices[p.id]}));
      if(participants.some(p=>!items.some(item=>item.id===p.tokenId&&sharedLink(item)?.characterId===p.characterId))) throw Error("Choisissez un pion présent pour chaque participant.");
      if (!participants.length) throw Error("Aucun token associé à un personnage de cette campagne.");
      const saved = await saveCombatPreparation(OBR, { campaignId, participants }, combat);
      setCombat(saved);
      if (combat) setCombat(await updateInitiative(OBR, saved.id, { type: "open" }));
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  const endCombatButton = ready && combat && canManage ? (
      <button type="button" className="c-button" disabled={busy} onClick={async () => {
        setBusy(true); setError("");
        try {
          const [{ default: OBR }, { cancelCombatPreparation }] = await Promise.all([import("@owlbear-rodeo/sdk"), import("../lib/obr/owlbear/combat")]);
          if(combat.phase === "ready") { const {combatCall}=await import('../lib/obr/owlbear/actions'); await combatCall(combat,'close'); }
          await cancelCombatPreparation(OBR, combat); setCombat(null);
        } catch (failure) { setError((failure as Error).message); }
        finally { setBusy(false); }
      }}>Terminer le combat</button>
  ) : null;
  return <section className="owlbear-previews" aria-label="Combat">
<datalist id="combat-camps"><option value="Joueurs"/><option value="Ennemis"/></datalist>
    {error && <p role="alert">{error}</p>}
    {!ready && !error && <p>Chargement…</p>}
    {ready && (!combat || combat.phase === "preparing") && <>
      {(combat?.participants??detected).length ? <ul className="c-combat-list">{participantsByPlayer(combat?.participants??detected).map(participant => <li key={participant.id}>
        <div className="c-combat-row"><span className="c-owlbear-participant"><span className="c-owlbear-avatar" aria-hidden="true">♟</span><span><strong>{participant.name}</strong></span></span><span className="c-owlbear-tag">{choices[participant.id]?.camp ?? participant.camp ?? "Joueurs"}</span></div>
        {canManage && <details><summary>Modifier</summary><label>Camp<input value={choices[participant.id]?.camp ?? participant.camp ?? "Joueurs"} onChange={e=>setChoices(old=>({...old,[participant.id]:{...old[participant.id],camp:e.target.value}}))} maxLength={50} list="combat-camps" /></label>
        <label>Pion de combat<select value={choices[participant.id]?.tokenId ?? participant.tokenId ?? ""} onChange={e=>setChoices(old=>({...old,[participant.id]:{...old[participant.id],tokenId:e.target.value}}))}>{tokens.filter(t=>t.type==="IMAGE"&&t.layer==="CHARACTER"&&sharedLink(t)?.characterId===participant.characterId).map(t=><option key={t.id} value={t.id}>{t.name || t.id}</option>)}</select></label></details>}

      </li>)}</ul> : <p>Aucun token associé sur la carte.</p>}
      <p className="c-owlbear-notice">{(combat?.participants??detected).length} participant(s)</p>
      {canManage && <div className="c-owlbear-footer"><button type="button" className="c-primary" disabled={busy || !detected.length} onClick={() => void createOrOpen()}>
        {busy ? "Préparation…" : combat ? "Lancer les initiatives →" : "Créer le combat →"}
      </button></div>}
    </>}
    {ready && combat && combat.campaignId !== campaignId && <p>Combat d’une autre campagne.</p>}
    {ready && combat && combat.phase !== "preparing" && self && <OwlbearInitiative key={combat.id} combat={combat} canManage={!!canManage} endCombatButton={endCombatButton} connectionId={self.connectionId} playerId={self.id} characters={characters} portraits={Object.fromEntries(tokens.filter((t): t is Item & {image:{url:string}} => t.type === "IMAGE" && "image" in t).map(t=>[t.id,t.image.url]))} />}
    {combat?.phase !== "ready" && endCombatButton}
  </section>;
}
