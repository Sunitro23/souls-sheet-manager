'use client';
import {useState} from 'react';
import {bonusKeys,type BonusKey} from '../lib/bonuses';
import type {Entry} from '../lib/rules';
export default function ItemExtraFields({item,onChange}:{item:Entry;onChange:(item:Entry)=>void}){
 const [selected,setSelected]=useState<BonusKey|''>('');
 const active=bonusKeys.filter(key=>item.bonuses?.[key]!==undefined&&item.bonuses[key]!==0);
 const [added,setAdded]=useState<BonusKey[]>(()=>active);
 const visible=bonusKeys.filter(key=>active.includes(key)||added.includes(key));
 const choices=bonusKeys.filter(key=>!visible.includes(key));
 if(item.type==='spell')return null;
 return <section className="c-form-section"><h3>Bonus d’équipement</h3><p className="c-muted">Actifs après validation MJ, lorsque l’objet est équipé. Caractéristiques plafonnées à 28.</p>
 {visible.map(key=><div className="c-bonus-row" key={key}><label className="c-field"><span>{key}</span><input type="number" min="0" max="100" step="1" value={item.bonuses?.[key]??0} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isInteger(n)&&n>=0&&n<=100)onChange({...item,bonuses:{...item.bonuses,[key]:n}})}}/></label><button type="button" className="c-text-button" aria-label={`Retirer le bonus ${key}`} onClick={()=>{const bonuses={...item.bonuses};delete bonuses[key];setAdded(added.filter(k=>k!==key));onChange({...item,bonuses})}}>Retirer</button></div>)}
 {choices.length>0&&<div className="c-inline"><label className="c-field"><span>Ajouter un bonus</span><select value={selected} onChange={e=>setSelected(e.target.value as BonusKey)}><option value="">Choisir une caractéristique</option>{choices.map(key=><option key={key}>{key}</option>)}</select></label><button type="button" className="c-button" disabled={!selected} onClick={()=>{if(selected){setAdded([...added,selected]);onChange({...item,bonuses:{...item.bonuses,[selected]:1}});setSelected('')}}}>Ajouter</button></div>}
 </section>;
}
