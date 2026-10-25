'use client';
import {useCampaignSettings} from './campaign-theme';
import {Check,Lock,Music,Flame,Sun,Moon,Sparkles,Droplets,Sword,TrendingUp,MessageCircle} from 'lucide-react';
import {useState,type ReactNode} from 'react';
import type {Node} from '../lib/progression';
import {skillState,type SkillCharacter} from '../lib/skill-state';
const icons:Record<string,typeof Music>={Miracles:Sun,Sorts:Sparkles,Pyromancies:Flame,Malédictions:Moon,Mélodies:Music};
export default function SkillProgression({nodes,known,available,character,onSelect,selectedId,toolbar,label}:{nodes:Node[];all?:Node[];label:string;known:Set<string>;available:number;character:SkillCharacter;onSelect:(n:Node)=>void;selectedId?:string;toolbar?:ReactNode}){
 const settings=useCampaignSettings();
 const school=(path:string)=>settings?.categories.find(c=>c.kind==='magic'&&c.baseKey===path);
 const [selectedPath,setSelectedPath]=useState('');
 const ordered:Node[]=[],pending=[...nodes].sort((a,b)=>(a.order??0)-(b.order??0)||a.level-b.level||a.cost-b.cost);
 while(pending.length){const index=pending.findIndex(n=>!n.requires.some(id=>pending.some(p=>p.id===id)));ordered.push(...pending.splice(index<0?0:index,1));}
 const magic=label==='Magie';
 const group=(n:Node)=>n.magicPath||n.classPath||n.racialPath||(n.id.startsWith('class:combat:')?'Talents de combat':magic?'Réserve de focus':n.tier?({base:'Fondamentaux',advanced:'Techniques',expert:'Maîtrises',ultimate:'Maîtrises'})[n.tier]:n.weapon||'Compétences');
 const paths=[...new Set(ordered.map(group))];
 const chosen=(character.unlocks??[]).find((n:Node)=>n.family===label&&(n.magicPath||n.classPath||n.racialPath));
 const chosenPath=chosen?.magicPath||chosen?.classPath||chosen?.racialPath;
 return <section className="c-graph c-magic-tree" aria-label={`Compétences : ${label}`}><div className="c-graph-toolbar">{toolbar}</div>{magic&&<p className="c-magic-intro">Développez votre réserve de FP et choisissez une spécialisation de dégâts.{chosenPath&&<> Voie choisie : <strong>{chosenPath}</strong>.</>}</p>}
 <nav className="c-path-picker" aria-label="Voies de compétences"><button type="button" aria-pressed={!selectedPath} onClick={()=>setSelectedPath('')}>Toutes les voies</button>{paths.map(path=><button key={path} type="button" aria-pressed={selectedPath===path} onClick={()=>setSelectedPath(path)}>{school(path)?.name??path}</button>)}</nav><div className="c-magic-branches">{paths.filter(path=>!selectedPath||path===selectedPath).map(path=>{const branch=ordered.filter(n=>group(n)===path),Icon=icons[path]||(magic?Droplets:branch[0].kind==='rp'?MessageCircle:['stat','bonus'].includes(branch[0].kind)?TrendingUp:Sword);const common=!branch[0].magicPath;return <section className={`c-magic-branch ${chosenPath===path?'chosen':''}`} key={path} data-magic-style={school(path)?.style||undefined} aria-label={school(path)?.name??path}><header><Icon size={23}/><div><h3>{school(path)?.name??path}</h3>{magic&&<p>{common?'Réserve commune':path==='Mélodies'?'Magie des bardes':'Spécialisation magique'}</p>}</div>{chosenPath===path&&<Check size={16} aria-label="Voie choisie"/>}</header><div className="c-magic-ranks">{branch.map((n,i)=>{const state=skillState(n,character,known,available);return <button type="button" key={n.id} className={`c-magic-rank ${state.acquired?'learned':state.available?'available':'locked'} ${n.id===selectedId?'selected':''}`} aria-pressed={n.id===selectedId} aria-label={`${n.name} — ${state.label} — ${n.cost} points`} onClick={()=>onSelect(n)}><span className="c-magic-rank-top"><span>{magic||n.classPath||n.racialPath?`Rang ${i+1}`:'Compétence'}</span><span className="c-skill-cost">{character.mode==='custom'?'Libre':`${n.cost} pts`}</span></span><strong>{['bonus','stat'].includes(n.kind)?`+${n.amount} ${n.stat.startsWith('Dégâts ')?'dégât'+(n.amount>1?'s':''):n.stat}`:n.name}</strong><small>{state.acquired?<Check size={14}/>:!state.available?<Lock size={13}/>:null}{state.label} · Niv. {n.level}</small></button>})}</div></section>})}</div>
 {!nodes.length&&<p className="c-muted">Aucune compétence dans cette catégorie.</p>}
 {magic&&<p className="c-magic-footnote">Les rangs se cumulent. Une seule spécialisation ; toutes les familles de sorts restent utilisables.</p>}</section>;
}
