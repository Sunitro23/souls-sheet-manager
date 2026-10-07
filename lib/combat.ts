import data from "../data_combat.json" with { type: "json" };
import type { Entry, Technique } from "./rules.ts";

export type TechniqueRank = "debutant" | "initie" | "expert";
export const rankLabels: Record<TechniqueRank, string> = {
  debutant: "Débutant",
  initie: "Initié",
  expert: "Expert",
};
export const categoryIds: Record<string, string> = {
  Dagues: "dague",
  "Épées courtes": "epee-courte",
  Épées: "epee",
  "Épée longue": "epee",
  Greatswords: "greatsword",
  Griffes: "griffes",
  Lances: "lance",
  Hallebardes: "hallebarde",
  Faux: "faux",
  Fléaux: "fleau",
  "Great Spears": "greatspear",
  Fouets: "fouet",
  Marteaux: "marteau",
  "Great Hammers": "greathammer",
  Haches: "hache",
  Greataxes: "greataxe",
  Arcs: "arc",
  Greatbows: "greatbow",
  Ballistes: "balliste",
  Arbalètes: "arbalete",
};
export const combatCatalog = data;
export function catalogueFor(category: string) {
  return data.weapons.find((w) => w.id === categoryIds[category]);
}
export type CatalogTechnique = Technique & {
  catalogId: string;
  weaponTypeId: string;
  rank: TechniqueRank;
  rangeMin: number;
  rangeKind: string;
  effects: Record<string, unknown>;
};
export function predefinedTechniques(
  item: Pick<Entry, "category" | "damage">,
): CatalogTechnique[] {
  const weapon = catalogueFor(item.category);
  return (
    weapon?.techniques.map((t) => ({
      catalogId: t.id,
      weaponTypeId: weapon.id,
      rank: t.rank as TechniqueRank,
      name: t.name,
      end: t.end,
      mana: 0,
      damage: item.damage,
      range: t.range.max,
      rangeMin: t.range.min,
      rangeKind: t.range.kind,
      origin: t.pattern.origin === "target" ? "target" : "self",
      pattern: t.pattern.cells.map((p) => [p.x, p.y]),
      friendlyFire: false,
      description: "",
      effects: t.effects,
    })) ?? []
  );
}
export function effectText(effects: Record<string, unknown>) {
  return Object.entries(effects)
    .map(([key, value]) =>
      key === "knockback"
        ? `Repousse de ${value} case${value === 1 ? "" : "s"}`
        : key === "immobilize" && value === "until-end-of-target-next-turn"
          ? "Immobilise jusqu’à la fin du prochain tour de la cible"
          : `${key} : ${value}`,
    )
    .join(" · ");
}
export function referencedTechniques(item: Entry): Technique[] {
  if (item.type === "weapon" && catalogueFor(item.category))
    return predefinedTechniques(item);
  return item.techniques.map((t) => ({ ...t, damage: item.damage, mana: 0 }));
}
export function patternBounds(points: number[][]) {
  const xs = [-2, 2, ...points.map((p) => p[0])],
    ys = [-2, 2, ...points.map((p) => p[1])];
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  return {
    minX,
    maxX,
    minY,
    maxY,
    columns: maxX - minX + 1,
    rows: maxY - minY + 1,
  };
}

export const techniqueCosts: Record<TechniqueRank, number> = {
  debutant: 0,
  initie: 2,
  expert: 3,
};
export type TrainingCharacter = { level: number; weaponTraining?: string[] };
export function techniqueKey(
  t: Pick<CatalogTechnique, "weaponTypeId" | "catalogId">,
) {
  return `${t.weaponTypeId}:${t.catalogId}`;
}
export function techniqueKnown(c: TrainingCharacter, t: CatalogTechnique) {
  return (
    t.rank === "debutant" || (c.weaponTraining ?? []).includes(techniqueKey(t))
  );
}
export function techniqueProgress(c: TrainingCharacter) {
  const keys = c.weaponTraining ?? [];
  if (!Array.isArray(keys) || new Set(keys).size !== keys.length)
    throw Error("Apprentissages invalides.");
  let spent = 0;
  for (const key of keys) {
    if (typeof key !== "string") throw Error("Apprentissage invalide.");
    const [weaponId, id] = key.split(":");
    const w = data.weapons.find((w) => w.id === weaponId),
      t = w?.techniques.find((t) => t.id === id);
    if (!t || key !== `${weaponId}:${id}` || t.rank === "debutant")
      throw Error("Technique apprise invalide.");
    spent += techniqueCosts[t.rank as TechniqueRank];
  }
  const earned = Math.max(0, c.level - 1);
  return { earned, spent, available: earned - spent };
}
export function learnTechnique<T extends TrainingCharacter>(
  c: T,
  weaponTypeId: string,
  catalogId: string,
): T {
  const w = data.weapons.find((w) => w.id === weaponTypeId),
    raw = w?.techniques.find((t) => t.id === catalogId);
  if (!w || !raw) throw Error("Technique inconnue.");
  const key = `${weaponTypeId}:${catalogId}`;
  if (raw.rank === "debutant" || c.weaponTraining?.includes(key))
    throw Error("Cette technique est déjà acquise.");
  if (
    raw.rank === "expert" &&
    w.techniques
      .filter((t) => t.rank === "initie")
      .some((t) => !c.weaponTraining?.includes(`${w.id}:${t.id}`))
  )
    throw Error(
      "Apprenez les techniques initiées de ce type avant la technique experte.",
    );
  const cost = techniqueCosts[raw.rank as TechniqueRank];
  if (techniqueProgress(c).available < cost)
    throw Error("Points de technique insuffisants.");
  return { ...c, weaponTraining: [...(c.weaponTraining ?? []), key] };
}

export type PersonalSkill = {
  id: string;
  name: string;
  description: string;
  status: "pending" | "approved" | "rejected";
};
export type PersonalCharacter = {
  level: number;
  personalSkills?: PersonalSkill[];
  personalTraining?: string[];
};
export function personalProgress(c: PersonalCharacter) {
  const learned = c.personalTraining ?? [];
  if (
    !Array.isArray(learned) ||
    new Set(learned).size !== learned.length ||
    learned.some((id) => !c.personalSkills?.some((s) => s.id === id))
  )
    throw Error("Apprentissages personnels invalides.");
  const earned = Math.min(7, Math.max(0, c.level - 1));
  return { earned, spent: learned.length, available: earned - learned.length };
}
export function learnPersonalSkill<T extends PersonalCharacter>(
  c: T,
  id: string,
): T {
  const skill = c.personalSkills?.find((s) => s.id === id);
  if (!skill || skill.status !== "approved")
    throw Error("La compétence doit être validée par le DM.");
  if (c.personalTraining?.includes(id))
    throw Error("Cette compétence est déjà acquise.");
  if (personalProgress(c).available < 1)
    throw Error("Points de compétence personnelle insuffisants.");
  return { ...c, personalTraining: [...(c.personalTraining ?? []), id] };
}
