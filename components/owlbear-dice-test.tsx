"use client";
import { useEffect, useState } from "react";
import type { CapturedD20 } from "../lib/obr/core/dice";

export default function OwlbearDiceTest() {
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("");
  const [rolls, setRolls] = useState<CapturedD20[]>([]);
  useEffect(() => {
    if (!listening) return;
    let live = true;
    let stop: (() => void) | undefined;
    void (async () => {
      const [{ default: OBR }, { observeDice }] = await Promise.all([
        import("@owlbear-rodeo/sdk"), import("../lib/obr/owlbear/dice"),
      ]);
      if (!live) return;
      stop = await observeDice(OBR, roll => {
        if (live) setRolls(previous => [roll, ...previous].slice(0, 20));
      });
      if (!live) stop();
      else setStatus("Écoute prête. Lancez maintenant un d20 public sans bonus dans Dice.");
    })().catch(error => {
      if (live) { setStatus(`Connexion impossible : ${(error as Error).message}`); setListening(false); }
    });
    return () => { live = false; stop?.(); };
  }, [listening]);
  return <details className="owlbear-previews">
    <summary>Vérifier la réception des initiatives Dice</summary>
    <p>Test de réception uniquement : aucun combat ni aucune ressource ne sont modifiés. Les anciens jets, jets masqués, bonus et lancers multiples sont ignorés.</p>
    <button className="c-button" onClick={() => {
      if (listening) { setListening(false); setStatus("Écoute arrêtée."); }
      else { setRolls([]); setStatus("Connexion à Dice…"); setListening(true); }
    }}>{listening ? "Arrêter l’écoute" : "Écouter les nouveaux d20"}</button>
    <p role="status">{status}</p>
    <ul aria-label="D20 reçus">{rolls.map(roll => <li key={`${roll.playerId}:${roll.dieId}`}>{roll.playerName} : {roll.value}</li>)}</ul>
  </details>;
}
