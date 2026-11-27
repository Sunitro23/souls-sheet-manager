'use client';
import {useCampaignSettings} from './campaign-theme';
import {Check,Lock,Plus,Music,Flame,Sun,Moon,Sparkles,Droplets,Sword} from 'lucide-react';
import {useIsMobile} from "../hooks/use-mobile";
import type {ReactNode} from 'react';
import type {Node} from '../lib/progression';
import {skillState,type SkillCharacter} from '../lib/skill-state';
import {skillBranches,skillCategories,rankLabel} from '../lib/skill-branches';
const icons:Record<string,typeof Music>={Miracles:Sun,Sorts:Sparkles,Pyromancies:Flame,Malédictions:Moon,Mélodies:Music};

export default function SkillProgression({nodes,known,available,character,onSelect,selectedId,detailsId,detailsOpen=true,toolbar,label}:{nodes:Node[];all?:Node[];label:string;known:Set<string>;available:number;character:SkillCharacter;onSelect:(n:Node)=>void;selectedId?:string;detailsId?:string;detailsOpen?:boolean;toolbar?:ReactNode}){
 const narrow = useIsMobile(760);
 const settings=useCampaignSettings();
 const branches=skillBranches(nodes,label),magic=nodes.some(node=>node.family==='Magie');
 const school=(path:string)=>settings?.categories.find(c=>c.kind==='magic'&&c.baseKey===path);
 return <section className="c-skill-trees" aria-label={`Compétences : ${label}`}>
  <div className="c-skill-toolbar">{toolbar}</div>
  <div className="c-skill-columns" role="region" aria-label="Arbres de progression">
   {branches.map((branch,index)=>{
    const acquired=branch.nodes.filter(node=>known.has(node.id)).length,Icon=icons[branch.name]||(branch.nodes[0].family==='Magie'?Droplets:Sword);
    return <details className="c-skill-tree" open={!narrow || index===0} key={branch.id} aria-label={school(branch.name)?.name??branch.name}>
     <summary className="c-skill-tree-heading"><span className="c-eyebrow">{branch.type}</span><h3><Icon size={18} aria-hidden="true"/>{school(branch.name)?.name??branch.name}</h3><div className="c-skill-progress"><span>Progression</span><strong>{acquired} / {branch.nodes.length}</strong></div><progress value={acquired} max={branch.nodes.length} aria-label={`Progression : ${branch.name}`}/>{!branch.linked&&<small>Choix indépendants</small>}</summary>
     <ol className="c-skill-nodes">{branch.nodes.map(node=>{
      const state=skillState(node,character,known,available),rank=branch.ranks.get(node.id)!;
      return <li key={node.id} className={`c-skill-step ${state.acquired?'learned':state.available?'available':'locked'}`} data-linked={branch.linked}>
       <button type="button" className="c-skill-node" data-skill-id={node.id} aria-pressed={node.id===selectedId} aria-expanded={node.id===selectedId&&detailsOpen} aria-controls={node.id===selectedId&&detailsOpen?detailsId:undefined} aria-label={`${node.name} — ${branch.linked?`Rang ${rankLabel(rank)} — `:''}${state.label} — ${character.mode==='custom'?'Acquisition libre':`${node.cost} points`}`} onClick={()=>onSelect(node)}>
        <span className="c-skill-marker" aria-hidden="true">{state.acquired?<Check size={15}/>:state.available?<Plus size={15}/>:<Lock size={13}/>}</span>
        <span className="c-skill-node-copy"><span className="c-skill-node-meta">{branch.linked?`Rang ${rankLabel(rank)}`:'Talent'}{node.tier&&<> · {skillCategories[node.tier]}</>}</span><strong>{node.name}</strong><span className="c-skill-node-state">{state.label}<span>{character.mode==='custom'?'Libre':state.acquired?'':`${node.cost} pts`}</span></span></span>
       </button>
      </li>;
     })}</ol>
    </details>;
   })}
  </div>
  {!nodes.length&&<p className="c-muted">Aucune voie disponible pour ce personnage.</p>}
  {magic&&<p className="c-skill-footnote">Les rangs se cumulent. Une seule spécialisation ; toutes les familles de sorts restent utilisables.</p>}
 </section>;
}
