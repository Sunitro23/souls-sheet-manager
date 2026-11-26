import type { Point } from './types.ts';

export type Footprint = { width?: number; height?: number };
type Placed = Footprint & { cell: Point };

export function validSize({ width = 1, height = 1 }: Footprint) {
  return [width, height].every(n => Number.isInteger(n) && n >= 1 && n <= 128);
}

export function overlaps(a: Placed, b: Placed) {
  return a.cell.x < b.cell.x + (b.width ?? 1) && b.cell.x < a.cell.x + (a.width ?? 1)
    && a.cell.y < b.cell.y + (b.height ?? 1) && b.cell.y < a.cell.y + (a.height ?? 1);
}

export function frontCells(cell: Point, size: Footprint, rotation: number): Point[] {
  const { width = 1, height = 1 } = size;
  const side = ((Math.round(rotation / 90) % 4) + 4) % 4;
  const vertical = side % 2 === 1;
  return Array.from({ length: vertical ? height : width }, (_, i) => ({
    x: cell.x + (vertical ? (side === 1 ? width - 1 : 0) : i),
    y: cell.y + (vertical ? i : (side === 2 ? height - 1 : 0)),
  }));
}
