'use client';
import {Sword,ChevronRight} from 'lucide-react';
import {derive,type Character} from '../lib/rules';
export type CampaignCharacter=Character&{race?:string;className?:string;playerId?:string};
export default function CharacterRoster({characters,members,user,isGM,onOpen}:{characters:CampaignCharacter[];members:{id:string;username:string}[];user:{id:string;username:string};isGM:boolean;onOpen:(character:CampaignCharacter)=>void}){
 return <div className="c-roster">{characters.map(c=>{const d=isGM?derive(c):null;return <button type="button" className="c-roster-card" key={c.id} onClick={()=>onOpen(c)} aria-label={`Ouvrir ${c.name}, niveau ${c.level}`}><div className="c-roster-identity">{c.portrait?<img src={c.portrait} alt="" loading="lazy"/>:<span className="c-avatar"><Sword size={24}/></span>}<div><h2>{c.name}</h2><p>{c.race||c.className||'Personnage'}</p></div><span className="c-level">Niv. {c.level}</span></div>{isGM&&<><p className="c-roster-player">{members.find(m=>m.id===c.playerId)?.username||(c.playerId===user.id?user.username:'À attribuer')}</p><dl className="c-roster-resources">{(['hp','mana','end'] as const).map(key=><div key={key} className={key}><dt>{{hp:'PV',mana:'FP',end:'END'}[key]}</dt><dd>{c[key]} <span>/ {d![key]}</span></dd></div>)}</dl></>}<span className="c-roster-open">Ouvrir la fiche<ChevronRight size={16}/></span></button>})}</div>;
}
