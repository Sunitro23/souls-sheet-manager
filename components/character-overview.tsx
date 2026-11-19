'use client';
import {Brain, Footprints, Info, MoveUpRight, Pencil, Skull, UserRound, Weight, Wind} from 'lucide-react';
import type {ReactNode} from 'react';
import {derive, mod, statNames, type Character} from '../lib/rules';
import type {CampaignCharacter} from './character-roster';
import {useCampaignSettings} from './campaign-theme';
import {characterCategoryLabel} from '../lib/campaign-settings';
import ResourceMeter from './resource-meter';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from './ui/tooltip';

const labels: Record<string, string> = {FOR:'Force', DEX:'Dextérité', CON:'Constitution', INT:'Intelligence', SAG:'Sagesse', CHA:'Charisme'};

function SheetHeading({children}: {children: ReactNode}) {
  return <h2 className="c-sheet-heading"><span aria-hidden="true"/><span>{children}</span><span aria-hidden="true"/></h2>;
}

export default function CharacterOverview({character, derived, isGM, busy, onEdit, onIdentity, onStats}: {
  character: CampaignCharacter;
  derived: ReturnType<typeof derive>;
  isGM: boolean;
  busy: boolean;
  onEdit: (patch: Partial<Character>) => void;
  onIdentity: () => void;
  onStats: () => void;
}) {
  const settings=useCampaignSettings();
  const death = character.death ?? 0;
  return <div className="c-sheet-overview">
    <section className="c-sheet-attributes" aria-label="Caractéristiques">
      <SheetHeading>Caractéristiques</SheetHeading>
      <div className="c-ability-grid">{statNames.map(stat => <label className="c-ability" key={stat}>
        <span>{labels[stat]}</span>
        <span className="c-ability-medallion">
        <svg className="c-ability-frame" viewBox="0 0 100 92" fill="none" aria-hidden="true"><path d="M50 2 94 24 94 68 50 90 6 68 6 24Z"/><path d="M50 7 89 27 89 65 50 85 11 65 11 27Z"/></svg>
        <input type="number" inputMode="numeric" aria-label={labels[stat]} min={character.mode==='custom'?1:2} max={character.mode==='custom'?Number.MAX_SAFE_INTEGER:28}
          disabled={!isGM||busy} value={character.stats[stat]} onChange={event=>{
            const value=event.target.valueAsNumber;
            if(Number.isInteger(value)) onEdit({stats:{...character.stats,[stat]:Math.min(character.mode==='custom'?Number.MAX_SAFE_INTEGER:28,Math.max(character.mode==='custom'?1:2,value))}});
          }}/>
        <small className="c-ability-modifier" aria-label={`Modificateur : ${mod(derived.stats[stat])>=0?'+':''}${mod(derived.stats[stat])}`}>{mod(derived.stats[stat])>=0?'+':''}{mod(derived.stats[stat])}</small>
        </span>
        {derived.bonuses[stat]>0&&<small className="c-ability-bonus">{derived.stats[stat]} avec équipement</small>}
      </label>)}</div>
      <div className="c-resource-grid">{(['mana','end'] as const).map(key=><ResourceMeter key={key} kind={key} label={{mana:'FP',end:'END'}[key]} value={character[key]} max={derived[key]} disabled={busy} onChange={value=>onEdit({[key]:value})}/>)}</div>
      <button type="button" className="c-text-button" onClick={onStats}><Info size={15}/>Détails et ajustements</button>
    </section>
    <section className="c-sheet-vitals" aria-label="Portrait et ressources">
      <header className="c-sheet-identity">
        <h1>{character.name}</h1>
        <p>{[characterCategoryLabel(settings,'class',character.className),characterCategoryLabel(settings,'race',character.race)].filter(Boolean).join(' · ')}</p>
        {character.subtitle&&<p className="c-sheet-subtitle">{character.subtitle}</p>}
        <div className="c-sheet-progression">
          <p className="c-sheet-level">Niveau <strong>{character.level}</strong></p>
          <label className="c-sheet-souls">· <span>Âmes</span><input type="number" inputMode="numeric" aria-label="Âmes" style={{width:`${Math.max(3,String(character.souls??0).length+1)}ch`}} min={0} max={Number.MAX_SAFE_INTEGER} step={1} disabled={busy} value={character.souls??0} onChange={event=>{
            const value=event.target.valueAsNumber;
            if(Number.isFinite(value)) onEdit({souls:Math.min(Number.MAX_SAFE_INTEGER,Math.max(0,Math.floor(value)))});
          }}/></label>
        </div>
      </header>
      <div className="c-portrait-stage">
      <button type="button" className={`c-sheet-portrait${character.portrait?'':' is-empty'}`} onClick={onIdentity} aria-label="Modifier le portrait et l’identité">
        {character.portrait?<img src={character.portrait} alt={`Portrait de ${character.name}`}/>:<UserRound size={112} strokeWidth={.7} aria-hidden="true"/>}
        <span><Pencil size={12} aria-hidden="true"/>{character.portrait?'Portrait et identité':'Ajouter un portrait'}</span>
      </button>
      </div>
      <div className="c-sheet-resources" role="group" aria-label="Ressources du personnage">
      <ResourceMeter kind="hp" label="PV" variant="diamond" value={character.hp} max={derived.hp} disabled={busy} onChange={hp=>onEdit({hp})}/>
      </div>
    </section>
    <section className="c-sheet-combat" aria-label="Combat et déplacements">
      <SheetHeading>Combat</SheetHeading>
      <dl className="c-sheet-facts">
        <div className="c-sheet-death" role="group" aria-label="Dégâts mortels">
          <dt className="c-sheet-death-label">Dégâts mortels</dt>
          <dd>
            <TooltipProvider delayDuration={200}><div className="c-sheet-death-marks">{[1,2,3].map(mark=><Tooltip key={mark}>
              <TooltipTrigger asChild><button type="button" aria-label={`Dégât mortel ${mark}`} aria-pressed={death>=mark} disabled={busy} onClick={()=>onEdit({death:death>=mark?mark-1:mark})}><Skull size={25} strokeWidth={1.4} aria-hidden="true"/></button></TooltipTrigger>
              <TooltipContent className="c-sheet-death-tooltip" side="top" sideOffset={8}>Chaque dégât mortel doit laisser une cicatrice au personnage. À 3 dégâts mortels, le personnage est mort.</TooltipContent>
            </Tooltip>)}</div></TooltipProvider>
            <p className="c-sheet-death-status" data-dead={death>=3} role="status">{death>=3?'Game over · Personnage mort':`${death} / 3`}</p>
          </dd>
        </div>
        <div className="c-combat-fact" data-overloaded={derived.overload>0}><dt><Weight size={15} aria-hidden="true"/>Charge équipée</dt><dd><strong>{derived.weight}</strong><span>/ {derived.capacity}</span></dd><progress aria-label={`Charge équipée : ${derived.weight} sur ${derived.capacity}`} value={derived.weight} max={Math.max(1,derived.capacity)}/>{derived.overload>0&&<small>Surcharge : {derived.overload}</small>}</div>
        <div className="c-combat-fact c-memory-fact"><dt><Brain size={15} aria-hidden="true"/>Mémoire</dt><dd><strong>{derived.used}</strong><span>/ {derived.memory}</span></dd><progress aria-label={`Mémoire : ${derived.used} sur ${derived.memory}`} value={derived.used} max={Math.max(1,derived.memory)}/></div>
      </dl>
      <SheetHeading>Déplacements</SheetHeading>
      <div className="c-sheet-movement">{[{label:'Marche',value:derived.move,Icon:Footprints},{label:'Sprint',value:derived.sprint,Icon:Wind},{label:'Esquive',value:derived.dodge,Icon:MoveUpRight}].map(({label,value,Icon})=><div key={label}><Icon size={17} strokeWidth={1.25} aria-hidden="true"/><strong>{value}</strong><span>{label}</span><small>cases</small></div>)}</div>
    </section>
  </div>;
}
