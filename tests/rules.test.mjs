import test from "node:test";
import assert from "node:assert/strict";
import { fresh, derive, validate, entry, mod } from "../lib/rules.ts";
const copy = (c) => structuredClone(c);
test("modifiers and derived values follow the supplied rules", () => {
  const c = fresh(),
    d = derive(c);
  assert.equal(mod(9), -1);
  assert.equal(d.capacity, 5);
  assert.equal(d.weight, 4);
  assert.equal(d.hp, 33);
  assert.equal(d.move, 2);
  assert.equal(d.dodge, 2);
  assert.equal(d.sprint, 4);
  assert.equal(d.mana, 9);
  assert.equal(d.memory, 3);
  assert.equal(d.used, 3);
});
test("increasing maximum never heals; decreasing clamps resources", () => {
  const c = fresh(),
    old = copy(c);
  c.inventory[1].armor = 3;
  c.hp = 26;
  assert.equal(validate(c, old, true).hp, 26);
  c.inventory[1].equipped = false;
  c.hp = 40;
  assert.equal(validate(c, old, true).hp, 26);
});
test("overload reduces endurance; weight above capacity + 2 rejected", () => {
  const c = fresh();
  c.inventory.push(
    entry("Charge", "other", { weight: 2, equipped: true, status: "approved" }),
  );
  c.end = 3;
  validate(c, undefined, true);
  assert.equal(c.end, 2);
  c.inventory.at(-1).weight = 4;
  assert.throws(() => validate(c, undefined, true), /trop lourd/);
});
test("unapproved content cannot be equipped or memorized", () => {
  const c = fresh();
  c.inventory.push(entry("Arme", "weapon", { equipped: true }));
  assert.throws(() => validate(c, undefined, true), /validé/);
});
test("player cannot self-approve new content", () => {
  const old = fresh(),
    c = copy(old);
  c.inventory.push(entry("Arme", "weapon", { status: "approved" }));
  validate(c, old);
  assert.equal(c.inventory.at(-1).status, "pending");
});
test("mechanical edits revoke approval; description edits preserve it", () => {
  const old = fresh(),
    c = copy(old);
  c.inventory[0].description = "Une histoire";
  validate(c, old);
  assert.equal(c.inventory[0].status, "approved");
  c.inventory[0].damage = "2d8";
  validate(c, old);
  assert.equal(c.inventory[0].status, "pending");
  assert.equal(c.inventory[0].equipped, false);
});
test("memory and innate spell restrictions are enforced", () => {
  const c = fresh();
  c.spells.push(
    entry("Extra", "spell", { rank: 1, status: "approved", memorized: true }),
  );
  assert.throws(() => validate(c, undefined, true), /Mémoire/);
  c.spells.at(-1).rank = 0;
  assert.throws(() => validate(c, undefined, true), /inné/);
  c.spells.at(-1).memorized = false;
  c.spells[0].known = false;
  assert.throws(() => validate(c, undefined, true), /connu/);
});
test("armor weights, penalties and shields are derived from categories", () => {
  const c = fresh();
  c.inventory = [];
  c.inventory.push(
    entry("Lourde", "armor", {
      armor: 4,
      weight: 0,
      equipped: true,
      status: "approved",
    }),
  );
  validate(c, undefined, true);
  assert.equal(derive(c).weight, 4);
  assert.equal(derive(c).hp, 52);
  assert.equal(derive(c).move, 1);
  assert.equal(derive(c).dodge, 1);
});
test("death marks and current resources stay under player control", () => {
  const c = fresh();
  c.hp = 0;
  c.death = 0;
  validate(c, undefined, true);
  assert.equal(c.death, 0);
  c.death = 3;
  validate(c, undefined, true);
  assert.equal(c.hp, 0);
});
test("invalid dice, stats and patterns are rejected", () => {
  const c = fresh();
  c.inventory[0].damage = "roll attack";
  assert.throws(() => validate(c, undefined, true), /notation/);
  c.inventory[0].damage = "2d6+2";
  c.stats.FOR = 29;
  assert.throws(() => validate(c, undefined, true), /FOR/);
  c.stats.FOR = 16;
  c.inventory[0].pattern = [[1, 1, 1]];
  assert.throws(() => validate(c, undefined, true), /Pattern/);
});
