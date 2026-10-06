export const statNames = ["FOR", "DEX", "CON", "INT", "SAG", "CHA"] as const;
export const armors = [
  { name: "Aucune", weight: 0, move: 0, dodge: 0, hp: 1, stability: "Normale" },
  {
    name: "Légère",
    weight: 1,
    move: 0,
    dodge: 1,
    hp: 1.1,
    stability: "Normale",
  },
  {
    name: "Moyenne",
    weight: 2,
    move: 1,
    dodge: 1,
    hp: 1.25,
    stability: "−1 déplacement forcé",
  },
  {
    name: "Lourde",
    weight: 3,
    move: 1,
    dodge: 2,
    hp: 1.6,
    stability: "−2 déplacements forcés",
  },
  {
    name: "Très lourde",
    weight: 4,
    move: 2,
    dodge: 3,
    hp: 2,
    stability: "Règle spéciale",
  },
];
export const ranks = [
  "Inné",
  "Basique",
  "Intermédiaire",
  "Avancé",
  "Légendaire",
];
export type Technique = {
  name: string;
  end: number;
  mana: number;
  damage: string;
  range: number;
  pattern: number[][];
  friendlyFire: boolean;
  description: string;
};
export type Entry = {
  id: string;
  name: string;
  type: string;
  description: string;
  weight: number;
  equipped: boolean;
  status: "pending" | "approved" | "rejected";
  armor: number;
  shield: number;
  damage: string;
  category: string;
  techniques: Technique[];
  special: Technique | null;
  rank: number;
  known: boolean;
  memorized: boolean;
  end: number;
  mana: number;
  range: number;
  pattern: number[][];
  friendlyFire: boolean;
  target: string;
  owner: string;
  createdBy: string;
  modifiedAt: string;
};
export type Character = {
  id: string;
  name: string;
  subtitle: string;
  level: number;
  stats: Record<string, number>;
  magic: string;
  hp: number;
  end: number;
  mana: number;
  death: number;
  bonus: number;
  malus: number;
  portrait: string;
  notes: string;
  inventory: Entry[];
  spells: Entry[];
  campaignId: string | null;
  revision: number;
};
export const mod = (v: number) => Math.floor((v - 10) / 2);
export function derive(c: Character) {
  const equipped = c.inventory.filter((i) => i.equipped);
  const armor = armors[equipped.find((i) => i.type === "armor")?.armor || 0];
  const weight = equipped.reduce((s, i) => s + i.weight, 0);
  const capacity = 2 + Math.max(0, mod(c.stats.FOR));
  const overload = Math.max(0, weight - capacity);
  const mobility = Math.min(4, Math.max(1, Math.floor((c.stats.DEX + 4) / 6)));
  const move = Math.max(1, mobility - armor.move);
  const magic = mod(c.stats[c.magic]);
  return {
    armor,
    weight,
    capacity,
    overload,
    mobility,
    move,
    sprint: move * 2,
    dodge: Math.max(1, mobility - armor.dodge),
    hp: Math.round((4 + 3 * c.level + 2 * mod(c.stats.CON)) * armor.hp),
    end: Math.max(0, 3 - overload - c.malus + c.bonus),
    mana: Math.max(4, 6 + magic),
    magic,
    memory: Math.max(0, magic),
    used: c.spells.filter((s) => s.memorized).reduce((n, s) => n + s.rank, 0),
  };
}
function integer(v: unknown, min: number, max: number, label: string) {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max)
    throw Error(label + " : valeur invalide.");
}
export function validate(c: Character, old?: Character, gm = false) {
  if (!c.name?.trim() || c.name.length > 100)
    throw Error("Le nom est requis (100 caractères maximum).");
  integer(c.level, 1, 1000, "Niveau");
  for (const s of statNames) integer(c.stats[s], 2, 28, s);
  if (!["INT", "SAG", "CHA"].includes(c.magic))
    throw Error("Caractéristique magique invalide.");
  integer(c.death, 0, 3, "Dégâts mortels");
  integer(c.bonus, -100, 100, "Bonus END");
  integer(c.malus, -100, 100, "Malus END");
  if (
    !Array.isArray(c.inventory) ||
    !Array.isArray(c.spells) ||
    c.inventory.length + c.spells.length > 500
  )
    throw Error("Inventaire invalide.");
  for (const list of [c.inventory, c.spells]) {
    if (new Set(list.map((i) => i.id)).size !== list.length)
      throw Error("Identifiants dupliqués.");
    for (const item of list) {
      if (!item.name?.trim()) throw Error("Nom de contenu requis.");
      if (
        ![
          "weapon",
          "armor",
          "shield",
          "talisman",
          "consumable",
          "other",
          "spell",
        ].includes(item.type)
      )
        throw Error("Type invalide.");
      integer(item.weight, 0, 100, "Poids");
      integer(item.rank, 0, 4, "Rang");
      integer(item.armor, 0, 4, "Armure");
      integer(item.shield, 1, 4, "Bouclier");
      integer(item.end, 0, 100, "Coût END");
      integer(item.mana, 0, 100, "Coût Mana");
      integer(item.range, 0, 1000, "Portée");
      if (item.type === "armor") item.weight = armors[item.armor].weight;
      if (item.type === "shield") item.weight = item.shield;
      const prev = [...(old?.inventory || []), ...(old?.spells || [])].find(
        (i) => i.id === item.id,
      );
      const mechanical = (i: Entry) =>
        JSON.stringify([
          i.type,
          i.weight,
          i.damage,
          i.armor,
          i.shield,
          i.category,
          i.techniques,
          i.special,
          i.rank,
          i.end,
          i.mana,
          i.range,
          i.pattern,
          i.friendlyFire,
          i.target,
        ]);
      if (!gm) {
        item.status = prev?.status || "pending";
        if (prev && mechanical(prev) !== mechanical(item))
          item.status = "pending";
      } else if (!["approved", "pending", "rejected"].includes(item.status))
        throw Error("Validation invalide.");
      if (item.status !== "approved") {
        if (prev?.equipped && item.status === "pending") item.equipped = false;
        if (prev?.memorized && item.status === "pending")
          item.memorized = false;
        if (item.equipped || item.memorized)
          throw Error("Ce contenu doit être validé par le GM.");
      }
      if (item.memorized && !item.known)
        throw Error("Un sort mémorisé doit être connu.");
      const patterns = [
        item,
        ...item.techniques,
        ...(item.special ? [item.special] : []),
      ];
      for (const t of patterns) {
        if (t.damage && !/^\d+d\d+([+-]\d+)?$/.test(t.damage))
          throw Error("Dégâts : utilisez une notation comme 1d8 ou 2d6+2.");
        integer(t.end, 0, 100, "Coût END");
        integer(t.mana, 0, 100, "Coût Mana");
        integer(t.range, 0, 1000, "Portée");
        if (
          !Array.isArray(t.pattern) ||
          t.pattern.length > 81 ||
          t.pattern.some(
            (p) =>
              !Array.isArray(p) ||
              p.length !== 2 ||
              p.some((v) => !Number.isInteger(v) || Math.abs(v) > 10),
          )
        )
          throw Error("Pattern invalide.");
      }
      item.owner = c.id;
      item.createdBy = prev?.createdBy || (gm ? "GM" : "Joueur");
      item.modifiedAt =
        prev &&
        JSON.stringify({ ...item, modifiedAt: prev.modifiedAt }) ===
          JSON.stringify(prev)
          ? prev.modifiedAt
          : new Date().toISOString();
    }
  }
  if (c.inventory.filter((i) => i.equipped && i.type === "armor").length > 1)
    throw Error("Une seule armure peut être équipée.");
  const d = derive(c);
  if (d.weight > d.capacity + 2)
    throw Error("Équipement trop lourd : capacité + 2 maximum.");
  if (d.used > d.memory)
    throw Error("Mémoire insuffisante : retirez un sort mémorisé.");
  if (c.spells.filter((s) => s.memorized && s.rank === 0).length > 1)
    throw Error("Un seul sort inné peut être mémorisé.");
  for (const key of ["hp", "end", "mana"] as const) {
    integer(c[key], 0, 100000, key);
    c[key] = Math.min(c[key], Math.max(0, d[key]));
  }
  return c;
}
export function entry(
  name: string,
  type: string,
  extra: Partial<Entry> = {},
): Entry {
  return {
    id: crypto.randomUUID(),
    name,
    type,
    description: "",
    weight: 0,
    equipped: false,
    status: "pending",
    armor: 0,
    shield: 1,
    damage: "",
    category: "",
    techniques: [],
    special: null,
    rank: 1,
    known: true,
    memorized: false,
    end: 0,
    mana: 0,
    range: 1,
    pattern: [[0, -1]],
    friendlyFire: false,
    target: "Une cible",
    owner: "",
    createdBy: "Joueur",
    modifiedAt: new Date().toISOString(),
    ...extra,
  };
}
export function fresh(): Character {
  return {
    id: "",
    name: "Kaelen",
    subtitle: "Le dernier veilleur",
    level: 6,
    stats: { FOR: 16, DEX: 14, CON: 14, INT: 12, SAG: 16, CHA: 10 },
    magic: "SAG",
    hp: 26,
    end: 3,
    mana: 7,
    death: 0,
    bonus: 0,
    malus: 0,
    portrait: "",
    notes: "Un serment oublié. Une flamme qui refuse de mourir.",
    inventory: [
      entry("Épée du veilleur", "weapon", {
        weight: 2,
        damage: "1d8",
        category: "Épée longue",
        equipped: true,
        status: "approved",
        description: "Une lame usée, marquée du sceau des anciens veilleurs.",
        techniques: [
          {
            name: "Taille circulaire",
            end: 2,
            mana: 0,
            damage: "1d8",
            range: 1,
            pattern: [
              [-1, -1],
              [0, -1],
              [1, -1],
            ],
            friendlyFire: true,
            description: "Une large taille devant le porteur.",
          },
        ],
      }),
      entry("Cuirasse de voyage", "armor", {
        armor: 2,
        weight: 2,
        equipped: true,
        status: "approved",
        description:
          "Des plaques de métal patinées, assemblées sur un cuir sombre.",
      }),
      entry("Talisman de braise", "talisman", {
        weight: 1,
        status: "approved",
        description: "Un souvenir encore tiède.",
      }),
      entry("Fiole de soin", "consumable", {
        description: "Une préparation ambrée.",
        status: "approved",
      }),
      entry("Fragment de titanite", "other", {
        status: "pending",
        description: "Un éclat de métal aux reflets anciens.",
      }),
    ],
    spells: [
      entry("Étincelle", "spell", {
        rank: 0,
        memorized: true,
        status: "approved",
        mana: 1,
        damage: "1d4",
        description: "Une étincelle danse au creux de la main.",
      }),
      entry("Lance de lumière", "spell", {
        rank: 2,
        memorized: true,
        status: "approved",
        mana: 3,
        end: 1,
        damage: "2d6",
        range: 6,
        description: "Une lance lumineuse traverse les ténèbres.",
      }),
      entry("Soin mineur", "spell", {
        rank: 1,
        memorized: true,
        status: "approved",
        mana: 2,
        description: "Une chaleur douce referme les blessures.",
      }),
    ],
    campaignId: null,
    revision: 0,
  };
}
