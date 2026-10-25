import { planMovement } from './obr/core/movement';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { combatSessions, characters, accounts } from '../db/schema';
import type { getDb } from '../db';
import { derive, normalizeStored, type Character } from './rules';
import { owlbearTechniques } from './owlbear';
import type { Tree } from './progression';
import { COMBAT_KEY, readCombat, changeTurn, type TurnAction } from './obr/core/combat';
import { projectPattern } from './obr/core/projection';
import { spellPosition } from './obr/core/spells';
import { activeParticipant, publicCombat, validDodge, validPoint, sameCell, resolveAttack,
  type CombatRuntime, type BoardToken, type ActionChoice } from './obr/core/actions';

type DB = ReturnType<typeof getDb>;
const fail = (message: string, status = 400) => Object.assign(Error(message), { status });
export async function combatSession(db: DB, input: Record<string, unknown>, context: {
  campaignId: string; gm: boolean; userId: string; playerId: string | null; tree: Tree;
}) {
  const { campaignId, gm, userId, playerId, tree } = context;
  const id = String(input.combatId ?? '');
  if (!id || id.length > 100) throw fail('Combat invalide.');
  let [row] = await db.select().from(combatSessions).where(and(eq(combatSessions.id, id), eq(combatSessions.campaignId, campaignId)));
  if (!row && input.command === 'init') {
    if (!gm) throw fail('Le MJ doit démarrer le combat.', 403);
    const combat = readCombat({ [COMBAT_KEY]: input.combat });
    if (!combat || combat.id !== id || combat.campaignId !== campaignId || combat.phase !== 'ready' ||
        combat.participants.some(p => !p.characterId || !p.tokenId || !p.camp) ||
        new Set(combat.participants.map(p => p.tokenId)).size !== combat.participants.length) throw fail('Choisissez un camp et un pion unique pour chaque participant.');
    const rows = await db.select().from(characters).where(and(eq(characters.campaignId, campaignId), isNull(characters.deletedAt)));
    if (combat.participants.some(p => !rows.some(c => c.id === p.characterId))) throw fail('Personnage absent de cette campagne.');
    const initial: CombatRuntime = { combat, revision: 0, dodges: {}, pending: null, resolution: null, receipts: [] };
    await db.insert(combatSessions).values({ id, campaignId, data: JSON.stringify(initial), revision: 0 }).onConflictDoNothing();
    [row] = await db.select().from(combatSessions).where(and(eq(combatSessions.id, id), eq(combatSessions.campaignId, campaignId)));
  }
  if (!row) return { combatState: null };
  const state: CombatRuntime = JSON.parse(row.data);
  // Token links can predate the player's Owlbear connection or a reassignment.
  const owners = await db.select({ characterId: characters.id, playerId: accounts.owlbearId, playerName: accounts.username })
    .from(characters).innerJoin(accounts, eq(accounts.id, characters.playerId)).where(eq(characters.campaignId, campaignId));
  for (const participant of state.combat.participants) {
    const owner = owners.find(owner => owner.characterId === participant.characterId);
    if (owner?.playerId) { participant.playerId = owner.playerId; participant.playerName = owner.playerName; }
  }
  if (input.command === 'get') return { combatState: publicCombat(state, playerId ?? undefined, gm) };
  if (input.command === 'close') {
    if (!gm) throw fail('Accès MJ requis.', 403);
    if (state.pending || state.resolution) throw fail('Terminez la résolution avant de fermer le combat.');
    const deleted = await db.delete(combatSessions).where(and(eq(combatSessions.id, id), eq(combatSessions.revision, row.revision))).returning({id:combatSessions.id});
    if(!deleted.length) throw fail('Le combat a changé. Réessayez.',409);
    return { combatState: null };
  }
  const requestId = input.requestId;
  if (typeof requestId !== 'string' || !requestId || requestId.length > 100) throw fail('Identifiant de confirmation invalide.');
  if (state.receipts.includes(requestId) || input.command === 'init' && state.receipts.includes('started')) return { combatState: publicCombat(state, playerId ?? undefined, gm) };
  if (input.command !== 'init' && input.revision !== row.revision) throw fail('Le combat a changé. Réessayez avec son état actuel.', 409);
  const active = activeParticipant(state.combat);
  if (!active) throw fail('Aucun tour actif.');
  const participant = state.combat.participants.find(p => p.id === input.participantId);
  const canControl = (p: typeof active) => gm || !!playerId && p.playerId === playerId;
  let resource: { row: typeof characters.$inferSelect; character: Character } | null = null;
  async function loadCharacter(characterId: string | null, own = true) {
    const [characterRow] = await db.select().from(characters).where(and(eq(characters.id, characterId ?? ''), eq(characters.campaignId, campaignId), isNull(characters.deletedAt)));
    if (!characterRow || own && !gm && characterRow.playerId !== userId) throw fail('Personnage inaccessible.', 403);
    resource = { row: characterRow, character: normalizeStored(JSON.parse(characterRow.data)) };
    return resource.character;
  }
  if (input.command === 'init' || input.command === 'turn') {
    if (state.pending || state.resolution) throw fail('Une attaque attend sa résolution.');
    if (input.command === 'init') { if (!gm) throw fail('Accès MJ requis.', 403); state.receipts.push('started'); }
    else {
      const action = input.action as TurnAction;
      if (!['next', 'previous', 'select'].includes(action?.type)) throw fail('Changement de tour invalide.');
      state.combat = changeTurn(state.combat, action, { playerId: playerId ?? '', isGM: gm });
      if (state.combat.turn === JSON.parse(row.data).combat.turn) return { combatState: publicCombat(state, playerId ?? undefined, gm) };
    }
    const next = activeParticipant(state.combat)!;
    const character = await loadCharacter(next.characterId, false);
    character.end = derive(character).end;
    state.dodges[next.id] = 0;
    state.combat.revision++;
  } else if (input.command === 'action') {
    if (!state.receipts.includes('started')) throw fail('Le MJ doit démarrer le combat.');
    if (!participant || participant.id !== active.id || !canControl(participant)) throw fail('Ce n’est pas votre tour.', 403);
    if (state.pending || state.resolution) throw fail('Une attaque attend sa résolution.');
    const character = await loadCharacter(participant.characterId);
    if (input.characterRevision !== character.revision) throw fail('La fiche a changé. Vérifiez les coûts puis confirmez à nouveau.',409);
    const choice = input.choice as ActionChoice;
    const available = owlbearTechniques(character, tree);
    const technique = choice?.kind === 'weapon' ? available.weapons.find(w => w.id === choice.weaponId)?.techniques[choice.index] :
      choice?.kind === 'spell' ? available.spells.find(s => s.id === choice.spellId) : undefined;
    const item = choice?.kind === 'item' ? character.inventory.find(i => i.id === choice.itemId && !i.archived && i.status === 'approved' && ['consumable', 'other'].includes(i.type)) : undefined;
    if (!technique && !item && choice?.kind !== 'dodge' && choice?.kind !== 'movement' && choice?.kind !== 'turn') throw fail('Action indisponible.');
    let movement: ReturnType<typeof planMovement> | undefined;
    if (choice.kind === 'movement') {
      const { move, sprint } = derive(character);
      movement = planMovement(input.board as BoardToken[], participant.tokenId!, input.target as import('./obr/core/types').Point, move, sprint);
      if (!movement.path.length) throw fail('Choisissez une autre case.');
      if (typeof input.dpi !== 'number' || !Number.isFinite(input.dpi) || input.dpi <= 0 || input.dpi > 10000) throw fail('Grille invalide.');
      if (state.combat.participants.some(p => !(input.board as BoardToken[]).some(t => t.tokenId === p.tokenId))) throw fail('Les pions du combat doivent être présents sur la carte.');
      const { token, path } = movement;
      const positions = [token.position, ...path.map(cell => ({ x: token.position.x + (cell.x - token.cell.x) * (input.dpi as number), y: token.position.y + (cell.y - token.cell.y) * (input.dpi as number) }))];
      state.resolution = { id: requestId, actorId: participant.id, name: 'Mouvement', cells: [], dpi: input.dpi, moves: [], movement: { tokenId: token.tokenId, positions } };
    }
    if (choice.kind === 'turn') {
      if (![0, 90, 180, 270].includes(choice.rotation)) throw fail('Choisissez une des quatre directions.');
      state.resolution = { id: requestId, actorId: participant.id, name: 'Se tourner', cells: [], dpi: 1, moves: [], facing: { tokenId: participant.tokenId!, rotation: choice.rotation } };
    }
    const end = movement?.end ?? technique?.end ?? 1, mana = technique?.mana ?? 0;
    const expected = input.expectedCost as {end?:unknown;mana?:unknown;name?:unknown} | undefined;
    const name = choice.kind === 'turn' ? 'Se tourner' : movement ? 'Mouvement' : technique?.name ?? item?.name ?? 'Préparer une esquive';
    if (!expected || expected.end !== end || expected.mana !== mana || expected.name !== name) throw fail('Les coûts ou l’action ont changé. Confirmez à nouveau.',409);
    if (![end, mana].every(cost => Number.isFinite(cost) && cost >= 0)) throw fail('Coût invalide.');
    if (character.end < end || character.mana < mana) throw fail('Ressources insuffisantes.');
    character.end -= end; character.mana -= mana;
    if (item?.type === 'consumable') item.archived = true;
    if (choice.kind === 'dodge') state.dodges[participant.id] = (state.dodges[participant.id] ?? 0) + 1;
    if (technique) {
      const board = input.board as BoardToken[];
      if (!Array.isArray(board) || !board.length || board.length > 1000 || board.some(t => !t || typeof t.tokenId !== 'string' || !validPoint(t.cell) || !Number.isInteger(t.cell.x) || !Number.isInteger(t.cell.y) || !validPoint(t.position)) || new Set(board.map(t => t.tokenId)).size !== board.length ||
          state.combat.participants.some(p => !board.some(t => t.tokenId === p.tokenId))) throw fail('Les pions du combat doivent être présents sur la carte.');
      const origin = board.find(t => t.tokenId === participant.tokenId)!.cell;
      if (typeof input.rotation !== 'number' || !Number.isFinite(input.rotation) || typeof input.dpi !== 'number' || !Number.isFinite(input.dpi) || input.dpi <= 0 || input.dpi > 10000) throw fail('Grille invalide.');
      let position = origin;
      if (choice.kind === 'spell') {
        if (!validPoint(input.target) || !Number.isInteger(input.target.x) || !Number.isInteger(input.target.y)) throw fail('Cible invalide.');
        position = spellPosition(available.spells.find(s => s.id === choice.spellId)!, origin, input.target);
      }
      const cells = projectPattern(position, technique.pattern as [number, number][], input.rotation);
      const offensive = choice.kind !== 'spell' || !!character.spells.find(spell => spell.id === choice.spellId)?.damage.trim();
      state.pending = { id: requestId, actorId: participant.id, name: technique.name, cells, dpi: input.dpi, board,
        defenders: state.combat.participants.filter(p => p.id !== participant.id && p.camp !== participant.camp && offensive && board.some(t => t.tokenId === p.tokenId && cells.some(cell => sameCell(cell, t.cell)))).map(p => p.id), answers: {} };
      const unprepared = state.pending.defenders.filter(id => !(state.dodges[id] > 0));
      for (const id of unprepared) state.pending.answers[id] = null;
      if (unprepared.length) state.unpreparedHit = { id: requestId, defenders: unprepared };
      resolveAttack(state);
    }
  } else if (input.command === 'answer') {
    const attack = state.pending;
    if (!attack || attack.id !== input.attackId || !participant || !attack.defenders.includes(participant.id) || participant.id in attack.answers) throw fail('Cette réaction n’est plus disponible.');
    if (!playerId || participant.playerId !== playerId) throw fail('Vous ne contrôlez pas ce personnage.', 403);
    if (input.destination !== null) {
      const destination = input.destination, from = attack.board.find(t => t.tokenId === participant.tokenId);
      if (!validPoint(destination) || !from || !validDodge(from.cell, destination)) throw fail('Choisissez une case à exactement 2 cases dans une des 8 directions.');
      planMovement(attack.board, participant.tokenId!, destination, 2, 2);
      if (!(state.dodges[participant.id] > 0)) throw fail('Aucune esquive préparée.');
      state.dodges[participant.id]--;
    }
    state.pending!.answers[participant.id] = input.destination as import("./obr/core/types").Point | null;
    resolveAttack(state);
  } else if (input.command === 'ack') {
    if (!state.resolution || state.resolution.id !== input.attackId) throw fail('Résolution expirée.');
    const attacker = state.combat.participants.find(p => p.id === state.resolution!.actorId)!;
    if (!canControl(attacker)) throw fail('Accès refusé.', 403);
    if (state.resolution.hitParticipants) state.lastAttack = {id:state.resolution.id,name:state.resolution.name,hitParticipants:state.resolution.hitParticipants};
    state.resolution = null;
  } else throw fail('Commande de combat inconnue.');
  state.revision = row.revision + 1;
  state.receipts = ['started', ...state.receipts.filter(id=>id!=='started'), requestId].slice(-2000);
  if(!state.receipts.includes('started')) state.receipts.unshift('started');
  const guard = and(eq(combatSessions.id, id), eq(combatSessions.revision, row.revision));
  // D1 batches are transactional. The second update only succeeds if this exact
  // resource write succeeded, so neither retries nor stale character saves debit twice.
  const payment = resource as { row: typeof characters.$inferSelect; character: Character } | null;
  if (payment) {
    const marker = crypto.randomUUID();
    const updatedCharacter = { ...payment.character, revision: payment.row.revision + 1, combatReceipt: marker };
    const results = await db.batch([
      db.update(characters).set({ data: JSON.stringify(updatedCharacter), revision: updatedCharacter.revision }).where(and(eq(characters.id, payment.row.id), eq(characters.revision, payment.row.revision), sql`exists (select 1 from ${combatSessions} where ${guard})`)).returning({ id: characters.id }),
      db.update(combatSessions).set({ data: JSON.stringify(state), revision: state.revision }).where(and(guard, sql`exists (select 1 from ${characters} where ${characters.id} = ${payment.row.id} and json_extract(${characters.data}, '$.combatReceipt') = ${marker})`)).returning({ id: combatSessions.id }),
    ]);
    if (!results[1].length) throw fail('Modification simultanée. Rechargez puis réessayez.', 409);
  } else {
    const result = await db.update(combatSessions).set({ data: JSON.stringify(state), revision: state.revision }).where(guard).returning({ id: combatSessions.id });
    if (!result.length) throw fail('Réponse simultanée. Réessayez.', 409);
  }
  return { combatState: publicCombat(state, playerId ?? undefined, gm) };
}
