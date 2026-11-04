import type { CombatPreparation } from './combat';
import type { CombatView } from './actions';

export const COMBAT_POLL_MS = 5000;
export type CombatSnapshot = { combat: CombatPreparation | null; state: CombatView | null; playerId: string; role: 'GM' | 'PLAYER'; ready: boolean; error: string };
export const emptyCombatSnapshot: CombatSnapshot = { combat: null, state: null, playerId: '', role: 'PLAYER', ready: false, error: '' };

// One subscription and one fallback timer per iframe, irrespective of UI consumers.
export function createCombatSync(load: () => Promise<CombatSnapshot>, observe: (refresh: () => void) => Promise<() => void>) {
  let snapshot = emptyCombatSnapshot, generation = 0, running = false, queued = false;
  let timer: ReturnType<typeof setInterval> | undefined, stop: (() => void) | undefined;
  const listeners = new Set<() => void>();
  function publish(next: CombatSnapshot) { snapshot = next; listeners.forEach(listener => listener()); }
  async function refresh() {
    if (!listeners.size) return;
    if (running) { queued = true; return; }
    running = true;
    const current = generation;
    try {
      const next = await load();
      if (generation === current) publish(next);
    } catch (error) {
      if (generation === current) publish({ ...snapshot, ready: false, error: (error as Error).message });
    } finally {
      if (generation === current) {
        running = false;
        if (queued) { queued = false; void refresh(); }
      }
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) {
        const current = ++generation;
        void observe(() => void refresh()).then(cleanup => {
          if (current !== generation) { cleanup(); return; }
          stop = cleanup;
          timer = setInterval(() => void refresh(), COMBAT_POLL_MS);
          void refresh();
        }).catch(error => {
          if (current === generation) publish({ ...snapshot, error: (error as Error).message, ready: false });
        });
      }
      return () => {
        listeners.delete(listener);
        if (!listeners.size) {
          ++generation; stop?.(); stop = undefined; clearInterval(timer);
          running = false; queued = false; snapshot = emptyCombatSnapshot;
        }
      };
    },
  };
}
