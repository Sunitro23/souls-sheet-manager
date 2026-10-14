export const characterTabs=['Fiche Perso','Inventaire','Grimoire','Amélioration','Notes'];
export type SavedNavigation={campaignId:string;characterId:string;tab:string;branch:string;gmPanel:boolean};
export function readNavigation(storage:Pick<Storage,'getItem'>,userId:string):SavedNavigation|null{
 try{const x=JSON.parse(storage.getItem(`cendres-navigation:${userId}`)||'null');if(!x||typeof x.campaignId!=='string')return null;return {campaignId:x.campaignId,characterId:typeof x.characterId==='string'?x.characterId:'',tab:characterTabs.includes(x.tab)?x.tab:'Fiche Perso',branch:typeof x.branch==='string'?x.branch:'Lames',gmPanel:x.gmPanel===true};}catch{return null;}
}
export function writeNavigation(storage:Pick<Storage,'setItem'>,userId:string,value:SavedNavigation){try{storage.setItem(`cendres-navigation:${userId}`,JSON.stringify(value))}catch{}}
