import { planMovement } from '../core/movement';
import OBR from '@owlbear-rodeo/sdk';
import { workspaceCall, characterForOwlbear } from '../../workspace-client';
import { readCombat, COMBAT_KEY, type CombatPreparation } from '../core/combat';
import { activeParticipant, type ActionChoice, type CombatView, type BoardToken } from '../core/actions';
import type { Point } from '../core/types';
import { tokenOrigin } from './token';

export async function combatCall(combat: CombatPreparation, command: string, data: Record<string, unknown> = {}) {
  const result = await workspaceCall({ op: 'combat', campaignId: combat.campaignId, combatId: combat.id, command, ...data });
  return result.combatState as CombatView | null;
}
export async function currentCombat() {
  const combat = readCombat(await OBR.room.getMetadata());
  return combat;
}
export async function mutateCombat(state: CombatView, command: string, data: Record<string, unknown> = {}) {
  const requestId = crypto.randomUUID();
  let current = state;
  for (let attempt = 0; ; attempt++) {
    try {
      const result = await combatCall(current.combat, command, { revision: current.revision, requestId, ...data });
      // Polling also refreshes clients if the optional notification is lost.
      await OBR.broadcast.sendMessage('de.sunitro.cendres/combat-refresh', {}, { destination: 'ALL' }).catch(() => {});
      return result;
    } catch (error) {
      const status = (error as Error & {status?:number}).status;
      if (attempt >= 2 || status && !(status === 409 && (command === 'answer' || command === 'ack')) && !(status === 400 && command === 'ack')) throw error;
      if (status) {
        const refreshed = await combatCall(state.combat,'get');
        if (!refreshed) throw error;
        if (command === 'ack' && refreshed.resolution?.id !== data.attackId) return refreshed;
        current = refreshed;
      }
      // A lost response is retried with the same receipt and revision.
    }
  }
}
export async function startCombat(combat: CombatPreparation) {
  return combatCall(combat, 'init', { combat, requestId: crypto.randomUUID() });
}
export async function advanceTurn(state: CombatView, action: unknown) {
  const next = await mutateCombat(state, 'turn', { action });
  if (next) await OBR.room.setMetadata({ [COMBAT_KEY]: next.combat });
  return next;
}
export async function boardSnapshot(): Promise<{ board: BoardToken[]; dpi: number }> {
  const items = await OBR.scene.items.getItems(item => item.type === 'IMAGE' && item.layer === 'CHARACTER');
  const board = await Promise.all(items.map(async item => ({ tokenId: item.id, cell: (await tokenOrigin(item.id)).origin, position: item.position })));
  return { board, dpi: await OBR.scene.grid.getDpi() };
}
export async function performCombatAction(characterId: string, tokenId: string, choice: ActionChoice,
  placement?: { target: Point; rotation: number }) {
  const combat = await currentCombat();
  if (!combat) return false;
  const state = await combatCall(combat, 'get');
  if (!state) throw Error('Le MJ doit démarrer le combat.');
  const participant = activeParticipant(state.combat);
  if (participant?.characterId !== characterId || participant.tokenId !== tokenId) throw Error('Ce personnage ou ce pion n’a pas le tour actif.');
  if (state.pending || state.resolution) throw Error('Attendez la résolution de l’attaque.');
  const data = await characterForOwlbear(characterId);
  const action = choice.kind === 'weapon' ? data.weapons.find(w => w.id === choice.weaponId)?.techniques[choice.index] :
    choice.kind === 'spell' ? data.spells.find(s => s.id === choice.spellId) : null;
  const name = choice.kind === 'turn' ? 'Se tourner' : choice.kind === 'movement' ? 'Mouvement' : choice.kind === 'dodge' ? 'Préparer une esquive' : choice.kind === 'item' ? data.items.find(item=>item.id===choice.itemId)?.name : action?.name;
  if (!name) throw Error('Action indisponible.');
  const snapshot = action || choice.kind === 'movement' ? await boardSnapshot() : undefined;
  if (choice.kind === 'movement' && !placement) throw Error('Choisissez une destination.');
  const movement = choice.kind === 'movement' ? planMovement(snapshot!.board, tokenId, placement!.target, data.movement.move, data.movement.sprint) : undefined;
  if (movement?.end === 0) return false;
  const rotation = placement?.rotation ?? (action ? (await tokenOrigin(tokenId)).rotation : 0);
  const result = await mutateCombat(state, 'action', { participantId: participant.id, choice, characterRevision: data.revision, expectedCost: {end:movement?.end??action?.end??1,mana:action?.mana??0,name}, ...snapshot, ...placement, rotation });
  const {showAttackPreview} = await import('./preview');
  await showAttackPreview(result);
  return true;
}
