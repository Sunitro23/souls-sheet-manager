'use client';
import {useState} from 'react';
import Zone from './technique-zone';
import {effectText} from '../lib/combat';
import {skillTechniques} from '../lib/skill-techniques';
import type {Entry} from '../lib/rules';
import type {Node,Tree} from '../lib/progression';
import {skillState,type SkillCharacter} from '../lib/skill-state';
import {skillBranches,skillCategories,rankLabel} from '../lib/skill-branches';
import {useCampaignSettings} from './campaign-theme';
import {Check,Lock,Plus} from 'lucide-react';
export default function SkillDetails({node,tree,character,known,points,busy,dirty,onUnlock}:{node:Node;tree:Tree;character:SkillCharacter&{inventory?:Entry[]};known:Set<string>;points:number;busy:boolean;dirty:boolean;onUnlock:()=>void}){
 const previews=skillTechniques(node,character.inventory??[],tree);
 const [category,setCategory]=useState(previews[0]?.category??'');
 const technique=previews.find(t=>t.category===category)??previews[0];
 const state=skillState(node,character,known,points);
 const settings=useCampaignSettings();
 const branch=skillBranches(tree.nodes.filter(n=>!n.archived&&!n.draft),node.family??'Compétences').find(branch=>branch.nodes.some(n=>n.id===node.id));
 const path=branch?.name??node.family??'Compétences',pathName=settings?.categories.find(c=>c.kind==='magic'&&c.baseKey===path)?.name??path;
 const effect=['stat','bonus'].includes(node.kind)
  ?node.stat.startsWith('Dégâts ')?`+${node.amount} dégât${node.amount>1?'s':''} aux ${node.stat.slice(7).toLowerCase()}.`:`+${node.amount} ${node.stat}${['HP','FP','END'].includes(node.stat)?' maximum':''}.`
  :node.description.replace(/ Les effets en jeu sont arbitrés par le MJ\.$/,'').trim()||node.name;
 return <><header className="c-detail-hero"><span className="c-eyebrow">{branch?.type??node.family} · {pathName}{branch?.linked&&<> · Rang {rankLabel(branch.ranks.get(node.id)!)}</>}{node.tier&&<> · {skillCategories[node.tier]}</>}</span><h2>{node.name}</h2></header><div className="c-skill-status" role="status" data-state={state.label}>{state.acquired?<Check size={15}/>:state.available?<Plus size={15}/>:<Lock size={14}/>} {state.label} · {character.mode==='custom'?'Acquisition libre':`${node.cost} pts · Niveau ${node.level}`}</div><section className="c-detail-section"><h3>Description et effets</h3>{['stat','bonus'].includes(node.kind)?<><p className="c-prose">{effect}</p>{node.description.trim()&&node.description.trim()!==effect&&<p className="c-prose">{node.description}</p>}</>:<p className="c-prose">{node.description||node.name}</p>}</section>{technique?<div className="c-skill-technique">{previews.length>1?<label className="c-field"><span>Arme</span><select aria-label="Arme du schéma" value={technique.category} onChange={e=>setCategory(e.target.value)}>{previews.map(t=><option key={t.category}>{t.category}</option>)}</select></label>:<p className="c-muted">{technique.category}</p>}<Zone cells={technique.pattern!} origin={technique.origin}/><p>{technique.end} END</p>{effectText(technique.effects)&&<p>{effectText(technique.effects)}</p>}</div>:null}{character.mode==='custom'?<p className="c-muted">Le MJ accorde cette compétence sans coût ni prérequis.</p>:<section className="c-detail-section"><h3>Prérequis</h3><p className="c-muted">Niveau {node.level} · {node.cost} point{node.cost!==1?'s':''}</p>{node.requires.length?<ul className="c-prerequisites">{node.requires.map(id=><li key={id}>{known.has(id)?'✓':'○'} {tree.nodes.find(n=>n.id===id)?.name??character.unlocks?.find(n=>n.id===id)?.name??'Compétence retirée du catalogue'} — {known.has(id)?'acquise':'à acquérir'}</li>)}</ul>:<p className="c-muted">Aucune compétence préalable.</p>}</section>}{state.reasons.length>0&&<section className="c-detail-section"><h3>Pourquoi cette compétence est verrouillée</h3><ul className="c-unlock-reasons">{state.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul></section>}{dirty&&!state.acquired&&<p className="c-muted">Enregistrez les modifications du personnage avant de débloquer une compétence.</p>}<div className="c-detail-actions"><button type="button" className="c-primary" disabled={busy||dirty||!state.available} onClick={onUnlock}>{state.acquired?'Acquise':busy?'Enregistrement…':character.mode==='custom'?'Accorder la compétence':`Débloquer · ${node.cost} pts`}</button></div></>;
}
