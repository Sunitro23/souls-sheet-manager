'use client';
import {useState} from 'react';
import {Minus,Plus,Info,RotateCcw} from 'lucide-react';
import {racialCatalog} from '../lib/races';
import {classCatalog} from '../lib/classes';
import PortraitPicker from './portrait-picker';
import {statNames} from '../lib/rules';
import {CREATION_POINTS,POINT_COSTS,initialStats,pointsSpent,statLabels} from '../lib/creation';
export default function CharacterCreation({races,suggestions,members,user,isGM,busy,onCreate}:{races:string[];suggestions:string[];members:any[];user:any;isGM:boolean;busy:boolean;onCreate:(data:any)=>void}){
 const [stats,setStats]=useState(initialStats),[race,setRace]=useState(''),[className,setClassName]=useState(''),[portrait,setPortrait]=useState(''),[photoBusy,setPhotoBusy]=useState(false);
 const racial=racialCatalog.find(r=>r.name===race);
 const selectedClass=classCatalog.find(c=>c.name===className);
 const left=CREATION_POINTS-pointsSpent(stats);
 return <form onSubmit={e=>{e.preventDefault();if(left!==0||photoBusy)return;const f=new FormData(e.currentTarget);onCreate({name:f.get('name'),className:f.get('className'),race,portrait,playerId:f.get('playerId'),stats,magic:f.get('magic')});}}>
 <PortraitPicker value={portrait} onChange={setPortrait} disabled={busy} onBusyChange={setPhotoBusy}/>
 <label className="c-field"><span>Nom</span><input name="name" required maxLength={100} autoFocus/></label>
 <label className="c-field"><span>Classe</span><select name="className" required value={className} onChange={e=>setClassName(e.target.value)}><option value="">Choisir une classe</option>{classCatalog.map(c=><option key={c.name}>{c.name}</option>)}</select></label>
 <label className="c-field"><span>{races.length?'Race':'Race (facultatif)'}</span>{races.length?<select required value={race} onChange={e=>setRace(e.target.value)}><option value="">Choisir une race</option>{races.map(r=><option key={r}>{r}</option>)}</select>:<><input maxLength={100} value={race} onChange={e=>setRace(e.target.value)} list="creation-races" placeholder="Nom de la race"/><datalist id="creation-races">{suggestions.map(r=><option key={r}>{r}</option>)}</datalist></>}</label>
 {selectedClass&&<details><summary>Aptitudes de {className}</summary><p className="c-muted">{selectedClass.stats.map(s=>`+1 ${s}`).join(', ')} · Bonus et aptitudes à débloquer dans l’arbre de compétences.</p>{selectedClass.abilities.map(a=><p className="c-muted" key={a.name}><strong>{a.name}</strong> · {a.description}</p>)}</details>}
 {racial&&<details><summary>Traits de {race}</summary><p className="c-muted">{racial.stats.map(s=>`+1 ${s}`).join(', ')} · Bonus à débloquer dans l’arbre de compétences.</p><p className="c-muted">{racial.trait}</p><p className="c-muted">{racial.weakness}</p></details>}
 {isGM&&<label className="c-field"><span>Joueur</span><select name="playerId"><option value={user.id}>{user.username} (vous)</option>{members.filter(m=>m.id!==user.id).map(m=><option value={m.id} key={m.id}>{m.username}</option>)}</select></label>}
 <div className="c-point-buy-head"><h3>Caractéristiques</h3><span role="status" aria-live="polite">{left}<small> / {CREATION_POINTS} pts</small></span></div>
 <div className="c-point-buy">{statNames.map(s=><div className="c-buy-row" key={s}><div><strong>{s}</strong><small>{statLabels[s]}</small></div><button type="button" className="c-icon" aria-label={`Diminuer ${statLabels[s]}`} disabled={stats[s]<=2||busy} onClick={()=>setStats({...stats,[s]:stats[s]-1})}><Minus size={16}/></button><output aria-label={statLabels[s]}>{stats[s]}</output><button type="button" className="c-icon" aria-label={`Augmenter ${statLabels[s]}`} disabled={stats[s]>=28||POINT_COSTS[stats[s]+1]-POINT_COSTS[stats[s]]>left||busy} onClick={()=>setStats({...stats,[s]:stats[s]+1})}><Plus size={16}/></button></div>)}</div>
 <details><summary><Info size={14}/> Répartition des points</summary><p className="c-muted">36 points à dépenser. Chaque caractéristique commence à 8 et peut aller de 2 à 28. Descendre sous 8 rend 1 point par cran. Au-delà de 20, chaque cran coûte 3 points.</p><div className="c-costs">{Object.entries(POINT_COSTS).map(([value,cost])=><span key={value}>{value}<small>{cost} pts</small></span>)}</div><button type="button" className="c-text-button" onClick={()=>setStats(initialStats())}><RotateCcw size={15}/>Réinitialiser</button></details>
 <details><summary>Affinité magique</summary><label className="c-field"><span>Caractéristique utilisée pour le focus et la mémoire</span><select name="magic" defaultValue="SAG"><option value="SAG">Sagesse</option><option value="INT">Intelligence</option><option value="CHA">Charisme</option></select></label></details>
 <button className="c-primary c-full" disabled={busy||photoBusy||left!==0}>{busy?'Création…':left===0?'Créer le personnage':`${left} points à répartir`}</button>
 </form>
}
