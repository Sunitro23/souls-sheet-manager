export const COMBAT_KEY = "de.sunitro.cendres/combat";
export type CombatPlayer = { id: string; name: string };
export type CombatParticipant = {
  id: string; characterId: string | null; name: string; dex: number;
  playerId: string; playerName: string; camp?: string; tokenId?: string;
};
export type CombatPreparation = {
  version: 1; phase: "preparing" | "collecting" | "ready"; id: string; revision: number;
  campaignId: string; name?: string; createdBy: string; participants: CombatParticipant[];
  turn?: number;
  initiative?: {
    rolls: { participantId: string; d20: number; source: "dice" | "manual" }[];
    usedDice: { playerId: string; dieId: string }[];
    tieOrder: string[];
    collector: { playerId: string; connectionId: string } | null;
  };
};

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function text(value: unknown, max = 100): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}
export function validateParticipants(value: unknown): asserts value is CombatParticipant[] {
  if (!Array.isArray(value) || !value.length || value.length > 50) throw Error("Choisissez entre 1 et 50 participants.");
  const ids = new Set<string>(), characters = new Set<string>();
  for (const participant of value) {
    if (!object(participant) || !text(participant.id) || !text(participant.name) ||
        !text(participant.playerId) || !text(participant.playerName) ||
        typeof participant.dex !== "number" || !Number.isSafeInteger(participant.dex) || participant.dex < 1 ||
        !(participant.characterId === null || text(participant.characterId))) {
      throw Error("Chaque participant doit avoir un nom, une DEX entière positive et un joueur Owlbear.");
    }
    if ((participant.camp !== undefined && !text(participant.camp, 50)) || (participant.tokenId !== undefined && !text(participant.tokenId))) throw Error("Camp ou pion invalide.");
    if (ids.has(participant.id) || (participant.characterId && characters.has(participant.characterId))) {
      throw Error("Un personnage ne peut participer qu’une seule fois au combat.");
    }
    ids.add(participant.id);
    if (participant.characterId) characters.add(participant.characterId);
  }
}
export function readCombat(metadata: Record<string, unknown>): CombatPreparation | null {
  const value = metadata[COMBAT_KEY];
  if (value === undefined || value === null) return null;
  if (!object(value) || value.version !== 1 || !["preparing", "collecting", "ready"].includes(String(value.phase)) ||
      !text(value.id) || !text(value.campaignId) || !text(value.createdBy) || (value.name !== undefined && !text(value.name)) ||
      !Number.isSafeInteger(value.revision) || (value.revision as number) < 1) {
    throw Error("Le combat de cette salle utilise des données incompatibles. Rechargez l’extension.");
  }
  if (value.turn !== undefined && (!Number.isSafeInteger(value.turn) || (value.turn as number) < 0)) throw Error("Tour de combat incompatible.");
  validateParticipants(value.participants);
  if (value.phase !== "preparing") {
    const initiative = value.initiative;
    const ids = value.participants.map(participant => participant.id);
    if (!object(initiative) || !Array.isArray(initiative.rolls) || !Array.isArray(initiative.usedDice) ||
        initiative.usedDice.length > ids.length || !Array.isArray(initiative.tieOrder) ||
        initiative.tieOrder.length !== ids.length || new Set(initiative.tieOrder).size !== ids.length ||
        !initiative.tieOrder.every(id => ids.includes(id)) ||
        !initiative.rolls.every(roll => object(roll) && ids.includes(String(roll.participantId)) && validD20(roll.d20) && ["dice", "manual"].includes(String(roll.source))) ||
        new Set(initiative.rolls.map(roll => roll.participantId)).size !== initiative.rolls.length ||
        !initiative.usedDice.every(die => object(die) && text(die.playerId) && text(die.dieId)) ||
        !(initiative.collector === null || (object(initiative.collector) && text(initiative.collector.playerId) && text(initiative.collector.connectionId))) ||
        (value.phase === "ready" && (initiative.rolls.length !== ids.length || initiative.collector !== null))) {
      throw Error("Les initiatives enregistrées sont incompatibles. Rechargez l’extension.");
    }
  }
  return value as CombatPreparation;
}

function validD20(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 20;
}
export function initiativeTotal(participant: CombatParticipant, d20: number) {
  return d20 + Math.floor((participant.dex - 10) / 2);
}
export function initiativeOrder(combat: CombatPreparation) {
  const initiative = combat.initiative;
  if (!initiative) return [];
  return combat.participants.filter(participant => initiative.rolls.some(roll => roll.participantId === participant.id)).sort((a, b) => {
    const aRoll = initiative.rolls.find(roll => roll.participantId === a.id)!;
    const bRoll = initiative.rolls.find(roll => roll.participantId === b.id)!;
    return initiativeTotal(b, bRoll.d20) - initiativeTotal(a, aRoll.d20) || b.dex - a.dex ||
      initiative.tieOrder.indexOf(a.id) - initiative.tieOrder.indexOf(b.id);
  });
}

export type InitiativeAction =
  | { type: "open" }
  | { type: "manual"; participantId: string; d20: number }
  | { type: "capture"; playerId: string; dieId: string; value: number }
  | { type: "finish" };

export function changeInitiative(combat: CombatPreparation, action: InitiativeAction,
  actor: { playerId: string; connectionId: string }, random: () => number = Math.random): CombatPreparation {
  if (action.type === "open") {
    const tieOrder = combat.initiative?.tieOrder ?? combat.participants.map(participant => participant.id);
    if (!combat.initiative) {
      for (let index = tieOrder.length - 1; index > 0; index--) {
        const other = Math.floor(random() * (index + 1));
        [tieOrder[index], tieOrder[other]] = [tieOrder[other], tieOrder[index]];
      }
    }
    return { ...combat, phase: "collecting", initiative: { rolls: [], usedDice: [], ...combat.initiative, tieOrder, collector: actor } };
  }
  if (combat.phase !== "collecting" || !combat.initiative) {
    if (action.type === "capture") return combat;
    throw Error("Ouvrez la collecte des initiatives avant de continuer.");
  }
  const initiative = combat.initiative;
  if (action.type === "finish") {
    if (initiative.collector?.playerId !== actor.playerId || initiative.collector.connectionId !== actor.connectionId) throw Error("Reprenez l’écoute ici avant de valider les initiatives.");
    if (initiative.rolls.length !== combat.participants.length) throw Error("Il manque encore des initiatives.");
    return { ...combat, turn: combat.turn ?? 0, phase: "ready", initiative: { ...initiative, collector: null } };
  }
  let participantId: string, d20: number;
  if (action.type === "capture") {
    if (initiative.collector?.playerId !== actor.playerId || initiative.collector.connectionId !== actor.connectionId ||
        !validD20(action.value) || !text(action.dieId) ||
        initiative.usedDice.some(die => die.playerId === action.playerId && die.dieId === action.dieId)) return combat;
    const participant = participantsByPlayer(combat.participants.filter(item => item.playerId === action.playerId))
      .find(item => !initiative.rolls.some(roll => roll.participantId === item.id));
    if (!participant) return combat;
    participantId = participant.id; d20 = action.value;
  } else {
    if (initiative.collector?.playerId !== actor.playerId || initiative.collector.connectionId !== actor.connectionId) throw Error("Reprenez l’écoute ici avant de modifier les initiatives.");
    if (!validD20(action.d20)) throw Error("Saisissez le résultat brut du d20, entre 1 et 20.");
    if (!combat.participants.some(participant => participant.id === action.participantId)) throw Error("Participant introuvable.");
    participantId = action.participantId; d20 = action.d20;
  }
  return { ...combat, initiative: { ...initiative,
    rolls: [...initiative.rolls.filter(roll => roll.participantId !== participantId), { participantId, d20, source: action.type === "capture" ? "dice" : "manual" }],
    usedDice: action.type === "capture" ? [...initiative.usedDice, { playerId: action.playerId, dieId: action.dieId }] : initiative.usedDice,
  } };
}

export function participantsByPlayer(participants: CombatParticipant[]) {
  return [...participants].sort((a, b) =>
    (a.playerId === b.playerId ? 0 : a.playerName.localeCompare(b.playerName, "fr") || a.playerId.localeCompare(b.playerId)) ||
    a.name.localeCompare(b.name, "fr", { sensitivity: "base", numeric: true }) || a.id.localeCompare(b.id));
}

export type TurnAction = { type: "next" } | { type: "previous" } | { type: "select"; participantId: string };
export function changeTurn(combat: CombatPreparation, action: TurnAction, actor: {playerId: string; isGM: boolean}): CombatPreparation {
  if (combat.phase !== "ready") throw Error("Validez les initiatives avant de jouer.");
  const order = initiativeOrder(combat), turn = combat.turn ?? 0;
  if (!order.length) throw Error("Aucun participant.");
  if (!actor.isGM && (action.type !== "next" || order[turn % order.length].playerId !== actor.playerId)) {
    throw Error("Vous ne pouvez terminer que votre propre tour.");
  }
  let next = turn;
  if (action.type === "next") next++;
  else if (action.type === "previous") next = Math.max(0, turn - 1);
  else {
    const index = order.findIndex(participant => participant.id === action.participantId);
    if (index < 0) throw Error("Participant introuvable.");
    next = Math.floor(turn / order.length) * order.length + index;
  }
  return { ...combat, turn: next };
}
