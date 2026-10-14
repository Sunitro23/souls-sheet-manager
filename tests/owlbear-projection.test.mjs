import test from "node:test";
import assert from "node:assert/strict";
import { cellFromCenter, projectPattern } from "../lib/obr/core/projection.ts";
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
