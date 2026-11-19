'use client';
import {Plus} from 'lucide-react';
import type {Character,Entry} from '../lib/rules';
import {itemSummary} from '../lib/inventory';
import ItemArtwork from './item-artwork';
import CollectionRow from './collection-row';

const slots=[{type:'weapon',index:0,label:'Arme 1'},{type:'weapon',index:1,label:'Arme 2'},{type:'armor',index:0,label:'Armure'},{type:'talisman',index:0,label:'Talisman 1'},{type:'talisman',index:1,label:'Talisman 2'}];
export type EquipmentSlot={type:string;label:string};
export default function EquipmentLoadout({character,onInspect,onChoose,selectedId,detailsId,detailsOpen=true}:{character:Character;onInspect:(item:Entry)=>void;onChoose?:(slot:EquipmentSlot)=>void;selectedId?:string;detailsId?:string;detailsOpen?:boolean}) {
 const equipped=character.inventory.filter(i=>i.equipped&&!i.archived);
 const shown=new Set<string>();
 const cards=slots.map(slot=>{const item=equipped.filter(i=>slot.type==='weapon'?['weapon','catalyst'].includes(i.type):i.type===slot.type)[slot.index];if(item)shown.add(item.id);return {...slot,item};});
 const extra=equipped.filter(i=>!shown.has(i.id));
 return <section className="c-inventory-loadout" aria-label="Objets équipés">
  <div className="c-inventory-heading"><h3>Équipements</h3><span>{cards.filter(s=>s.item).length} / 5</span></div>
  <div className="c-equipped-list">{cards.map(({item,type,index,label})=>item?<CollectionRow key={label} item={item} onSelect={onInspect} selectedId={selectedId} detailsId={detailsId} detailsOpen={detailsOpen} category={label} summary={itemSummary(item)} label={`${label} : ${item.name}, consulter les détails`} className="c-equipped-row is-occupied"/>:<button key={label} type="button" className="c-inventory-row c-equipped-row is-empty" aria-pressed={false} aria-label={`${label} : choisir un équipement`} disabled={!onChoose} onClick={()=>onChoose?.({type,label})}>
   <ItemArtwork type={type} slotIcon={type==='weapon'?(index===0?'right_hand':'left_hand'):undefined}/><span className="c-inventory-row-copy"><small>{label}</small><strong>Emplacement libre</strong><span>Choisir dans le sac</span></span><Plus size={15}/>
  </button>)}</div>
  {extra.length>0&&<div className="c-additional-equipment"><h4>Également portés</h4>{extra.map(item=><CollectionRow key={item.id} item={item} onSelect={onInspect} selectedId={selectedId} detailsId={detailsId} detailsOpen={detailsOpen} summary={itemSummary(item)}/>)}</div>}
 </section>;
}
