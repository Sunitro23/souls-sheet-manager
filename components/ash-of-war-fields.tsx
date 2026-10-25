'use client';
import {useId} from 'react';
import {ashOfWarNames,newAshOfWar,type AshOfWar} from '../lib/ash-of-war';
import type {Entry} from '../lib/rules';

export default function AshOfWarFields({item,onChange}:{item:Entry;onChange:(item:Entry)=>void}){
 const namesId=useId(),ash=item.ashOfWar;
 if(!['weapon','shield'].includes(item.type))return null;
 const update=(patch:Partial<AshOfWar>)=>{if(ash)onChange({...item,ashOfWar:{...ash,...patch}})};
 return <fieldset className="c-form-section c-ash-fields"><legend>Cendre de guerre</legend>
 <p className="c-muted">Compétence indépendante des techniques, consommant des FP. Le MJ définit son coût et valide sa compatibilité avec cet équipement.</p>
 <label><input type="checkbox" checked={!!ash} onChange={e=>onChange({...item,ashOfWar:e.target.checked?newAshOfWar('Cendre personnalisée'):null})}/> Associer une cendre de guerre</label>
 {ash&&<>
 <label className="c-field"><span>Nom de la cendre</span><input required list={namesId} value={ash.name} onChange={e=>update({name:e.target.value})}/><datalist id={namesId}>{ashOfWarNames.map(name=><option key={name} value={name}/>)}</datalist></label>
 <div className="c-grid3">
 <label className="c-field"><span>Coût FP</span><input required type="number" min="1" max="100" step="1" placeholder="À définir" value={ash.mana||''} onChange={e=>update({mana:e.target.valueAsNumber||0})}/></label>
 <label className="c-field"><span>Dégâts propres (facultatifs)</span><input placeholder="Ex. 2d6" value={ash.damage} onChange={e=>update({damage:e.target.value})}/></label>
 <label className="c-field"><span>Type de dégâts / affinité</span><input placeholder="Feu, magie, ténèbres…" value={ash.damageType} onChange={e=>update({damageType:e.target.value})}/></label>
 </div>
 <label className="c-field"><span>Effet spécial</span><textarea rows={3} placeholder="Déplacement, posture, projection, effet élémentaire…" value={ash.description} onChange={e=>update({description:e.target.value})}/></label>
 <div className="c-grid2"><label className="c-field"><span>Portée (cases)</span><input required type="number" min="0" max="1000" value={ash.range} onChange={e=>update({range:e.target.valueAsNumber||0})}/></label>
 <label className="c-field"><span>Origine de la zone</span><select value={ash.origin??'self'} onChange={e=>update({origin:e.target.value as AshOfWar['origin']})}><option value="self">Porteur</option><option value="target">Cible</option></select></label></div>
 <section className="c-zone-editor"><h4>Zone d’effet · {ash.pattern.length} cases</h4><p className="c-muted">Sélectionnez les cases affectées autour de l’origine (◎).</p>
 <div role="group" aria-label="Zone de l’Ash of War" style={{display:'grid',gridTemplateColumns:'repeat(9, minmax(0, 1fr))',maxWidth:360,gap:2}}>{Array.from({length:81},(_,i)=>{
  const x=i%9-4,y=Math.floor(i/9)-4,selected=ash.pattern.some(p=>p[0]===x&&p[1]===y);
  return <button key={i} type="button" className={selected?'c-primary':'c-button'} style={{padding:0,aspectRatio:'1'}} aria-label={`Case ${x}, ${y}`} aria-pressed={selected} onClick={()=>update({pattern:selected?ash.pattern.filter(p=>p[0]!==x||p[1]!==y):[...ash.pattern,[x,y]]})}>{x===0&&y===0?'◎':selected?'●':'·'}</button>;
 })}</div><button type="button" className="c-text-button" onClick={()=>update({pattern:[]})}>Effacer la zone</button></section>
 <label><input type="checkbox" checked={ash.friendlyFire} onChange={e=>update({friendlyFire:e.target.checked})}/> Affecte aussi les alliés</label>
 </>}
 </fieldset>;
}
