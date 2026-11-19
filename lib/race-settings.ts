import type { CampaignSettings, Category } from './campaign-settings.ts';
import { matchesCharacter, type Node, type Tree } from './progression.ts';

export function syncRaceSettings(tree: Tree, settings: CampaignSettings): Tree {
 const races=settings.categories.filter(category=>category.kind==='race');
 const belongsTo=(node:Node,race:Category)=>node.family==='Race'&&matchesCharacter(node,{race:race.baseKey,className:node.className,id:node.characterId});
 const nodes=tree.nodes.map(node=>{
  if(races.some(race=>race.archived&&belongsTo(node,race)))
   return node.archived?node:{...node,archived:true,archivedByRace:true};
  if(node.archivedByRace&&races.some(race=>belongsTo(node,race))){
   const restored={...node,archived:false};
   delete restored.archivedByRace;
   return restored;
  }
  return node;
 });
 for(const race of races){
  if(nodes.some(node=>belongsTo(node,race)))continue;
  const description=[race.traits,race.weaknesses].filter(Boolean).join('\n');
  const descriptions=description.length<=3000
   ? [{key:'traits',name:'Traits raciaux',description}]
   : [{key:'traits',name:'Traits raciaux',description:race.traits},{key:'weaknesses',name:'Faiblesses raciales',description:race.weaknesses}];
  for(const entry of descriptions)nodes.push({
   id:`race:category:${race.id}:${entry.key}`,family:'Race',race:race.baseKey,
   name:entry.name,description:entry.description,kind:'rp',cost:0,level:1,
   weapon:'',className:'',requires:[],stat:'',amount:0,
   ...(race.archived?{archived:true,archivedByRace:true}:{})
  });
 }
 return {...tree,races:[...new Set([...(tree.races??[]),...races.map(race=>race.baseKey)])],nodes};
}
