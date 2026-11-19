'use client';
import {useState} from 'react';
import type {Entry} from '../lib/rules';
import EquipmentIcon from './equipment-icon';
import SpellIcon from './spell-icon';
import {useCampaignSettings} from './campaign-theme';
import {categoryFor} from '../lib/campaign-settings';
import {weaponIconSource} from '../lib/weapon-icons';

const illustrations:Record<string,string>={weapon:'equipment/sword',armor:'equipment/armor-medium',shield:'items/shield',talisman:'items/ring',consumable:'items/estus',catalyst:'equipment/staff',other:'items/bag'};
const armors=['clothes','armor-light','armor-medium','armor-heavy','armor-heavy'];
function illustration(item:Entry|undefined,type:string){
 if(item&&type==='armor')return `equipment/${armors[item.armor]??'armor-medium'}`;
 if(item&&type==='catalyst'){
  if(/sceau/i.test(item.category))return 'equipment/seal';
  if(/flûte|flute|luth|lyre|tambour|guitare|instrument/i.test(item.category||item.name))return 'equipment/chime';
  return 'equipment/staff';
 }
 return illustrations[type];
}
const emptyIllustrations:Record<string,string>={weapon:'right_hand',armor:'armor',shield:'left_hand',talisman:'ring',catalyst:'right_hand'};
export default function ItemArtwork({item,type=item?.type??'other',slotIcon}:{item?:Entry;type?:string;slotIcon?:string}) {
 const settings=useCampaignSettings();
 const category=item?categoryFor(settings,item):undefined;
 // Optional artwork on existing objects is read without rewriting their stored data.
 const image=(item as (Entry & {image?:string})|undefined)?.image;
 const emptyIcon=slotIcon??emptyIllustrations[type];
 const artwork=illustration(item,type);
 const fallback=!item&&emptyIcon?`/ui/dark-souls/interface/${emptyIcon}.png`:item&&type==='weapon'?weaponIconSource(item.category,category?.weaponIcon):artwork?`/ui/dark-souls/${artwork}.png`:'';
 const custom=typeof image==='string'?image.trim():'';
 const [failed,setFailed]=useState<string[]>([]);
 const source=[custom,fallback].find(src=>src&&!failed.includes(src));
 return <span className="c-item-artwork" data-empty={!item||undefined} aria-hidden="true">{source?<img src={source} alt="" width={96} height={96} loading="lazy" decoding="async" onError={()=>setFailed(previous=>[...previous,source])}/>:type==='spell'&&item?<SpellIcon spell={item}/>:<EquipmentIcon item={item} type={type}/>}</span>;
}
