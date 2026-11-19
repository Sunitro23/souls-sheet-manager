import {armors,derive,itemWeight,type Character,type Entry} from './rules.ts';
import {bonusText} from './bonuses.ts';

export const inventoryFilters = [
 {id:'all',label:'Tous',types:[]},
 {id:'weapon',label:'Armes',types:['weapon','catalyst']},
 {id:'armor',label:'Armures',types:['armor','shield']},
 {id:'talisman',label:'Talismans',types:['talisman']},
 {id:'consumable',label:'Consommables',types:['consumable']},
 {id:'other',label:'Autres',types:['other']},
];
const searchable = (value:string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').trim();
export const matchesCollectionSearch = (value:string,query:string) => searchable(value).includes(searchable(query));
export function bagItems(inventory:Entry[],query='',filter='all',slotType?:string) {
 const types=slotType ? slotType==='weapon'?['weapon','catalyst']:[slotType] : inventoryFilters.find(f=>f.id===filter)?.types??[];
 return inventory.filter(item=>!item.archived&&!item.equipped&&(!types.length||types.includes(item.type))&&matchesCollectionSearch(item.name,query));
}
export function itemSummary(item:Entry) {
 if(['weapon','shield'].includes(item.type)&&item.damage)return `${item.damage} dégâts`;
 if(item.type==='armor')return `Armure ${armors[item.armor]?.name.toLocaleLowerCase('fr')??'—'}`;
 return bonusText(item.bonuses)||item.effects||`${itemWeight(item)} pds`;
}
// These hints anticipate the existing server validation; saving remains authoritative.
export function equipUnavailableReason(character:Character,item:Entry) {
 if(item.archived)return 'Cet objet est archivé.';
 if(item.equipped)return '';
 const equipped=character.inventory.filter(i=>i.equipped&&i.id!==item.id);
 if(item.type==='armor'&&equipped.some(i=>i.type==='armor'))return 'Retirez l’armure portée pour équiper celle-ci.';
 if(['weapon','catalyst'].includes(item.type)&&equipped.filter(i=>['weapon','catalyst'].includes(i.type)).length>=2)return 'Retirez une arme ou un catalyseur pour libérer un emplacement.';
 if(item.type==='talisman'&&equipped.filter(i=>i.type==='talisman').length>=2)return 'Retirez un talisman pour libérer un emplacement.';
 const projected=derive({...character,inventory:character.inventory.map(i=>i.id===item.id?{...i,equipped:true}:i)});
 if(projected.weight>projected.capacity+2)return 'Charge maximale dépassée : retirez un équipement.';
 return '';
}
