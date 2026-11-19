'use client';
import {useCampaignSettings} from './campaign-theme';
import {categoryFor} from '../lib/campaign-settings';
import {itemWeight,armors,ranks,type Character,type Entry} from '../lib/rules';
import {bonusText,spellDamage,spellSchool} from '../lib/bonuses';
import {itemAshOfWar} from '../lib/ash-of-war';
import {weaponSummary} from '../lib/weapon-summary';
import type {Tree} from '../lib/progression';
import Zone from './technique-zone';
import ItemArtwork from './item-artwork';
import type {ReactNode} from 'react';

export const itemTypes:Record<string,string>={weapon:'Arme',armor:'Armure',shield:'Bouclier',talisman:'Talisman',consumable:'Consommable',spell:'Sort',catalyst:'Catalyseur / instrument',other:'Objet'};
export default function ItemDetails({item,character,tree,children}:{item:Entry;character:Character;tree:Tree;children?:ReactNode}){
 const settings=useCampaignSettings(),category=categoryFor(settings,item);
 const weapon=item.type==='weapon'?weaponSummary(item,character,tree):null;
 const techniques=weapon?.techniques.filter(t=>t.learned)??[];
 const ash=itemAshOfWar(item),spell=item.type==='spell';
 const bonuses=bonusText(item.bonuses),weight=itemWeight(item);
 const facts:[string,string|number][]=[];
 if(['weapon','shield','spell'].includes(item.type)&&item.damage?.trim())facts.push(['Dégâts',spell?spellDamage(item,character):item.damage]);
 if(spell){
  if(ranks[item.rank])facts.push(['Rang',ranks[item.rank]],['Mémoire',`${item.rank} point${item.rank!==1?'s':''}`]);
  if(Number.isFinite(item.mana))facts.push(['Focus',`${item.mana} FP`]);
  if(Number.isFinite(item.end))facts.push(['Endurance',`${item.end} END`]);
  if(Number.isFinite(item.range))facts.push(['Portée',`${item.range} cases`]);
 }
 else if(Number.isFinite(weight))facts.push(['Poids',`${weight} pds`]);
 if(item.type==='armor'){
  const armor=armors[item.armor];
  if(armor)facts.push(['Armure',armor.name],['PV maximum',`× ${armor.hp}`],['Déplacement',armor.move?`−${armor.move} case${armor.move>1?'s':''}`:'Sans malus'],['Stabilité',armor.stability]);
 }
 return <article className="c-item-detail">
  <header className="c-detail-hero c-item-identity"><ItemArtwork item={item}/><p className="c-eyebrow">{itemTypes[item.type]}{spell?` · ${category?.name??spellSchool(item)}`:category?.name||item.category?` · ${category?.name??item.category}`:''}</p><h2>{item.name||'Sans nom'}</h2>{weapon?.family&&<p className="c-muted">{weapon.family}</p>}</header>
  {facts.length>0&&<dl className="c-fact-grid">{facts.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
  {children}
  {item.description?.trim()&&<section className="c-detail-section"><h3>Description</h3><p className="c-prose">{item.description}</p></section>}
  {item.effects?.trim()&&<section className="c-detail-section"><h3>Effets</h3><p className="c-prose">{item.effects}</p></section>}
  {bonuses&&<section className="c-detail-section"><h3>Bonus d’équipement</h3><p>{bonuses}</p><p className="c-muted">Actifs lorsque l’objet est équipé.</p></section>}
  {spell&&(item.target?.trim()||item.pattern?.length>0)&&<section className="c-detail-section"><h3>Cible et zone d’effet</h3>{item.target?.trim()&&<p>{item.target}</p>}{item.pattern?.length>0&&<><p className="c-muted">Origine : {item.origin==='target'?'cible':'lanceur'}</p><Zone cells={item.pattern} origin={item.origin}/>{item.friendlyFire!==undefined&&<p className="c-muted">{item.friendlyFire?'Affecte aussi les alliés.':'Épargne les alliés.'}</p>}</>}</section>}
  {techniques.length>0&&<section className="c-detail-section"><h3>Techniques acquises</h3><div className="c-detail-techniques">{techniques.map(t=>{const costs=[Number.isFinite(t.end)?`${t.end} END`:'',Number.isFinite(t.mana)?`${t.mana} FP`:'',t.range&&t.range!=='undefined'?`Portée : ${t.range} cases`:''].filter(Boolean);return <article key={t.id}><h4>{t.name}</h4>{costs.length>0&&<p className="c-technique-cost">{costs.join(' · ')}</p>}{t.description?.trim()&&<p className="c-prose">{t.description}</p>}{t.pattern?.length? <Zone cells={t.pattern} origin={t.origin}/>:null}{t.friendlyFire!==undefined&&<p className="c-muted">{t.friendlyFire?'Affecte aussi les alliés.':'Épargne les alliés.'}</p>}</article>})}</div></section>}
  {ash&&<section className="c-detail-section c-ash-detail"><p className="c-eyebrow">Cendre de guerre</p><h3>{ash.name}</h3><dl className="c-fact-grid"><div><dt>Focus</dt><dd>{ash.mana} FP</dd></div><div><dt>Portée</dt><dd>{ash.range} cases</dd></div>{ash.damage&&<div><dt>Dégâts</dt><dd>{ash.damage}</dd></div>}{ash.damageType&&<div><dt>Affinité</dt><dd>{ash.damageType}</dd></div>}</dl>{ash.description?.trim()&&<p className="c-prose">{ash.description}</p>}{ash.pattern.length>0&&<Zone cells={ash.pattern} origin={ash.origin}/>}<p className="c-muted">Origine : {ash.origin==='target'?'cible':'porteur'} · {ash.friendlyFire?'Affecte aussi les alliés.':'Épargne les alliés.'}</p></section>}
 </article>;
}
