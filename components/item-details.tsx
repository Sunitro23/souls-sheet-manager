'use client';
import {useCampaignSettings} from './campaign-theme';
import {categoryFor} from '../lib/campaign-settings';
import {itemWeight,armors,ranks,type Character,type Entry} from '../lib/rules';
import {bonusText,spellDamage,spellSchool} from '../lib/bonuses';
import {itemAshOfWar} from '../lib/ash-of-war';
import {weaponSummary} from '../lib/weapon-summary';
import type {Tree} from '../lib/progression';
import Zone from './technique-zone';

export const itemTypes:Record<string,string>={weapon:'Arme',armor:'Armure',shield:'Bouclier',talisman:'Talisman',consumable:'Consommable',spell:'Sort',catalyst:'Catalyseur / instrument',other:'Objet'};
export default function ItemDetails({item,character,tree}:{item:Entry;character:Character;tree:Tree}){
 const settings=useCampaignSettings(),category=categoryFor(settings,item);
 const weapon=item.type==='weapon'?weaponSummary(item,character,tree):null;
 const techniques=weapon?.techniques.filter(t=>t.learned)??[];
 const ash=itemAshOfWar(item),spell=item.type==='spell';
 const facts:[string,string|number][]=[];
 if(['weapon','shield','spell'].includes(item.type))facts.push(['Dégâts',spell?spellDamage(item,character):item.damage||'—']);
 if(spell)facts.push(['Rang',ranks[item.rank]],['Focus',`${item.mana} FP`],['Endurance',`${item.end} END`],['Portée',`${item.range} cases`]);
 else facts.push(['Poids',`${itemWeight(item)} pds`]);
 if(item.type==='armor')facts.push(['Armure',armors[item.armor]?.name??'—']);
 return <article className="c-item-detail">
  <header className="c-detail-hero"><p className="c-eyebrow">{itemTypes[item.type]}{spell?` · ${category?.name??spellSchool(item)}`:item.category?` · ${category?.name??item.category}`:''}</p><h2>{item.name||'Sans nom'}</h2><p className="c-muted">{weapon?.family&&`${weapon.family} · `}{{approved:'Validé par le MJ',pending:'En attente de validation',rejected:'Refusé par le MJ'}[item.status]}</p></header>
  <dl className="c-fact-grid">{facts.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  {item.description&&<section className="c-detail-section"><h3>Description</h3><p className="c-prose">{item.description}</p></section>}
  {item.effects&&<section className="c-detail-section"><h3>Effets</h3><p className="c-prose">{item.effects}</p></section>}
  {bonusText(item.bonuses)&&<section className="c-detail-section"><h3>Bonus d’équipement</h3><p>{bonusText(item.bonuses)}</p><p className="c-muted">Actifs lorsque l’objet est équipé et validé.</p></section>}
  {spell&&<section className="c-detail-section"><h3>Cible et zone d’effet</h3><p>{item.target||'Cible non précisée'} · Origine : {item.origin==='target'?'cible':'porteur'}</p>{item.pattern?.length>0&&<Zone cells={item.pattern} origin={item.origin}/>}<p className="c-muted">{item.friendlyFire?'Affecte aussi les alliés.':'Épargne les alliés.'}</p></section>}
  {techniques.length>0&&<section className="c-detail-section"><h3>Techniques acquises</h3><div className="c-detail-techniques">{techniques.map(t=><article key={t.id}><h4>{t.name}</h4><p className="c-technique-cost">{t.end!==undefined?`${t.end} END`:'Coût END non défini'}{t.mana?` · ${t.mana} FP`:''}{t.range!==undefined?` · Portée : ${t.range} cases`:''}</p><p className="c-prose">{t.description}</p>{t.pattern?.length? <Zone cells={t.pattern} origin={t.origin}/>:null}{t.friendlyFire!==undefined&&<p className="c-muted">{t.friendlyFire?'Affecte aussi les alliés.':'Épargne les alliés.'}</p>}</article>)}</div></section>}
  {ash&&<section className="c-detail-section c-ash-detail"><p className="c-eyebrow">Cendre de guerre</p><h3>{ash.name}</h3><dl className="c-fact-grid"><div><dt>Focus</dt><dd>{ash.mana} FP</dd></div><div><dt>Portée</dt><dd>{ash.range} cases</dd></div>{ash.damage&&<div><dt>Dégâts</dt><dd>{ash.damage}</dd></div>}{ash.damageType&&<div><dt>Affinité</dt><dd>{ash.damageType}</dd></div>}</dl>{ash.description&&<p className="c-prose">{ash.description}</p>}{ash.pattern.length>0&&<Zone cells={ash.pattern} origin={ash.origin}/>}<p className="c-muted">Origine : {ash.origin==='target'?'cible':'porteur'} · {ash.friendlyFire?'Affecte aussi les alliés.':'Épargne les alliés.'}</p></section>}
 </article>;
}
