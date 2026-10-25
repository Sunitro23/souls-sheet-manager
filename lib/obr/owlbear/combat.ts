import { COMBAT_KEY, readCombat, validateParticipants, changeInitiative, changeTurn } from "../core/combat.ts";
import type { InitiativeAction, TurnAction } from "../core/combat.ts";
import type { CombatPreparation, CombatParticipant } from "../core/combat.ts";

type CombatSource = {
  player: { getRole(): Promise<"GM" | "PLAYER">; getId(): Promise<string> };
  room: { getMetadata(): Promise<Record<string, unknown>>; setMetadata(update: Record<string, unknown>): Promise<void> };
};

const queues = new WeakMap<CombatSource, Promise<unknown>>();
function enqueue<T>(source: CombatSource, action: () => Promise<T>): Promise<T> {
  const next = (queues.get(source) ?? Promise.resolve()).catch(() => {}).then(action);
  queues.set(source, next);
  return next;
}

export async function saveCombatPreparation(source: CombatSource, input: {
  campaignId: string; name?: string; participants: CombatParticipant[];
}, expected: Pick<CombatPreparation, "id" | "revision"> | null) {
  return enqueue(source, async () => {
  if (await source.player.getRole() !== "GM") throw Error("Seul le GM peut préparer le combat.");
  validateParticipants(input.participants);
  if (!input.campaignId) throw Error("Choisissez une campagne.");
  const createdBy = await source.player.getId();
  const metadata = await source.room.getMetadata(), current = readCombat(metadata);
  if (expected ? !current || current.id !== expected.id || current.revision !== expected.revision : current !== null) {
    throw Error("Le combat a été modifié ailleurs. Fermez le formulaire pour consulter la préparation actuelle.");
  }
  if (current && current.campaignId !== input.campaignId) throw Error("Ce combat appartient à une autre campagne.");
  if (current && current.phase !== "preparing") throw Error("La sélection des participants est déjà validée.");
  const next: CombatPreparation = {
    version: 1, phase: "preparing", id: current?.id ?? crypto.randomUUID(), revision: (current?.revision ?? 0) + 1,
    campaignId: input.campaignId, createdBy: current?.createdBy ?? createdBy,
    participants: input.participants.map(participant => ({
      id: participant.id, characterId: participant.characterId, name: participant.name.trim(), dex: participant.dex,
      playerId: participant.playerId, playerName: participant.playerName, camp: participant.camp, tokenId: participant.tokenId,
    })),
  };
  // Owlbear limits all room metadata (including other extensions) to 16 kB.
  if (new TextEncoder().encode(JSON.stringify({ ...metadata, [COMBAT_KEY]: next })).length >= 16_000) {
    throw Error("La salle manque d’espace pour ce combat. Réduisez le nombre de participants.");
  }
  await source.room.setMetadata({ [COMBAT_KEY]: next });
  return next;
  });
}

export function updateInitiative(source: CombatSource & { player: CombatSource["player"] & { getConnectionId(): Promise<string> } },
  combatId: string, action: InitiativeAction) {
  return enqueue(source, async () => {
    if (await source.player.getRole() !== "GM") throw Error("Seul le GM peut enregistrer les initiatives.");
    const [playerId, connectionId] = await Promise.all([source.player.getId(), source.player.getConnectionId()]);
    const metadata = await source.room.getMetadata(), current = readCombat(metadata);
    if (!current || current.id !== combatId) throw Error("Le combat a changé. Rechargez le panneau.");
    const changed = changeInitiative(current, action, { playerId, connectionId });
    if (changed === current) return current;
    const saved = { ...changed, revision: current.revision + 1 };
    if (new TextEncoder().encode(JSON.stringify({ ...metadata, [COMBAT_KEY]: saved })).length >= 16_000) {
      throw Error("La salle manque d’espace pour enregistrer cette initiative.");
    }
    await source.room.setMetadata({ [COMBAT_KEY]: saved });
    return saved;
  });
}

export async function cancelCombatPreparation(source: CombatSource, expected: Pick<CombatPreparation, "id" | "revision">) {
  return enqueue(source, async () => {
  if (await source.player.getRole() !== "GM") throw Error("Seul le GM peut annuler la préparation.");
  const current = readCombat(await source.room.getMetadata());
  if (!current || current.id !== expected.id || current.revision !== expected.revision) {
    throw Error("Le combat a été modifié ailleurs. Rechargez la préparation.");
  }
  await source.room.setMetadata({ [COMBAT_KEY]: null });
  });
}

export function updateTurn(source: CombatSource, expected: Pick<CombatPreparation, "id" | "revision">, action: TurnAction) {
  return enqueue(source, async () => {
    const [role, playerId, metadata] = await Promise.all([source.player.getRole(), source.player.getId(), source.room.getMetadata()]);
    const current = readCombat(metadata);
    if (!current || current.id !== expected.id || current.revision !== expected.revision) throw Error("Le tour a changé. Consultez le combat actualisé.");
    const changed = changeTurn(current, action, {playerId, isGM:role === "GM"});
    const saved = {...changed, revision: current.revision + 1};
    await source.room.setMetadata({[COMBAT_KEY]:saved});
    return saved;
  });
}
