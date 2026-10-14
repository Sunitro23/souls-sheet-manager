import type { Point, Technique } from "./types";

export function projectPattern(origin: Point, pattern: Technique["pattern"], rotation = 0): Point[] {
  if (!Number.isFinite(rotation)) throw new Error("Rotation du token invalide.");
  // Y descend dans la scène : les rotations positives sont horaires.
  const turns = Math.round(((rotation % 360) + 360) % 360 / 90) % 4;
  return pattern.map(([dx, dy]) => {
    const [x, y] = turns === 1 ? [-dy, dx] : turns === 2 ? [-dx, -dy] : turns === 3 ? [dy, -dx] : [dx, dy];
    return { x: origin.x + x, y: origin.y + y };
  });
}

export function cellFromCenter(center: Point, dpi: number): Point {
  if (!Number.isFinite(dpi) || dpi <= 0) throw new Error("Taille de grille invalide.");
  return { x: Math.floor(center.x / dpi), y: Math.floor(center.y / dpi) };
}
