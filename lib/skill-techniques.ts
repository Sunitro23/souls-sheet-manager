import {predefinedTechniques} from './combat.ts';
import type {Node,Tree} from './progression.ts';
import type {Entry} from './rules.ts';
export function skillTechniques(node:Node,inventory:Entry[],tree:Tree){
 if(!['technique','competence'].includes(node.kind))return [];
 const matching=inventory.filter(i=>i.type==='weapon'&&(node.weapon?i.category===node.weapon:tree.weaponFamilies?.[i.category]===node.family)).sort((a,b)=>Number(b.equipped)-Number(a.equipped));
 const categories=[...new Set([...matching.map(i=>i.category),...(node.weapon?[node.weapon]:Object.entries(tree.weaponFamilies??{}).filter(([,family])=>family===node.family).map(([category])=>category))])];
 return categories.flatMap(category=>{const technique=predefinedTechniques({category,damage:''}).find(t=>t.name===node.name);return technique?.pattern?.length?[{category,...technique}]:[]});
}
