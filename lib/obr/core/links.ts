import type { Item } from "@owlbear-rodeo/sdk";
import type { TokenLink, Viewer } from "./types";

export const TOKEN_LINK_KEY = "de.sunitro.cendres/link";

export function sharedLink(item: Item | undefined): TokenLink | undefined {
  const value = item?.metadata[TOKEN_LINK_KEY];
  if (!item || !value || typeof value !== "object") return undefined;
  const link = value as Record<string, unknown>;
  if (typeof link.characterId !== "string" || typeof link.characterName !== "string" ||
      !(link.playerId === null || typeof link.playerId === "string")) return undefined;
  return { tokenId: item.id, characterId: link.characterId, characterName: link.characterName,
    playerId: link.playerId, playerName: typeof link.playerName === "string" ? link.playerName : undefined };
}

export function tokenLink(item: Item | undefined, viewer: Viewer | undefined, legacy: Map<string, TokenLink>): TokenLink | undefined {
  return sharedLink(item) ?? (viewer?.role === "GM" && item ? legacy.get(item.id) : undefined);
}

export function canViewTechniques(link: TokenLink | undefined, viewer: Viewer | undefined): boolean {
  return !!viewer && (viewer.role === "GM" || (!!link?.playerId && link.playerId === viewer.id));
}

export function linkStorageKey(roomId: string, playerId: string) {
  return `cendres:links:${roomId}:${playerId}`;
}

export function readLinks(storageKey: string): Map<string, TokenLink> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    if (Array.isArray(stored)) return new Map(stored.filter((link): link is TokenLink =>
      link && typeof link.tokenId === "string" && typeof link.characterId === "string" && typeof link.characterName === "string")
      .map(link => [link.tokenId, link]));
  } catch { /* Stockage indisponible : l’association reste possible dans le panneau. */ }
  return new Map();
}
