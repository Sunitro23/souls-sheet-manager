import test from "node:test";
import assert from "node:assert/strict";
import {
  groups,
  pages,
  readDestination,
  destinationUrl,
  searchAdministration,
} from "../components/admin/navigation.ts";
import { defaultSettings } from "../lib/campaign-settings.ts";
import { defaultTree } from "../lib/progression.ts";
import { fresh, entry } from "../lib/rules.ts";

function fixture() {
  const character = {
    ...fresh(),
    id: "hero",
    name: "Avesdios",
    playerId: "player",
    spells: [entry("Son Crispant", "spell")],
    inventory: [entry("Épée ancienne", "weapon", { archived: true })],
  };
  const tree = defaultTree();
  tree.nodes.push({
    ...tree.nodes[0],
    id: "archived-skill",
    name: "Savoir ancien",
    family: "Magie",
    magicPath: "Voie oubliée",
    archived: true,
  });
  return {
    campaign: { id: "campaign", name: "Cendres" },
    settings: defaultSettings(),
    tree,
    characters: [character],
    members: [{ id: "player", username: "JoueurTest" }],
    history: [],
  };
}

test("les destinations /dm conservent campagne et paramètres sans hériter des filtres de la rubrique précédente", () => {
  const target = {
    page: "skills",
    family: "Magie",
    path: "Voie & école",
    selected: "id/1",
    status: "archived",
  };
  const url = destinationUrl(
    "https://example.test/dm?owner=ancien&create=1&obrref=host",
    target,
    "campaign",
  );
  assert.deepEqual(
    readDestination(new URL(url, "https://example.test").search),
    target,
  );
  assert.equal(
    new URL(url, "https://example.test").searchParams.get("campaign"),
    "campaign",
  );
  assert.equal(
    new URL(url, "https://example.test").searchParams.get("obrref"),
    "host",
  );
  assert.doesNotMatch(url, /owner=|create=/);
  assert.deepEqual(readDestination("?section=magic&create=1"), {
    page: "magic",
    create: true,
  });
  assert.equal(readDestination("?section=inconnue"), null);
  assert.equal(readDestination("?page=skills"), null);
});

test("la recherche ouvre exactement le contenu et son propriétaire, y compris les archives", () => {
  const workspace = fixture(),
    before = JSON.stringify(workspace);
  const [spell] = searchAdministration(workspace, "son crispant");
  assert.deepEqual(spell.target, {
    page: "magic",
    owner: "hero",
    selected: workspace.characters[0].spells[0].id,
  });
  assert.match(spell.context, /Avesdios/);
  const [item] = searchAdministration(workspace, "epee ancienne");
  assert.equal(item.archived, true);
  assert.equal(item.target.page, "weapons");
  const [skill] = searchAdministration(workspace, "Savoir ancien");
  assert.equal(skill.target.selected, "archived-skill");
  assert.equal(skill.target.family, "Magie");
  assert.equal(skill.archived, true);
  assert.equal(JSON.stringify(workspace), before);
});

test("joueurs, voies, catégories et créations utilisent les mêmes destinations que la navigation", () => {
  const workspace = fixture();
  assert.deepEqual(
    searchAdministration(workspace, "JoueurTest").find(
      (r) => r.type === "Joueurs",
    ).target,
    { page: "players", selected: "player" },
  );
  assert.deepEqual(
    searchAdministration(workspace, "Voie oubliée").find(
      (r) => r.type === "Voies",
    ).target,
    { page: "skills", family: "Magie", path: "Voie oubliée" },
  );
  const category = workspace.settings.categories[0];
  assert.equal(
    searchAdministration(workspace, category.name).find(
      (r) => r.id === `category:${category.id}`,
    ).target.selected,
    category.id,
  );
  assert.deepEqual(searchAdministration(workspace, "Créer un sort")[0].target, {
    page: "magic",
    create: true,
  });
  assert.equal(groups.length, 5);
  assert.equal(new Set(pages.map(([id]) => id)).size, pages.length);
  assert.deepEqual(searchAdministration(workspace, "introuvable"), []);
  assert.deepEqual(searchAdministration(workspace, " "), []);
  const other = fixture();
  other.characters = [];
  other.members = [];
  assert.equal(searchAdministration(other, "Son Crispant").length, 0);
});

test("une race reste accessible depuis un ancien lien de catégorie et depuis la recherche MJ", () => {
  const workspace = fixture();
  const race = workspace.settings.categories.find(category => category.kind === "race");
  const expected = {page: "creation", selected: race.id, kind: "race"};
  const query = new URLSearchParams({...expected, section: "categories"});
  assert.deepEqual(readDestination(query.toString()), expected);
  const result = searchAdministration(workspace, race.name).find(result => result.id === "category:" + race.id);
  assert.deepEqual(result.target, expected);
});
