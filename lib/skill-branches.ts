import {families,matchesCharacter,type Node,type Tree} from './progression.ts';
import {spellSchool} from './bonuses.ts';
import type {Entry} from './rules.ts';
import type {SkillCharacter} from './skill-state.ts';

export const skillCategories={base:'Fondamentaux',advanced:'Techniques',expert:'Maîtrises',ultimate:'Maîtrises'};
export const rankLabel=(rank:number)=>['I','II','III','IV','V','VI','VII','VIII','IX','X'][rank-1]??String(rank);

export function characterSkillNodes(tree:Tree,character:SkillCharacter&{inventory:Entry[];spells?:Entry[]}){
 const weapons=character.inventory.filter(item=>item.type==='weapon'&&!item.archived);
 const categories=new Set(weapons.map(item=>item.category));
 const ownedFamilies=new Set(weapons.map(item=>tree.categoryFamilies?.[item.categoryId??`weapon:${item.category}`]??tree.weaponFamilies?.[item.category]));
 const magicSchools=new Set<string>((character.spells??[]).filter(spell=>spell.type==='spell'&&spell.known&&!spell.archived).map(spellSchool));
 for(const node of character.unlocks??[])if(node.magicPath)magicSchools.add(node.magicPath);
 return tree.nodes.filter(node=>{
  if(node.archived||node.draft||!matchesCharacter(node,character))return false;
  if(node.magicPath&&!magicSchools.has(node.magicPath))return false;
  if(node.weapon)return categories.has(node.weapon);
  return !families.slice(0,4).some(family=>family===node.family)||!!node.family&&ownedFamilies.has(node.family);
 });
}

// Categories describe nodes; only actual paths (or their family) define columns.
export function skillBranches(nodes:Node[],label:string){
 const groups=new Map<string,{id:string;name:string;type:string;nodes:Node[]}>();
 for(const node of nodes){
  const path=node.magicPath||node.classPath||node.racialPath;
  const name=path||(node.family==='Magie'?'Réserve de focus':node.className||node.race||node.weapon||(node.family==='Personnel'?'Voie personnelle':node.family||label));
  const type=node.family==='Classe'?'Voie de classe':node.family==='Race'?'Voie raciale':node.family==='Personnel'?'Voie personnelle':node.family==='Magie'?(path?'Spécialisation magique':'Réserve commune'):'Voie d’armes';
  const id=JSON.stringify([node.family,node.className,node.race,node.characterId,name]);
  if(!groups.has(id))groups.set(id,{id,name,type,nodes:[]});
  groups.get(id)!.nodes.push(node);
 }
 return [...groups.values()].map(group=>{
  const pending=[...group.nodes].sort((a,b)=>(a.order??0)-(b.order??0)||a.level-b.level||a.cost-b.cost);
  const ordered:Node[]=[],ranks=new Map<string,number>();
  while(pending.length){
   const index=pending.findIndex(node=>!node.requires.some(id=>pending.some(parent=>parent.id===id)));
   const [node]=pending.splice(index<0?0:index,1);
   ranks.set(node.id,1+Math.max(0,...node.requires.map(id=>ranks.get(id)??0)));
   ordered.push(node);
  }
  return {...group,nodes:ordered,ranks,linked:ordered.some(node=>node.requires.some(id=>ranks.has(id)))};
 });
}
