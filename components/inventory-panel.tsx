'use client';
import EquipmentLoadout from './equipment-loadout';
import {useState,useId} from 'react';
import {Plus,Pencil,Check,Lock} from 'lucide-react';
import {entry,itemWeight,armors,ranks,type Entry} from '../lib/rules';
import {weaponSummary} from '../lib/weapon-summary';
import type {Tree} from '../lib/progression';
const statusLabels={approved:'Validé',pending:'À valider',rejected:'Refusé'};
function Zone({cells,origin}:{cells:number[][];origin?:string}){
 const xs=[0,...cells.map(p=>p[0])],ys=[0,...cells.map(p=>p[1])];const x=Math.min(...xs)-.5,y=Math.min(...ys)-.5,w=Math.max(...xs)-x+.5,h=Math.max(...ys)-y+.5;
 return <svg className="c-zone" viewBox={`${x} ${y} ${w} ${h}`} role="img" aria-label={`Zone : ${cells.length} cases, origine ${origin==='target'?'cible':'porteur'}`}><title>{cells.length} cases · origine {origin==='target'?'cible':'porteur'}</title>{cells.map(([a,b],i)=><rect key={i} x={a-.44} y={b-.44} width=".88" height=".88" rx=".12" fill="currentColor"/>)}<circle cx="0" cy="0" r=".23" fill="#e5e8e1"/></svg>
}
export default function InventoryPanel({mode,character,derived,tree,onEdit,onInspect,detailItem,onEquip,selectedItemId}:{mode:'Inventaire'|'Grimoire';character:any;derived:any;tree:Tree;onEdit:(item:Entry)=>void;onInspect?:(item:Entry)=>void;detailItem?:Entry;onEquip?:(item:Entry)=>void;selectedItemId?:string}){
 const [expanded,setExpanded]=useState<Set<string>>(()=>new Set(detailItem?[detailItem.id]:[]));
 const prefix=useId();
 function toggle(id:string){setExpanded(previous=>{const next=new Set(previous);if(next.has(id))next.delete(id);else next.add(id);return next;});}
 const spells=mode==='Grimoire',items:Entry[]=detailItem?[detailItem]:spells?character.spells:character.inventory.filter((i:Entry)=>!i.equipped);
 return <section className={`c-card c-pad c-inventory-panel ${spells?'c-spells-panel':''}`} aria-label={mode}>
 {!detailItem&&<div className="c-title compact"><div><h2>{mode}</h2><p>{spells?`Mémoire : ${derived.used} / ${derived.memory}`:`Charge équipée : ${derived.weight} / ${derived.capacity}`}</p></div><button className="c-button" aria-label={spells?'Ajouter un sort':'Ajouter un objet'} onClick={()=>onEdit(entry('',spells?'spell':'weapon'))}><Plus size={16}/>{spells?'Ajouter un sort':'Ajouter'}</button></div>}
 {!spells&&!detailItem&&onInspect&&<EquipmentLoadout character={character} onInspect={onInspect} selectedId={selectedItemId}/>}
 {!spells&&!detailItem&&<h3 className="c-bag-heading">Sac <span>{items.length} objets</span></h3>}
 {(spells?['spell']:['weapon','armor','shield','talisman','consumable','other']).filter(type=>items.some(i=>i.type===type)).map(type=><div key={type} className="c-item-group"><h3>{({spell:'Sorts',weapon:'Armes',armor:'Armures',shield:'Boucliers',talisman:'Talismans',consumable:'Consommables',other:'Autres objets'} as Record<string,string>)[type]}</h3>
 {items.filter(i=>i.type===type).map(i=>{const weapon=i.type==='weapon'?weaponSummary(i,character,tree):null;return <article className={`c-equipment-card ${i.equipped?'is-equipped':''}`} key={i.id}>
 <div className="c-equipment-head">{weapon?<button type="button" className="c-weapon-row" aria-expanded={expanded.has(i.id)} aria-controls={`${prefix}-${i.id}-techniques`} aria-label={`${i.name||'Arme'} — ${expanded.has(i.id)?'masquer':'afficher'} les techniques et zones d’attaque`} onClick={()=>toggle(i.id)}><span className="c-weapon-name">{i.name||'Sans nom'}</span><span className="c-weapon-category">{i.category}</span></button>:<div><h4>{i.name||'Sans nom'}</h4><p>{i.category|| (i.type==='armor'?armors[i.armor]?.name:i.type==='spell'?ranks[i.rank]:'')}</p></div>}{!detailItem&&<button className="c-icon" aria-label={`Modifier ${i.name}`} onClick={()=>onEdit(structuredClone(i))}><Pencil size={16}/></button>}</div>
 {detailItem&&<p className="c-muted">{i.category||(i.type==='armor'?armors[i.armor]?.name:'')}</p>}
 <div className="c-item-badges"><span className={i.equipped||i.memorized?'is-active':''}>{spells?(i.memorized?'Mémorisé':i.known?'Connu':'Non appris'):(i.equipped?'Équipé':'Non équipé')}</span><span className={`status-${i.status}`}>{statusLabels[i.status]}</span>{weapon?.family&&<span>{weapon.family}</span>}</div>
 <dl className="c-item-facts">{['weapon','shield','spell'].includes(i.type)&&<div><dt>Dégâts</dt><dd>{i.damage||'—'}</dd></div>}{!spells&&<div><dt>Poids</dt><dd>{itemWeight(i)}</dd></div>}{spells&&<><div><dt>FP</dt><dd>{i.mana}</dd></div><div><dt>END</dt><dd>{i.end}</dd></div><div><dt>Portée</dt><dd>{i.range} cases</dd></div></>}</dl>
 {!spells&&!detailItem&&onEquip&&<button type="button" className="c-equip-action" disabled={i.status!=='approved'} onClick={()=>onEquip(i)}>{i.status==='approved'?'Équiper':i.status==='pending'?'Validation MJ requise':'Objet refusé'}</button>}
 {i.description&&<p className="c-item-description">{i.description}</p>}
 {weapon&&<div className="c-weapon-techniques" hidden={!expanded.has(i.id)} id={`${prefix}-${i.id}-techniques`}><h5>Techniques & compétences</h5>{weapon.techniques.length?weapon.techniques.map(t=><div key={t.id} className={`c-weapon-technique ${t.learned?'is-learned':''}`}><div className="c-technique-heading"><strong>{t.learned?<Check size={12}/>:<Lock size={12}/>} {t.name}</strong><span>{t.learned?'Acquis':'À débloquer'}</span></div><div className="c-technique-body">{expanded.has(i.id)&&t.pattern?.length?<Zone cells={t.pattern} origin={t.origin}/>:null}<div><div className="c-technique-values">{t.damage&&t.damage!==i.damage&&<span>{t.damage} dégâts</span>}{t.end!==undefined&&<span>{t.end} END</span>}{!!t.mana&&<span>{t.mana} FP</span>}{t.range!==undefined&&<span>{t.range} cases</span>}{t.friendlyFire&&<span>Touche les alliés</span>}</div>{t.description&&<p>{t.description}</p>}</div></div></div>):<p className="c-muted">Aucune technique attribuée.</p>}</div>}
 </article>})}</div>)}
 {!items.length&&<div className="c-empty"><p>{spells?'Votre grimoire est vide. Ajoutez votre premier sort.':'Aucun objet dans le sac.'}</p></div>}
 </section>
}
