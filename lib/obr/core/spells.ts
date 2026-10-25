import type { Point, Spell } from './types.ts';

export const CAST_CHANNEL = 'de.sunitro.cendres/cast';
export const SPELL_ZONE_KEY = 'de.sunitro.cendres/spell-zone';

export function spellPosition(spell: Spell, caster: Point, target: Point): Point {
  if (spell.origin === 'self') return caster;
  if (![target.x, target.y, caster.x, caster.y, spell.range].every(Number.isFinite) ||
      Math.max(Math.abs(target.x - caster.x), Math.abs(target.y - caster.y)) > spell.range) {
    throw Error('Position hors de portée du sort.');
  }
  return target;
}

export function canDeleteSpellZone(metadata: unknown, playerId: string, role: string): boolean {
  return !!metadata && typeof metadata === 'object' && 'casterId' in metadata &&
    (role === 'GM' || metadata.casterId === playerId);
}
