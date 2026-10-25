'use client';
import {useCampaignSettings} from './campaign-theme';
import {categoryFor} from '../lib/campaign-settings';
import {itemAshOfWar} from '../lib/ash-of-war';
import Zone from './technique-zone';
import ItemDetails from './item-details';
import GrimoireLoadout from './grimoire-loadout';
import {bonusText,spellDamage,spellSchool} from '../lib/bonuses';
import EquipmentLoadout from './equipment-loadout';
import {useState,useId} from 'react';
import {Plus,Pencil,Clock,ChevronRight} from 'lucide-react';
import {entry,itemWeight,armors,ranks,type Character,type Entry} from '../lib/rules';
import {weaponSummary} from '../lib/weapon-summary';
import type {Tree} from '../lib/progression';
const statusLabels={approved:'Validé',pending:'À valider',rejected:'Refusé'};
export default function InventoryPanel({mode,character,derived,tree,onEdit,onInspect,detailItem,onEquip,selectedItemId}:{mode:'Inventaire'|'Grimoire';character:Character;derived:{weight:number;capacity:number};tree:Tree;onEdit:(item:Entry)=>void;onInspect?:(item:Entry)=>void;detailItem?:Entry;onEquip?:(item:Entry)=>void;selectedItemId?:string}){
 const settings=useCampaignSettings();
 const [expanded,setExpanded]=useState<Set<string>>(()=>new Set(detailItem?[detailItem.id]:[]));
 const prefix=useId();
 function toggle(id:string){setExpanded(previous=>{const next=new Set(previous);if(next.has(id))next.delete(id);else next.add(id);return next;});}
 if(detailItem)return <ItemDetails item={detailItem} character={character} tree={tree}/>;
 const spells=mode==='Grimoire',items:Entry[]=spells?character.spells.filter((i:Entry)=>!i.archived&&!i.memorized):character.inventory.filter((i:Entry)=>!i.archived&&!i.equipped);
 return <section className={`c-card c-pad c-inventory-panel ${spells?'c-spells-panel':''}`} aria-label={mode}>
 {!detailItem&&<div className="c-title compact"><div><h2>{mode}</h2>{!spells&&<p>Charge équipée : {derived.weight} / {derived.capacity}</p>}</div><button className="c-button" aria-label={spells?'Ajouter un sort':'Ajouter un objet'} onClick={()=>onEdit(entry('',spells?'spell':'weapon'))}><Plus size={16}/>{spells?'Ajouter un sort':'Ajouter'}</button></div>}
 {spells&&!detailItem&&<GrimoireLoadout character={character} derived={derived} onInspect={onInspect} onEquip={onEquip}/>}
 {!spells&&!detailItem&&onInspect&&<EquipmentLoadout character={character} onInspect={onInspect} selectedId={selectedItemId}/>}
 {!spells&&!detailItem&&<h3 className="c-bag-heading">Sac <span>{items.length} objets</span></h3>}
 {(spells?['spell']:['weapon','catalyst','armor','shield','talisman','consumable','other']).filter(type=>items.some(i=>i.type===type)).map(type=><div key={type} className="c-item-group"><h3>{({spell:'Bibliothèque',catalyst:'Catalyseurs et instruments',weapon:'Armes',armor:'Armures',shield:'Boucliers',talisman:'Talismans',consumable:'Consommables',other:'Autres objets'} as Record<string,string>)[type]}</h3>
 {items.filter(i=>i.type===type).map(i=>{const weapon=i.type==='weapon'?weaponSummary(i,character,tree):null;
 const techniques=weapon?.techniques.filter(t=>t.learned)??[];
 const facts=[categoryFor(settings,i)?.name||i.category||(i.type==='armor'?armors[i.armor]?.name:i.type==='spell'?ranks[i.rank]:''),weapon?.family,['weapon','shield','spell'].includes(i.type)?`${spells?spellDamage(i,character):i.damage||'—'} dégâts`:'',i.type==='spell'?`${categoryFor(settings,i)?.name??spellSchool(i)} · ${i.mana} FP · ${i.end} END`:`${itemWeight(i)} pds`,bonusText(i.bonuses)].filter((v,index,all)=>v&&all.indexOf(v)===index).join(' · ');
 const ash=itemAshOfWar(i);
 const hasDetails=!!i.description||techniques.length>0||!!ash;
 return <article className={`c-equipment-card ${!detailItem?'is-compact ':''}${i.status!=='approved'?'is-unvalidated ':''}${i.equipped?'is-equipped':''}`} key={i.id}>
 {!detailItem&&<div className="c-equipment-row"><button type="button" className="c-equipment-summary" aria-expanded={!onInspect&&hasDetails?expanded.has(i.id):undefined} aria-controls={!onInspect&&hasDetails?`${prefix}-${i.id}-details`:undefined} onClick={()=>{if(onInspect)onInspect(i);else if(hasDetails)toggle(i.id)}}><ChevronRight size={14} style={hasDetails?undefined:{visibility:'hidden'}} className={expanded.has(i.id)?'is-open':''}/><span className="c-equipment-name" title={i.name||'Sans nom'}>{i.name||'Sans nom'}</span>{i.status!=='approved'&&<Clock size={14} aria-label={statusLabels[i.status]}><title>{statusLabels[i.status]}</title></Clock>}<span className="c-equipment-value">{facts}</span></button>{onEquip&&<button type="button" className="c-row-equip" disabled={i.status!=='approved'} title={i.status==='approved'?'Équiper':statusLabels[i.status]} aria-label={`Équiper ${i.name}`} onClick={()=>onEquip(i)}>Équiper</button>}<button type="button" className="c-icon" aria-label={`Modifier ${i.name}`} onClick={()=>onEdit(structuredClone(i))}><Pencil size={14}/></button></div>}
 {detailItem&&<p className="c-equipment-meta">{i.status!=='approved'&&<Clock size={14} aria-label={statusLabels[i.status]}/>} {facts}</p>}
 <div className="c-equipment-details" id={`${prefix}-${i.id}-details`} hidden={!detailItem&&!expanded.has(i.id)}>
 {i.description&&<p className="c-item-description">{i.description}</p>}
 {techniques.length>0&&<div className="c-weapon-techniques" hidden={!expanded.has(i.id)} id={`${prefix}-${i.id}-techniques`}><div className="c-technique-grid">{techniques.map(t=><div key={t.id} className="c-technique-tile"><strong>{t.name}</strong>{expanded.has(i.id)&&t.pattern?.length?<Zone cells={t.pattern} origin={t.origin}/>:<span className="c-zone-unavailable" title="Schéma non défini">—</span>}<span>{t.end!==undefined?`${t.end} END`:'END —'}</span></div>)}</div></div>}
 {ash&&<section aria-label="Ash of War" className="c-card c-pad"><h3>Ash of War · {ash.name}</h3><p>{ash.mana} FP · Portée : {ash.range} cases{ash.damage?` · ${ash.damage} dégâts`:''}{ash.damageType?` · ${ash.damageType}`:''}</p>{ash.description&&<p>{ash.description}</p>}{ash.pattern.length>0&&<Zone cells={ash.pattern} origin={ash.origin}/>}<p className="c-muted">{ash.friendlyFire?'Affecte aussi les alliés.':'Épargne les alliés.'}</p></section>}
 </div></article>})}</div>)}
 {!items.length&&<div className="c-empty"><p>{spells?'Aucun sort dans la bibliothèque.':'Aucun objet dans le sac.'}</p></div>}
 </section>
}
