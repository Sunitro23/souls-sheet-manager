import {matchesCharacter,racialPathAllowed,classPathAllowed,magicPathAllowed,type Node} from './progression.ts';
export type SkillCharacter={mode?:"custom";id?:string;className?:string;race?:string;level:number;stats?:Record<string,number>;unlocks?:Node[]};
export function skillState(node:Node,character:SkillCharacter,known:Set<string>,points:number){
 const acquired=known.has(node.id),reasons:string[]=[];
 if(node.draft)reasons.push('Ce déblocage doit être défini par le MJ.');
 if(node.archived)reasons.push('Cette compétence est archivée.');
 if(character.mode!=='custom'){
 if(!matchesCharacter(node,character))reasons.push('Ce déblocage ne correspond pas à ce personnage.');
 if(!racialPathAllowed(node,character))reasons.push('Une autre voie raciale est déjà choisie.');
 if(!classPathAllowed(node,character))reasons.push('Une autre voie de classe est déjà choisie.');
 if(!magicPathAllowed(node,character))reasons.push('Une autre spécialisation magique est déjà choisie.');
 if(character.level<node.level)reasons.push(`Niveau ${node.level} requis.`);
 if(node.requires.some(id=>!known.has(id)))reasons.push('Des prérequis restent à débloquer.');
 if(points<node.cost)reasons.push(`${node.cost-points} point${node.cost-points>1?'s':''} supplémentaire${node.cost-points>1?'s':''} nécessaire${node.cost-points>1?'s':''}.`);
 if(node.kind==='stat'&&character.stats&&character.stats[node.stat]+node.amount>28)reasons.push(`Le bonus dépasserait le maximum de 28 en ${node.stat}.`);
 }
 return {acquired,available:!acquired&&!reasons.length,reasons:acquired?[]:reasons,label:acquired?'Acquise':reasons.length?'Verrouillée':'Disponible'};
}
