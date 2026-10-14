"use client";
import { useEffect, useRef, useState } from "react";
import { characterForOwlbear } from "../lib/workspace-client";
import type { Character } from "../lib/rules";
import type { Technique } from "../lib/obr/core/types";
export default function OwlbearTools({ character, characters, canAssign, section, onCharacter, onSection }: {
  characters: Character[]; canAssign: boolean; character: Character | null; section: string; onCharacter: (id: string) => Promise<void>; onSection: (section: string) => void;
}) {
  const [status, setStatus] = useState(""), [selected, setSelected] = useState(""), [gm, setGm] = useState(false),
    [data, setData] = useState<Awaited<ReturnType<typeof characterForOwlbear>> | null>(null), [busy, setBusy] = useState(false);
  const [choice, setChoice] = useState("");
  const assignmentId = characters.some(c => c.id === choice) ? choice : character?.id ?? "";
  const latest = useRef({ character, onCharacter, onSection }); latest.current = { character, onCharacter, onSection };
  const preview = useRef<import("../lib/obr/owlbear/preview").Preview | null>(null);
  const active = useRef<Technique | null>(null);
  useEffect(() => {
    let live = true, version = 0; const stops: (() => void)[] = [];
    void (async () => {
      const [{ default: OBR }, { selectedToken, tokenOrigin }, { Preview, buildPattern }, { sharedLink }] = await Promise.all([
        import("@owlbear-rodeo/sdk"), import("../lib/obr/owlbear/token"), import("../lib/obr/owlbear/preview"), import("../lib/obr/core/links"),
      ]);
      if (!live) return;
      preview.current = new Preview();
      async function refresh() {
        const request = ++version;
        const [token, role] = await Promise.all([selectedToken(), OBR.player.getRole()]);
        if (!live || request !== version) return;
        setGm(role === "GM"); setSelected(token?.id ?? "");
        const link = sharedLink(token);
        setStatus(!token ? "Sélectionnez un token Personnage dans la scène." : link ? `${token.name} → ${link.characterName}` : "Choisissez le personnage à associer à ce token.");
        if (link && link.characterId !== latest.current.character?.id) {
          active.current = null; await preview.current?.clear();
          await latest.current.onCharacter(link.characterId);
        }
        if (!token || !link || link.characterId !== latest.current.character?.id) { active.current = null; await preview.current?.clear(); }
        else if (active.current) {
          const technique = active.current;
          await preview.current?.show(async () => {
            const origin = await tokenOrigin(token.id);
            if (!live || request !== version || active.current !== technique) return [];
            return buildPattern(origin.origin, origin.dpi, technique, origin.rotation);
          });
        }
      }
      const update = () => { void refresh().catch(e => { if (live) setStatus(e.message); }); };
      stops.push(OBR.player.onChange(update), OBR.scene.items.onChange(update), OBR.scene.onReadyChange(update), OBR.scene.grid.onChange(update));
      stops.push(OBR.broadcast.onMessage("de.sunitro.cendres/section", event => {
        if (typeof event.data === "string") latest.current.onSection(event.data);
        update();
      }));
      const clear = () => { active.current = null; void preview.current?.clear().catch(() => {}); };
      const visibility = () => { if (document.visibilityState === "hidden") clear(); };
      window.addEventListener("pagehide", clear); document.addEventListener("visibilitychange", visibility);
      stops.push(() => { window.removeEventListener("pagehide", clear); document.removeEventListener("visibilitychange", visibility); });
      const requested = sessionStorage.getItem("souls-owlbear-section");
      if (requested) latest.current.onSection(requested);
      update();
    })().catch(e => { if (live) setStatus(e.message); });
    return () => { live = false; ++version; stops.forEach(stop => stop()); active.current = null; void preview.current?.clear().catch(() => {}); };
  }, []);
  useEffect(() => {
    let live = true; setData(null); active.current = null;
    void preview.current?.clear().catch(() => {});
    if (character?.id) void characterForOwlbear(character?.id).then(result => { if (live) setData(result); }).catch(e => { if (live) setStatus(e.message); });
    return () => { live = false; };
  }, [character?.id, character?.revision]);
  return <section className="owlbear-tools" aria-label="Token Owlbear"><p role="status">{status}</p>
    {gm && canAssign && selected && <div className="owlbear-assignment"><select aria-label="Personnage à associer" value={assignmentId} onChange={e => setChoice(e.target.value)}><option value="">Choisir un personnage</option>{characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="c-button" disabled={!assignmentId || busy} onClick={async () => {
      setBusy(true);
      try {
        const [{ default: OBR }, { selectedToken }, { TOKEN_LINK_KEY }] = await Promise.all([import("@owlbear-rodeo/sdk"), import("../lib/obr/owlbear/token"), import("../lib/obr/core/links")]);
        const token = await selectedToken(), current = await characterForOwlbear(assignmentId);
        if (!token || token.id !== selected || await OBR.player.getRole() !== "GM" || !current.canAssign) throw Error("Sélection ou autorisation modifiée. Réessayez.");
        await OBR.scene.items.updateItems([token.id], items => { for (const item of items) item.metadata[TOKEN_LINK_KEY] = {
          tokenId: token.id, characterId: assignmentId, ownerId: current.ownerId, characterName: current.name, playerId: current.playerId, playerName: current.playerName,
        }; });
        setStatus(`${current.name} associé${current.playerName ? ` · joueur ${current.playerName}` : ""}`);
        await latest.current.onCharacter(assignmentId);
      } catch (e) { setStatus((e as Error).message); } finally { setBusy(false); }
    }}>Associer au token</button></div>}
    {section === "Techniques" && character && data && <div className="owlbear-previews"><b>Prévisualiser sur la scène</b>
      {data.weapons.flatMap(weapon => weapon.techniques.map((technique, index) => <button className="c-button" key={`${weapon.id}-${index}`} disabled={!selected || !technique.pattern.length} onClick={async () => {
        try {
          const [{ selectedToken, tokenOrigin }, { sharedLink }, { buildPattern }] = await Promise.all([import("../lib/obr/owlbear/token"), import("../lib/obr/core/links"), import("../lib/obr/owlbear/preview")]);
          const token = await selectedToken();
          if (!token || sharedLink(token)?.characterId !== character?.id) throw Error("Sélectionnez le token associé à cette fiche.");
          await characterForOwlbear(character?.id);
          const pattern = { ...technique, pattern: technique.pattern as [number, number][] }; active.current = pattern;
          await preview.current?.show(async () => { const origin = await tokenOrigin(token.id); return buildPattern(origin.origin, origin.dpi, pattern, origin.rotation); });
        } catch (e) { setStatus((e as Error).message); }
      }}>{weapon.name} · {technique.name}</button>))}
      {!data.weapons.some(weapon => weapon.techniques.length) && <p>Aucune technique équipée.</p>}
      <button className="c-button" onClick={() => { active.current = null; void preview.current?.clear().catch(e => setStatus(e.message)); }}>Effacer la prévisualisation</button>
    </div>}
  </section>;
}
