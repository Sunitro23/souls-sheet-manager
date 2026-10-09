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

test("every weapon family uses its automatic weight and ignores player-supplied weight", async () => {
  const { weaponTypes, itemWeight } = await import("../lib/rules.ts");
  for (const family of weaponTypes) {
    const c = fresh();
    const item = entry("Test", "weapon", { category: family.name, weight: 99 });
    c.inventory.push(item);
    validate(c, undefined, true);
    assert.equal(item.weight, family.weight);
    assert.equal(itemWeight(item), family.weight);
  }
  const c = fresh();
  c.inventory.push(entry("Talisman", "talisman", { weight: 42 }));
  validate(c, undefined, true);
  assert.equal(c.inventory.at(-1).weight, 0);
});
test("creation accepts chosen stats and fills each derived resource", async () => {
  const { createCharacter } = await import("../lib/rules.ts");
  const c = createCharacter({
    name: "Mira",
    level: 4,
    stats: { FOR: 12, DEX: 16, CON: 18, INT: 20, SAG: 8, CHA: 10 },
    magic: "INT",
  });
  assert.equal(c.stats.CON, 18);
  assert.equal(c.level, 4);
  assert.equal(c.hp, 24);
  assert.equal(c.end, 3);
  assert.equal(c.mana, 11);
  assert.equal(c.reviewStatus, "pending");
  assert.equal(c.inventory.length, 0);
  const minimal = createCharacter({
    name: "Faible",
    level: 1,
    stats: { FOR: 2, DEX: 2, CON: 2, INT: 2, SAG: 2, CHA: 2 },
    magic: "INT",
  });
  assert.equal(minimal.hp, 0);
  assert.equal(minimal.mana, 4);
});
test("character review cannot be forged and stat edits reset it", () => {
  const old = fresh();
  old.reviewStatus = "approved";
  const c = copy(old);
  c.hp--;
  validate(c, old);
  assert.equal(c.reviewStatus, "approved");
  c.stats.FOR = 18;
  validate(c, old);
  assert.equal(c.reviewStatus, "pending");
  const pending = copy(c);
  c.reviewStatus = "approved";
  validate(c, pending);
  assert.equal(c.reviewStatus, "pending");
});
test("target origins persist, trigger revalidation and reject invalid values", () => {
  const old = fresh(),
    c = copy(old);
  old.inventory[0].category = "Bâtons";
  c.inventory[0].category = "Bâtons";
  c.inventory[0].techniques[0].origin = "target";
  validate(c, old);
  assert.equal(c.inventory[0].status, "pending");
  assert.equal(c.inventory[0].techniques[0].origin, "target");
  c.inventory[0].techniques[0].origin = "enemy";
  assert.throws(() => validate(c, old), /Origine/);
});
test("legacy weapons are normalized without revoking approval", async () => {
  const { normalizeStored } = await import("../lib/rules.ts");
  const old = fresh();
  const c = normalizeStored(copy(old));
  assert.equal(c.inventory[0].category, "Épées");
  validate(c, old);
  assert.equal(c.inventory[0].status, "approved");
  assert.equal(c.inventory[0].equipped, true);
});

test("all 95 catalog techniques preserve supplied zones, range, effects and END", async () => {
  const { combatCatalog, categoryIds, predefinedTechniques } = await import(
    "../lib/combat.ts"
  );
  let count = 0;
  for (const w of combatCatalog.weapons) {
    const category = Object.keys(categoryIds).find(
      (k) => categoryIds[k] === w.id,
    );
    const ts = predefinedTechniques({ category, damage: "2d6+2" });
    assert.equal(ts.length, 5);
    for (let i = 0; i < ts.length; i++) {
      const t = ts[i],
        raw = w.techniques[i];
      assert.deepEqual(
        t.pattern,
        raw.pattern.cells.map((p) => [p.x, p.y]),
      );
      assert.deepEqual(t.effects, raw.effects);
      assert.equal(t.end, raw.end);
      assert.equal(t.range, raw.range.max);
      assert.equal(t.rangeMin, raw.range.min);
      assert.equal(t.rangeKind, raw.range.kind);
      assert.equal(t.origin, raw.pattern.origin === "user" ? "self" : "target");
      assert.equal(t.damage, "2d6+2");
      assert.equal(t.mana, 0);
      count++;
    }
  }
  assert.equal(count, 95);
});
test("weapon types absent from the supplied catalog are not fabricated", async () => {
  const { predefinedTechniques } = await import("../lib/combat.ts");
  for (const category of [
    "Bâtons",
    "Sceaux",
    "Arcs courts",
    "Great Staves",
    "Colossal Weapons",
  ])
    assert.deepEqual(predefinedTechniques({ category, damage: "1d6" }), []);
});
test("one weapon type is fully learned at level 8 and applies to multiple weapons", async () => {
  const {
    predefinedTechniques,
    learnTechnique,
    techniqueProgress,
    techniqueKnown,
  } = await import("../lib/combat.ts");
  let c = fresh();
  c.level = 1;
  const ts = predefinedTechniques(c.inventory[0]);
  assert.equal(ts.filter((t) => techniqueKnown(c, t)).length, 2);
  assert.throws(() => learnTechnique(c, "epee", "swipe"), /insuffisants/);
  c.level = 3;
  c = learnTechnique(c, "epee", "swipe");
  assert.equal(techniqueProgress(c).available, 0);
  assert.throws(() => learnTechnique(c, "epee", "swipe"), /déjà/);
  assert.throws(() => learnTechnique(c, "epee", "jump"), /initiées/);
  c.level = 5;
  c = learnTechnique(c, "epee", "cyclone");
  c.level = 7;
  assert.throws(() => learnTechnique(c, "epee", "jump"), /insuffisants/);
  c.level = 8;
  c = learnTechnique(c, "epee", "jump");
  assert.equal(techniqueProgress(c).spent, 7);
  assert.equal(ts.filter((t) => techniqueKnown(c, t)).length, 5);
  const other = entry("Autre épée", "weapon", { damage: "1d4" });
  assert.equal(
    predefinedTechniques(other).filter((t) => techniqueKnown(c, t)).length,
    5,
  );
  assert.ok(predefinedTechniques(other).every((t) => t.damage === "1d4"));
});
test("learning cannot be forged through generic saves or refunded by changing level", async () => {
  const { learnTechnique } = await import("../lib/combat.ts");
  const old = fresh(),
    c = copy(old);
  c.weaponTraining = ["epee:jump"];
  validate(c, old);
  assert.deepEqual(c.weaponTraining, []);
  let learned = learnTechnique(old, "epee", "swipe");
  const lower = copy(learned);
  lower.level = 1;
  assert.throws(() => validate(lower, learned), /points de technique/);
  const changed = copy(learned);
  changed.weaponTraining = [];
  validate(changed, learned);
  assert.deepEqual(changed.weaponTraining, ["epee:swipe"]);
});
test("catalog-backed weapons cannot override preset mechanics or damage", async () => {
  const { referencedTechniques } = await import("../lib/combat.ts");
  const old = fresh(),
    c = copy(old);
  c.inventory[0].techniques[0].damage = "99d99";
  c.inventory[0].techniques[0].end = 99;
  validate(c, old);
  const ts = referencedTechniques(c.inventory[0]);
  assert.ok(ts.every((t) => t.damage === c.inventory[0].damage));
  assert.equal(ts[0].end, 1);
  assert.equal(c.inventory[0].status, "approved");
});
test("large patterns remain inside dynamic bounds in every orientation", async () => {
  const { patternBounds, combatCatalog } = await import("../lib/combat.ts");
  for (const w of combatCatalog.weapons)
    for (const t of w.techniques)
      for (let r = 0; r < 4; r++) {
        const pts = t.pattern.cells.map(({ x, y }) =>
          r === 1 ? [-y, x] : r === 2 ? [-x, -y] : r === 3 ? [y, -x] : [x, y],
        );
        const b = patternBounds(pts);
        assert.ok(
          pts.every(
            ([x, y]) =>
              x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY,
          ),
        );
      }
  const b = patternBounds([[0, -8]]);
  assert.equal(b.minY, -8);
});
test("personal skills require DM approval and use an independent capped pool", async () => {
  const { learnTechnique, learnPersonalSkill, personalProgress } = await import(
    "../lib/combat.ts"
  );
  let c = fresh();
  c.level = 8;
  c.personalSkills = Array.from({ length: 7 }, (_, i) => ({
    id: String(i),
    name: "Talent " + i,
    description: "Effet",
    status: "pending",
  }));
  assert.throws(() => learnPersonalSkill(c, "0"), /validée/);
  for (const skill of c.personalSkills) skill.status = "approved";
  c = learnTechnique(c, "epee", "swipe");
  c = learnTechnique(c, "epee", "cyclone");
  c = learnTechnique(c, "epee", "jump");
  for (const skill of c.personalSkills) c = learnPersonalSkill(c, skill.id);
  assert.equal(personalProgress(c).spent, 7);
  assert.equal(personalProgress(c).available, 0);
  c.level = 20;
  assert.equal(personalProgress(c).earned, 7);
  assert.throws(() => learnPersonalSkill(c, "0"), /déjà/);
});
test("player-created personal skills cannot self-approve or bypass learning", () => {
  const old = fresh(),
    c = copy(old);
  c.personalSkills = [
    { id: "talent", name: "Talent", description: "Effet", status: "approved" },
  ];
  c.personalTraining = ["talent"];
  validate(c, old);
  assert.equal(c.personalSkills[0].status, "pending");
  assert.deepEqual(c.personalTraining, []);
  const approved = copy(c);
  approved.personalSkills[0].status = "approved";
  const edited = copy(approved);
  edited.personalSkills[0].description = "Autre effet";
  validate(edited, approved);
  assert.equal(edited.personalSkills[0].status, "pending");
});

test("PV and Mana modifiers adjust maxima and reject invalid values", () => {
  const c = fresh(),
    base = derive(c);
  c.hpBonus = 8;
  c.hpMalus = 3;
  c.manaBonus = 4;
  c.manaMalus = 1;
  assert.equal(derive(c).hp, base.hp + 5);
  assert.equal(derive(c).mana, base.mana + 3);
  c.hpMalus = 100;
  c.manaMalus = 100;
  assert.equal(derive(c).hp, 0);
  assert.equal(derive(c).mana, 0);
  c.hpBonus = -1;
  assert.throws(() => validate(c), /hpBonus/);
  c.hpBonus = NaN;
  assert.throws(() => validate(c), /hpBonus/);
});

import { readCampaignAccess, rememberCampaignAccess } from "../lib/access.ts";
test("admin access migrates and keeps independent campaign capabilities", () => {
  const values = new Map(),
    storage = {
      getItem: (k) => values.get(k) ?? null,
      setItem: (k, v) => values.set(k, v),
    };
  storage.setItem(
    "cendres-gm",
    JSON.stringify({ id: "a", token: "secret-a", name: "A" }),
  );
  assert.equal(readCampaignAccess(storage)[0].id, "a");
  rememberCampaignAccess(storage, { id: "b", token: "secret-b", name: "B" });
  assert.equal(readCampaignAccess(storage).length, 2);
  rememberCampaignAccess(storage, { id: "a", token: "renewed", name: "A" });
  assert.equal(readCampaignAccess(storage).length, 2);
  assert.equal(
    readCampaignAccess(storage).find((x) => x.id === "b").token,
    "secret-b",
  );
  storage.setItem("cendres-campaigns", "broken");
  assert.equal(readCampaignAccess(storage)[0].token, "renewed");
});

test('équipement : deux armes, une armure et deux talismans maximum',()=>{
 const c=fresh();c.stats.FOR=28;c.inventory=[
  entry('Dague 1','weapon',{category:'Dagues',damage:'1d4',equipped:true,status:'approved'}),
  entry('Dague 2','weapon',{category:'Dagues',damage:'1d4',equipped:true,status:'approved'}),
  entry('Armure','armor',{armor:1,equipped:true,status:'approved'}),
  entry('Talisman 1','talisman',{equipped:true,status:'approved'}),
  entry('Talisman 2','talisman',{equipped:true,status:'approved'})
 ];
 assert.doesNotThrow(()=>validate(copy(c),copy(c),true));
 for(const [type,message] of [['weapon',/Deux armes/],['talisman',/Deux talismans/],['armor',/seule armure/]]){
  const over=copy(c);over.inventory.push(entry('En trop',type,{category:type==='weapon'?'Dagues':'',damage:type==='weapon'?'1d4':'',equipped:true,status:'approved'}));
  assert.throws(()=>validate(copy(over),copy(over),true),message);
  over.inventory.at(-1).equipped=false;assert.doesNotThrow(()=>validate(copy(over),copy(over),true));
 }
});
