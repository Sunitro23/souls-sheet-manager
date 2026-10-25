'use client';
import {useCampaignSettings} from './campaign-theme';
import {categoryFor,defaultSettings} from '../lib/campaign-settings';
import type {ReactNode} from 'react';
import {armors,ranks,itemWeight,type Entry} from '../lib/rules';
import {catalystTypes} from '../lib/bonuses';
import {itemTypes} from './item-details';
import ItemExtraFields from './item-extra-fields';
import AshOfWarFields from './ash-of-war-fields';
import SpellZoneFields from './spell-zone-fields';
function Field({label,children}:{label:string;children:ReactNode}){return <label className="c-field"><span>{label}</span>{children}</label>}
export default function ItemForm({item,onChange,onSave,onDelete,isGM,busy,existing}:{item:Entry;onChange:(item:Entry)=>void;onSave:()=>void;onDelete:()=>void;isGM:boolean;busy:boolean;existing:boolean}){
 const settings=useCampaignSettings()??defaultSettings(),currentCategory=categoryFor(settings,item);
 const choices=settings?.categories.filter(c=>c.kind===(item.type==='spell'?'magic':item.type==='weapon'?'weapon':'item')&&c.available&&!c.archived).sort((a,b)=>a.order-b.order)??[];
 const update=(patch:Partial<Entry>)=>onChange({...item,...patch});
 const number=(key:'weight'|'shield'|'mana'|'end'|'range',max:number,min=0)=><input type="number" inputMode="numeric" min={min} max={max} required value={item[key]} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isInteger(n)&&n>=min&&n<=max)update({[key]:n})}}/>;
 return <form className="c-editor-form" onSubmit={e=>{e.preventDefault();onSave()}}>
 <p className="c-muted">{existing?'Modifier les informations de cet objet.':'Définir un nouvel objet.'} Les changements restent soumis aux règles de validation de la campagne.</p>
 <section className="c-form-section"><h3>Informations générales</h3><div className="c-grid2"><Field label="Nom"><input autoFocus required value={item.name} onChange={e=>update({name:e.target.value})}/></Field>{item.type!=='spell'&&<Field label="Type d’objet"><select value={item.type} onChange={e=>update({type:e.target.value,categoryId:undefined,ashOfWar:['weapon','shield'].includes(e.target.value)?item.ashOfWar:null,category:e.target.value==='weapon'?'Épées':''})}>{Object.entries(itemTypes).filter(([key])=>key!=='spell').map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></Field>}
 {item.type==='weapon'&&<Field label="Catégorie d’arme"><select value={item.categoryId??currentCategory?.id??item.category} onChange={e=>{const c=choices.find(c=>c.id===e.target.value);if(c)update({categoryId:c.id,category:c.baseKey})}}>{!choices.some(c=>c.id===(item.categoryId??currentCategory?.id))&&<option value={item.categoryId??currentCategory?.id??item.category}>{currentCategory?.name??item.category} (conservée)</option>}{choices.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></Field>}
 {!['weapon','spell'].includes(item.type)&&choices.length>0&&<Field label="Catégorie d’objet"><select value={item.categoryId??''} onChange={e=>update({categoryId:e.target.value||undefined})}><option value="">Sans catégorie</option>{currentCategory&&!choices.some(c=>c.id===currentCategory.id)&&<option value={currentCategory.id}>{currentCategory.name} (conservée)</option>}{choices.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}{item.type==='catalyst'&&<Field label="Catalyseur / instrument"><select value={catalystTypes.some(c=>c.name===item.category)?item.category:''} onChange={e=>{const c=catalystTypes.find(c=>c.name===e.target.value);update({category:c?.name??'',weight:c?.weight??item.weight})}}><option value="">Personnalisé</option>{catalystTypes.map(c=><option key={c.name} value={c.name}>{c.name} · {c.weight} pds</option>)}</select></Field>}
 {item.type==='spell'&&<Field label="Famille magique"><select value={item.categoryId??currentCategory?.id??item.school??'Sorts'} onChange={e=>{const c=choices.find(c=>c.id===e.target.value);if(c)update({categoryId:c.id,school:c.baseKey as Entry['school']})}}>{!choices.some(c=>c.id===(item.categoryId??currentCategory?.id))&&<option value={item.categoryId??currentCategory?.id??item.school??'Sorts'}>{currentCategory?.name??item.school??'Sorts'} (conservée)</option>}{choices.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></Field>}</div><Field label="Description"><textarea rows={3} value={item.description} onChange={e=>update({description:e.target.value})}/></Field></section>
 <section className="c-form-section"><h3>{item.type==='spell'?'Rang, dégâts et coûts':'Statistiques'}</h3><div className="c-grid3">
 {item.type==='armor'&&<Field label="Classe d’armure"><select value={item.armor} onChange={e=>update({armor:Number(e.target.value)})}>{armors.map((a,i)=><option key={a.name} value={i}>{a.name}</option>)}</select></Field>}
 {item.type==='shield'&&<Field label="Poids du bouclier">{number('shield',4,1)}</Field>}
 {['other','consumable','catalyst'].includes(item.type)&&<Field label="Poids">{number('weight',100)}</Field>}
 {['weapon','spell','shield'].includes(item.type)&&<Field label="Dégâts"><input placeholder="Ex. 1d8" value={item.damage} onChange={e=>update({damage:e.target.value})}/></Field>}
 {item.type==='spell'&&<><Field label="Rang"><select value={item.rank} onChange={e=>update({rank:Number(e.target.value)})}>{ranks.map((rank,i)=><option value={i} key={rank}>{i} · {rank}</option>)}</select></Field><Field label="Coût en focus (FP)">{number('mana',100)}</Field><Field label="Coût en endurance (END)">{number('end',100)}</Field></>}
 </div>{['weapon','armor','talisman'].includes(item.type)&&<p className="c-muted">Poids selon le barème : {itemWeight(item)} pds.</p>}</section>
 <ItemExtraFields item={item} onChange={onChange}/>
 <section className="c-form-section"><h3>Effets</h3><Field label="Effets de l’objet"><textarea maxLength={3000} rows={4} placeholder="Propriétés, conditions et effets particuliers…" value={item.effects??''} onChange={e=>update({effects:e.target.value})}/></Field>{item.type==='spell'&&<><div className="c-grid2"><Field label="Cible"><input value={item.target} onChange={e=>update({target:e.target.value})}/></Field><Field label="Portée (cases)">{number('range',1000)}</Field></div><p className="c-muted">Les dégâts, coûts et effets sont des informations de référence pour la partie.</p></>}</section>
 <SpellZoneFields item={item} onChange={onChange}/>
 <AshOfWarFields item={item} onChange={onChange}/>
 <section className="c-form-section"><h3>Validation et équipement</h3>{isGM&&<Field label="Validation MJ"><select value={item.status} onChange={e=>update({status:e.target.value as Entry['status']})}><option value="pending">En attente</option><option value="approved">Validé</option><option value="rejected">Refusé</option></select></Field>}
 {item.type==='spell'?<div className="c-inline"><label><input type="checkbox" checked={item.known} onChange={e=>update({known:e.target.checked,memorized:e.target.checked&&item.memorized})}/> Connu</label><label><input type="checkbox" disabled={item.status!=='approved'||!item.known} checked={item.memorized} onChange={e=>update({memorized:e.target.checked})}/> Mémorisé</label></div>:<label><input type="checkbox" disabled={item.status!=='approved'} checked={item.equipped} onChange={e=>update({equipped:e.target.checked})}/> Équipé</label>}</section>
 <div className="c-form-actions"><button className="c-primary" disabled={busy}>{busy?'Enregistrement…':'Enregistrer'}</button>{existing&&<button type="button" className="c-text-button c-danger" disabled={busy} onClick={onDelete}>Supprimer cet objet</button>}</div>
 </form>;
}
