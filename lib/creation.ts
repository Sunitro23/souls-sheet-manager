import {statNames} from './rules.ts';
// Adapted from Sunitro23/Dndwebsite: CharacterCreationModal and levelUp.utils.
// Keep Cendres' six attributes and the requested 2–28 creation range.
export const CREATION_POINTS=36;
export const POINT_COSTS:Record<number,number>={2:-6,3:-5,4:-4,5:-3,6:-2,7:-1,8:0,9:1,10:2,11:3,12:4,13:5,14:7,15:9,16:12,17:15,18:18,19:21,20:24,21:27,22:30,23:33,24:36,25:39,26:42,27:45,28:48};
export const statLabels:Record<string,string>={FOR:'Force',DEX:'Dextérité',CON:'Constitution',INT:'Intelligence',SAG:'Sagesse',CHA:'Charisme'};
export const initialStats=()=>Object.fromEntries(statNames.map(s=>[s,8]));
export const pointsSpent=(stats:Record<string,number>)=>statNames.reduce((total,s)=>total+(POINT_COSTS[stats[s]]??Infinity),0);
export function validateCreation(stats:unknown){
 if(!stats||typeof stats!=='object'||Array.isArray(stats))throw Error('Répartissez vos points de caractéristiques.');
 const s=stats as Record<string,number>;
 for(const name of statNames)if(!Number.isInteger(s[name])||!(s[name] in POINT_COSTS))throw Error(`${name} : valeur de création entre 2 et 28 requise.`);
 if(pointsSpent(s)!==CREATION_POINTS)throw Error('Répartissez exactement les 36 points de création.');
 return Object.fromEntries(statNames.map(name=>[name,s[name]]));
}
