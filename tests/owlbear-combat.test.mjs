import test from "node:test";
import assert from "node:assert/strict";
import { COMBAT_KEY, readCombat, participantsByPlayer } from "../lib/obr/core/combat.ts";
import { saveCombatPreparation, cancelCombatPreparation } from "../lib/obr/owlbear/combat.ts";

const participant = (changes = {}) => ({ id: "participant", characterId: "character", name: "Alice", dex: 14,
  playerId: "owlbear-without-cendres", playerName: "Invité", ...changes });
const input = (participants = [participant()]) => ({ campaignId: "campaign", name: "Rencontre", participants });
function source(role = "GM", initial = {}) {
  let metadata = structuredClone(initial);
  const writes = [];
  return {
    writes, metadata: () => metadata,
    player: { getRole: async () => role, getId: async () => "gm" },
    room: { getMetadata: async () => structuredClone(metadata), setMetadata: async update => {
      writes.push(update); metadata = { ...metadata, ...structuredClone(update) };
    } },
  };
}

test("GM creates one shared preparation with a character and a manual enemy", async () => {
  const sdk = source("GM", { "other-extension": { keep: true } });
  const draft = input([participant(), participant({ id: "enemy", characterId: null, name: "Zombie", playerId: "gm", playerName: "GM" })]);
  const before = structuredClone(draft);
  const saved = await saveCombatPreparation(sdk, draft, null);
  assert.equal(saved.phase, "preparing");
  assert.equal(saved.createdBy, "gm");
  assert.equal(saved.revision, 1);
  assert.deepEqual(readCombat(sdk.metadata()), saved);
  assert.deepEqual(sdk.metadata()["other-extension"], { keep: true });
  assert.deepEqual(draft, before);
  assert.equal(saved.participants[0].playerId, "owlbear-without-cendres");
  // A fresh client restores the same preparation from the room, without local storage.
  assert.deepEqual(readCombat(await sdk.room.getMetadata()), saved);
  await assert.rejects(saveCombatPreparation(sdk, draft, null), /modifié ailleurs/);
  assert.equal(sdk.writes.length, 1);
});

test("players cannot create, change or cancel combat preparations", async () => {
  const gm = source(), saved = await saveCombatPreparation(gm, input(), null);
  const sdk = source("PLAYER", gm.metadata());
  await assert.rejects(saveCombatPreparation(sdk, input(), null), /GM/);
  await assert.rejects(saveCombatPreparation(sdk, input(), saved), /GM/);
  await assert.rejects(cancelCombatPreparation(sdk, saved), /GM/);
  assert.equal(sdk.writes.length, 0);
});

test("GM can reassign to a different Owlbear player and stale forms cannot overwrite it", async () => {
  const sdk = source(), first = await saveCombatPreparation(sdk, input(), null);
  const changed = input([participant({ playerId: "other-guest", playerName: "Autre invité" })]);
  const second = await saveCombatPreparation(sdk, changed, first);
  assert.equal(second.id, first.id);
  assert.equal(second.revision, 2);
  assert.equal(second.participants[0].playerId, "other-guest");
  await assert.rejects(saveCombatPreparation(sdk, input(), first), /modifié ailleurs/);
  await assert.rejects(cancelCombatPreparation(sdk, first), /modifié ailleurs/);
  await assert.rejects(saveCombatPreparation(sdk, { ...input(), campaignId: "another" }, second), /autre campagne/);
  await cancelCombatPreparation(sdk, second);
  assert.equal(readCombat(sdk.metadata()), null);
  assert.ok(await saveCombatPreparation(sdk, input(), null));
});

test("rejects missing controller, invalid DEX, duplicates and empty preparations", async () => {
  for (const participants of [[], [participant({ playerId: "" })], [participant({ name: " " })],
    [participant({ dex: 0 })], [participant({ dex: 1.5 })], [participant({ dex: NaN })],
    [participant(), participant({ id: "different" })], [participant(), participant({ characterId: null })],
    Array.from({ length: 51 }, (_, index) => participant({ id: String(index), characterId: null })),
  ]) {
    const sdk = source();
    await assert.rejects(saveCombatPreparation(sdk, input(participants), null));
    assert.equal(sdk.writes.length, 0);
  }
});

test("keeps same-name enemies distinct and sorts each player's participants alphabetically", () => {
  const participants = [
    participant({ id: "zombie", characterId: null, name: "Zombie", playerId: "gm", playerName: "GM" }),
    participant(),
    participant({ id: "archer-2", characterId: null, name: "Archer", playerId: "gm", playerName: "GM" }),
    participant({ id: "archer-1", characterId: null, name: "Archer", playerId: "gm", playerName: "GM" }),
  ];
  assert.deepEqual(participantsByPlayer(participants).map(item => item.id), ["archer-1", "archer-2", "zombie", "participant"]);
  assert.equal(participants[0].id, "zombie");
});

test("unknown or damaged room data is never silently overwritten", async () => {
  for (const value of [{ version: 99 }, "bad", { version: 1, phase: "preparing" }]) {
    const sdk = source("GM", { [COMBAT_KEY]: value });
    await assert.rejects(saveCombatPreparation(sdk, input(), null), /incompatibles/);
    assert.equal(sdk.writes.length, 0);
  }
});

test("respects the shared room metadata budget before writing", async () => {
  const sdk = source("GM", { "other-extension": "x".repeat(16000) });
  await assert.rejects(saveCombatPreparation(sdk, input(), null), /espace/);
  assert.equal(sdk.writes.length, 0);
});
