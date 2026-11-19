'use client';
import {Sparkles} from 'lucide-react';
import type {Character,Entry} from '../lib/rules';
import {spellFamily,spellSummary} from '../lib/spell-library';
import {useCampaignSettings} from './campaign-theme';
import CollectionRow from './collection-row';

export default function GrimoireLoadout({character,onInspect,selectedId,detailsId,detailsOpen}:{character:Character;onInspect:(item:Entry)=>void;selectedId?:string;detailsId?:string;detailsOpen?:boolean}){
 const settings=useCampaignSettings(),spells=character.spells.filter(s=>s.memorized&&!s.archived);
 return <section className="c-inventory-loadout" aria-label="Sorts mémorisés"><div className="c-inventory-heading"><h3>Mémoire</h3><span>{spells.length} sort{spells.length!==1?'s':''}</span></div><div className="c-equipped-list">{spells.map(spell=><CollectionRow key={spell.id} item={spell} onSelect={onInspect} selectedId={selectedId} detailsId={detailsId} detailsOpen={detailsOpen} category={spellFamily(spell,settings).label} summary={spellSummary(spell,character)} status="Mémorisé" className="c-equipped-row is-occupied"/>)}</div>{!spells.length&&<div className="c-inventory-empty"><Sparkles size={26}/><p>Aucun sort mémorisé.</p><span>Choisissez un sort dans la bibliothèque.</span></div>}</section>;
}
