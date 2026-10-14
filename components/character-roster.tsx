'use client';
import {Sword} from 'lucide-react';
import {type Character} from '../lib/rules';
export type CampaignCharacter=Character&{race?:string;className?:string;playerId?:string};
export default function CharacterRoster({characters,members,user,isGM,onOpen}:{characters:CampaignCharacter[];members:{id:string;username:string}[];user:{id:string;username:string};isGM:boolean;onOpen:(character:CampaignCharacter)=>void}){
 return <div className="c-roster c-roster-portraits">{characters.map(c=><button type="button" className="c-roster-card" key={c.id} onClick={()=>onOpen(c)} aria-label={`Ouvrir ${c.name}`}><div className="c-roster-identity">{c.portrait?<img src={c.portrait} alt="" loading="lazy"/>:<span className="c-avatar"><Sword size={40}/></span>}<h2>{c.name}</h2></div></button>)}</div>;
}
