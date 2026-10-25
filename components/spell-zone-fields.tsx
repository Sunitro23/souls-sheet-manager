'use client';
import type {Entry} from '../lib/rules';

export default function SpellZoneFields({item,onChange}:{item:Entry;onChange:(item:Entry)=>void}){
 if(item.type!=='spell')return null;
 const update=(patch:Partial<Entry>)=>onChange({...item,...patch});
 return <fieldset className="c-form-section"><legend>Zone du sort</legend>
 <label className="c-field"><span>Origine de la zone</span><select value={item.origin??'self'} onChange={event=>update({origin:event.target.value as Entry['origin']})}><option value="self">Lanceur</option><option value="target">Cible à distance</option></select></label>
 <p className="c-muted">Sélectionnez les cases affectées autour de l’origine (◎).</p>
 <div role="group" aria-label="Zone du sort" style={{display:'grid',gridTemplateColumns:'repeat(9, minmax(0, 1fr))',maxWidth:360,gap:2}}>{Array.from({length:81},(_,index)=>{
  const column=index%9-4,row=Math.floor(index/9)-4,selected=item.pattern.some(cell=>cell[0]===column&&cell[1]===row);
  return <button key={index} type="button" className={selected?'c-primary':'c-button'} style={{padding:0,aspectRatio:'1'}} aria-label={`Case ${column}, ${row}`} aria-pressed={selected} onClick={()=>update({pattern:selected?item.pattern.filter(cell=>cell[0]!==column||cell[1]!==row):[...item.pattern,[column,row]]})}>{column===0&&row===0?'◎':selected?'●':'·'}</button>;
 })}</div>
 <button type="button" className="c-text-button" onClick={()=>update({pattern:[]})}>Effacer la zone</button>
 <label><input type="checkbox" checked={item.friendlyFire} onChange={event=>update({friendlyFire:event.target.checked})}/> Affecte aussi les alliés</label>
 </fieldset>;
}
