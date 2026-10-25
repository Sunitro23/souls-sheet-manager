"use client";
import { workspaceAction } from "../app/workspace-actions";
export async function workspaceCall(data: Record<string, unknown>) {
  const embedded = new URLSearchParams(location.search).has("obrref");
  const result = await workspaceAction(data, embedded);
  if (result.error) throw Object.assign(Error(result.error), {status: result.status});
  return result;
}
export async function characterForOwlbear(characterId: string) {
  return workspaceCall({ op: "owlbearCharacter", id: characterId }) as Promise<{
    movement: { move: number; sprint: number; end: number };
    characterId: string; name: string; revision: number; items: {id:string;name:string;type:string}[]; campaignId: string; canAssign: boolean; ownerId: string | null; playerId: string | null; playerName: string | null;
    weapons: { id: string; name: string; techniques: { name: string; pattern: [number, number][]; end: number; mana: number }[] }[];
    spells: import('./obr/core/types').Spell[];
  }>;
}
