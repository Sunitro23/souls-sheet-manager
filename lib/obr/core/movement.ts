import { sameCell, validPoint, type BoardToken } from './actions.ts';
import type { Point } from './types.ts';

export const MOVEMENT_CHANNEL = 'de.sunitro.cendres/movement';

// Sample the direct line once per grid step; diagonals cost one case.
export function movementPath(from: Point, to: Point, limit: number): Point[] {
  if (![from, to].every(p => validPoint(p) && Number.isInteger(p.x) && Number.isInteger(p.y))) throw Error('Case invalide.');
  const distance = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
  if (distance > limit) throw Error('Destination hors de portée.');
  return Array.from({ length: distance }, (_, index) => {
    const step = index + 1;
    return { x: Math.round(from.x + (to.x - from.x) * step / distance), y: Math.round(from.y + (to.y - from.y) * step / distance) };
  });
}

export function planMovement(board: BoardToken[], tokenId: string, target: Point, move: number, sprint: number) {
  if (!Array.isArray(board) || !board.length || board.length > 1000 ||
      board.some(t => !t || typeof t.tokenId !== 'string' || !validPoint(t.cell) || !Number.isInteger(t.cell.x) || !Number.isInteger(t.cell.y) || !validPoint(t.position)) ||
      new Set(board.map(t => t.tokenId)).size !== board.length) throw Error('Pions invalides.');
  const token = board.find(t => t.tokenId === tokenId);
  if (!token) throw Error('Le pion manque sur la carte.');
  const path = movementPath(token.cell, target, sprint);
  if (path.some(cell => board.some(other => other.tokenId !== tokenId && sameCell(other.cell, cell)))) throw Error('Un pion bloque le trajet.');
  return { path, end: path.length === 0 ? 0 : path.length <= move ? 1 : 2, token };
}

export function cardinalRotation(from: Point, to: Point): 0 | 90 | 180 | 270 {
  const dx = to.x - from.x, dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) return dx > 0 ? 90 : 270;
  return dy > 0 ? 180 : 0;
}

export function facingTargets(origin: Point, radius: number) {
  return ([
    { x: 0, y: -1, rotation: 0, arrow: '↑' },
    { x: 1, y: 0, rotation: 90, arrow: '→' },
    { x: 0, y: 1, rotation: 180, arrow: '↓' },
    { x: -1, y: 0, rotation: 270, arrow: '←' },
  ] as const).map(direction => ({ ...direction, x: origin.x + direction.x * (radius + 1), y: origin.y + direction.y * (radius + 1) }));
}
