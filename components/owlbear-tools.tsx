"use client";
import { useEffect, useRef, useState, type ReactNode, type ComponentProps } from "react";
import { characterForOwlbear } from "../lib/workspace-client";
import { Sword, Sparkles, Dice5, Ruler, Plus, Shield, FlaskConical, ChevronRight, X } from "lucide-react";
import OwlbearResource, { OwlbearCost, OwlbearBonuses } from "./owlbear-resource";
import { weaponSummary } from "../lib/weapon-summary";
import type { Tree } from "../lib/progression";
import type { Character } from "../lib/rules";
import type { Technique } from "../lib/obr/core/types";
import { useOwlbearCombat } from "./use-owlbear-combat";
import OwlbearReactions from "./owlbear-reactions";
import { activeParticipant, type ActionChoice } from "../lib/obr/core/actions";
import { MOVEMENT_CHANNEL } from "../lib/obr/core/movement";
import { projectPattern } from "../lib/obr/core/projection";
import { CAST_CHANNEL } from "../lib/obr/core/spells";

function ActionButton({hint, cost, children, ...props}: ComponentProps<"button"> & {hint: ReactNode; cost?: ReactNode}) {
  return <button {...props} type="button" className="c-owlbear-action-button">{children}<span className="c-owlbear-action-info"><strong>{props["aria-label"]}</strong>{hint&&<small>{hint}</small>}</span>{cost&&<span className="c-owlbear-price">{cost}</span>}<ChevronRight className="c-owlbear-action-chevron" size={15} aria-hidden="true"/></button>;
}
export default function OwlbearTools({ character, characters, canAssign, section, tree, onCharacter, onSection, dirty = false }: {
  dirty?: boolean; tree?: Tree; characters: Character[]; canAssign: boolean; character: Character | null; section: string; onCharacter: (id: string) => Promise<void>; onSection: (section: string) => void;
}) {
  const runtime = useOwlbearCombat();
  const [actionTab, setActionTab] = useState("Armes");
  const [weaponTargets, setWeaponTargets] = useState<string[]>([]);
  const [submittedRevision, setSubmittedRevision] = useState<number | null>(null);
  const [dismissedAttack, setDismissedAttack] = useState("");
  const [actionError, setActionError] = useState(false);
  const [armed, setArmed] = useState<{choice:ActionChoice;context:string} | null>(null);
  const [status, setStatus] = useState(""), [selected, setSelected] = useState(""), [gm, setGm] = useState(false),
    [loaded, setLoaded] = useState<{data:Awaited<ReturnType<typeof characterForOwlbear>>;revision:number} | null>(null), [busy, setBusy] = useState(false);
  const [loadFailure, setLoadFailure] = useState<{key:string;message:string} | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const loadKey = `${character?.id}/${character?.revision}/${loadAttempt}`;
  const loadError = loadFailure?.key === loadKey ? loadFailure.message : "";
  const data = loaded?.data.characterId === character?.id && loaded?.revision === character?.revision ? loaded?.data : null;
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const inspected = character?.inventory.find(item=>item.id===inspectedId&&!item.archived);
  const objects = character?.inventory.filter(item=>!item.archived&&["consumable","other"].includes(item.type)) ?? [];
  const [choice, setChoice] = useState("");
  const [tokens, setTokens] = useState<{id:string;name:string}[]>([]), [tokenChoice, setTokenChoice] = useState("");
  const participant = runtime.combat?.participants.find(p=>p.characterId===character?.id);
  const inCombat = !!runtime.combat;
  const blocked = dirty || !runtime.ready || inCombat && (!runtime.state || activeParticipant(runtime.state.combat)?.characterId !== character?.id || !!runtime.state.pending || !!runtime.state.resolution || !gm && participant?.playerId !== runtime.playerId);
  const tokenId = (inCombat ? participant?.tokenId : undefined) ?? (tokens.length === 1 ? tokens[0].id : tokens.find(token => token.id === tokenChoice)?.id ?? "");
  const showActions = section === "Actions";
  const actionContext = `${character?.id}/${tokenId}/${runtime.combat?.id}/${runtime.combat?.turn}/${runtime.state?.revision}`;
  const selectedAction = armed?.context === actionContext ? armed.choice : null;
  const runtimeRevision = runtime.state?.revision, runtimeId = runtime.state?.combat.id;
  const acting = runtime.state ? activeParticipant(runtime.state.combat) : null;
  const followedCharacterId = acting && (gm || acting.playerId === runtime.playerId) ? acting.characterId : character?.id;
  const assignmentId = characters.some(c => c.id === choice) ? choice : character?.id ?? "";
  const latest = useRef({ character, onCharacter, onSection, combat: runtime.combat, tokenChoice: tokenId });
  useEffect(() => { latest.current = { character, onCharacter, onSection, combat: runtime.combat, tokenChoice: tokenId }; }, [character, onCharacter, onSection, runtime.combat, tokenId]);
  const refreshRef = useRef<() => void>(() => {});
  const preview = useRef<import("../lib/obr/owlbear/preview").Preview | null>(null);
  const active = useRef<Technique | null>(null);
  const releaseWeapon = async () => {
    const {default: OBR} = await import('@owlbear-rodeo/sdk');
    await OBR.broadcast.sendMessage(MOVEMENT_CHANNEL, {interaction:'weapon',active:false}, {destination:'LOCAL'});
  };
  const updateWeaponTargets = async (technique: Technique, origin: {origin: {x:number;y:number};rotation:number}) => {
    const combat = latest.current.combat;
    if (!combat) return;
    const { boardSnapshot } = await import('../lib/obr/owlbear/actions');
    const { board } = await boardSnapshot();
    const cells = projectPattern(origin.origin, technique.pattern, origin.rotation);
    const actor = combat.participants.find(p => p.characterId === latest.current.character?.id);
    const names = combat.participants.filter(p => p.id !== actor?.id && p.camp !== actor?.camp && board.some(token => token.tokenId === p.tokenId && cells.some(cell => cell.x === token.cell.x && cell.y === token.cell.y))).map(p => p.name);
    if (active.current === technique) setWeaponTargets(names);
  };
  useEffect(() => {
    let live = true, version = 0, lastSelection: string | undefined; const stops: (() => void)[] = [];
    void (async () => {
      const [{ default: OBR }, { selectedToken, characterTokens, tokenOrigin }, { Preview, buildPattern }, { sharedLink }] = await Promise.all([
        import("@owlbear-rodeo/sdk"), import("../lib/obr/owlbear/token"), import("../lib/obr/owlbear/preview"), import("../lib/obr/core/links"),
      ]);
      if (!live) return;
      preview.current = new Preview();
      async function refresh() {
        const request = ++version;
        const [selectedTokenItem, role] = await Promise.all([selectedToken(), OBR.player.getRole()]);
        if (!live || request !== version) return;
        setGm(role === "GM"); setSelected(selectedTokenItem?.id ?? "");
        const link = sharedLink(selectedTokenItem);
        const combat = latest.current.combat;
        const actor = combat?.phase === "ready" ? activeParticipant(combat) : null;
        const followsTurn = actor && (role === "GM" || actor.playerId === await OBR.player.getId());
        if (!followsTurn && link && link.characterId !== latest.current.character?.id && selectedTokenItem?.id !== lastSelection) {
          lastSelection = selectedTokenItem?.id;
          active.current = null; await preview.current?.clear();
          if (role === "GM" || link.playerId === await OBR.player.getId()) await latest.current.onCharacter(link.characterId);
        }
        lastSelection = selectedTokenItem?.id;
        const available = latest.current.character ? await characterTokens(latest.current.character.id) : [];
        if (!live || request !== version) return;
        setTokens(available);
        const token = available.length === 1 ? available[0] : available.find(item => item.id === latest.current.tokenChoice);
        setStatus(latest.current.character && !available.length ? "Aucun token associé à ce personnage dans la scène." : "");
        if (!token) { active.current = null; await preview.current?.clear(); }
        else if (active.current) {
          const technique = active.current;
          await preview.current?.show(async () => {
            const origin = await tokenOrigin(token.id);
            if (!live || request !== version || active.current !== technique) return [];
            await updateWeaponTargets(technique, origin);
            if (!live || request !== version || active.current !== technique) return [];
            return buildPattern(origin.origin, origin.dpi, technique, origin.rotation);
          });
        }
      }
      const update = () => { void refresh().catch(e => { if (live) setStatus(e.message); }); };
      refreshRef.current = update;
      stops.push(OBR.player.onChange(update), OBR.scene.items.onChange(update), OBR.scene.onReadyChange(update), OBR.scene.grid.onChange(update));
      stops.push(OBR.broadcast.onMessage("de.sunitro.cendres/section", event => {
        if (typeof event.data === "string" && event.data !== "Notes") latest.current.onSection(event.data);
        update();
      }));
      const clear = () => { active.current = null; setArmed(null); void preview.current?.clear().catch(() => {}); void releaseWeapon().catch(() => {}); };
      stops.push(OBR.broadcast.onMessage(MOVEMENT_CHANNEL, event => {
        if ((event.data as {weaponCancelled?: boolean})?.weaponCancelled) clear();
      }));
      const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape' && active.current) clear(); };
      window.addEventListener('keydown', keydown);
      stops.push(() => window.removeEventListener('keydown', keydown));
      const visibility = () => { if (document.visibilityState === "hidden") clear(); };
      window.addEventListener("pagehide", clear); document.addEventListener("visibilitychange", visibility);
      stops.push(() => { window.removeEventListener("pagehide", clear); document.removeEventListener("visibilitychange", visibility); });
      const requested = sessionStorage.getItem("souls-owlbear-section");
      if (requested) latest.current.onSection(requested === "Notes" ? "Fiche Perso" : requested);
      update();
    })().catch(e => { if (live) setStatus(e.message); });
    return () => { live = false; ++version; refreshRef.current = () => {}; stops.forEach(stop => stop()); active.current = null; void preview.current?.clear().catch(() => {}); void releaseWeapon().catch(() => {}); };
  }, []);
  useEffect(() => {
    let live = true; active.current = null;
    void preview.current?.clear().catch(() => {});
    void releaseWeapon().catch(() => {});
    refreshRef.current();
    if (character?.id) void characterForOwlbear(character.id).then(result => { if (live) setLoaded({data:result,revision:character.revision}); }).catch(e => { if (live) setLoadFailure({key:loadKey,message:e.message}); });
    return () => { live = false; };
  }, [character?.id, character?.revision, loadKey]);
  useEffect(() => { refreshRef.current(); }, [tokenId]);
  useEffect(() => { active.current=null; void preview.current?.clear().catch(()=>{}); void releaseWeapon().catch(()=>{}); }, [actionContext]);
  useEffect(() => {
    if(runtimeRevision !== undefined && followedCharacterId && !dirty) void latest.current.onCharacter(followedCharacterId).catch(e=>setStatus(e.message));
  }, [runtimeRevision, runtimeId, character?.id, followedCharacterId, dirty]);
  async function execute(choice: ActionChoice) {
    if(!character || busy || blocked)return;
    setBusy(true);setStatus("");setActionError(false);
    try {
      const {performCombatAction}=await import('../lib/obr/owlbear/actions');
      if(await performCombatAction(character.id,tokenId,choice)) {if(choice.kind === "weapon" || choice.kind === "spell") setSubmittedRevision(runtime.state?.revision ?? null);setArmed(null);active.current=null;await preview.current?.clear();await releaseWeapon();}
    }catch(e){setActionError(true);setStatus((e as Error).message)}finally{setBusy(false)}
  }
  async function cancelPrepared() {
    setArmed(null); active.current = null;
    try {
      await preview.current?.clear(); await releaseWeapon();
      const { default: OBR } = await import('@owlbear-rodeo/sdk');
      await OBR.broadcast.sendMessage(CAST_CHANNEL, { cancel: true }, { destination: 'LOCAL' });
    } catch (error) { setStatus((error as Error).message); }
  }
  async function cast(spellId: string, confirm = false) {
    if (!character || busy || blocked) return;
    setBusy(true); setStatus('');
    try {
      active.current = null; await preview.current?.clear(); await releaseWeapon();
      const { default: OBR } = await import('@owlbear-rodeo/sdk');
      await OBR.broadcast.sendMessage(CAST_CHANNEL, { characterId: character.id, spellId, tokenId, confirm }, { destination: 'LOCAL' });
      setArmed(confirm ? null : { choice: { kind: 'spell', spellId }, context: actionContext });
    } catch (error) { setStatus((error as Error).message); } finally { setBusy(false); }
  }
  const attack = runtime.state?.lastAttack;
  const waiting = !!runtime.state?.pending || !!runtime.state?.resolution || submittedRevision !== null && submittedRevision === runtime.state?.revision;
  const ownResult = !!attack && !!participant && attack.actorId === participant.id && attack?.id !== dismissedAttack;
  if(showActions && (waiting || ownResult)) return <section className="owlbear-tools" aria-label="Résultat de l’attaque">
    {waiting ? <>
      {runtime.state?.pending?.defenders.some(id=>runtime.combat?.participants.find(p=>p.id===id)?.playerId===runtime.playerId)
        ? <OwlbearReactions state={runtime.state} playerId={runtime.playerId} gm={gm}/>
        : <section className="c-owlbear-encounter" role="status">
          <span className="c-owlbear-encounter-icon"><Sword size={28} aria-hidden="true"/></span>
          <p className="c-owlbear-eyebrow">Sur le champ de bataille</p>
          <h2>{runtime.state?.resolution?.movement || runtime.state?.resolution?.facing ? "En mouvement" : "L’attaque est lancée"}</h2>
          {runtime.state?.pending&&<p>Vos adversaires peuvent encore esquiver.</p>}
        </section>}
    </> : attack && <section className="c-owlbear-encounter is-result" aria-label="Bilan de votre attaque" aria-live="polite">
      <p className="c-owlbear-eyebrow">{attack.name}</p>
      <h2>{attack.hitParticipants.length ? "Dans le mille !" : "Coup manqué"}</h2>
      {attack.hitParticipants.length ? <>
        <div className="c-owlbear-hit-summary"><p>Votre attaque touche</p>
        <ul className="c-owlbear-hit-list">{attack.hitParticipants.map(id=><li key={id}>{runtime.combat?.participants.find(p=>p.id===id)?.name ?? id}</li>)}</ul></div>
        <div className="c-owlbear-damage"><Dice5 size={24} aria-hidden="true"/><span>{attack.damage ? "Lancez vos dés de dégâts" : "Dégâts"}<strong>{attack.damage || "Aucun dé indiqué"}</strong></span></div>
      </> : <p>Votre attaque ne touche personne cette fois-ci.</p>}
      <div className="c-owlbear-encounter-actions"><button type="button" className="c-primary" onClick={()=>setDismissedAttack(attack.id)}>OK</button></div>
    </section>}

  </section>;
  return <section className="owlbear-tools" aria-label="Token Owlbear">
    {runtime.error&&<p role="alert">{runtime.error}</p>}
    {section === "Actions"&&runtime.state&&<OwlbearReactions state={runtime.state} playerId={runtime.playerId} gm={gm}/>}

    {showActions && character && <nav className="c-owlbear-action-tabs" aria-label="Types d’actions">{['Armes', 'Sorts', 'Objets'].map(tab => <button type="button" key={tab} aria-pressed={actionTab === tab} disabled={busy} onClick={() => { setActionTab(tab); void cancelPrepared(); }}>{tab === 'Armes' ? <Sword size={14}/> : tab === 'Sorts' ? <Sparkles size={14}/> : <FlaskConical size={14}/>}<span>{tab}</span></button>)}</nav>}
    {showActions && character && !data && (loadError ? <div role="alert">
      <p>Impossible de charger les actions du personnage : {loadError}</p>
      <button type="button" onClick={() => setLoadAttempt(attempt => attempt + 1)}>Réessayer le chargement des actions</button>
    </div> : <p role="status">Chargement des actions…</p>)}
    {(showActions || section === "Paramètres")&&status&&<p role={actionError?"alert":"status"}>{status}</p>}

    {section!=="Combat"&&!inCombat&&tokens.length>1&&<label>Token à utiliser<select value={tokenId} onChange={event=>setTokenChoice(event.target.value)}><option value="">Choisir un token</option>{tokens.map(token=><option key={token.id} value={token.id}>{token.name}</option>)}</select></label>}
    {section === "Paramètres" && gm && canAssign && selected && <details><summary>Association du token sélectionné</summary><div className="owlbear-assignment"><select aria-label="Personnage à associer" value={assignmentId} onChange={e => setChoice(e.target.value)}><option value="">Choisir un personnage</option>{characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="c-button" disabled={!assignmentId || busy} onClick={async () => {
      setBusy(true);
      try {
        const [{ default: OBR }, { selectedToken }, { TOKEN_LINK_KEY }] = await Promise.all([import("@owlbear-rodeo/sdk"), import("../lib/obr/owlbear/token"), import("../lib/obr/core/links")]);
        const token = await selectedToken(), current = await characterForOwlbear(assignmentId);
        if (!token || token.id !== selected || await OBR.player.getRole() !== "GM" || !current.canAssign) throw Error("Sélection ou autorisation modifiée. Réessayez.");
        await OBR.scene.items.updateItems([token.id], items => { for (const item of items) item.metadata[TOKEN_LINK_KEY] = {
          tokenId: token.id, characterId: assignmentId, ownerId: current.ownerId, characterName: current.name, playerId: current.playerId, playerName: current.playerName,
        }; });
        setStatus("Token associé.");
        await latest.current.onCharacter(assignmentId);
      } catch (e) { setStatus((e as Error).message); } finally { setBusy(false); }
    }}>Associer au token</button><button className="c-button" disabled={busy} onClick={async()=>{
      setBusy(true);
      try {
        const [{default:OBR},{selectedToken},{sharedLink,TOKEN_LINK_KEY}]=await Promise.all([import('@owlbear-rodeo/sdk'),import('../lib/obr/owlbear/token'),import('../lib/obr/core/links')]);
        const token=await selectedToken(),link=sharedLink(token);
        if(!token||token.id!==selected||!link||await OBR.player.getRole()!=='GM'||!(await characterForOwlbear(link.characterId)).canAssign)throw Error('Sélection ou autorisation modifiée. Réessayez.');
        await OBR.scene.items.updateItems([token.id],items=>{for(const item of items)delete item.metadata[TOKEN_LINK_KEY]});
        setStatus('Association supprimée.');
      }catch(error){setStatus((error as Error).message)}finally{setBusy(false)}
    }}>Dissocier</button></div></details>}
    {showActions && character && data && <section aria-label="Attaques disponibles" hidden={actionTab !== "Armes"}><div className="owlbear-action-grid">
      {data.weapons.map(weapon => <section key={weapon.id} className="c-owlbear-weapon-group" aria-label={weapon.name}><h3>{weapon.name}</h3>{weapon.techniques.map((technique, index) => {
        const item = character.inventory.find(item=>item.id===weapon.id);
        const details = item&&tree ? weaponSummary(item,character,tree).techniques.find(t=>t.name===technique.name) : undefined;
        const expanded = selectedAction?.kind==="weapon"&&selectedAction.weaponId===weapon.id&&selectedAction.index===index;
        const damage = details?.damage || item?.damage || "—";
        const damageParts = /^(\d+d\d+)\s*([+-]\s*\d+)$/.exec(damage);
        const bonus = damageParts?.[2];
        const range = details?.range ?? Math.max(0, ...technique.pattern.map(([x,y])=>Math.max(Math.abs(x),Math.abs(y))));
        const effects = (details?.description || item?.description || "").replace(/Portée et zone selon le type d[’']arme\./g, "").trim();
        return <div key={`${weapon.id}-${index}`}>
          <ActionButton aria-label={technique.name} aria-pressed={expanded} title={[weapon.name, effects].filter(Boolean).join(" · ")} hint={<><span className="c-owlbear-weapon-stats"><span title="Dégâts" aria-label={`Dégâts : ${damageParts?.[1] || damage}`}><Dice5 aria-hidden="true"/>{damageParts?.[1] || damage}</span><span title="Portée (cases)" aria-label={`Portée : ${range} cases`}><Ruler aria-hidden="true"/>{range}</span>{bonus&&<span title="Bonus" aria-label={`Bonus : ${bonus}`}><Plus aria-hidden="true"/>{bonus}</span>}<OwlbearBonuses bonuses={item?.bonuses}/></span></>} cost={<OwlbearCost end={technique.end} mana={technique.mana}/>} disabled={busy||blocked||!tokenId||character.end<(technique.end??1)||character.mana<(technique.mana??0)} onClick={async()=>{
            if(expanded) return;
            setBusy(true);setStatus("");setActionError(false);setArmed(null);setWeaponTargets([]);active.current=null;
            try {
              const {default: OBR} = await import('@owlbear-rodeo/sdk');
              await OBR.broadcast.sendMessage(CAST_CHANNEL, {cancel:true}, {destination:'LOCAL'});
              await OBR.broadcast.sendMessage(MOVEMENT_CHANNEL, {interaction:'weapon',active:true}, {destination:'LOCAL'});
              if (!preview.current) throw Error("Prévisualisation indisponible. Réessayez.");
              await preview.current.clear();
              const [{characterToken,tokenOrigin},{buildPattern}]=await Promise.all([import("../lib/obr/owlbear/token"),import("../lib/obr/owlbear/preview")]);
              const token=await characterToken(character.id,tokenId);
              const pattern={...technique,pattern:technique.pattern as [number,number][]};active.current=pattern;
              await preview.current?.show(async()=>{const origin=await tokenOrigin(token.id);if(active.current!==pattern)return [];await updateWeaponTargets(pattern,origin);return active.current===pattern?buildPattern(origin.origin,origin.dpi,pattern,origin.rotation):[];});
              if(active.current===pattern)setArmed({choice:{kind:"weapon",weaponId:weapon.id,index},context:actionContext});
            }catch(e){active.current=null;setActionError(true);await releaseWeapon();setStatus((e as Error).message)}finally{setBusy(false)}
          }}><Sword size={18} aria-hidden="true"/></ActionButton>
          {expanded&&<div className="c-owlbear-action-confirm"><p role="status">{inCombat ? `Cibles : ${weaponTargets.join(", ") || "aucune"}` : "Prévisualisation hors combat"}</p><div>{inCombat&&<button type="button" className="c-primary" disabled={busy||blocked} onClick={()=>void execute({kind:"weapon",weaponId:weapon.id,index})}>Confirmer l’attaque <OwlbearCost end={technique.end} mana={technique.mana}/></button>}<button type="button" className="c-button" onClick={()=>void cancelPrepared()} aria-label="Annuler la préparation"><X size={15}/>Annuler</button></div></div>}
        </div>;
      })}</section>)}

    </div>{!data.weapons.length&&<p className="c-owlbear-empty">Aucune arme équipée.</p>}</section>}
    {showActions && character && data && <section aria-label="Sorts disponibles" hidden={actionTab !== "Sorts"}><div className="owlbear-action-grid">

      {data.spells.map(spell=>{
        const item=character.spells.find(item=>item.id===spell.id);
        const prepared = selectedAction?.kind === "spell" && selectedAction.spellId === spell.id;
        return <div key={spell.id}><ActionButton aria-pressed={prepared} aria-label={spell.name} title={item?.effects||item?.description||undefined} hint={<span className="c-owlbear-weapon-stats">{item?.damage&&<span title="Dégâts"><Dice5 size={14}/>{item.damage}</span>}<span title="Portée (cases)"><Ruler size={14}/>{spell.range}</span></span>} cost={<OwlbearCost mana={item?.mana} end={item?.end}/>} disabled={blocked||busy||!tokenId||character.end<(spell.end??1)||character.mana<(spell.mana??0)} onClick={()=>void cast(spell.id)}><Sparkles size={18} aria-hidden="true"/></ActionButton>{prepared&&<div className="c-owlbear-action-confirm"><p role="status">Visez sur la carte, puis confirmez le sort.</p><div><button type="button" className="c-primary" disabled={busy||blocked} onClick={()=>void cast(spell.id,true)}>Lancer le sort <OwlbearCost mana={item?.mana} end={item?.end}/></button><button type="button" className="c-button" onClick={()=>void cancelPrepared()}>Annuler</button></div></div>}
        </div>;
      })}
    </div>{!data.spells.length&&<p className="c-owlbear-empty">Aucun sort mémorisé.</p>}</section>}
    {showActions && character && <section aria-label="Objets disponibles" hidden={actionTab !== "Objets"}><div className="owlbear-action-grid">
      {objects.map(item=><ActionButton key={item.id} aria-label={item.name} disabled={inCombat&&(blocked||busy||!tokenId||character.end<1)} aria-expanded={inspectedId===item.id} hint={null} title={item.effects||item.description||"Consulter l’objet"} onClick={()=>setInspectedId(inspectedId===item.id?null:item.id)}><FlaskConical size={18} aria-hidden="true"/></ActionButton>)}

    </div>{!objects.length&&<p className="c-owlbear-empty">Aucun objet disponible.</p>}{inspected&&<p>{inspected.effects||inspected.description}</p>}
    {inspected&&inCombat&&<button className="c-primary" disabled={blocked||busy||!tokenId||character.end<1} onClick={()=>void execute({kind:"item",itemId:inspected.id})}>Utiliser <OwlbearResource kind="end">1</OwlbearResource></button>}</section>}


    {showActions&&inCombat&&character&&<section className="c-owlbear-utility"><ActionButton aria-label="Préparer une esquive" hint={null} cost={<OwlbearCost end={1}/>} disabled={blocked||busy||!tokenId||character.end<1} onClick={()=>void execute({kind:'dodge'})} title="Préparer une esquive"><Shield size={18} aria-hidden="true"/></ActionButton></section>}
  </section>;
}
