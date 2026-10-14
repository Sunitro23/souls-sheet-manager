'use client';
import {useState} from 'react';
import Zone from './technique-zone';
import {effectText} from '../lib/combat';
import {skillTechniques} from '../lib/skill-techniques';
import type {Entry} from '../lib/rules';
import type {Node,Tree} from '../lib/progression';
import {skillState,type SkillCharacter} from '../lib/skill-state';
export default function SkillDetails({node,tree,character,known,points,busy,dirty,onUnlock}:{node:Node;tree:Tree;character:SkillCharacter&{inventory?:Entry[]};known:Set<string>;points:number;busy:boolean;dirty:boolean;onUnlock:()=>void}){
 const previews=skillTechniques(node,character.inventory??[],tree);
 const [category,setCategory]=useState(previews[0]?.category??'');
 const technique=previews.find(t=>t.category===category)??previews[0];
 const state=skillState(node,character,known,points);
 const effect=['stat','bonus'].includes(node.kind)
  ?node.stat.startsWith('Dégâts ')?`+${node.amount} dégât${node.amount>1?'s':''} aux ${node.stat.slice(7).toLowerCase()}.`:`+${node.amount} ${node.stat}${['HP','FP','END'].includes(node.stat)?' maximum':''}.`
  :node.description.replace(/ Les effets en jeu sont arbitrés par le MJ\.$/,'').trim()||node.name;
 return <>{technique?<div className="c-skill-technique">{previews.length>1?<label className="c-field"><span>Arme</span><select aria-label="Arme du schéma" value={technique.category} onChange={e=>setCategory(e.target.value)}>{previews.map(t=><option key={t.category}>{t.category}</option>)}</select></label>:<p className="c-muted">{technique.category}</p>}<Zone cells={technique.pattern!} origin={technique.origin}/><p>{technique.end} END</p>{effectText(technique.effects)&&<p>{effectText(technique.effects)}</p>}</div>:<p className="c-detail-description">{effect}</p>}<button type="button" className="c-primary c-full" disabled={busy||dirty||!state.available} onClick={onUnlock}>{state.acquired?'Acquise':busy?'Enregistrement…':`Débloquer · ${node.cost} pts`}</button></>;
}
