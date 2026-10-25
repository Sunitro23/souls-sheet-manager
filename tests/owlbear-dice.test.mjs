import test from "node:test";
import assert from "node:assert/strict";
import { createD20Capture } from "../lib/obr/core/dice.ts";
import { observeDice } from "../lib/obr/owlbear/dice.ts";

const player = (id, dieId, value, options = {}) => ({
  id, name: id, metadata: dieId ? {
    "rodeo.owlbear.dice/roll": { dice: [{ id: dieId, type: "D20" }], ...options },
    "rodeo.owlbear.dice/rollValues": { [dieId]: value },
  } : {},
});

test("ignores existing rolls, including rolls still moving when listening starts", () => {
  const capture = createD20Capture([player("GM", "old", 12), player("Alice", "moving", null)]);
  assert.equal(capture(player("GM", "old", 12)), null);
  assert.equal(capture(player("Alice", "moving", 18)), null);
  assert.equal(capture(player("GM", "next", null)), null);
  assert.deepEqual(capture(player("GM", "next", 17)), { playerId: "GM", playerName: "GM", dieId: "next", value: 17 });
  assert.equal(capture(player("GM", "next", 17)), null);
});

test("does not import an old hidden roll when it is revealed", () => {
  const capture = createD20Capture([player("GM", "old", undefined, { hidden: true })]);
  assert.equal(capture(player("GM", "old", 12)), null);
});

test("rejects hidden, modified, multiple, non-d20 and invalid results", () => {
  const capture = createD20Capture([player("Alice")]);
  for (const options of [
    { hidden: true }, { bonus: 2 }, { bonus: -1 }, { combination: "HIGHEST" },
    { dice: [{ id: "die", type: "D20" }, { id: "other", type: "D20" }] },
    { dice: [{ id: "die", type: "D6" }] },
    { dice: [{ dice: [{ id: "die", type: "D20" }], bonus: 3 }] },
  ]) assert.equal(capture(player("Alice", "die", 12, options)), null);
  for (const value of [null, undefined, "12", 0, 21, 1.5, NaN]) {
    assert.equal(capture(player("Alice", "die", value)), null);
  }
  assert.equal(capture({ id: "Alice", name: "Alice", metadata: { "rodeo.owlbear.dice/roll": "invalid" } }), null);
});

test("supports a nested single d20 and independent simultaneous players", () => {
  const capture = createD20Capture([player("Alice"), player("Bob")]);
  assert.equal(capture(player("Alice", "die", 1, { dice: [{ dice: [{ id: "die", type: "D20" }], bonus: 0 }] })).value, 1);
  assert.equal(capture(player("Bob", "die", 20)).value, 20);
  assert.equal(capture(player("Alice", "new", 1)).value, 1);
  assert.equal(capture(player("Alice", "die", 1)), null);
});

test("new arrivals are baselined before their next roll", () => {
  const capture = createD20Capture([]);
  assert.equal(capture(player("Alice", "old", 10)), null);
  assert.equal(capture(player("Alice", "new", 10)).value, 10);
});

function source() {
  const callbacks = {};
  const stopped = [];
  return {
    callbacks, stopped,
    player: {
      getId: async () => "GM", getName: async () => "GM", getMetadata: async () => ({}),
      onChange: callback => { callbacks.self = callback; return () => stopped.push("self"); },
    },
    party: {
      getPlayers: async () => [player("Alice")],
      onChange: callback => { callbacks.party = callback; return () => stopped.push("party"); },
    },
  };
}

test("subscribes to local GM and remote players and releases both listeners", async () => {
  const sdk = source(), rolls = [];
  const stop = await observeDice(sdk, roll => rolls.push(roll));
  sdk.callbacks.self(player("GM", "gm-die", 8));
  sdk.callbacks.party([player("Alice", "alice-die", 19)]);
  sdk.callbacks.party([player("Alice", "alice-die", 19)]);
  assert.deepEqual(rolls.map(roll => [roll.playerId, roll.value]), [["GM", 8], ["Alice", 19]]);
  stop();
  assert.deepEqual(sdk.stopped, ["self", "party"]);
});

test("updates arriving during startup become the baseline, not a stale snapshot", async () => {
  const sdk = source(), rolls = [];
  let resolvePlayers;
  sdk.party.getPlayers = () => new Promise(resolve => { resolvePlayers = resolve; });
  const ready = observeDice(sdk, roll => rolls.push(roll));
  sdk.callbacks.party([player("Alice", "during-startup", null)]);
  resolvePlayers([player("Alice")]);
  const stop = await ready;
  sdk.callbacks.party([player("Alice", "during-startup", 9)]);
  assert.equal(rolls.length, 0);
  sdk.callbacks.party([player("Alice", "after-startup", 9)]);
  assert.equal(rolls.length, 1);
  stop();
});

test("failed startup releases subscriptions", async () => {
  const sdk = source();
  sdk.party.getPlayers = async () => { throw Error("offline"); };
  await assert.rejects(observeDice(sdk, () => {}), /offline/);
  assert.deepEqual(sdk.stopped, ["self", "party"]);
});
