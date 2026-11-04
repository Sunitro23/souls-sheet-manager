import type { CombatView, Resolution } from './actions.ts';
import type { Point } from './types.ts';

export const COMBAT_FEEDBACK_CHANNEL = 'de.sunitro.cendres/combat-feedback';
export const COMBAT_AUDIO_CHANNEL = 'de.sunitro.cendres/combat-audio';
export const IMPACT_MS = 120;
export const FEEDBACK_MS = 720;

export type CombatFeedback = {
  id: string; combatId: string; at: number; dpi: number;
  kind: 'weapon' | 'spell' | 'dodge'; actorTokenId: string;
  hitTokenIds: string[]; dodgedTokenIds: string[]; target: Point;
};

export function attackFeedback(state: CombatView, combatId: string, at: number): CombatFeedback | null {
  const r = state.resolution;
  const actorTokenId = state.combat.participants.find(p => p.id === r?.actorId)?.tokenId;
  if (!r || r.movement || r.facing || !actorTokenId || !r.cells.length) return null;
  const hitTokenIds = state.combat.participants.filter(p => r.hitParticipants?.includes(p.id) && p.tokenId).map(p => p.tokenId!);
  return { id: r.id, combatId, at, dpi: r.dpi, kind: r.effectKind ?? 'weapon', actorTokenId, hitTokenIds,
    dodgedTokenIds: r.moves.map(m => m.tokenId).filter(id => !hitTokenIds.includes(id)),
    target: { x: (r.cells.reduce((sum, p) => sum + p.x, 0) / r.cells.length + 0.5) * r.dpi,
      y: (r.cells.reduce((sum, p) => sum + p.y, 0) / r.cells.length + 0.5) * r.dpi } };
}

export function dodgeFeedback(r: Resolution, move: Resolution['moves'][number], combatId: string, at: number): CombatFeedback {
  return { id: `${r.id}/dodge/${move.tokenId}`, combatId, at, dpi: r.dpi, kind: 'dodge', actorTokenId: move.tokenId,
    hitTokenIds: [], dodgedTokenIds: [], target: move.position };
}

export function validFeedback(value: unknown, now = Date.now()): value is CombatFeedback {
  const v = value as CombatFeedback | undefined;
  const ids = (a: unknown): a is string[] => Array.isArray(a) && a.length <= 200 && a.every(id => typeof id === 'string' && id.length <= 200);
  return !!v && typeof v.id === 'string' && v.id.length <= 400 && typeof v.combatId === 'string' &&
    typeof v.actorTokenId === 'string' && ['weapon', 'spell', 'dodge'].includes(v.kind) &&
    Number.isFinite(v.at) && now - v.at < 1500 && v.at - now < 1500 &&
    Number.isFinite(v.dpi) && v.dpi > 0 && v.dpi <= 10000 && ids(v.hitTokenIds) && ids(v.dodgedTokenIds) &&
    !!v.target && Number.isFinite(v.target.x) && Number.isFinite(v.target.y);
}

export type CombatAudioSettings = { muted: boolean; volume: number };
export const DEFAULT_COMBAT_AUDIO: CombatAudioSettings = { muted: false, volume: 0.45 };
export const audioStorageKey = (playerId: string) => `cendres-combat-audio/${playerId}`;
export function audioSettings(value: unknown): CombatAudioSettings {
  const v = value as Partial<CombatAudioSettings> | null;
  return { muted: typeof v?.muted === 'boolean' ? v.muted : false,
    volume: typeof v?.volume === 'number' && Number.isFinite(v.volume) ? Math.max(0, Math.min(1, v.volume)) : 0.45 };
}
