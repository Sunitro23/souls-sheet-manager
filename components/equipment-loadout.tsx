'use client';
import {Sword,Shield,Gem,User,Package} from 'lucide-react';
import {armors,itemWeight,type Entry} from '../lib/rules';
const slots=[{type:'weapon',index:0,label:'Arme 1',position:'weapon-one',Icon:Sword},{type:'weapon',index:1,label:'Arme 2',position:'weapon-two',Icon:Sword},{type:'armor',index:0,label:'Armure',position:'armor',Icon:Shield},{type:'talisman',index:0,label:'Talisman 1',position:'talisman-one',Icon:Gem},{type:'talisman',index:1,label:'Talisman 2',position:'talisman-two',Icon:Gem}];
export default function EquipmentLoadout({character,onInspect,selectedId}:{character:any;onInspect:(item:Entry)=>void;selectedId?:string}){
 const equipped:Entry[]=character.inventory.filter((i:Entry)=>i.equipped);
 const shown=new Set<string>();
 const cards=slots.map(slot=>{const item=equipped.filter(i=>i.type===slot.type)[slot.index];if(item)shown.add(item.id);return {...slot,item};});
 const extra=equipped.filter(i=>!shown.has(i.id));
 return <section className="c-loadout" aria-label="Objets équipés"><div className="c-loadout-heading"><h3>Équipés</h3><span>{cards.filter(s=>s.item).length} / 5</span></div><div className="c-loadout-map">
 <div className="c-loadout-portrait">{character.portrait?<img src={character.portrait} alt={`Portrait de ${character.name}`}/>:<User size={38}/>}<span>{character.name}</span></div>
 {cards.map(({item,Icon,label,position})=>{const content=<><span className="c-slot-label">{label}</span><Icon size={23}/><strong>{item?.name||'Vide'}</strong>{item&&<small>{item.type==='weapon'?item.damage||'Dégâts non renseignés':item.type==='armor'?armors[item.armor]?.name:'Talisman'}</small>}</>;return item?<button key={position} type="button" className={`c-gear-slot ${position} occupied`} onClick={()=>onInspect(item)} aria-pressed={selectedId===item.id} aria-label={`${label} : ${item.name}, consulter les détails`}>{content}</button>:<div key={position} className={`c-gear-slot ${position} empty`}>{content}</div>;})}
 </div>{extra.length>0&&<div className="c-extra-equipped">{extra.map(i=><button className="c-button" key={i.id} onClick={()=>onInspect(i)}><Package size={15}/>{i.name}<small>Poids {itemWeight(i)}</small></button>)}</div>}</section>;
}
