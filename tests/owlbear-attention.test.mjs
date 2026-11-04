import test from 'node:test';
import assert from 'node:assert/strict';
import { combatAttention } from '../lib/obr/core/attention.ts';

test('le badge cible le joueur actif et donne priorité aux réactions encore attendues', () => {
  const state = { combat: { phase: 'ready', turn: 0, participants: [{ id: 'a', name: 'Aldren', playerId: 'alice', dex: 10 }, { id: 'b', name: 'Lyra', playerId: 'bob', dex: 10 }], initiative: { rolls: [{ participantId: 'a', d20: 20 }, { participantId: 'b', d20: 10 }], tieOrder: ['a', 'b'] } }, pending: null, resolution: null };
  assert.equal(combatAttention(state, 'alice').text, 'À vous');
  assert.equal(combatAttention(state, 'bob'), null);
  assert.equal(combatAttention(state, 'gm', true), null);
  state.pending = { defenders: ['b'], answered: [] };
  assert.equal(combatAttention(state, 'bob').text, 'Réagir');
  assert.equal(combatAttention(state, 'alice'), null);
  state.pending.answered.push('b'); assert.equal(combatAttention(state, 'bob'), null);
  state.pending = null; state.resolution = {}; assert.equal(combatAttention(state, 'alice'), null);
  assert.equal(combatAttention(null, 'alice'), null);
});
