import type {Node} from './progression.ts';
import {spellSchools} from './bonuses.ts';
export function magicNodes():Node[]{
 const base={family:'Magie' as const,kind:'bonus' as const,weapon:'',cost:1,level:1,className:'',race:'',stat:'FP',amount:2};
 return [...Array.from({length:3},(_,i)=>({...base,id:`magic:fp:${i}`,name:`Réserve de focus ${i+1}`,description:'+2 FP maximum.',requires:i?[`magic:fp:${i-1}`]:[]})),
 ...spellSchools.flatMap((school,si)=>Array.from({length:3},(_,i)=>({...base,id:`magic:school:${si}:${i}`,magicPath:school,name:`${school} ${i+1}`,stat:`Dégâts ${school}`,amount:1,description:`+1 dégât fixe aux ${school.toLowerCase()} par rang. Une seule spécialisation magique ; les autres familles de sorts restent utilisables.`,requires:i?[`magic:school:${si}:${i-1}`]:[]})))];
}
