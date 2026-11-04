import test from 'node:test';
import assert from 'node:assert/strict';
import { attackFeedback, dodgeFeedback, validFeedback, audioSettings } from '../lib/obr/core/combat-feedback.ts';

test('feedback : résultats réels, distinction magie et absence de dégâts inventés', () => {
  const state = { combat: { participants: [{ id: 'a', tokenId: 'actor' }, { id: 'b', tokenId: 'hit' }, { id: 'c', tokenId: 'safe' }] },
    resolution: { id: 'attack', actorId: 'a', effectKind: 'spell', damage: '2d6', cells: [{ x: 1, y: 0 }], dpi: 100,
      hitParticipants: ['b'], moves: [{ tokenId: 'hit', position: { x: 150, y: 50 } }, { tokenId: 'safe', position: { x: 250, y: 50 } }] } };
  const event = attackFeedback(state, 'scene', 1000);
  assert.equal(event.kind, 'spell');
  assert.deepEqual(event.hitTokenIds, ['hit']);
  assert.deepEqual(event.dodgedTokenIds, ['safe'], 'une esquive restée dans la zone n’est pas annoncée réussie');
  assert.deepEqual(event.target, { x: 150, y: 50 });
  assert.equal('damage' in event, false);
  assert.equal(validFeedback(event, 1080), true);
  for (const invalid of [null, {}, { ...event, at: -2000 }, { ...event, at: 5000 }, { ...event, dpi: NaN },
    { ...event, target: null }, { ...event, hitTokenIds: 'hit' }]) assert.equal(validFeedback(invalid, 1080), false);
  assert.equal(attackFeedback({ ...state, resolution: { ...state.resolution, facing: {} } }, 'scene', 1000), null);
  assert.equal(attackFeedback({ ...state, resolution: { ...state.resolution, movement: {} } }, 'scene', 1000), null);
  const dodge = dodgeFeedback(state.resolution, state.resolution.moves[1], 'scene', 1000);
  assert.equal(dodge.kind, 'dodge');
  assert.equal(dodge.actorTokenId, 'safe');
});

test('son : réglages invalides normalisés et volume borné', () => {
  assert.deepEqual(audioSettings(null), { muted: false, volume: 0.45 });
  assert.deepEqual(audioSettings({ muted: true, volume: 5 }), { muted: true, volume: 1 });
  assert.equal(audioSettings({ volume: -1 }).volume, 0);
  assert.equal(audioSettings({ volume: NaN }).volume, 0.45);
});
