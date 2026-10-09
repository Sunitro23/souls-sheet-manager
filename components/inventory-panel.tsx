'use client';
import {Plus,Pencil,Check,Lock} from 'lucide-react';
import {entry,itemWeight,armors,ranks,type Entry} from '../lib/rules';
import {weaponSummary} from '../lib/weapon-summary';
import type {Tree} from '../lib/progression';
const statusLabels={approved:'Validé',pending:'À valider',rejected:'Refusé'};
function Zone({cells,origin}:{cells:number[][];origin?:string}){
 const xs=[0,...cells.map(p=>p[0])],ys=[0,...cells.map(p=>p[1])];const x=Math.min(...xs)-.5,y=Math.min(...ys)-.5,w=Math.max(...xs)-x+.5,h=Math.max(...ys)-y+.5;
 return <svg className="c-zone" viewBox={`${x} ${y} ${w} ${h}`} role="img" aria-label={`Zone : ${cells.length} cases, origine ${origin==='target'?'cible':'porteur'}`}><title>{cells.length} cases · origine {origin==='target'?'cible':'porteur'}</title>{cells.map(([a,b],i)=><rect key={i} x={a-.44} y={b-.44} width=".88" height=".88" rx=".12" fill="currentColor"/>)}<circle cx="0" cy="0" r=".23" fill="#e5e8e1"/></svg>
}
export default function InventoryPanel({mode,character,derived,tree,onEdit}:{mode:'Inventaire'|'Grimoire';character:any;derived:any;tree:Tree;onEdit:(item:Entry)=>void}){
 const spells=mode==='Grimoire',items:Entry[]=spells?character.spells:character.inventory;
 return <section className={`c-card c-pad c-inventory-panel ${spells?'c-spells-panel':''}`} aria-label={mode}>
 <div className="c-title compact"><div><h2>{mode}</h2><p>{spells?`Mémoire : ${derived.used} / ${derived.memory}`:`Charge équipée : ${derived.weight} / ${derived.capacity}`}</p></div><button className="c-button" aria-label={spells?'Ajouter un sort':'Ajouter un objet'} onClick={()=>onEdit(entry('',spells?'spell':'weapon'))}><Plus size={16}/>Ajouter</button></div>
 {(spells?['spell']:['weapon','armor','shield','talisman','consumable','other']).filter(type=>items.some(i=>i.type===type)).map(type=><div key={type} className="c-item-group"><h3>{({spell:'Sorts',weapon:'Armes',armor:'Armures',shield:'Boucliers',talisman:'Talismans',consumable:'Consommables',other:'Autres objets'} as Record<string,string>)[type]}</h3>
 {items.filter(i=>i.type===type).map(i=>{const weapon=i.type==='weapon'?weaponSummary(i,character,tree):null;return <article className={`c-equipment-card ${i.equipped?'is-equipped':''}`} key={i.id}>
 <div className="c-equipment-head"><div><h4>{i.name||'Sans nom'}</h4><p>{i.category|| (i.type==='armor'?armors[i.armor]?.name:i.type==='spell'?ranks[i.rank]:'')}</p></div><button className="c-icon" aria-label={`Modifier ${i.name}`} onClick={()=>onEdit(structuredClone(i))}><Pencil size={16}/></button></div>
 <div className="c-item-badges"><span className={i.equipped||i.memorized?'is-active':''}>{spells?(i.memorized?'Mémorisé':i.known?'Connu':'Non appris'):(i.equipped?'Équipé':'Non équipé')}</span><span className={`status-${i.status}`}>{statusLabels[i.status]}</span>{weapon?.family&&<span>{weapon.family}</span>}</div>
 <dl className="c-item-facts">{['weapon','shield','spell'].includes(i.type)&&<div><dt>Dégâts</dt><dd>{i.damage||'—'}</dd></div>}{!spells&&<div><dt>Poids</dt><dd>{itemWeight(i)}</dd></div>}{spells&&<><div><dt>FP</dt><dd>{i.mana}</dd></div><div><dt>END</dt><dd>{i.end}</dd></div><div><dt>Portée</dt><dd>{i.range} cases</dd></div></>}</dl>
 {i.description&&<p className="c-item-description">{i.description}</p>}
 {weapon&&<div className="c-weapon-techniques"><h5>Techniques & compétences</h5>{weapon.techniques.length?weapon.techniques.map(t=><div key={t.id} className={`c-weapon-technique ${t.learned?'is-learned':''}`}><div className="c-technique-heading"><strong>{t.learned?<Check size={12}/>:<Lock size={12}/>} {t.name}</strong><span>{t.learned?'Acquis':'À débloquer'}</span></div><div className="c-technique-body">{t.pattern?.length?<Zone cells={t.pattern} origin={t.origin}/>:null}<div><div className="c-technique-values">{t.damage&&t.damage!==i.damage&&<span>{t.damage} dégâts</span>}{t.end!==undefined&&<span>{t.end} END</span>}{!!t.mana&&<span>{t.mana} FP</span>}{t.range!==undefined&&<span>{t.range} cases</span>}{t.friendlyFire&&<span>Touche les alliés</span>}</div>{t.description&&<p>{t.description}</p>}</div></div></div>):<p className="c-muted">Aucune technique attribuée.</p>}</div>}
 </article>})}</div>)}
 {!items.length&&<div className="c-empty"><p>{spells?'Aucun sort.':'Inventaire vide.'}</p></div>}
 </section>
}
