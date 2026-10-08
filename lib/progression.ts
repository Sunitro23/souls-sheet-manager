import { weaponTypes, statNames } from './rules.ts';
import { predefinedTechniques, effectText } from './combat.ts';
export type Node = {id:string; name:string; description:string; kind:'technique'|'competence'|'stat'|'rp'; weapon:string; cost:number; level:number; requires:string[]; className:string; race:string; stat:string; amount:number};
export type Tree = {pointsPerLevel:number; nodes:Node[]};
export function defaultTree():Tree {
 const nodes:Node[]=[];
 for(const w of weaponTypes){
  const techniques=predefinedTechniques({category:w.name,damage:''});
  if(techniques.length) for(const t of techniques) nodes.push({id:`${w.name}:${t.catalogId}`,name:t.name,description:[t.description,effectText(t.effects),`END : ${t.end} · Portée : ${t.rangeMin}–${t.range} cases`].filter(Boolean).join('\n'),kind:'technique',weapon:w.name,cost:t.rank==='debutant'?0:t.rank==='initie'?1:2,level:t.rank==='expert'?3:1,requires:t.rank==='expert'?techniques.filter(x=>x.rank==='initie').map(x=>`${w.name}:${x.catalogId}`):[],className:'',race:'',stat:'',amount:0});
  else for(let i=0;i<3;i++) nodes.push({id:`${w.name}:palier-${i}`,name:['Fondamentaux','Technique initiée','Technique experte'][i],description:'Emplacement à définir par le GM.',kind:'technique',weapon:w.name,cost:i,level:i+1,requires:i?[`${w.name}:palier-${i-1}`]:[],className:'',race:'',stat:'',amount:0});
 }
 return {pointsPerLevel:2,nodes};
}
export function validateTree(t:Tree){
 if(!t||!Number.isInteger(t.pointsPerLevel)||t.pointsPerLevel<0||t.pointsPerLevel>100||!Array.isArray(t.nodes)||t.nodes.length>500)throw Error('Arbre invalide.');
 const ids=new Set(t.nodes.map(n=>n.id));if(ids.size!==t.nodes.length)throw Error('Identifiants de nœuds dupliqués.');
 for(const n of t.nodes){if(!n.id||typeof n.name!=='string'||!n.name.trim()||n.name.length>100||typeof n.description!=='string'||n.description.length>3000||!['technique','competence','stat','rp'].includes(n.kind)||!Number.isInteger(n.cost)||n.cost<0||n.cost>100||!Number.isInteger(n.level)||n.level<1||n.level>1000||!Array.isArray(n.requires)||n.requires.some(r=>!ids.has(r)||r===n.id)||typeof n.weapon!=='string'||typeof n.className!=='string'||typeof n.race!=='string')throw Error('Nœud invalide.');
 if(n.kind==='stat'&&(!statNames.includes(n.stat as any)||!Number.isInteger(n.amount)||n.amount<1||n.amount>10))throw Error('Bonus de caractéristique invalide.');}
 const done=new Set<string>(),active=new Set<string>();function visit(id:string){if(active.has(id))throw Error('Les prérequis forment une boucle.');if(done.has(id))return;active.add(id);t.nodes.find(n=>n.id===id)!.requires.forEach(visit);active.delete(id);done.add(id);}t.nodes.forEach(n=>visit(n.id));return t;
}
export function remaining(c:any,tree:Tree){return Math.max(0,(c.level-1)*tree.pointsPerLevel)-(c.unlocks??[]).reduce((s:number,u:any)=>s+u.cost,0);}
export function unlock(c:any,tree:Tree,id:string){const n=tree.nodes.find(n=>n.id===id);if(!n)throw Error('Déblocage introuvable.');const known=new Set((c.unlocks??[]).map((u:any)=>u.id));if(known.has(id))throw Error('Déjà débloqué.');if(c.level<n.level||n.requires.some(id=>!known.has(id))||(n.className&&n.className!==c.className)||(n.race&&n.race!==c.race))throw Error('Prérequis non remplis.');if(remaining(c,tree)<n.cost)throw Error('Points insuffisants.');if(n.kind==='stat'&&c.stats[n.stat]+n.amount>28)throw Error('Caractéristique maximale atteinte.');return {...c,stats:n.kind==='stat'?{...c.stats,[n.stat]:c.stats[n.stat]+n.amount}:c.stats,unlocks:[...(c.unlocks??[]),{...n}]};}
export function migrateProgress(c:any){
 if(Array.isArray(c.unlocks))return c;
 const tree=defaultTree(),unlocks:Node[]=[];
 for(const w of weaponTypes)for(const t of predefinedTechniques({category:w.name,damage:''}))if((c.weaponTraining??[]).includes(`${t.weaponTypeId}:${t.catalogId}`)){const n=tree.nodes.find(x=>x.id===`${w.name}:${t.catalogId}`);if(n)unlocks.push({...n});}
 for(const skill of c.personalSkills??[])if((c.personalTraining??[]).includes(skill.id))unlocks.push({id:`legacy:${skill.id}`,name:skill.name,description:skill.description,kind:'rp',weapon:'',cost:1,level:1,requires:[],className:'',race:'',stat:'',amount:0});
 return {...c,className:c.className??'',race:c.race??'',unlocks};
}
