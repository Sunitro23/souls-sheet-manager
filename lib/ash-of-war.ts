import type {Character, Entry, Technique} from './rules.ts';

export type AshOfWar = Technique & { damageType: string };

// Names supplied by the campaign; costs, effects and compatibility are set by its MJ.
export const ashOfWarNames = [
  'Ambres', 'En garde', 'Quickstep', 'Brise-garde', 'Entaille tournoyante',
  'Stamp Uppercut', 'En dure', 'Lion Claws', 'Charge', 'Dégainer',
  'Enchaînement de taille', 'Empalement', 'Cri de guerre', 'Tir lointain',
  'Tir perçant', 'Pluie de flèches', 'Barrage', 'Lancer d’arme', 'Cendre personnalisée',
] as const;

export function newAshOfWar(name: string): AshOfWar {
  return {name, mana: 0, end: 0, damage: '', damageType: '', range: 1,
    pattern: [], origin: 'self', friendlyFire: false, description: ''};
}

export function useAshOfWar<T extends Pick<Character, 'inventory' | 'mana'>>(character: T, itemId: string): T {
  const item = character.inventory.find(i => i.id === itemId);
  if (!item || !['weapon', 'shield'].includes(item.type) || !item.ashOfWar)
    throw Error('Aucune Ash of War sur cet équipement.');
  if (!item.equipped || item.status !== 'approved')
    throw Error('L’équipement doit être équipé et validé par le MJ.');
  const cost = item.ashOfWar.mana;
  if (!Number.isInteger(cost) || cost < 1 || cost > 100)
    throw Error('Le coût FP de l’Ash of War doit être défini (1–100).');
  if (character.mana < cost) throw Error('FP insuffisants.');
  return {...character, mana: character.mana - cost};
}

export function itemAshOfWar(item: Entry) {
  return ['weapon', 'shield'].includes(item.type) ? item.ashOfWar ?? null : null;
}
