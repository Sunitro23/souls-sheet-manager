import test from "node:test";
import assert from "node:assert/strict";
import { COMBAT_KEY, changeInitiative, initiativeOrder, initiativeTotal, readCombat } from "../lib/obr/core/combat.ts";
import { saveCombatPreparation, updateInitiative } from "../lib/obr/owlbear/combat.ts";

const actor = { playerId: "gm", connectionId: "window" };
const participant = (id, name, playerId = "gm", dex = 14) => ({ id, name, playerId, dex, characterId: null, playerName: playerId });
const prepared = (participants = [participant("z", "Zombie"), participant("a", "Archer"), participant("b", "Bob", "guest")]) => ({
  version: 1, phase: "preparing", id: "combat", revision: 1, campaignId: "campaign", name: "Combat", createdBy: "gm", participants,
});
const open = combat => changeInitiative(combat, { type: "open" }, actor, () => 0);
const capture = (combat, playerId, dieId, value = 10, collector = actor) => changeInitiative(combat, { type: "capture", playerId, dieId, value }, collector);
const manual = (combat, participantId, d20) => changeInitiative(combat, { type: "manual", participantId, d20 }, actor);

test("assigns new d20s alphabetically per player, including guests without accounts", () => {
  let combat = open(prepared());
  combat = capture(combat, "gm", "first", 8);
  combat = capture(combat, "guest", "guest-first", 17);
  combat = capture(combat, "gm", "second", 12);
  assert.deepEqual(combat.initiative.rolls.map(roll => [roll.participantId, roll.d20]), [["a", 8], ["b", 17], ["z", 12]]);
  assert.equal(capture(combat, "gm", "extra", 20), combat);
  assert.equal(capture(combat, "outsider", "extra", 20), combat);
  assert.deepEqual(readCombat({ [COMBAT_KEY]: combat }), combat);
});

test("manual corrections retain dice deduplication and filled slots are skipped", () => {
  let combat = capture(open(prepared()), "gm", "first");
  combat = manual(combat, "a", 19);
  assert.equal(capture(combat, "gm", "first"), combat);
  combat = capture(combat, "gm", "second", 4);
  assert.equal(combat.initiative.rolls.find(roll => roll.participantId === "a").d20, 19);
  assert.equal(combat.initiative.rolls.find(roll => roll.participantId === "z").d20, 4);
  assert.throws(() => manual(combat, "a", 21), /entre 1 et 20/);
  assert.throws(() => manual(combat, "a", 0), /entre 1 et 20/);
  assert.throws(() => manual(combat, "missing", 10), /introuvable/);
});

test("only the designated GM connection captures, and resuming preserves previous results", () => {
  const first = capture(open(prepared()), "gm", "first");
  const newActor = { ...actor, connectionId: "other-window" };
  assert.equal(capture(first, "gm", "second", 10, newActor), first);
  const resumed = changeInitiative(first, { type: "open" }, newActor);
  assert.deepEqual(resumed.initiative.rolls, first.initiative.rolls);
  assert.deepEqual(resumed.initiative.tieOrder, first.initiative.tieOrder);
  assert.equal(capture(resumed, "gm", "second"), resumed);
  assert.equal(capture(resumed, "gm", "second", 14, newActor).initiative.rolls.length, 2);
  assert.throws(() => manual(resumed, "a", 11), /Reprenez/);
});

test("sorts by total, then raw DEX, then a persisted random tie order", () => {
  let combat = open(prepared([participant("low", "Low", "gm", 10), participant("high", "High", "gm", 14),
    participant("tie1", "Tie1", "gm", 14), participant("tie2", "Tie2", "gm", 14)]));
  combat = manual(combat, "low", 12);
  combat = manual(combat, "high", 10);
  combat = manual(combat, "tie1", 18);
  combat = manual(combat, "tie2", 18);
  const order = initiativeOrder(combat).map(item => item.id);
  assert.deepEqual(order.slice(2), ["high", "low"]);
  assert.deepEqual(order.slice(0, 2), combat.initiative.tieOrder.filter(id => id.startsWith("tie")));
  const finished = changeInitiative(combat, { type: "finish" }, actor);
  assert.equal(finished.phase, "ready");
  assert.equal(finished.initiative.collector, null);
  assert.equal(capture(finished, "gm", "late"), finished);
  assert.deepEqual(initiativeOrder(readCombat({ [COMBAT_KEY]: finished })).map(item => item.id), order);
  assert.deepEqual(open(finished).initiative.tieOrder, finished.initiative.tieOrder);
  assert.equal(initiativeTotal(participant("negative", "Negative", "gm", 7), 1), -1);
});

test("cannot validate incomplete initiatives, and malformed saved initiatives are rejected", () => {
  const combat = open(prepared());
  assert.throws(() => changeInitiative(combat, { type: "finish" }, actor), /manque/);
  assert.throws(() => manual(prepared(), "a", 10), /Ouvrez/);
  for (const patch of [{ tieOrder: [] }, { rolls: [{ participantId: "a", d20: 30, source: "manual" }] }, { collector: {} }]) {
    assert.throws(() => readCombat({ [COMBAT_KEY]: { ...combat, initiative: { ...combat.initiative, ...patch } } }), /incompatibles/);
  }
});

function source(role = "GM") {
  let metadata = { [COMBAT_KEY]: open(prepared()) };
  return {
    player: { getRole: async () => role, getId: async () => actor.playerId, getConnectionId: async () => actor.connectionId },
    room: { getMetadata: async () => structuredClone(metadata), setMetadata: async update => {
      await new Promise(resolve => setTimeout(resolve, 1)); metadata = { ...metadata, ...structuredClone(update) };
    } },
  };
}

test("simultaneous results serialize without overwriting each other", async () => {
  const sdk = source();
  await Promise.all([
    updateInitiative(sdk, "combat", { type: "capture", playerId: "gm", dieId: "one", value: 8 }),
    updateInitiative(sdk, "combat", { type: "capture", playerId: "guest", dieId: "guest", value: 12 }),
    updateInitiative(sdk, "combat", { type: "capture", playerId: "gm", dieId: "two", value: 4 }),
    updateInitiative(sdk, "combat", { type: "capture", playerId: "gm", dieId: "one", value: 8 }),
  ]);
  const combat = readCombat(await sdk.room.getMetadata());
  assert.equal(combat.initiative.rolls.length, 3);
  assert.equal(combat.revision, 4);
});

test("permissions, stale combat IDs, and failures do not corrupt the write queue", async () => {
  const sdk = source();
  await assert.rejects(updateInitiative(source("PLAYER"), "combat", { type: "open" }), /GM/);
  await assert.rejects(updateInitiative(sdk, "other", { type: "open" }), /changé/);
  await assert.rejects(updateInitiative(sdk, "combat", { type: "manual", participantId: "a", d20: 30 }), /entre 1 et 20/);
  const saved = await updateInitiative(sdk, "combat", { type: "manual", participantId: "a", d20: 18 });
  assert.equal(saved.initiative.rolls[0].d20, 18);
  await assert.rejects(saveCombatPreparation(sdk, { campaignId: "campaign", name: "Oops", participants: prepared().participants }, saved), /déjà validée/);
});
