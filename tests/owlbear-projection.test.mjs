import test from "node:test";
import assert from "node:assert/strict";
import { frontCells } from "../lib/obr/core/footprint.ts";
import { attackRotation, cellFromCenter, projectPattern } from "../lib/obr/core/projection.ts";
import { spellPosition, canDeleteSpellZone } from "../lib/obr/core/spells.ts";
test("spell placement limits target range and anchors self zones to the caster",()=>{
  const spell={origin:'target',range:3},caster={x:-2,y:5};
  assert.deepEqual(spellPosition(spell,caster,{x:1,y:8}),{x:1,y:8});
  assert.throws(()=>spellPosition(spell,caster,{x:2,y:5}),/portée/);
  assert.throws(()=>spellPosition(spell,caster,{x:NaN,y:5}),/portée/);
  assert.deepEqual(spellPosition({...spell,origin:'self'},caster,{x:99,y:99}),caster);
  assert.equal(canDeleteSpellZone({casterId:'alice'},'alice','PLAYER'),true);
  assert.equal(canDeleteSpellZone({casterId:'alice'},'bob','PLAYER'),false);
  assert.equal(canDeleteSpellZone({casterId:'alice'},'bob','GM'),true);
  assert.equal(canDeleteSpellZone(undefined,'bob','GM'),false);
});
const slam = [[0,-4],[0,-3],[0,-2],[0,-1]];
test("Owlbear preserves grid coordinates and token rotations", () => {
  assert.deepEqual(projectPattern({x:10,y:8},slam),[{x:10,y:4},{x:10,y:5},{x:10,y:6},{x:10,y:7}]);
  assert.deepEqual(projectPattern({x:10,y:8},slam,90),[{x:14,y:8},{x:13,y:8},{x:12,y:8},{x:11,y:8}]);
  const project = angle => projectPattern({x:0,y:0},slam,angle);
  for(const [a,b] of [[-90,270],[450,90],[44,0],[46,90],[359,0]]) assert.deepEqual(project(a),project(b));
  assert.throws(()=>project(NaN));
});
test("Owlbear supports negative grid coordinates and rejects zero dpi", () => {
  assert.deepEqual(cellFromCenter({x:1575,y:1275},150),{x:10,y:8});
  assert.deepEqual(cellFromCenter({x:-75,y:-225},150),{x:-1,y:-2});
  assert.throws(()=>cellFromCenter({x:0,y:0},0));
});

test('le bord avant et la frappe suivent le regard du pion dans les quatre directions', () => {
  const origin = {x:0,y:0}, size = {width:2,height:2};
  for (const [angle, edge, hit] of [
    [0,   [[0,1],[1,1]], [0,2]],
    [90,  [[0,0],[0,1]], [-1,0]],
    [180, [[0,0],[1,0]], [0,-1]],
    [270, [[1,0],[1,1]], [2,0]],
  ]) {
    const cells = frontCells(origin, size, angle);
    assert.deepEqual(cells.map(p => [p.x,p.y]), edge);
    assert.deepEqual(projectPattern(cells[0], [[0,-1]], attackRotation(angle)), [{x:hit[0],y:hit[1]}]);
  }
});
