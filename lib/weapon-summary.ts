import {itemWeight,type Entry} from './rules.ts';
import {predefinedTechniques,effectText} from './combat.ts';
import {matchesCharacter,knownNodeIds,type Tree} from './progression.ts';
export function weaponSummary(item:Entry,character:any,tree:Tree){
 const family=tree.weaponFamilies?.[item.category];
 const catalogue=predefinedTechniques(item);
 const known=knownNodeIds(character,tree);
 const nodes=tree.nodes.filter(n=>(n.kind==='technique'||n.kind==='competence')&&matchesCharacter(n,character)&&(n.weapon?n.weapon===item.category:!!family&&n.family===family));
 const techniques=nodes.map(n=>{
  const source=catalogue.find(t=>t.name===n.name);
  return {id:n.id,name:n.name,learned:known.has(n.id),description:[source?effectText(source.effects):'',n.description].filter((text,i,all)=>text&&!all.some((other,j)=>j!==i&&other.length>text.length&&other.includes(text))).filter((text,i,all)=>all.indexOf(text)===i).join('\n'),end:source?.end,mana:source?.mana,range:source?`${source.rangeMin}–${source.range}`:undefined,pattern:source?.pattern,origin:source?.origin,friendlyFire:source?.friendlyFire,damage:item.damage};
 });
 for(const [i,t] of [...item.techniques,...(item.special?[item.special]:[])].entries()){
  if(techniques.some(n=>n.name===t.name)||catalogue.some(n=>n.name===t.name))continue;
  techniques.push({id:`item:${i}`,name:t.name,learned:true,description:t.description,end:t.end,mana:t.mana,range:String(t.range),pattern:t.pattern,origin:t.origin,friendlyFire:t.friendlyFire,damage:t.damage||item.damage});
 }
 return {family,weight:itemWeight(item),techniques};
}
