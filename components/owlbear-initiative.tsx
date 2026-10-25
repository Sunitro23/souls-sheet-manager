"use client";
import { useEffect, useState, type ReactNode } from "react";
import { initiativeOrder, initiativeTotal, participantsByPlayer } from "../lib/obr/core/combat";
import type { CombatPreparation, InitiativeAction, TurnAction } from "../lib/obr/core/combat";

import { type Character } from "../lib/rules";
import { useOwlbearCombat } from "./use-owlbear-combat";

export default function OwlbearInitiative({ combat: initialCombat, canManage, connectionId, playerId, characters = [], portraits = {}, endCombatButton }: {
  endCombatButton?: ReactNode; portraits?: Record<string, string>; characters?: Character[]; combat: CombatPreparation; canManage: boolean; connectionId: string; playerId: string;
}) {
  const runtime = useOwlbearCombat();
  const combat = runtime.state?.combat.id === initialCombat.id ? runtime.state.combat : initialCombat;
  const locked = !!runtime.state?.pending || !!runtime.state?.resolution;
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0), [listenFailed, setListenFailed] = useState(false);
  const collector = combat.initiative?.collector?.connectionId;
  const listening = canManage && combat.phase === "collecting" && collector === connectionId;
  useEffect(() => {
    if (!listening) return;
    let live = true;
    let stop: (() => void) | undefined;
    void (async () => {
      const [{ default: OBR }, { observeDice }, { updateInitiative }] = await Promise.all([
        import("@owlbear-rodeo/sdk"), import("../lib/obr/owlbear/dice"), import("../lib/obr/owlbear/combat"),
      ]);
      if (!live) return;
      stop = await observeDice(OBR, roll => {
        if (live) void updateInitiative(OBR, combat.id, { type: "capture", ...roll }).catch(failure => {
          if (live) setError(`Jet non enregistré : ${(failure as Error).message} Saisissez sa valeur manuellement.`);
        });
      });
      if (!live) stop();
      else setStatus("Lancez vos d20 dans Dice.");
    })().catch(failure => { if (live) { setError((failure as Error).message); setListenFailed(true); } });
    return () => { live = false; stop?.(); };
  }, [listening, combat.id, attempt]);
  async function change(action: InitiativeAction) {
    if (busy) return;
    setBusy(true); setError("");
    if (action.type === "open") setStatus("Connexion à Dice…");
    try {
      const [{ default: OBR }, { updateInitiative }] = await Promise.all([import("@owlbear-rodeo/sdk"), import("../lib/obr/owlbear/combat")]);
      const updated = await updateInitiative(OBR, combat.id, action);
      if(action.type === "finish") { const {startCombat}=await import("../lib/obr/owlbear/actions"); await startCombat(updated); }
      if (action.type === "open") { setListenFailed(false); if (listening) setAttempt(value => value + 1); }
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  async function turn(action: TurnAction) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      if(!runtime.state) throw Error("Démarrez le combat avant de changer de tour.");
      const {advanceTurn}=await import("../lib/obr/owlbear/actions");
      await advanceTurn(runtime.state, action);
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  const rolls = combat.initiative?.rolls ?? [];
  const ordered = combat.phase === "ready" ? initiativeOrder(combat) : participantsByPlayer(combat.participants);
  const currentTurn = combat.turn ?? 0;
  const active = combat.phase === "ready" ? ordered[currentTurn % ordered.length] : null;
  return <section className="owlbear-previews" aria-label="Initiatives">
    {(error || runtime.error) && <p role="alert">{error || runtime.error}</p>}
    {canManage && combat.phase === "ready" && runtime.ready && !runtime.state && <button className="c-primary" disabled={busy} onClick={async()=>{setBusy(true);try{const {startCombat}=await import('../lib/obr/owlbear/actions');await startCombat(combat);}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}>Démarrer le combat</button>}
    {combat.phase === "preparing" ? <>
      {canManage && <button type="button" className="c-primary" disabled={busy || locked} onClick={() => void change({ type: "open" })}>Ouvrir la collecte des initiatives</button>}
    </> : <>
      {combat.phase === "collecting" && <p role="status">{listening ? status || "Connexion à Dice…" : "En attente des jets."}</p>}
      <ol className={combat.phase === "ready" ? "c-combat-list c-turn-strip" : "c-combat-list"}>{ordered.map(participant => {
        const roll = rolls.find(item => item.participantId === participant.id);
        return <li key={participant.id} aria-current={active?.id===participant.id?"step":undefined}>
          <div className="c-combat-row"><span title={participant.name} aria-label={participant.name}>{combat.phase === "ready" ? (() => {
            const portrait = characters.find(c=>c.id===participant.characterId)?.portrait || portraits[participant.tokenId ?? ""];
            // eslint-disable-next-line @next/next/no-img-element
            return portrait ? <img className="c-turn-portrait" src={portrait} alt={participant.name}/> : <span className="c-turn-portrait c-turn-fallback">{participant.name.slice(0,2)}</span>;
          })() : <strong>{participant.name}</strong>}</span>
            <b title={roll ? (canManage||participant.playerId===playerId ? `D20 : ${roll.d20} · DEX : ${participant.dex}` : "Initiative") : "En attente"}>{roll ? initiativeTotal(participant, roll.d20) : "—"}</b>
          </div>
          {listening && <details><summary>{roll ? "Corriger" : "Saisir manuellement"}</summary><form key={`${participant.id}:${roll?.d20 ?? "empty"}`} className="owlbear-assignment" onSubmit={event => {
            event.preventDefault();
            void change({ type: "manual", participantId: participant.id, d20: Number(new FormData(event.currentTarget).get("d20")) });
          }}><label className="c-field">D20<input name="d20" type="number" required min={1} max={20} step={1} defaultValue={roll?.d20 ?? ""} disabled={busy || locked} /></label>
            <button className="c-button" disabled={busy || locked}>{roll ? "Corriger" : "Saisir"}</button>
          </form></details>}
        </li>;
      })}</ol>
      {canManage && combat.phase === "collecting" && <>
        {(!listening || listenFailed) && <button className="c-button" disabled={busy || locked} onClick={() => void change({ type: "open" })}>Reprendre l’écoute ici</button>}
        <div className="c-owlbear-footer"><button className="c-primary" disabled={busy || !listening || rolls.length !== combat.participants.length} onClick={() => void change({ type: "finish" })}>Valider l’ordre</button></div>
      </>}
      {canManage && combat.phase === "ready" && !runtime.state && <button className="c-button" disabled={busy || locked} onClick={() => void change({ type: "open" })}>Corriger les initiatives</button>}
    </>}
    {active&&(canManage||active.playerId===playerId)&&<div className="c-owlbear-footer"><button className="c-primary" disabled={busy || locked} onClick={()=>void turn({type:"next"})}>{active.playerId===playerId?"Terminer mon tour":"Tour suivant"} →</button>{endCombatButton}</div>}
  </section>;
}
