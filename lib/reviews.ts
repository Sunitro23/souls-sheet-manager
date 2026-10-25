import type { Character, Entry } from "./rules.ts";
export type ReviewDecision = {
  id: string;
  at: number;
  actor: string;
  kind: string;
  itemId: string;
  name: string;
  decision: "approved" | "rejected" | "correction";
  comment: string;
};
export type ReviewCharacter = Character & {
  race?: string;
  playerId?: string;
  reviewHistory?: ReviewDecision[];
};
export type ReviewRow = {
  kind: string;
  itemId: string;
  name: string;
  status: string;
  detail: Partial<Character & Entry> & { race?: string };
  characterId: string;
  characterName: string;
  playerId?: string;
  revision: number;
  correction: boolean;
};
export function reviewRows(characters: ReviewCharacter[]): ReviewRow[] {
  return characters.flatMap((c) =>
    [
      {
        kind: "character",
        itemId: c.id,
        name: c.name,
        status: c.reviewStatus ?? "pending",
        detail: c,
      },
      ...(["inventory", "spells", "personalSkills"] as const).flatMap((kind) =>
        (c[kind] ?? [])
          .filter((i) => !("archived" in i && i.archived))
          .map((i) => ({
            kind,
            itemId: i.id,
            name: i.name,
            status: i.status ?? "pending",
            detail: i,
          })),
      ),
    ].map((r) => ({
      ...r,
      characterId: c.id,
      characterName: c.name,
      playerId: c.playerId,
      revision: c.revision,
      correction:
        (c.reviewHistory ?? [])
          .filter((h) => h.kind === r.kind && h.itemId === r.itemId)
          .at(-1)?.decision === "correction" && r.status === "pending",
    })),
  );
}
export function decideReview(
  old: ReviewCharacter,
  input: {
    kind: string;
    itemId: string;
    decision: ReviewDecision["decision"];
    comment: string;
  },
  actor: string,
  now: number,
) {
  if (
    !["approved", "rejected", "correction"].includes(input.decision) ||
    typeof input.comment !== "string" ||
    input.comment.length > 3000
  )
    throw Error("Décision ou commentaire invalide.");
  const c = structuredClone(old),
    row = reviewRows([c]).find(
      (r) => r.kind === input.kind && r.itemId === input.itemId,
    );
  if (!row) throw Error("Élément à valider introuvable.");
  if (row.status !== "pending")
    throw Error("Cette demande a déjà été traitée.");
  const status = input.decision === "correction" ? "pending" : input.decision;
  if (input.kind === "character") c.reviewStatus = status;
  else if (
    input.kind === "inventory" ||
    input.kind === "spells" ||
    input.kind === "personalSkills"
  ) {
    const item = c[input.kind]?.find((i) => i.id === input.itemId);
    if (!item) throw Error("Élément introuvable.");
    item.status = status;
    if (status !== "approved") {
      if ("equipped" in item) item.equipped = false;
      if ("memorized" in item) item.memorized = false;
    }
  }
  c.reviewHistory = [
    ...(old.reviewHistory ?? []),
    {
      id: crypto.randomUUID(),
      at: now,
      actor,
      kind: input.kind,
      itemId: input.itemId,
      name: row.name,
      decision: input.decision,
      comment: input.comment,
    },
  ];
  return c;
}
