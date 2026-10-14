import {classNodes} from './classes.ts';
import {magicNodes} from './magic-progression.ts';
import {progressionBonusKeys} from './bonuses.ts';
import {racialCatalog,racialNames} from './races.ts';
import { weaponTypes, statNames } from './rules.ts';
import { predefinedTechniques, effectText } from './combat.ts';
export const families=['Lames','Armes longues','Armes d’impact','Armes de tir','Classe','Race','Personnel','Magie'] as const;
export const activeFamilies=families;
export type Family=typeof families[number];
export type Node = {id:string; racialPath?:string; classPath?:string; magicPath?:string; family?:Family; characterId?:string; tier?:'base'|'advanced'|'ultimate'|'expert'; draft?:boolean; name:string; description:string; kind:'technique'|'competence'|'stat'|'rp'|'bonus'; weapon:string; cost:number; level:number; requires:string[]; className:string; race:string; stat:string; amount:number};
export type Tree = {version?:number; races?:string[]; pointsPerLevel:number; nodes:Node[]; legacyNodes?:Node[]; weaponFamilies?:Record<string,Family>};
function legacyDefaultTree():Tree {
 const nodes:Node[]=[];
 for(const w of weaponTypes){
  const techniques=predefinedTechniques({category:w.name,damage:''});
  if(techniques.length) for(const t of techniques) nodes.push({id:`${w.name}:${t.catalogId}`,name:t.name,description:[t.description,effectText(t.effects),`END : ${t.end} · Portée : ${t.rangeMin}–${t.range} cases`].filter(Boolean).join('\n'),kind:'technique',weapon:w.name,cost:t.rank==='debutant'?0:t.rank==='initie'?1:2,level:t.rank==='expert'?3:1,requires:t.rank==='expert'?techniques.filter(x=>x.rank==='initie').map(x=>`${w.name}:${x.catalogId}`):[],className:'',race:'',stat:'',amount:0});
  else for(let i=0;i<3;i++) nodes.push({id:`${w.name}:palier-${i}`,name:['Fondamentaux','Technique initiée','Technique experte'][i],description:'Emplacement à définir par le GM.',kind:'technique',weapon:w.name,cost:i,level:i+1,requires:i?[`${w.name}:palier-${i-1}`]:[],className:'',race:'',stat:'',amount:0});
 }
 return {pointsPerLevel:2,nodes};
}
export const defaultWeaponFamilies:Record<string,Family>={
 Dagues:'Lames','Épées courtes':'Lames',Épées:'Lames',Greatswords:'Lames',Griffes:'Lames',
 Lances:'Armes longues',Hallebardes:'Armes longues',Faux:'Armes longues','Great Spears':'Armes longues',Fouets:'Armes longues',Bâtons:'Armes longues','Great Staves':'Armes longues',
 Haches:'Armes d’impact',Greataxes:'Armes d’impact',Marteaux:'Armes d’impact','Great Hammers':'Armes d’impact',Fléaux:'Armes d’impact','Colossal Weapons':'Armes d’impact',
 'Arcs courts':'Armes de tir',Arcs:'Armes de tir',Greatbows:'Armes de tir',Arbalètes:'Armes de tir',Ballistes:'Armes de tir'
};
export function defaultTree():Tree {
 const definitions=[
  {family:'Lames',id:'blades',base:['Swing','Estoc'],advanced:['Swipe','Cyclone','Jump Attack'],final:1},
  {family:'Armes longues',id:'long',base:['Swipe','Slam'],advanced:['Cyclone','Jump Attack','Super Cyclone'],final:2},
  {family:'Armes d’impact',id:'impact',base:['Swing','Slam'],advanced:['Swipe avec recul','Jump Attack','Earth Smasher'],final:2},
  {family:'Armes de tir',id:'ranged',base:['Tir simple','Tir chargé'],advanced:['Flèche perçante','Tir en rafale','Pluie de flèches'],final:2}
 ] as const;
 const nodes:Node[]=[];
 for(const f of definitions){
  const baseIds=f.base.map((_,i)=>`family:${f.id}:base:${i}`),advancedIds=f.advanced.map((_,i)=>`family:${f.id}:advanced:${i}`);
  const make=(id:string,name:string,tier:Node['tier'],requires:string[],cost:number):Node=>({id,name,family:f.family,tier,description:'',kind:'technique',weapon:'',cost,level:1,requires,className:'',race:'',characterId:'',stat:'',amount:0,draft:false});
  f.base.forEach((name,i)=>nodes.push(make(baseIds[i],name,'base',[],0)));
  f.advanced.forEach((name,i)=>nodes.push(make(advancedIds[i],name,i===f.final?'expert':'advanced',i===f.final?advancedIds.filter((_,j)=>j!==f.final):[...baseIds],i===f.final?2:1)));
  for(const n of nodes.filter(n=>n.family===f.family)){const category=({'Lames':'Épées','Armes longues':'Hallebardes','Armes d’impact':'Great Hammers','Armes de tir':'Arcs'} as Record<string,string>)[f.family];const technique=predefinedTechniques({category,damage:''}).find(t=>t.name===n.name);if(technique)n.description=[effectText(technique.effects),`END : ${technique.end}. Portée et zone selon le type d’arme.`,n.tier==='expert'?({'Lames':'Attaque circulaire couvrant toutes les directions autour du porteur.','Armes longues':'Attaque circulaire avec recul de 2 cases.','Armes d’impact':'Attaque de zone qui immobilise jusqu’à la fin du prochain tour de la cible.','Armes de tir':'Attaque de zone centrée sur une cible distante.'} as Record<string,string>)[f.family]:''].filter(Boolean).join('\n');}
 }
 return {version:9,races:[...racialNames],pointsPerLevel:2,nodes:[...nodes,...racialNodes(),...classNodes(),...magicNodes()],weaponFamilies:{...defaultWeaponFamilies}};
}
export function racialNodes():Node[]{
 return racialCatalog.flatMap(race=>{
  const base={family:'Race' as const,weapon:'',level:1,requires:[],className:'',race:race.name};
  return [
   ...race.stats.map(stat=>({...base,id:`race:v9:${race.id}:stat:${stat}`,name:`+1 ${stat}`,description:`+1 ${stat}.`,kind:'stat' as const,cost:1,stat,amount:1})),
   {...base,id:`race:v9:${race.id}:traits`,name:'Traits raciaux',description:`${race.trait}\n${race.weakness}`,kind:'rp' as const,cost:0,stat:'',amount:0}
  ];
 });
}
export function racialPathAllowed(n:Node,c:any){return !n.racialPath||!(c.unlocks??[]).some((u:Node)=>u.family==='Race'&&u.racialPath&&u.racialPath!==n.racialPath);}
export function normalizeTree(t:Tree):Tree {
 if(t.version===9)return t;
 const base=(t.version??0)>=5?t:normalizePreviousTree(t);
 const obsolete=base.nodes.filter(n=>/^class:(?:\d+:path:|combat:)|^race:\d+:path:/.test(n.id));
 const removed=new Set(obsolete.map(n=>n.id));
 // Keep old prerequisites when a custom node still depends on them.
 let changed=true;
 while(changed){changed=false;for(const n of base.nodes.filter(n=>!removed.has(n.id)))for(const id of n.requires)if(removed.delete(id))changed=true;}
 const nodes=base.nodes.filter(n=>!removed.has(n.id)),ids=new Set(nodes.map(n=>n.id));
 const additions=[...racialNodes(),...classNodes(),...((t.version??0)<5?magicNodes():t.version===5?magicNodes().filter(n=>n.magicPath==='Mélodies'):[])];
 const oldRaces=new Set(['Clan du Lion','Corviens','Demi-Humains','Dieux','Dragons','Démons','Enfant des Ténèbres','Gyrm','Géants','Hommes-champignons','Hommes-Serpents','Humains']);
 return {...base,version:9,races:[...new Set([...(base.races??[]).filter(r=>!oldRaces.has(r)),...racialNames])],nodes:[...nodes,...additions.filter(n=>!ids.has(n.id))],legacyNodes:[...(base.legacyNodes??[]),...obsolete.filter(n=>removed.has(n.id))]};
}
export function classPathAllowed(n:Node,c:any){return !n.classPath||!(c.unlocks??[]).some((u:Node)=>u.family==='Classe'&&u.classPath&&u.classPath!==n.classPath);}
export function magicPathAllowed(n:Node,c:any){return !n.magicPath||!(c.unlocks??[]).some((u:Node)=>u.magicPath&&u.magicPath!==n.magicPath);}
function normalizePreviousTree(t:Tree):Tree {
 if(t.version===4)return t;
 if(t.version===3)return {...t,races:t.races??[],weaponFamilies:t.weaponFamilies??{...defaultWeaponFamilies}};
 if(t.version===2){
  const defaults=defaultTree(),finals=defaults.nodes.filter(n=>n.tier==='expert');
  const replacements=new Map(finals.map(n=>[n.id.replace(/:advanced:\d+$/,':ultimate'),n.id]));
  const oldUltimates=t.nodes.filter(n=>replacements.has(n.id));
  const nodes=t.nodes.filter(n=>!replacements.has(n.id)).map(n=>{
   const d=defaults.nodes.find(x=>x.id===n.id);
   const updated=d?{...n,tier:d.tier,requires:d.requires.filter(id=>t.nodes.some(x=>x.id===id)),description:n.description?.trim()?n.description:d.description,draft:n.draft??false,cost:d.tier==='expert'&&n.cost===1?2:n.cost}:n;
   return {...updated,requires:[...new Set(updated.requires.map(id=>replacements.get(id)??id))].filter(id=>id!==n.id)};
  });
  return {...t,version:3,races:t.races??[],nodes,legacyNodes:[...(t.legacyNodes??[]),...oldUltimates],weaponFamilies:t.weaponFamilies??{...defaultWeaponFamilies}};
 }
 return {...defaultTree(),pointsPerLevel:t.pointsPerLevel,legacyNodes:[...(t.legacyNodes??[]),...t.nodes]};
}
const classAliases:Record<string,string>={Guerrier:'Warrior',Roublard:'Rogue',Magicien:'Mage',Barde:'Bard',Artificier:'Craftsman'};
const raceAliases:Record<string,string>={'Géants':'Giant',Dieux:'Godlike','Démons':'Demon',Humains:'Human','Demi-Humains':'Demi-Human'};
export function matchesCharacter(n:Node,c:any){return (!n.className||(classAliases[n.className]??n.className)===(classAliases[c.className]??c.className))&&(!n.race||(raceAliases[n.race]??n.race)===(raceAliases[c.race]??c.race))&&(!n.characterId||n.characterId===c.id);}
export function nodesForFamily(tree:Tree,family:string,c:any){return tree.nodes.filter(n=>n.family===family&&matchesCharacter(n,c));}
export function validateTree(t:Tree){
 if(!t||!Number.isInteger(t.pointsPerLevel)||t.pointsPerLevel<0||t.pointsPerLevel>100||!Array.isArray(t.nodes)||t.nodes.length>500)throw Error('Arbre invalide.');
 if(t.races!==undefined&&(!Array.isArray(t.races)||t.races.length>100||t.races.some(r=>typeof r!=='string'||!r.trim()||r.length>100)||new Set(t.races).size!==t.races.length))throw Error('Liste de races invalide.');
 const ids=new Set(t.nodes.map(n=>n.id));if(ids.size!==t.nodes.length)throw Error('Identifiants de nœuds dupliqués.');
 for(const n of t.nodes){if(!n.id||typeof n.name!=='string'||!n.name.trim()||n.name.length>100||typeof n.description!=='string'||n.description.length>3000||!['technique','competence','stat','rp','bonus'].includes(n.kind)||!Number.isInteger(n.cost)||n.cost<0||n.cost>100||!Number.isInteger(n.level)||n.level<1||n.level>1000||!Array.isArray(n.requires)||n.requires.some(r=>!ids.has(r)||r===n.id)||typeof n.weapon!=='string'||typeof n.className!=='string'||typeof n.race!=='string')throw Error('Nœud invalide.');
 if((t.version??0)>=2){if(!families.includes(n.family as Family))throw Error('Famille invalide.');if(n.family==='Classe'&&!n.className.trim())throw Error('Choisissez une classe.');if(n.family==='Race'&&!n.race.trim())throw Error('Choisissez une race.');if(n.family==='Personnel'&&!n.characterId)throw Error('Choisissez le personnage de cet arbre personnel.');if(n.draft!==undefined&&typeof n.draft!=='boolean')throw Error('État du déblocage invalide.');for(const id of n.requires){const p=t.nodes.find(x=>x.id===id)!;if(p.family!==n.family||p.className!==n.className||p.race!==n.race||(p.characterId??'')!==(n.characterId??''))throw Error('Un prérequis doit appartenir au même arbre.');}}
 if(n.racialPath!==undefined&&(n.family!=='Race'||typeof n.racialPath!=='string'||!n.racialPath.trim()||n.racialPath.length>100))throw Error('Voie raciale invalide.');
 if(n.kind==='bonus'&&(!progressionBonusKeys.includes(n.stat)||!Number.isInteger(n.amount)||n.amount<1||n.amount>100))throw Error('Bonus invalide.');
 for(const key of ['classPath','magicPath'] as const)if(n[key]!==undefined&&(typeof n[key]!=='string'||!n[key]?.trim()||n[key]!.length>100||(key==='classPath'?n.family!=='Classe':n.family!=='Magie')))throw Error('Voie invalide.');
 if(n.kind==='stat'&&(!statNames.includes(n.stat as any)||!Number.isInteger(n.amount)||n.amount<1||n.amount>10))throw Error('Bonus de caractéristique invalide.');}
 if(t.weaponFamilies&&Object.entries(t.weaponFamilies).some(([key,v])=>!weaponTypes.some(w=>w.name===key)||!families.slice(0,4).includes(v)))throw Error('Attribution de famille invalide.');
 const done=new Set<string>(),active=new Set<string>();function visit(id:string){if(active.has(id))throw Error('Les prérequis forment une boucle.');if(done.has(id))return;active.add(id);t.nodes.find(n=>n.id===id)!.requires.forEach(visit);active.delete(id);done.add(id);}t.nodes.forEach(n=>visit(n.id));return t;
}
export function knownNodeIds(c:any,tree:Tree):Set<string>{
 const known=new Set<string>((c?.unlocks??[]).map((u:any)=>u.id));
 if(!c)return known;
 let changed=true;
 while(changed){changed=false;for(const n of tree.nodes){
  if(known.has(n.id)||n.cost!==0||['stat','bonus'].includes(n.kind)||n.draft||c.level<n.level||!matchesCharacter(n,c)||!racialPathAllowed(n,c)||!classPathAllowed(n,c)||!magicPathAllowed(n,c)||n.requires.some(id=>!known.has(id)))continue;
  known.add(n.id);changed=true;
 }}
 return known;
}
export function remaining(c:any,tree:Tree){return Math.max(0,(c.level-1)*tree.pointsPerLevel)-(c.unlocks??[]).reduce((s:number,u:any)=>s+u.cost,0);}
export function unlock(c:any,tree:Tree,id:string){const n=tree.nodes.find(n=>n.id===id);if(!n)throw Error('Déblocage introuvable.');if(n.draft)throw Error('Cette technique doit être définie par le GM.');if(!racialPathAllowed(n,c))throw Error('Une autre voie raciale est déjà choisie.');if(!classPathAllowed(n,c))throw Error('Une autre voie de classe est déjà choisie.');if(!magicPathAllowed(n,c))throw Error('Une autre spécialisation magique est déjà choisie.');if(!matchesCharacter(n,c))throw Error('Ce déblocage ne correspond pas à votre personnage.');const known=knownNodeIds(c,tree);if(known.has(id))throw Error('Déjà débloqué.');if(c.level<n.level||n.requires.some(id=>!known.has(id)))throw Error('Prérequis non remplis.');if(remaining(c,tree)<n.cost)throw Error('Points insuffisants.');if(n.kind==='stat'&&c.stats[n.stat]+n.amount>28)throw Error('Caractéristique maximale atteinte.');return {...c,stats:n.kind==='stat'?{...c.stats,[n.stat]:c.stats[n.stat]+n.amount}:c.stats,unlocks:[...(c.unlocks??[]),{...n}]};}
export function migrateProgress(c:any){
 c={...c,className:classAliases[c.className]??c.className,race:raceAliases[c.race]??c.race};
 if(Array.isArray(c.unlocks))return c;
 const tree=legacyDefaultTree(),unlocks:Node[]=[];
 for(const w of weaponTypes)for(const t of predefinedTechniques({category:w.name,damage:''}))if((c.weaponTraining??[]).includes(`${t.weaponTypeId}:${t.catalogId}`)){const n=tree.nodes.find(x=>x.id===`${w.name}:${t.catalogId}`);if(n)unlocks.push({...n});}
 for(const skill of c.personalSkills??[])if((c.personalTraining??[]).includes(skill.id))unlocks.push({id:`legacy:${skill.id}`,name:skill.name,description:skill.description,kind:'rp',weapon:'',cost:1,level:1,requires:[],className:'',race:'',stat:'',amount:0});
 return {...c,className:c.className??'',race:c.race??'',unlocks};
}
