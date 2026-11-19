import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {derive,entry,fresh,validate} from '../lib/rules.ts';
import {defaultSettings} from '../lib/campaign-settings.ts';
import {defaultTree} from '../lib/progression.ts';
import {librarySpells,memorizeUnavailableReason,spellFilters,spellSummary} from '../lib/spell-library.ts';

test('bibliothèque : recherche et familles excluent les sorts mémorisés sans mutations',()=>{
 const settings=defaultSettings(),family=settings.categories.find(c=>c.kind==='magic'&&c.baseKey==='Sorts');
 family.name='Arts des cendres';
 const retired={...family,id:'retired-magic',name:'Arts oubliés',archived:true};settings.categories.push(retired);
 const spells=[entry('Éclat de cendre','spell',{school:'Sorts',categoryId:family.id,memorized:true}),entry('Écho ancien','spell',{school:'Sorts',categoryId:retired.id}),entry('Soin','spell',{school:'Miracles'}),entry('Secret inconnu','spell',{known:false}),entry('Sort archivé','spell',{archived:true})];
 const before=structuredClone(spells);
 assert.deepEqual(librarySpells(spells,' ECLAT ',family.id,settings),[]);
 assert.deepEqual(librarySpells(spells.map(s=>({...s,memorized:false})),' ECLAT ',family.id,settings).map(s=>s.name),['Éclat de cendre']);
 assert.equal(librarySpells(spells,'éclat','Miracles',settings).length,0);
 assert.equal(librarySpells(spells,'',retired.id,settings).length,1);
 assert.equal(librarySpells(spells).length,3);
 const filters=spellFilters(spells,settings);
 assert.equal(filters.filter(f=>f.id===family.id).length,1);
 assert.equal(filters.find(f=>f.id===family.id).label,'Arts des cendres');
 assert.equal(filters.find(f=>f.id===retired.id).label,'Arts oubliés');
 assert.deepEqual(spells,before);
});

test('mémorisation : rang et sort inné suivent la validation existante, indépendamment des FP et END',()=>{
 const c=fresh();c.spells=[];
 const capacity=derive(c).memory;
 const occupied=entry('Mémoire occupée','spell',{rank:capacity,memorized:true});c.spells=[occupied];
 const paid=entry('Sort coûteux','spell',{rank:1,mana:100,end:100}),innate=entry('Don inné','spell',{rank:0});
 const before=structuredClone(c);
 assert.match(memorizeUnavailableReason(c,paid),/Mémoire insuffisante/);
 assert.throws(()=>validate(structuredClone({...c,spells:[occupied,{...paid,memorized:true}]}),c,true),/Mémoire insuffisante/);
 assert.equal(memorizeUnavailableReason(c,innate),'');
 assert.doesNotThrow(()=>validate(structuredClone({...c,spells:[occupied,{...innate,memorized:true}]}),c,true));
 assert.deepEqual(c,before);
 c.spells.push({...innate,memorized:true});
 const second=entry('Autre don','spell',{rank:0});
 assert.match(memorizeUnavailableReason(c,second),/Un seul sort inné/);
 assert.throws(()=>validate(structuredClone({...c,spells:[...c.spells,{...second,memorized:true}]}),c,true),/Un seul sort inné/);
 assert.equal(memorizeUnavailableReason(c,c.spells[1]),'');
 c.spells[0].memorized=false;
 assert.equal(memorizeUnavailableReason(c,paid),'');
 assert.doesNotThrow(()=>validate(structuredClone({...c,spells:[...c.spells,{...paid,memorized:true}]}),c,true));
});

test('édition : remplace le coût existant et préserve les restrictions connu et archivé',()=>{
 const c=fresh(),spell=c.spells.find(s=>s.rank===2);
 assert.equal(memorizeUnavailableReason(c,spell),'');
 assert.match(memorizeUnavailableReason(c,{...spell,rank:3}),/Mémoire insuffisante/);
 assert.match(memorizeUnavailableReason(c,{...spell,known:false}),/doit être connu/);
 assert.match(memorizeUnavailableReason(c,{...spell,archived:true}),/archivé/);
 const zeroMemory={...c,stats:{...c.stats,[c.magic]:10},spells:[]};
 assert.equal(derive(zeroMemory).memory,0);
 assert.equal(memorizeUnavailableReason(zeroMemory,entry('Inné','spell',{rank:0})), '');
 assert.match(memorizeUnavailableReason(zeroMemory,entry('Basique','spell')), /Mémoire insuffisante/);
});

test('résumé : dégâts calculés, coûts nuls et effets libres restent distincts de la mémoire',()=>{
 const c=fresh(),spell=entry('Chant','spell',{rank:4,damage:'',mana:0,end:2,effects:'Règle spéciale'});
 assert.match(spellSummary(spell,c),/0 FP/);assert.match(spellSummary(spell,c),/2 END/);assert.match(spellSummary(spell,c),/Règle spéciale/);
 assert.doesNotMatch(spellSummary(spell,c),/4 FP|4 END|— dégâts/);
 c.unlocks=[{kind:'bonus',stat:'Dégâts Sorts',amount:2}];
 assert.match(spellSummary({...spell,damage:'1d6'},c),/1d6\+2 dégâts/);
});

test('rendu Sorts : panneau partagé, capacité, formulaire protégé et propriétés facultatives',async()=>{
 const folder=await mkdtemp(resolve('.openai/spell-render-'));
 try{
  await build({stdin:{contents:"export {default as Inventory} from './components/inventory-panel';export {default as Form} from './components/item-form';",resolveDir:process.cwd(),loader:'tsx'},outfile:join(folder,'components.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',logLevel:'silent'});
  const {Inventory,Form}=await import(pathToFileURL(join(folder,'components.mjs')).href);
  const character=fresh(),tree=defaultTree(),spell=entry('Sort libre','spell',{description:'Récit libre',effects:'Durée : une nuit. Condition : chanter.',mana:0,end:0,pattern:[],target:'',damage:''});character.spells.push(spell);
  const before=structuredClone(character);
  const render=(selected=spell)=>renderToStaticMarkup(React.createElement(Inventory,{mode:'Grimoire',character,tree,derived:derive(character),onEdit:()=>{},onEquip:()=>{},onSaveItem:async()=>true,onDeleteItem:async()=>true,selectedItemId:selected.id}));
  const html=render();
  assert.match(html,/c-inventory-workspace/);assert.match(html,/c-detail-layout has-details/);assert.match(html,/c-detail-sidebar/);
  assert.match(html,/Sorts mémorisés/);assert.match(html,/Bibliothèque/);assert.match(html,/Familles magiques/);assert.match(html,/Rechercher un sort dans la bibliothèque/);
  assert.match(html,/Mémoire utilisée/);assert.match(html,/3 \/ 3/);assert.match(html,/Capacité atteinte/);
  assert.match(html,/<button[^>]*disabled=""[^>]*>Mémoriser<\/button>/);assert.match(html,/Mémoire insuffisante/);
  assert.match(html,/Récit libre/);assert.match(html,/Durée : une nuit/);assert.match(html,/0 FP/);assert.match(html,/0 END/);
  assert.match(html,/c-spell-art/);assert.doesNotMatch(html,/c-open-book|c-book-|<form|<textarea|<dt>Dégâts|Cible et zone d’effet/);
  const memorized=render(character.spells[0]);assert.match(memorized,/>Retirer de la mémoire<\/button>/);
  const memorizedRow=`data-inventory-item="${character.spells[0].id}"`;
  assert.equal(memorized.split(memorizedRow).length-1,1);
  const library=memorized.match(/<section class="c-inventory-bag"[\s\S]*?<\/section>/)[0];
  assert.ok(!library.includes(memorizedRow));
  const form=renderToStaticMarkup(React.createElement(Form,{item:spell,character,onChange:()=>{},onSave:()=>{},busy:false,existing:true}));
  assert.match(form,/<input type="checkbox" disabled=""\/> Mémorisé/);assert.match(form,/Effets du sort/);
  const invalid=renderToStaticMarkup(React.createElement(Form,{item:{...character.spells[1],rank:4},character,onChange:()=>{},onSave:()=>{},busy:false,existing:true}));
  assert.match(invalid,/<button class="c-primary" disabled="">Enregistrer les modifications/);
  const sparse={...spell,mana:undefined,end:undefined,range:undefined,rank:undefined,description:'',effects:''};
  const sparseDetail=renderToStaticMarkup(React.createElement(Inventory,{mode:'Grimoire',character,tree,derived:derive(character),onEdit:()=>{},detailItem:sparse}));
  assert.doesNotMatch(sparseDetail,/undefined|NaN|c-detail-section|c-fact-grid/);
  assert.deepEqual(character,before);
 }finally{await rm(folder,{recursive:true,force:true})}
});
