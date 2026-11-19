import {isUploadedWeaponIcon} from './weapon-icons.ts';

export const spellIcons = [
  {id: 'spell', name: 'Sorts', image: 'items/spell'},
  {id: 'miracle', name: 'Miracles', image: 'spells/miracle'},
  {id: 'pyromancy', name: 'Pyromancies', image: 'spells/pyromancy'},
  {id: 'curse', name: 'Malédictions', image: 'spells/curse'},
  {id: 'melody', name: 'Mélodies', image: 'spells/melody'},
];

export function spellIconSource(school: string, icon?: string) {
  if (isUploadedWeaponIcon(icon)) return icon;
  const choice = spellIcons.find(choice => choice.id === icon)
    ?? spellIcons.find(choice => choice.name === school);
  return `/ui/dark-souls/${choice?.image ?? 'items/spells'}.png`;
}
