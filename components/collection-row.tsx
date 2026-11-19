'use client';
import {ChevronRight} from 'lucide-react';
import type {Entry} from '../lib/rules';
import ItemArtwork from './item-artwork';

export default function CollectionRow({item,onSelect,selectedId,detailsId,detailsOpen,category,summary,status,className='',label}:{item:Entry;onSelect:(item:Entry)=>void;selectedId?:string;detailsId?:string;detailsOpen?:boolean;category?:string;summary:string;status?:string;className?:string;label?:string}){
 const selected=selectedId===item.id;
 return <button type="button" className={`c-inventory-row ${className}`} data-inventory-item={item.id} aria-label={label} aria-pressed={selected} aria-expanded={selected&&!!detailsOpen} aria-controls={selected&&detailsOpen?detailsId:undefined} onClick={()=>onSelect(item)}><ItemArtwork item={item}/><span className="c-inventory-row-copy"><strong>{item.name||'Sans nom'}</strong>{category&&<small>{category}</small>}{summary&&<span>{summary}</span>}{status&&<small className="c-collection-status">{status}</small>}</span><ChevronRight size={15}/></button>;
}
