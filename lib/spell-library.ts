import {derive,type Character,type Entry} from './rules.ts';
import {spellDamage,spellSchool,spellSchools} from './bonuses.ts';
import {categoryFor,type CampaignSettings} from './campaign-settings.ts';
import {matchesCollectionSearch} from './inventory.ts';

export function spellFamily(spell:Entry,settings?:CampaignSettings|null) {
 const category=categoryFor(settings,spell);
 return {id:category?.id??spellSchool(spell),label:category?.name??spellSchool(spell)};
}
export function spellFilters(spells:Entry[],settings?:CampaignSettings|null) {
 const families=new Map<string,string>();
 if(settings)for(const category of [...settings.categories].sort((a,b)=>a.order-b.order)){
  if(category.kind==='magic'&&category.available&&!category.archived)families.set(category.id,category.name);
 }else for(const school of spellSchools)families.set(school,school);
 // Retain filters for existing spells whose campaign family is no longer offered.
 for(const spell of spells.filter(s=>!s.archived)){
  const family=spellFamily(spell,settings);families.set(family.id,family.label);
 }
 return [{id:'all',label:'Tous'},...Array.from(families,([id,label])=>({id,label}))];
}
export function librarySpells(spells:Entry[],query='',filter='all',settings?:CampaignSettings|null) {
 return spells.filter(spell=>!spell.archived&&!spell.memorized&&(filter==='all'||spellFamily(spell,settings).id===filter)&&matchesCollectionSearch(spell.name,query));
}
export function spellSummary(spell:Entry,character:Character) {
 return [spell.damage?.trim()?`${spellDamage(spell,character)} dégâts`:'',Number.isFinite(spell.mana)?`${spell.mana} FP`:'',Number.isFinite(spell.end)?`${spell.end} END`:'',!spell.damage?.trim()?spell.effects?.trim()||spell.description?.trim():''].filter(Boolean).join(' · ');
}
// Anticipate the existing validation, including replacement of an edited spell.
export function memorizeUnavailableReason(character:Character,spell:Entry) {
 if(spell.archived)return 'Ce sort est archivé.';
 if(!spell.known)return 'Ce sort doit être connu avant d’être mémorisé.';
 const others=character.spells.filter(s=>s.id!==spell.id);
 if(spell.rank===0&&others.some(s=>s.memorized&&s.rank===0))return 'Un seul sort inné peut être mémorisé.';
 const projected=derive({...character,spells:[...others,{...spell,memorized:true}]});
 if(projected.used>projected.memory)return 'Mémoire insuffisante : retirez un sort mémorisé.';
 return '';
}
