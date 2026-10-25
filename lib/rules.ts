import {bonusKeys,equipmentBonuses,learnedBonus,spellSchools,type BonusKey} from './bonuses.ts';
import type {AshOfWar} from './ash-of-war.ts';
import type {Node} from './progression.ts';
import {
  catalogueFor,
  referencedTechniques,
  techniqueProgress,
  personalProgress,
  type PersonalSkill,
} from "./combat.ts";
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
export const weaponTypes = [
  ...[
    "Sceaux",
    "Bâtons",
    "Dagues",
    "Arcs courts",
    "Épées courtes",
    "Fouets",
    "Griffes",
  ].map((name) => ({ name, weight: 1 })),
  ...[
    "Épées",
    "Arcs",
    "Haches",
    "Fléaux",
    "Lances",
    "Marteaux",
    "Arbalètes",
    "Hallebardes",
  ].map((name) => ({ name, weight: 2 })),
  ...[
    "Greatswords",
    "Great Spears",
    "Greataxes",
    "Great Hammers",
    "Greatbows",
    "Great Staves",
    "Faux",
    "Ballistes",
  ].map((name) => ({ name, weight: 3 })),
  { name: "Colossal Weapons", weight: 4 },
];
export function weaponCategory(category: string) {
  return category === "Épée longue" ? "Épées" : category;
}
export function itemWeight(item: Entry) {
  if (item.type === "armor") return armors[item.armor]?.weight ?? 0;
  if (item.type === "shield") return item.shield;
  if (item.type === "talisman" || item.type === "spell") return 0;
  if (item.type === "weapon")
    return (
      weaponTypes.find((t) => t.name === weaponCategory(item.category))
        ?.weight ?? item.weight
    );
  return item.weight;
}
export function normalizeStored(c: Character) {
  for (const item of c.inventory) {
    item.category = weaponCategory(item.category);
    item.weight = itemWeight(item);
  }
  c.reviewStatus ??= "pending";
  return c;
}
export const ranks = [
  "Inné",
  "Basique",
  "Intermédiaire",
  "Avancé",
  "Légendaire",
];
export type ZoneOrigin = "self" | "target";
export type Technique = {
  origin?: ZoneOrigin;
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
  categoryId?: string;
  archived?: boolean;
  effects?: string;
  bonuses?: Partial<Record<BonusKey,number>>;
  school?: typeof spellSchools[number];
  origin?: ZoneOrigin;
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
  ashOfWar?: AshOfWar | null;
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
  mode?: "custom";
  resourceBases?: {hp:number;mana:number;end:number};
  unlocks?: Node[];
  className?: string;
  weaponTraining?: string[];
  personalSkills?: PersonalSkill[];
  personalTraining?: string[];
  reviewStatus?: "pending" | "approved" | "rejected";
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
  hpBonus?: number;
  hpMalus?: number;
  manaBonus?: number;
  manaMalus?: number;
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
  const equipped = c.inventory.filter((i) => i.equipped && i.status === 'approved');
  const bonuses=equipmentBonuses(c);
  const stats=Object.fromEntries(statNames.map(key=>[key,Math.min(c.mode==='custom'?Number.MAX_SAFE_INTEGER:28,Math.max(c.mode==='custom'?1:2,c.stats[key]+bonuses[key]))]));
  const armor = armors[equipped.find((i) => i.type === "armor")?.armor || 0];
  const weight = equipped.reduce((s, i) => s + itemWeight(i), 0);
  const capacity = 2 + Math.max(0, mod(stats.FOR));
  const overload = Math.max(0, weight - capacity);
  const mobility = Math.min(4, Math.max(1, Math.floor((stats.DEX + 4) / 6)));
  const move = Math.max(1, mobility - armor.move);
  const magic = mod(stats[c.magic]);
  return {
    stats,
    bonuses,
    armor,
    weight,
    capacity,
    overload,
    mobility,
    move,
    sprint: Math.floor(move * 2.5),
    dodge: 2,
    hp: Math.max(
      1,
      Math.round((c.mode==='custom'?c.resourceBases!.hp:4 + 3 * c.level + 2 * mod(stats.CON)) * armor.hp) +
        (c.hpBonus ?? 0) + bonuses.HP + learnedBonus(c,'HP') -
        (c.hpMalus ?? 0),
    ),
    end: Math.max(0, (c.mode==='custom'?c.resourceBases!.end:3) - overload - c.malus + c.bonus + bonuses.END + learnedBonus(c,'END')),
    mana: Math.max(
      0,
      (c.mode==='custom'?c.resourceBases!.mana:Math.max(4, 6 + magic)) + (c.manaBonus ?? 0) + bonuses.FP + learnedBonus(c,'FP') - (c.manaMalus ?? 0),
    ),
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
  if(c.mode!==undefined&&c.mode!=='custom')throw Error('Mode de personnage invalide.');
  if(old&&c.mode!==old.mode)throw Error('Le mode de création ne peut pas changer.');
  if(c.mode==='custom'){
    if(!gm)throw Error('Personnage custom réservé au MJ.');
    for(const key of ['hp','mana','end'] as const)integer(c.resourceBases?.[key],1,Number.MAX_SAFE_INTEGER,key+' de base');
  }else if(c.resourceBases!==undefined)throw Error('Bases manuelles réservées au mode custom.');
  integer(c.level, 1, 1000, "Niveau");
  c.unlocks = [...(old?.unlocks ?? [])];
  // Learning is purchased through its dedicated endpoint, never granted through a sheet save.
  c.weaponTraining = [...(old?.weaponTraining ?? [])];
  if (techniqueProgress(c).available < 0)
    throw Error(
      "Ce niveau ne couvre plus les points de technique déjà dépensés.",
    );
  c.personalSkills ??= [];
  if (
    !Array.isArray(c.personalSkills) ||
    c.personalSkills.length > 7 ||
    new Set(c.personalSkills.map((s) => s.id)).size !== c.personalSkills.length
  )
    throw Error(
      "Sept compétences personnelles maximum, avec des identifiants uniques.",
    );
  for (const skill of c.personalSkills) {
    if (
      typeof skill.id !== "string" ||
      !skill.id ||
      typeof skill.name !== "string" ||
      !skill.name.trim() ||
      skill.name.length > 100 ||
      typeof skill.description !== "string" ||
      !skill.description.trim() ||
      skill.description.length > 3000
    )
      throw Error(
        "Nom et description de compétence requis (100 et 3 000 caractères maximum).",
      );
    const previous = old?.personalSkills?.find((s) => s.id === skill.id);
    if (!gm) {
      skill.status = previous?.status ?? "pending";
      if (
        previous &&
        (previous.name !== skill.name ||
          previous.description !== skill.description)
      )
        skill.status = "pending";
    } else if (!["pending", "approved", "rejected"].includes(skill.status))
      throw Error("Validation de compétence invalide.");
  }
  c.personalTraining = [...(old?.personalTraining ?? [])];
  if (personalProgress(c).available < 0)
    throw Error(
      "Ce niveau ne couvre plus les compétences personnelles acquises.",
    );
  for (const s of statNames) integer(c.stats[s], c.mode==='custom'?1:2, c.mode==='custom'?Number.MAX_SAFE_INTEGER:28, s);
  if (!["INT", "SAG", "CHA"].includes(c.magic))
    throw Error("Caractéristique magique invalide.");
  integer(c.death, 0, 3, "Dégâts mortels");
  for (const key of ["hpBonus", "hpMalus", "manaBonus", "manaMalus"] as const)
    integer(c[key] ?? 0, 0, 100, key);
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
      if(item.archived!==undefined&&typeof item.archived!=='boolean')throw Error('Archivage invalide.');
      if(item.archived&&(item.equipped||item.memorized))throw Error('Un contenu archivé ne peut pas être équipé.');
      if (item.effects !== undefined && (typeof item.effects !== "string" || item.effects.length > 3000)) throw Error("Effets invalides (3 000 caractères maximum).");
      if (
        ![
          "weapon",
          "armor",
          "shield",
          "talisman",
          "catalyst",
          "consumable",
          "other",
          "spell",
        ].includes(item.type)
      )
        throw Error("Type invalide.");
      if (item.type === "weapon") {
        item.category = weaponCategory(item.category);
        const legacy = old?.inventory.find((i) => i.id === item.id);
        if (
          !weaponTypes.some((t) => t.name === item.category) &&
          (!legacy ||
            legacy.category !== item.category ||
            legacy.weight !== item.weight)
        )
          throw Error("Choisissez un type d’arme du barème.");
      }
      if (item.ashOfWar != null) {
        const ash = item.ashOfWar;
        if (!['weapon', 'shield'].includes(item.type)) throw Error('Une Ash of War nécessite une arme ou un bouclier.');
        if (typeof ash.name !== 'string' || !ash.name.trim()) throw Error('Nom d’Ash of War requis.');
        if (typeof ash.description !== 'string' || typeof ash.damageType !== 'string' || typeof ash.friendlyFire !== 'boolean') throw Error('Effet d’Ash of War invalide.');
        integer(ash.mana, 1, 100, 'Coût FP de l’Ash of War');
        // Ashes consume FP independently of regular techniques.
        ash.end = 0;
      }
      item.weight = itemWeight(item);
      integer(item.weight, 0, 100, "Poids");
      integer(item.rank, 0, 4, "Rang");
      integer(item.armor, 0, 4, "Armure");
      integer(item.shield, 1, 4, "Bouclier");
      integer(item.end, 0, 100, "Coût END");
      integer(item.mana, 0, 100, "Coût Mana");
      if(item.type==='spell')item.school??='Sorts';
      if(item.type==='spell'&&!spellSchools.includes(item.school!))throw Error('Famille de sort invalide.');
      if(item.bonuses!==undefined){
        if(!item.bonuses||typeof item.bonuses!=='object'||Array.isArray(item.bonuses)||Object.keys(item.bonuses).some(k=>!bonusKeys.includes(k as BonusKey)))throw Error('Bonus d’équipement invalide.');
        for(const key of bonusKeys)integer(item.bonuses[key]??0,0,100,`Bonus ${key}`);
        if(item.type==='spell'&&Object.values(item.bonuses).some(Boolean))throw Error('Les bonus passifs sont réservés aux équipements.');
      }
      integer(item.range, 0, 1000, "Portée");
      if (item.type === "armor") item.weight = armors[item.armor].weight;
      if (item.type === "shield") item.weight = item.shield;
      if (["weapon", "shield"].includes(item.type)) {
        if (!catalogueFor(item.category) && item.techniques.length > 5)
          throw Error("Cinq techniques maximum par arme.");
        // Regular techniques always inherit the weapon's damage and never consume Mana.
        item.techniques = item.techniques.map((t) => ({
          ...t,
          damage: item.damage,
          mana: 0,
        }));
      }
      const prev = [...(old?.inventory || []), ...(old?.spells || [])].find(
        (i) => i.id === item.id,
      );
      const mechanical = (i: Entry) => {
        const common = [i.type, itemWeight(i), i.ashOfWar ? {...i.ashOfWar, origin: i.ashOfWar.origin ?? "self"} : null, ...bonusKeys.map(k=>i.bonuses?.[k]??0)];
        const techniques = referencedTechniques(i).map((t) => ({
          ...t,
          origin: t.origin ?? "self",
        }));
        const special = i.special
          ? { ...i.special, origin: i.special.origin ?? "self" }
          : null;
        if (i.type === "weapon")
          return JSON.stringify([
            ...common,
            weaponCategory(i.category),
            i.damage,
            techniques,
            special,
          ]);
        if (i.type === "armor") return JSON.stringify([...common, i.armor]);
        if (i.type === "shield")
          return JSON.stringify([...common, i.shield, techniques, special]);
        if (i.type === "spell")
          return JSON.stringify([
            ...common,
            i.rank,
            i.damage,
            i.end,
            i.mana,
            i.school??'Sorts',
            i.pattern,
            i.friendlyFire,
            i.target,
            i.origin ?? "self",
          ]);
        return JSON.stringify(common);
      };
      if (!gm) {
        item.archived = prev?.archived ?? false;
        item.status = prev?.status || "pending";
        if (prev && (mechanical(prev) !== mechanical(item)||prev.categoryId!==item.categoryId))
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
        ...referencedTechniques(item),
        ...(item.special ? [item.special] : []),
        ...(item.ashOfWar ? [item.ashOfWar] : []),
      ];
      for (const t of patterns) {
        if (!["self", "target"].includes(t.origin ?? "self"))
          throw Error("Origine de zone invalide.");
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
  if (c.inventory.filter(i=>i.equipped && ["weapon","catalyst"].includes(i.type)).length > 2)
    throw Error("Deux armes ou catalyseurs maximum peuvent être équipés.");
  if (c.inventory.filter(i=>i.equipped && i.type === "talisman").length > 2)
    throw Error("Deux talismans maximum peuvent être équipés.");
  const d = derive(c);
  if (d.weight > d.capacity + 2)
    throw Error("Équipement trop lourd : capacité + 2 maximum.");
  if (d.used > d.memory)
    throw Error("Mémoire insuffisante : retirez un sort mémorisé.");
  if (c.spells.filter((s) => s.memorized && s.rank === 0).length > 1)
    throw Error("Un seul sort inné peut être mémorisé.");
  for (const key of ["hp", "end", "mana"] as const) {
    integer(c[key], 0, c.mode==='custom'?Number.MAX_SAFE_INTEGER:100000, key);
    c[key] = Math.min(c[key], Math.max(0, d[key]));
  }
  // Preserve full health only when a newly equipped, approved armor raises the maximum.
  if (old && c.hp === old.hp && old.hp === derive(old).hp && d.hp > old.hp &&
      c.inventory.some(i => i.type === 'armor' && i.equipped && i.status === 'approved' &&
        !old.inventory.some(previous => previous.id === i.id && previous.equipped && previous.status === 'approved')))
    c.hp = d.hp;
  if (!gm) {
    c.reviewStatus = old?.reviewStatus ?? "pending";
    if (
      old &&
      (old.level !== c.level ||
        old.magic !== c.magic ||
        statNames.some((s) => old.stats[s] !== c.stats[s]))
    )
      c.reviewStatus = "pending";
  } else if (
    !["pending", "approved", "rejected"].includes(c.reviewStatus ?? "pending")
  )
    throw Error("Validation du personnage invalide.");
  return c;
}
export function createCharacter(input: {
  mode?: "custom";
  resourceBases?: Character["resourceBases"];
  name: string;
  level: number;
  stats: Record<string, number>;
  magic: string;
}): Character {
  const c = fresh();
  Object.assign(c, input, {
    id: crypto.randomUUID(),
    inventory: [],
    spells: [],
    notes: "",
    subtitle: "",
    reviewStatus: "pending",
    hp: 0,
    end: 0,
    mana: 0,
  });
  validate(c, undefined, true);
  const d = derive(c);
  c.hp = d.hp;
  c.end = d.end;
  c.mana = d.mana;
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
    category: type === "weapon" ? "Épées" : "",
    techniques: [],
    special: null,
    ashOfWar: null,
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
    subtitle: "",
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
