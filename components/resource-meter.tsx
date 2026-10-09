'use client';
import {Minus,Plus} from 'lucide-react';
export default function ResourceMeter({label,value,max,kind,disabled,onChange}:{label:string;value:number;max:number;kind:'hp'|'mana'|'end';disabled:boolean;onChange:(value:number)=>void}){
 const limit=Math.max(0,Math.floor(max));
 const change=(next:number)=>{if(Number.isFinite(next))onChange(Math.min(limit,Math.max(0,Math.floor(next))))};
 return <section className={`c-resource-meter ${kind}`} aria-label={label}><label><span>{label}</span><div><input type="number" inputMode="numeric" min={0} max={limit} step={1} disabled={disabled} value={value} onChange={e=>change(e.target.valueAsNumber)} onBlur={e=>{if(!e.target.value)e.target.value=String(value)}}/><span className="c-resource-max">/ {limit}</span></div></label><progress aria-label={`${label} : ${value} sur ${limit}`} max={Math.max(1,limit)} value={value}/><div className="c-resource-actions"><button type="button" aria-label={`Retirer 1 ${label}`} disabled={disabled||value<=0} onClick={()=>change(value-1)}><Minus size={16}/></button><button type="button" aria-label={`Ajouter 1 ${label}`} disabled={disabled||value>=limit} onClick={()=>change(value+1)}><Plus size={16}/></button></div></section>;
}
