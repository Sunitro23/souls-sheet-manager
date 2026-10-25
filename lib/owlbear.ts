import {
  catalogueFor,
  predefinedTechniques,
  referencedTechniques,
  techniqueKnown,
} from "./combat.ts";
import { derive, type Character } from "./rules.ts";
import type { Tree } from "./progression.ts";
import { weaponSummary } from "./weapon-summary.ts";

export function owlbearTechniques(character: Character, tree?: Tree) {
  const { move, sprint } = derive(character);
  return {
    movement: { move, sprint, end: character.end },
    characterId: character.id,
    name: character.name,
    items: character.inventory.filter(item=>!item.archived&&item.status==="approved"&&["consumable","other"].includes(item.type)).map(({id,name,type})=>({id,name,type})),
    spells: character.spells.filter(spell => spell.status === "approved" && spell.known && spell.memorized && !spell.archived && spell.pattern.length)
      .map(spell => ({ id: spell.id, name: spell.name, pattern: spell.pattern as [number, number][], origin: spell.origin ?? "self", range: spell.range, end: spell.end, mana: spell.mana })),
    weapons: character.inventory
      .filter(
        (item) => item.type === "weapon" && item.equipped && item.status === "approved",
      )
      .map((item) => {
        if (tree) {
          return {
            id: item.id,
            name: item.name,
            techniques: weaponSummary(item, character, tree).techniques
              .filter((technique) => technique.learned && technique.pattern?.length)
              .map(({ name, pattern, end, mana }) => ({ name, pattern, end: end ?? 0, mana: mana ?? 0 })),
          };
        }
        const techniques = catalogueFor(item.category)
          ? predefinedTechniques(item).filter((technique) =>
              techniqueKnown(character, technique),
            )
          : referencedTechniques(item);
        return {
          id: item.id,
          name: item.name,
          techniques: [...techniques, ...(item.special ? [item.special] : [])].map(
            ({ name, pattern, end, mana }) => ({ name, pattern, end: end ?? 0, mana: mana ?? 0 }),
          ),
        };
      }),
  };
}
