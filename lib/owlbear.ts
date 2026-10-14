import {
  catalogueFor,
  predefinedTechniques,
  referencedTechniques,
  techniqueKnown,
} from "./combat.ts";
import type { Character } from "./rules.ts";
import type { Tree } from "./progression.ts";
import { weaponSummary } from "./weapon-summary.ts";

export function owlbearTechniques(character: Character, tree?: Tree) {
  return {
    characterId: character.id,
    name: character.name,
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
              .map(({ name, pattern }) => ({ name, pattern })),
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
            ({ name, pattern }) => ({ name, pattern }),
          ),
        };
      }),
  };
}
