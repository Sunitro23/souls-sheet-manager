import {
  type Family,
  type Node,
  type Tree,
  validateTree,
} from "./progression.ts";

export type SkillScope = {
  family: Family;
  race?: string;
  className?: string;
  characterId?: string;
  path?: string;
};
export type SkillTemplate = "innate" | "stat" | "unlock";
export const skillTemplates: {
  id: SkillTemplate;
  name: string;
  description: string;
}[] = [
  {
    id: "innate",
    name: "Trait inné",
    description: "Gratuit, disponible dès le niveau 1.",
  },
  {
    id: "stat",
    name: "Bonus de caractéristique",
    description: "Une caractéristique à augmenter.",
  },
  {
    id: "unlock",
    name: "Capacité à débloquer",
    description: "Un effet, un coût et des prérequis.",
  },
];
export function createSkill(
  scope: SkillScope,
  template: SkillTemplate = "unlock",
): Node {
  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
    family: scope.family,
    kind: template === "stat" ? "stat" : "rp",
    weapon: "",
    cost: template === "innate" ? 0 : 1,
    level: 1,
    requires: [],
    className: scope.family === "Classe" ? (scope.className ?? "") : "",
    race: scope.family === "Race" ? (scope.race ?? "") : "",
    characterId: scope.family === "Personnel" ? (scope.characterId ?? "") : "",
    stat: template === "stat" ? "FOR" : "",
    amount: template === "stat" ? 1 : 0,
    draft: true,
    ...(scope.path && scope.family === "Race"
      ? { racialPath: scope.path }
      : {}),
    ...(scope.path && scope.family === "Classe"
      ? { classPath: scope.path }
      : {}),
    ...(scope.path && scope.family === "Magie"
      ? { magicPath: scope.path }
      : {}),
  };
}
export function copySkill(node: Node, evolution = false): Node {
  const copy = {
    ...node,
    id: crypto.randomUUID(),
    name: `${node.name.slice(0, 80)}${evolution ? " — évolution" : " (copie)"}`,
    draft: true,
    archived: false,
    requires: evolution ? [node.id] : [...node.requires],
  };
  delete copy.archivedByRace;
  if (evolution) {
    copy.level = Math.min(1000, node.level + 1);
    copy.cost = Math.max(1, node.cost);
    copy.order = Math.min(10000, (node.order ?? 0) + 1);
  }
  return copy;
}
export function saveSkill(tree: Tree, node: Node): Tree {
  return validateTree({
    ...tree,
    nodes: tree.nodes.some((n) => n.id === node.id)
      ? tree.nodes.map((n) => (n.id === node.id ? node : n))
      : [...tree.nodes, node],
  });
}
export function prerequisiteOptions(tree: Tree, node: Node): Node[] {
  const descendants = new Set([node.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const candidate of tree.nodes)
      if (
        !descendants.has(candidate.id) &&
        candidate.requires.some((id) => descendants.has(id))
      ) {
        descendants.add(candidate.id);
        changed = true;
      }
  }
  return tree.nodes.filter(
    (n) =>
      !descendants.has(n.id) &&
      n.family === node.family &&
      n.race === node.race &&
      n.className === node.className &&
      (n.characterId ?? "") === (node.characterId ?? "") &&
      (!n.archived || node.requires.includes(n.id)),
  );
}
