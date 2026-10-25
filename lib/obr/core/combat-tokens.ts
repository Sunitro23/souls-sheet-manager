import type { Item } from "@owlbear-rodeo/sdk";
import { sharedLink } from "./links.ts";
import { derive } from "../../rules.ts";
import type { Character } from "../../rules.ts";
import type { CombatParticipant, CombatPlayer } from "./combat.ts";

export function participantsFromTokens(items: Item[], characters: Character[], players: CombatPlayer[], gm: CombatPlayer): CombatParticipant[] {
  const participants = new Map<string, CombatParticipant>();
  for (const item of items) {
    if (item.type !== "IMAGE" || item.layer !== "CHARACTER") continue;
    const link = sharedLink(item);
    const character = link && characters.find(character => character.id === link.characterId);
    if (!link || !character || participants.has(character.id)) continue;
    const playerId = link.playerId || gm.id;
    const playerName = players.find(player => player.id === playerId)?.name || link.playerName || (playerId === gm.id ? gm.name : "Joueur absent");
    participants.set(character.id, { id: character.id, characterId: character.id, name: character.name,
      dex: derive(character).stats.DEX, playerId, playerName, tokenId: item.id, camp: playerId === gm.id ? "Ennemis" : "Joueurs" });
  }
  return [...participants.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}
