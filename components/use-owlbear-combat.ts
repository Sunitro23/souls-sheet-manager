"use client";
import { useEffect, useState } from 'react';
import { emptyCombatSnapshot } from '../lib/obr/core/combat-sync';

export function useOwlbearCombat() {
  const [snapshot, setSnapshot] = useState(emptyCombatSnapshot);
  useEffect(() => {
    let live = true, stop: (() => void) | undefined;
    void import('../lib/obr/owlbear/combat-sync').then(({ combatSync }) => {
      if (!live) return;
      const refresh = () => { if (live) setSnapshot(combatSync.getSnapshot()); };
      stop = combatSync.subscribe(refresh);
      refresh();
    }).catch(error => { if (live) setSnapshot(previous => ({ ...previous, error: error.message, ready: false })); });
    return () => { live = false; stop?.(); };
  }, []);
  return snapshot;
}
