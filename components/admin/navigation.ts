import type { Workspace } from "./types";

export const groups = [
  {
    id: "dashboard",
    name: "Tableau de bord",
    pages: [["overview", "Vue d’ensemble"]],
  },
  {
    id: "content",
    name: "Création & Contenu",
    pages: [
      ["weapons", "Objets et armes"],
      ["magic", "Sorts et magie"],
      ["skills", "Compétences et voies"],
      ["creation", "Races et classes"],
      ["categories", "Catégories et écoles"],
    ],
  },
  {
    id: "campaign",
    name: "Campagne",
    pages: [
      ["characters", "Personnages"],
      ["players", "Joueurs"],
    ],
  },
  {
    id: "configuration",
    name: "Configuration",
    pages: [
      ["general", "Informations générales"],
      ["rules", "Règles et progression"],
      ["appearance", "Apparence"],
    ],
  },
  {
    id: "administration",
    name: "Données & Administration",
    pages: [
      ["data", "Import / Export"],
      ["archives", "Archives"],
      ["history", "Historique"],
      ["advanced", "Paramètres avancés"],
    ],
  },
] as const;
export const pages = groups.flatMap((group) => [...group.pages]);
export type AdminPage = (typeof pages)[number][0];
export type Destination = {
  page: AdminPage;
  create?: boolean;
  selected?: string;
  owner?: string;
  kind?: string;
  family?: string;
  path?: string;
  status?: string;
  player?: string;
  race?: string;
  className?: string;
};
export const isAdminPage = (value: unknown): value is AdminPage =>
  pages.some(([id]) => id === value);
const parameters = [
  "selected",
  "owner",
  "kind",
  "family",
  "path",
  "status",
  "player",
  "race",
  "className",
] as const;
export function readDestination(search: string): Destination | null {
  const params = new URLSearchParams(search),
    page = params.get("section");
  if (!isAdminPage(page)) return null;
  const target: Destination = { page };
  for (const key of parameters)
    if (params.has(key)) target[key] = params.get(key)!;
  if (params.get("create") === "1") target.create = true;
  return target;
}
export function destinationUrl(
  href: string,
  target: Destination,
  campaignId: string,
) {
  const url = new URL(href);
  url.pathname = "/dm";
  url.searchParams.set("campaign", campaignId);
  url.searchParams.set("section", target.page);
  for (const key of [...parameters, "create"]) url.searchParams.delete(key);
  for (const key of parameters)
    if (target[key]) url.searchParams.set(key, target[key]!);
  if (target.create) url.searchParams.set("create", "1");
  return url.pathname + url.search + url.hash;
}
export const quickActions: { label: string; target: Destination }[] = [
  { label: "Créer un objet", target: { page: "weapons", create: true } },
  { label: "Créer un sort", target: { page: "magic", create: true } },
  { label: "Créer une compétence", target: { page: "skills", create: true } },
  {
    label: "Ajouter une catégorie",
    target: { page: "categories", create: true },
  },
  { label: "Ajouter un joueur", target: { page: "players", create: true } },
];
export const skillPath = (node: Workspace["tree"]["nodes"][number]) =>
  node.magicPath ||
  node.classPath ||
  node.racialPath ||
  node.weapon ||
  "Commun";
export type SearchResult = {
  id: string;
  label: string;
  type: string;
  context: string;
  archived?: boolean;
  target: Destination;
};
export function searchAdministration(
  workspace: Workspace,
  query: string,
): SearchResult[] {
  if (!query.trim()) return [];
  const results: SearchResult[] = [
    ...pages.map(([page, label]) => ({
      id: `page:${page}`,
      label,
      type: "Rubriques",
      context: "Administration",
      target: { page },
    })),
    ...quickActions.map((action) => ({
      id: `create:${action.target.page}`,
      ...action,
      type: "Créer",
      context: "Action rapide",
    })),
    ...workspace.members.map((member) => ({
      id: `player:${member.id}`,
      label: member.username,
      type: "Joueurs",
      context: "Membre de la campagne",
      target: { page: "players" as const, selected: member.id },
    })),
    ...workspace.characters.map((character) => ({
      id: `character:${character.id}`,
      label: character.name,
      type: "Personnages",
      context:
        workspace.members.find((member) => member.id === character.playerId)
          ?.username ?? "Ancien membre",
      target: { page: "characters" as const, selected: character.id },
    })),
    ...workspace.characters.flatMap((character) =>
      [...character.inventory, ...character.spells].map((item) => ({
        id: `${character.id}:${item.id}`,
        label: item.name,
        type: item.type === "spell" ? "Sorts" : "Objets",
        context: [
          character.name,
          workspace.settings.categories.find(
            (category) => category.id === item.categoryId,
          )?.name ??
            item.school ??
            item.category,
        ]
          .filter(Boolean)
          .join(" · "),
        archived: item.archived,
        target: {
          page:
            item.type === "spell" ? ("magic" as const) : ("weapons" as const),
          owner: character.id,
          selected: item.id,
        },
      })),
    ),
    ...workspace.characters.flatMap((character) =>
      (character.personalSkills ?? []).map((skill) => ({
        id: `personal:${character.id}:${skill.id}`,
        label: skill.name,
        type: "Compétences personnelles",
        context: character.name,
        target: { page: "characters" as const, selected: character.id },
      })),
    ),
    ...workspace.tree.nodes.map((node) => ({
      id: `skill:${node.id}`,
      label: node.name,
      type: "Compétences",
      context: `${node.family} · ${skillPath(node)}`,
      archived: node.archived,
      target: {
        page: "skills" as const,
        selected: node.id,
        family: node.family,
      },
    })),
    ...workspace.settings.categories.map((category) => ({
      id: `category:${category.id}`,
      label: category.name,
      type: "Catégories",
      context: {
        weapon: "Armes",
        item: "Objets",
        magic: "Écoles de magie",
        skill: "Familles de compétences",
        race: "Races",
        class: "Classes",
      }[category.kind],
      archived: category.archived,
      target: {
        page: "categories" as const,
        selected: category.id,
        kind: category.kind,
      },
    })),
  ];
  const paths = new Set<string>();
  for (const node of workspace.tree.nodes) {
    const path = skillPath(node),
      id = `path:${node.family}:${path}`;
    if (paths.has(id)) continue;
    paths.add(id);
    results.push({
      id,
      label: path,
      type: "Voies",
      context: node.family ?? "Compétence",
      target: { page: "skills", family: node.family, path },
    });
  }
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase();
  const words = normalize(query).trim().split(/\s+/);
  return query.trim()
    ? results.filter((result) =>
        words.every((word) =>
          normalize(
            `${result.label} ${result.context} ${result.type}`,
          ).includes(word),
        ),
      )
    : [];
}
