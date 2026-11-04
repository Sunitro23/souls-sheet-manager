import { activeParticipant, type CombatView } from './actions.ts';

export function combatAttention(state: CombatView | null, playerId: string, gm = false) {
  if (!state || !playerId) return null;
  const pending = state.pending;
  if (pending?.defenders.some(id => !pending.answered.includes(id) && state.combat.participants.find(p => p.id === id)?.playerId === playerId)) {
    return { text: 'Réagir', title: 'Une attaque attend votre réaction', color: '#e9bf7f' };
  }
  const active = activeParticipant(state.combat);
  if (!pending && !state.resolution && active && (active.playerId === playerId || gm && !active.playerId)) {
    return { text: 'À vous', title: `À vous de jouer · ${active.name}`, color: '#7cdbba' };
  }
  return null;
}
