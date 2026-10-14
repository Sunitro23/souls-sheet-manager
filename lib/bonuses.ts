export const bonusKeys=['HP','END','FP','FOR','DEX','CON','INT','SAG','CHA'] as const;
export type BonusKey=typeof bonusKeys[number];
export const spellSchools=['Miracles','Sorts','Pyromancies','Malédictions','Mélodies'] as const;
export const progressionBonusKeys=['HP','END','FP',...spellSchools.map(s=>`Dégâts ${s}`)];
export function equipmentBonuses(c:any):Record<BonusKey,number>{
 const result=Object.fromEntries(bonusKeys.map(k=>[k,0])) as Record<BonusKey,number>;
 for(const item of c.inventory??[])if(item.equipped&&item.status==='approved')for(const key of bonusKeys)result[key]+=item.bonuses?.[key]??0;
 return result;
}
export function learnedBonus(c:any,key:string){return (c.unlocks??[]).filter((n:any)=>n.kind==='bonus'&&n.stat===key).reduce((sum:number,n:any)=>sum+n.amount,0);}
export function spellSchool(item:any){return spellSchools.includes(item.school)?item.school:'Sorts';}
export function spellDamage(item:any,c:any){
 const bonus=learnedBonus(c,`Dégâts ${spellSchool(item)}`),match=/^(\d+d\d+)([+-]\d+)?$/.exec(item.damage||'');
 if(!match)return item.damage||'—';
 const extra=Number(match[2]||0)+bonus;return match[1]+(extra>0?`+${extra}`:extra<0?String(extra):'');
}
export function bonusText(bonuses:Partial<Record<BonusKey,number>>={}){return bonusKeys.filter(k=>bonuses[k]).map(k=>`+${bonuses[k]} ${k}`).join(' · ');}
export const catalystTypes=[{name:'Baguette',weight:1},{name:'Sceau',weight:1},{name:'Bâton de catalyse',weight:2},{name:'Flûte',weight:1},{name:'Luth',weight:2},{name:'Lyre',weight:2},{name:'Tambour',weight:3}];
