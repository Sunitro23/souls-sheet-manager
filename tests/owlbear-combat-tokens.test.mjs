import test from "node:test";
import assert from "node:assert/strict";
import { fresh } from "../lib/rules.ts";
import { participantsFromTokens } from "../lib/obr/core/combat-tokens.ts";
import { TOKEN_LINK_KEY } from "../lib/obr/core/links.ts";
import { readCombat, COMBAT_KEY } from "../lib/obr/core/combat.ts";
import { saveCombatPreparation } from "../lib/obr/owlbear/combat.ts";

const gm = { id: "gm", name: "GM" };
const guest = { id: "owlbear-guest", name: "Joueur sans compte" };
const character = (id, name) => ({ ...fresh(), id, name });
const token = (id, characterId, playerId = guest.id) => ({ id, type: "IMAGE", layer: "CHARACTER", metadata: {
  [TOKEN_LINK_KEY]: { characterId, characterName: "Ancien nom", playerId, playerName: "Ancien pseudo" },
} });

test("detects linked map characters and their Owlbear controller without manual input", () => {
  const hero = character("hero", "Héros");
  const result = participantsFromTokens([token("t", "hero")], [hero], [gm, guest], gm);
  assert.equal(result.length, 1);
  assert.equal(result[0].characterId, "hero");
  assert.equal(result[0].name, "Héros");
  assert.equal(result[0].playerId, guest.id);
  assert.equal(result[0].playerName, guest.name);
  assert.equal(result[0].dex, 14);
});

test("ignores unlinked tokens, other layers, other campaigns, and duplicate character tokens", () => {
  const hero = character("hero", "Héros"), absent = character("absent", "Absent");
  const result = participantsFromTokens([
    token("one", "hero"), token("two", "hero"), token("other", "other-campaign"),
    { ...token("map", "absent"), layer: "MAP" }, { ...token("shape", "absent"), type: "SHAPE" },
    { id: "unlinked", type: "IMAGE", layer: "CHARACTER", metadata: {} },
  ], [hero, absent], [guest], gm);
  assert.deepEqual(result.map(item => item.characterId), ["hero"]);
  assert.deepEqual(participantsFromTokens([], [hero], [guest], gm), []);
});

test("keeps absent owners from token links and assigns GM tokens without a player", () => {
  const result = participantsFromTokens([token("hero-token", "hero"), token("enemy-token", "enemy", null)],
    [character("hero", "Héros"), character("enemy", "Ennemi")], [gm], gm);
  assert.equal(result.find(item => item.characterId === "hero").playerId, guest.id);
  assert.equal(result.find(item => item.characterId === "hero").playerName, "Ancien pseudo");
  assert.equal(result.find(item => item.characterId === "enemy").playerId, gm.id);
});

test("creating a combat no longer requires or stores a name", async () => {
  let metadata = {};
  const source = { player: { getRole: async () => "GM", getId: async () => gm.id },
    room: { getMetadata: async () => metadata, setMetadata: async update => { metadata = { ...metadata, ...update }; } } };
  const participants = participantsFromTokens([token("t", "hero")], [character("hero", "Héros")], [guest], gm);
  const saved = await saveCombatPreparation(source, { campaignId: "campaign", participants }, null);
  assert.equal(Object.hasOwn(saved, "name"), false);
  assert.deepEqual(readCombat(metadata), saved);
  assert.equal(readCombat({ [COMBAT_KEY]: { ...saved, name: "Ancien combat" } }).id, saved.id);
});
