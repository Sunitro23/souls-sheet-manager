import { movementPath } from './movement.ts';
import { initiativeOrder, type CombatPreparation } from './combat.ts';
import type { Point } from './types.ts';

export type ActionChoice = { kind: 'dodge' } | { kind: 'movement' } | { kind: 'turn'; rotation: 0 | 90 | 180 | 270 } | { kind: 'weapon'; weaponId: string; index: number } | { kind: 'spell'; spellId: string } | { kind: 'item'; itemId: string };
export type BoardToken = { tokenId: string; cell: Point; position: Point };
export type Attack = {
  id: string; actorId: string; name: string; cells: Point[]; dpi: number;
  board: BoardToken[]; defenders: string[]; answers: Record<string, Point | null>;
};
export type Resolution = { id: string; actorId: string; name: string; cells: Point[]; dpi: number; hitParticipants?: string[]; moves: { tokenId: string; position: Point; positions?: Point[] }[]; facing?: { tokenId: string; rotation: number }; movement?: { tokenId: string; positions: Point[] } };
export type CombatRuntime = {
  combat: CombatPreparation; revision: number; dodges: Record<string, number>;
  lastAttack?: { id: string; name: string; hitParticipants: string[] };
  unpreparedHit?: { id: string; defenders: string[] };
  pending: Attack | null; resolution: Resolution | null; receipts: string[];
};
export type CombatView = Omit<CombatRuntime, 'pending' | 'receipts'> & {
  attackPreview?: { id: string; name: string; cells: Point[]; dpi: number };
  pending: { id: string; actorId: string; defenders: string[]; answered: string[] } | null;
};
export function publicCombat(state: CombatRuntime, playerId?: string, gm = false): CombatView {
  const { pending } = state;
  return { lastAttack:state.lastAttack, ...(pending && (gm || !!playerId && state.combat.participants.find(p=>p.id===pending.actorId)?.playerId===playerId) ? {attackPreview:{id:pending.id,name:pending.name,cells:pending.cells,dpi:pending.dpi}} : {}), unpreparedHit:state.unpreparedHit, combat:state.combat, revision:state.revision, dodges:state.dodges, resolution:state.resolution, pending: pending ? { id: pending.id, actorId: pending.actorId, defenders: pending.defenders, answered: Object.keys(pending.answers) } : null };
}
export function activeParticipant(combat: CombatPreparation) {
  const order = initiativeOrder(combat);
  return combat.phase === 'ready' ? order[(combat.turn ?? 0) % order.length] : undefined;
}
export function validPoint(value: unknown): value is Point {
  const p = value as Point | null;
  return !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) < 1e8 && Math.abs(p.y) < 1e8;
}
export function sameCell(a: Point, b: Point) { return a.x === b.x && a.y === b.y; }
export function validDodge(from: Point, to: Point) {
  const x = Math.abs(to.x - from.x), y = Math.abs(to.y - from.y);
  return (x === 0 || x === 2) && (y === 0 || y === 2) && Math.max(x, y) === 2;
}
export function resolveAttack(state: CombatRuntime) {
  const attack = state.pending;
  if (!attack || attack.defenders.some(id => !(id in attack.answers))) return;
  const board = attack.board.map(token => ({ ...token }));
  const moves: Resolution['moves'] = [];
  for (const participant of initiativeOrder(state.combat)) {
    const destination = attack.answers[participant.id];
    if (!destination) continue;
    const token = board.find(token => token.tokenId === participant.tokenId);
    // A reserved destination wins by initiative. An occupied destination fails.
    if (!token) continue;
    const path = movementPath(token.cell, destination, 2);
    if (path.some(cell => board.some(other => other.tokenId !== token.tokenId && sameCell(other.cell, cell)))) continue;
    const positions = [token.position, ...path.map(cell => ({x:token.position.x+(cell.x-token.cell.x)*attack.dpi,y:token.position.y+(cell.y-token.cell.y)*attack.dpi}))];
    const position = { x: token.position.x + (destination.x - token.cell.x) * attack.dpi,
      y: token.position.y + (destination.y - token.cell.y) * attack.dpi };
    token.cell = destination; token.position = position;
    moves.push({ tokenId: token.tokenId, position, positions });
  }
  const hitParticipants = attack.defenders.filter(id => {
    const participant = state.combat.participants.find(p=>p.id===id);
    const token = board.find(t=>t.tokenId===participant?.tokenId);
    return token && attack.cells.some(cell=>sameCell(cell,token.cell));
  });
  state.resolution = { hitParticipants, id: attack.id, actorId: attack.actorId, name: attack.name, cells: attack.cells, dpi: attack.dpi, moves };
  state.pending = null;
}
