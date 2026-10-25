import test from 'node:test';
import assert from 'node:assert/strict';
import { movementPath, planMovement, cardinalRotation, facingTargets } from '../lib/obr/core/movement.ts';
const token = (tokenId, x, y) => ({tokenId, cell: {x,y}, position: {x:x*100+50,y:y*100+50}});

test('mouvement : marche, course, diagonales et limites', () => {
  const board = [token('hero',0,0)];
  assert.equal(planMovement(board,'hero',{x:0,y:0},2,5).end,0);
  assert.equal(planMovement(board,'hero',{x:2,y:2},2,5).end,1);
  assert.equal(planMovement(board,'hero',{x:-3,y:2},2,5).end,2);
  assert.equal(planMovement(board,'hero',{x:5,y:0},2,5).end,2);
  assert.throws(()=>planMovement(board,'hero',{x:6,y:0},2,5),/portée/);
  assert.throws(()=>movementPath({x:0,y:0},{x:1.5,y:0},5),/invalide/);
  assert.throws(()=>movementPath({x:0,y:0},{x:1e7,y:0},5),/portée/);
  assert.deepEqual(movementPath({x:0,y:0},{x:3,y:1},5),[{x:1,y:0},{x:2,y:1},{x:3,y:1}]);
});
test('mouvement : les pions bloquent le trajet et l’arrivée, sans détour', () => {
  const board=[token('hero',0,0),token('other',1,0)];
  assert.throws(()=>planMovement(board,'hero',{x:1,y:0},2,5),/bloque/);
  assert.throws(()=>planMovement(board,'hero',{x:4,y:0},2,5),/bloque/);
  assert.equal(planMovement(board,'hero',{x:2,y:2},2,5).end,1);
  assert.throws(()=>planMovement(board,'missing',{x:2,y:2},2,5),/manque/);
  assert.throws(()=>planMovement([...board,board[0]],'hero',{x:2,y:2},2,5),/invalides/);
});

test('orientation : quatre directions, flèches hors de la portée', () => {
  const origin={x:0,y:0};
  for(const [x,y,rotation] of [[0,-1,0],[1,0,90],[0,1,180],[-1,0,270],[1,1,90],[-1,-1,270],[1,-2,0]]) {
    assert.equal(cardinalRotation(origin,{x,y}),rotation);
  }
  const arrows=facingTargets(origin,5);
  assert.deepEqual(arrows.map(a=>a.rotation),[0,90,180,270]);
  assert.ok(arrows.every(a=>Math.max(Math.abs(a.x),Math.abs(a.y))===6));
});
