"use client";
import { workspaceAction } from "../app/workspace-actions";
export async function workspaceCall(data: Record<string, unknown>) {
  const embedded = new URLSearchParams(location.search).has("obrref");
  const result = await workspaceAction(data, embedded);
  if (result.error) throw Error(result.error);
  return result;
}
export async function characterForOwlbear(characterId: string) {
  return workspaceCall({ op: "owlbearCharacter", id: characterId }) as Promise<{
    characterId: string; name: string; campaignId: string; canAssign: boolean; ownerId: string | null; playerId: string | null; playerName: string | null;
    weapons: { id: string; name: string; techniques: { name: string; pattern: [number, number][] }[] }[];
  }>;
}
