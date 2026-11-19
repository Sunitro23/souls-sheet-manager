'use client';
import {useCampaignSettings} from './campaign-theme';
import {categoryFor} from '../lib/campaign-settings';
import {spellSchool} from '../lib/bonuses';
import {spellIconSource} from '../lib/spell-icons';
import type {Entry} from '../lib/rules';

export default function SpellIcon({spell,school}:{spell?:Entry;school?:string}){
 const settings=useCampaignSettings(),category=spell?categoryFor(settings,spell):settings?.categories.find(c=>c.kind==='magic'&&(c.id===school||c.baseKey===school));
 const family=category?.baseKey||(spell?spellSchool(spell):school)||'Sorts';
 return <img className="c-spell-art" data-school={family} src={spellIconSource(family,category?.spellIcon)} width={96} height={96} loading="lazy" decoding="async" alt="" aria-hidden="true"/>;
}
