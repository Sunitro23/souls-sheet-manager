'use client';
import {Check,Lock,Sword,Sparkles,MessageCircle,TrendingUp,Crown} from 'lucide-react';
import {matchesCharacter,type Node} from '../lib/progression';
import {layoutTree} from '../lib/tree-layout';
export default function SkillTree({nodes,all,known,available,character,onSelect,label}:{nodes:Node[];all:Node[];known:Set<string>;available:number;character:any;onSelect:(n:Node)=>void;label:string}){
 const {points,edges,height}=layoutTree(nodes,all);
 if(!nodes.length)return <div className="c-empty"><p>Aucun déblocage.</p></div>;
 return <div className="skill-map" style={{height}} aria-label={`Arbre : ${label}`}>
 <svg className="skill-lines" viewBox={`0 0 320 ${height}`} preserveAspectRatio="none" aria-hidden="true">{edges.filter(e=>!e.root).map(e=>{const fromY=e.from.y+(e.root?17:30),toY=e.to.y-30,mid=(fromY+toY)/2;return <path key={e.id} className={known.has(e.to.node.id)?'learned':''} d={e.root?`M 160 ${fromY} L 160 ${toY-28} Q 160 ${toY-12}, ${e.to.x} ${toY-12} L ${e.to.x} ${toY}`:`M ${e.from.x} ${fromY} C ${e.from.x} ${mid}, ${e.to.x} ${mid}, ${e.to.x} ${toY}`}/>})}</svg>
 
 {points.map(({node:n,x,y,external})=>{const acquired=known.has(n.id),eligible=!n.draft&&matchesCharacter(n,character)&&character.level>=n.level&&n.requires.every(id=>known.has(id))&&(!n.className||n.className===character.className)&&(!n.race||n.race===character.race)&&available>=n.cost;const Icon=n.tier==='expert'?Crown:n.kind==='stat'?TrendingUp:n.kind==='rp'?MessageCircle:n.kind==='competence'?Sparkles:Sword;return <button key={n.id} className={`skill-point ${n.tier==='expert'?'expert':''} ${acquired?'learned':eligible?'available':'locked'}`} style={{left:`${x/320*100}%`,top:y}} onClick={()=>onSelect(n)} aria-label={`${n.name} — ${acquired?'Acquis':eligible?'Disponible':'Verrouillé'}`}><span className="skill-bubble"><Icon size={23}/><span className="skill-state">{acquired?<Check size={12}/>:eligible?<span>{n.cost}</span>:<Lock size={10}/>}</span></span><span className="skill-name">{n.name}</span>{n.draft&&<small>À définir</small>}{external&&<small>{n.weapon||'Prérequis'}</small>}</button>})}
 </div>
}
