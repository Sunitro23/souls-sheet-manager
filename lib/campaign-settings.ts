import type { Entry } from "./rules.ts";
import { weaponTypes } from "./rules.ts";
import { spellSchools } from "./bonuses.ts";
import { families } from "./progression.ts";
import { racialCatalog } from "./races.ts";
import { classCatalog } from "./classes.ts";
export const magicStyles = ["Runique", "Mystique", "Sacré", "Occulte", "Épuré"];
export const weaponStyles = [
  "Classique",
  "Brutal",
  "Runique",
  "Noble",
  "Minimaliste",
];
export const palettes = [
  {
    name: "Cendres anciennes",
    accent: "#c4ae83",
    surface: "#191c1a",
    background: "#111312",
    line: "#4b5047",
  },
  {
    name: "Sang et braises",
    accent: "#f19b86",
    surface: "#281b1b",
    background: "#170f10",
    line: "#65413d",
  },
  {
    name: "Lune et givre",
    accent: "#a8d2ef",
    surface: "#18232d",
    background: "#0e161e",
    line: "#3e596e",
  },
  {
    name: "Racines oubliées",
    accent: "#b7d59a",
    surface: "#1c271c",
    background: "#101910",
    line: "#496247",
  },
  {
    name: "Occulte",
    accent: "#cfb0ef",
    surface: "#251c30",
    background: "#17101f",
    line: "#5b466e",
  },
];
export type Appearance = (typeof palettes)[number] & {
  magicStyle: string;
  weaponStyle: string;
};
export type Category = {
  id: string;
  kind: "weapon" | "magic" | "item" | "skill" | "race" | "class";
  name: string;
  description: string;
  icon: string;
  color: string;
  order: number;
  parentId: string;
  available: boolean;
  archived: boolean;
  baseKey: string;
  family: string;
  traits: string;
  weaknesses: string;
  style: string;
};
export type CampaignSettings = {
  description: string;
  appearance: Appearance;
  categories: Category[];
};
export function makeCategory(
  kind: Category["kind"],
  name: string,
  id = crypto.randomUUID(),
): Category {
  return {
    id,
    kind,
    name,
    description: "",
    icon: "✦",
    color: "#c4ae83",
    order: 0,
    parentId: "",
    available: true,
    archived: false,
    baseKey: name,
    family: "",
    traits: "",
    weaknesses: "",
    style: "",
  };
}
export function defaultSettings(races?: string[]): CampaignSettings {
  const groups: [Category["kind"], string[]][] = [
    ["weapon", weaponTypes.map((w) => w.name)],
    ["magic", [...spellSchools]],
    ["skill", [...families]],
    ["race", races?.length ? races : racialCatalog.map((r) => r.name)],
    ["class", classCatalog.map((c) => c.name)],
  ];
  return {
    description: "",
    appearance: {
      ...palettes[0],
      magicStyle: "Runique",
      weaponStyle: "Classique",
    },
    categories: groups.flatMap(([kind, names]) =>
      names.map((name, i) => ({
        ...makeCategory(kind, name, `${kind}:${name}`),
        order: i,
      })),
    ),
  };
}
export function readSettings(
  raw: string | null | undefined,
  races?: string[],
): CampaignSettings {
  return raw ? JSON.parse(raw) : defaultSettings(races);
}
function luminance(hex: string) {
  const values = hex
    .slice(1)
    .match(/../g)!
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
export function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function validateSettings(
  value: CampaignSettings,
  previous: CampaignSettings,
) {
  if (
    !value ||
    typeof value.description !== "string" ||
    value.description.length > 3000
  )
    throw Error("Description invalide.");
  const a = value.appearance;
  if (
    !a ||
    typeof a.name !== "string" ||
    a.name.length > 100 ||
    !magicStyles.includes(a.magicStyle) ||
    !weaponStyles.includes(a.weaponStyle)
  )
    throw Error("Apparence invalide.");
  for (const key of ["accent", "surface", "background", "line"] as const)
    if (typeof a[key] !== "string" || !/^#[\da-f]{6}$/i.test(a[key]))
      throw Error("Couleur invalide.");
  if (
    [a.surface, a.background].some(
      (bg) =>
        contrast(bg, "#f5f4ef") < 7 ||
        contrast(bg, "#bdbdb5") < 4.5 ||
        contrast(bg, a.accent) < 4.5,
    ) ||
    contrast(a.accent, "#111111") < 4.5
  )
    throw Error(
      "Palette trop peu contrastée : choisissez des surfaces sombres et un accent clair.",
    );
  if (!Array.isArray(value.categories) || value.categories.length > 500)
    throw Error("Catalogue invalide.");
  const ids = new Set(value.categories.map((c) => c.id));
  if (ids.size !== value.categories.length)
    throw Error("Identifiants de catégorie dupliqués.");
  for (const c of value.categories) {
    if (
      !c ||
      typeof c.id !== "string" ||
      !c.id ||
      c.id.length > 150 ||
      !["weapon", "magic", "item", "skill", "race", "class"].includes(c.kind)
    )
      throw Error("Catégorie invalide.");
    for (const key of [
      "name",
      "description",
      "icon",
      "color",
      "parentId",
      "baseKey",
      "family",
      "traits",
      "weaknesses",
      "style",
    ] as const)
      if (
        typeof c[key] !== "string" ||
        c[key].length >
          (["description", "traits", "weaknesses"].includes(key) ? 3000 : 150)
      )
        throw Error("Propriété de catégorie invalide.");
    if (
      !c.name.trim() ||
      !c.baseKey.trim() ||
      !/^#[\da-f]{6}$/i.test(c.color) ||
      !Number.isInteger(c.order) ||
      c.order < 0 ||
      c.order > 10000 ||
      typeof c.available !== "boolean" ||
      typeof c.archived !== "boolean"
    )
      throw Error("Configuration de catégorie invalide.");
    if (
      (c.kind === "weapon" && !weaponTypes.some((w) => w.name === c.baseKey)) ||
      (c.kind === "magic" && !spellSchools.some((s) => s === c.baseKey)) ||
      (c.kind === "skill" && !families.some((f) => f === c.baseKey))
    )
      throw Error("Correspondance mécanique inconnue.");
    if (c.family && !families.some((f) => f === c.family))
      throw Error("Famille inconnue.");
    if (c.style && !magicStyles.includes(c.style))
      throw Error("Style inconnu.");
    const old = previous.categories.find((p) => p.id === c.id);
    if (old && (old.kind !== c.kind || old.baseKey !== c.baseKey))
      throw Error(
        "La référence mécanique d’une catégorie existante est immuable. Dupliquez-la.",
      );
    const seen = new Set([c.id]);
    let p = c;
    while (p.parentId) {
      const parent = value.categories.find((x) => x.id === p.parentId);
      if (!parent || parent.kind !== c.kind)
        throw Error("Catégorie parente inexistante ou incompatible.");
      if (seen.has(parent.id))
        throw Error("Les catégories parentes forment une boucle.");
      seen.add(parent.id);
      p = parent;
    }
  }
  if (previous.categories.some((c) => !ids.has(c.id)))
    throw Error("Archivez les catégories au lieu de les supprimer.");
  return {
    description: value.description,
    appearance: { ...a },
    categories: value.categories.map((c) => ({ ...c })),
  };
}
export function themeVariables(a: Appearance) {
  return {
    "--accent": a.accent,
    "--panel": a.surface,
    "--bg": a.background,
    "--line": a.line,
    "--text": "#f5f4ef",
    "--muted": "#bdbdb5",
    "--surface": a.surface,
    "--surface-active": a.surface,
    "--border": a.line,
    "--border-active": a.accent,
    "--text-primary": "#f5f4ef",
    "--text-secondary": "#bdbdb5",
    "--accent-ink": "#111111",
  };
}

export function categoryFor(
  settings: CampaignSettings | null | undefined,
  item: {
    categoryId?: string;
    type: string;
    school?: string;
    category?: string;
  },
) {
  return settings?.categories.find((c) =>
    item.categoryId
      ? c.id === item.categoryId
      : c.kind ===
          (item.type === "spell"
            ? "magic"
            : item.type === "weapon"
              ? "weapon"
              : "item") &&
        c.baseKey === (item.type === "spell" ? item.school : item.category),
  );
}
export function validateCategoryReferences(
  c: { inventory: Entry[]; spells: Entry[] },
  old: { inventory: Entry[]; spells: Entry[] } | undefined,
  settings: CampaignSettings,
) {
  for (const key of ["inventory", "spells"] as const)
    for (const item of c[key] ?? []) {
      if (
        item.categoryId !== undefined &&
        (typeof item.categoryId !== "string" || item.categoryId.length > 150)
      )
        throw Error("Référence de catégorie invalide.");
      const category = categoryFor(settings, item),
        previous = old?.[key]?.find((i) => i.id === item.id);
      if (item.categoryId && !category) throw Error("Catégorie inconnue.");
      if (!category) continue;
      if (
        category.kind !==
        (item.type === "spell"
          ? "magic"
          : item.type === "weapon"
            ? "weapon"
            : "item")
      )
        throw Error("Type de catégorie incompatible.");
      if (
        (!category.available || category.archived) &&
        (!previous ||
          previous.categoryId !== item.categoryId ||
          previous.category !== item.category ||
          previous.school !== item.school)
      )
        throw Error("Catégorie indisponible à la création.");
      if (
        item.categoryId && category.kind!=="item" &&
        category.baseKey !==
          (item.type === "spell" ? item.school : item.category)
      )
        throw Error("La catégorie ne correspond pas à la référence mécanique.");
    }
}
