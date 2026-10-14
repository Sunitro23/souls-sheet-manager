import test from "node:test";
import assert from "node:assert/strict";
import { fresh, entry } from "../lib/rules.ts";
const copy = (c) => structuredClone(c);
test("owlbear uses campaign unlocks and ignores locked techniques without patterns", async () => {
  const { owlbearTechniques } = await import("../lib/owlbear.ts");
  const { defaultTree } = await import("../lib/progression.ts");
  const c = fresh();
  c.inventory[0].category = "Épées";
  c.inventory[0].techniques = [];
  c.unlocks = [];
  const tree = defaultTree();
  const swipe = tree.nodes.find((n) => n.family === "Lames" && n.name === "Swipe");
  assert.ok(swipe);
  assert.equal(owlbearTechniques(c, tree).weapons[0].techniques.length, 2);
  c.unlocks = [swipe];
  const exported = owlbearTechniques(c, tree).weapons[0].techniques;
  assert.equal(exported.length, 3);
  assert.ok(exported.some((t) => t.name === "Swipe"));
  tree.nodes.push({ ...swipe, id: "custom", name: "Sans schéma" });
  c.unlocks.push(tree.nodes.at(-1));
  assert.equal(owlbearTechniques(c, tree).weapons[0].techniques.length, 3);
});
test("owlbear exports only equipped approved weapons and acquired techniques", async () => {
  const { owlbearTechniques } = await import("../lib/owlbear.ts");
  const c = fresh();
  c.id = "123";
  c.weaponTraining = ["epee:swipe", "griffes:swipe"];
  const weapon = c.inventory[0];
  weapon.special = { ...weapon.techniques[0], name: "Spéciale" };
  c.inventory.push(
    { ...weapon, id: "unequipped", equipped: false },
    { ...weapon, id: "pending", status: "pending" },
    { ...weapon, id: "rejected", status: "rejected" },
  );
  const before = copy(c);
  const result = owlbearTechniques(c);
  assert.equal(result.characterId, "123");
  assert.equal(result.name, c.name);
  assert.equal(result.weapons.length, 1);
  assert.equal(result.weapons[0].id, weapon.id);
  assert.equal(result.weapons[0].name, weapon.name);
  assert.deepEqual(result.weapons[0].techniques, [
    { name: "Swing", pattern: [[0, -2], [-1, -1], [0, -1], [1, -2]] },
    { name: "Estoc", pattern: [[0, -3], [0, -2], [0, -1]] },
    { name: "Swipe", pattern: [[-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2], [-2, -1], [2, -1], [-2, 0], [2, 0]] },
    { name: "Spéciale", pattern: weapon.special.pattern },
  ]);
  assert.deepEqual(c, before);
});
test("owlbear supports custom weapons and empty inventories", async () => {
  const { owlbearTechniques } = await import("../lib/owlbear.ts");
  const c = fresh();
  const technique = c.inventory[0].techniques[0];
  c.inventory = [entry("Bâton", "weapon", {
    category: "Bâtons", equipped: true, status: "approved", techniques: [technique],
  })];
  assert.deepEqual(owlbearTechniques(c).weapons[0].techniques, [
    { name: technique.name, pattern: technique.pattern },
  ]);
  c.inventory = [];
  assert.deepEqual(owlbearTechniques(c).weapons, []);
});
