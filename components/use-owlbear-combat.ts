"use client";
import { useEffect, useState } from 'react';
import type { CombatPreparation } from '../lib/obr/core/combat';
import type { CombatView } from '../lib/obr/core/actions';

export function useOwlbearCombat() {
  const [combat, setCombat] = useState<CombatPreparation | null>(null);
  const [state, setState] = useState<CombatView | null>(null);
  const [playerId, setPlayerId] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true, running = false;
    const stops: (() => void)[] = [];
    let timer: ReturnType<typeof setInterval>;
    void (async () => {
      const [{ default: OBR }, { readCombat }, { combatCall }] = await Promise.all([
        import('@owlbear-rodeo/sdk'), import('../lib/obr/core/combat'), import('../lib/obr/owlbear/actions'),
      ]);
      if (!live) return;
      const refresh = async () => {
        if (running || !live) return;
        running = true;
        try {
          const current = readCombat(await OBR.room.getMetadata());
          const runtime = current?.phase === 'ready' ? await combatCall(current, 'get') : null;
          const id = await OBR.player.getId();
          if (live) { setCombat(runtime?.combat ?? current); setState(runtime); setPlayerId(id); setError(''); setReady(true); }
        } catch (failure) { if (live) { setError((failure as Error).message); setReady(false); } }
        finally { running = false; }
      };
      stops.push(OBR.room.onMetadataChange(() => void refresh()), OBR.broadcast.onMessage('de.sunitro.cendres/combat-refresh', () => void refresh()));
      timer = setInterval(() => void refresh(), 1500);
      await refresh();
    })().catch(failure => { if (live) setError((failure as Error).message); });
    return () => { live = false; clearInterval(timer); stops.forEach(stop => stop()); };
  }, []);
  return { combat, state, playerId, error, ready };
}
