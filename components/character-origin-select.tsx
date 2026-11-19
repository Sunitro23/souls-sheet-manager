'use client';
import {useCampaignSettings} from './campaign-theme';
import {characterCategoryLabel} from '../lib/campaign-settings';

export default function CharacterOriginSelect({kind,value,fallback,disabled,onChange}:{kind:'race'|'class';value:string;fallback:string[];disabled:boolean;onChange:(value:string)=>void}){
 const settings=useCampaignSettings();
 const options=settings
  ?settings.categories.filter(c=>c.kind===kind&&c.available&&!c.archived).sort((a,b)=>a.order-b.order).map(c=>({value:c.baseKey,label:c.name}))
  :fallback.map(value=>({value,label:value}));
 if(!settings&&!fallback.length&&kind==='race')return <input disabled={disabled} maxLength={100} value={value} onChange={e=>onChange(e.target.value)}/>;
 return <select disabled={disabled} value={value} onChange={e=>onChange(e.target.value)}>
  <option value="">{kind==='race'?'Sans race':'Sans classe'}</option>
  {value&&!options.some(option=>option.value===value)&&<option value={value} disabled hidden>{characterCategoryLabel(settings,kind,value)}</option>}
  {options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
 </select>;
}
