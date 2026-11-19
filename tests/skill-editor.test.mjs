import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createSkill,copySkill,saveSkill,prerequisiteOptions} from '../lib/skill-editor.ts';
import {defaultTree,validateTree} from '../lib/progression.ts';
import {defaultSettings,makeCategory} from '../lib/campaign-settings.ts';
import {syncRaceSettings} from '../lib/race-settings.ts';

test('les modèles créent des compétences valides dans la race, classe ou voie choisie',()=>{
 for(const scope of [{family:'Race',race:'Robot'},{family:'Classe',className:'Warrior',path:'Gardien'},{family:'Magie',path:'Miracles'},{family:'Personnel',characterId:'hero'}]){
  for(const template of ['innate','stat','unlock']){
   const node={...createSkill(scope,template),name:'Nouvelle compétence'};
   assert.doesNotThrow(()=>validateTree(saveSkill(defaultTree(),node)));
   assert.equal(node.cost,template==='innate'?0:1);
   assert.equal(node.draft,true);
   if(scope.race)assert.equal(node.race,scope.race);
   if(scope.className)assert.equal(node.className,scope.className);
   if(scope.characterId)assert.equal(node.characterId,scope.characterId);
   if(scope.family==='Magie')assert.equal(node.magicPath,scope.path);
  }
 }
});
test('une évolution conserve son contexte et dépend de sa compétence précédente',()=>{
 const node={...createSkill({family:'Race',race:'Robot',path:'Métal'}),name:'Blindage',level:3,draft:false};
 const next=copySkill(node,true);
 assert.notEqual(next.id,node.id);assert.deepEqual(next.requires,[node.id]);
 assert.equal(next.race,'Robot');assert.equal(next.racialPath,'Métal');assert.equal(next.level,4);
 assert.equal(next.draft,true);
 assert.doesNotThrow(()=>saveSkill(saveSkill(defaultTree(),node),next));
 const copy=copySkill({...node,archived:true,archivedByRace:true});
 assert.equal(copy.archived,false);assert.equal(copy.archivedByRace,undefined);
});
test('les prérequis proposés excluent les descendants et les autres races',()=>{
 const first={...createSkill({family:'Race',race:'Robot'}),name:'Base'};
 const second=copySkill(first,true),third=copySkill(second,true);
 const other={...createSkill({family:'Race',race:'Human'}),name:'Autre race'};
 const tree={...defaultTree(),nodes:[first,second,third,other]};
 assert.deepEqual(prerequisiteOptions(tree,first),[]);
 assert.deepEqual(prerequisiteOptions(tree,third).map(node=>node.id),[first.id,second.id]);
 assert.throws(()=>saveSkill(tree,{...first,requires:[third.id]}),/boucle/);
});
test('l’éditeur affiche la liste et le formulaire ensemble, y compris dans une fiche de race',async()=>{
 const folder=await mkdtemp(resolve('.openai/skill-editor-test-'));
 try{
  await build({stdin:{contents:"export {default as Skills} from './components/admin/skills';export {default as Catalog} from './components/admin/catalog';",resolveDir:process.cwd(),loader:'tsx'},outfile:join(folder,'components.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic'});
  const {Skills,Catalog}=await import(pathToFileURL(join(folder,'components.mjs')).href);
  const settings=defaultSettings(),race={...makeCategory('race','Robot'),traits:'Corps mécanique.',weaknesses:'Vulnérable à la foudre.'};
  settings.categories.push(race);
  const tree=syncRaceSettings(defaultTree(),settings),node=tree.nodes.find(node=>node.race==='Robot');
  const workspace={campaign:{id:'campaign',name:'Table',img:'',revision:0,isGM:true},settings,tree,characters:[],members:[],history:[]};
  const props={workspace,busy:false,onDirty:()=>{},onSave:()=>{}};
  const before=JSON.stringify(workspace);
  const html=renderToStaticMarkup(React.createElement(Skills,{...props,target:{page:'skills',family:'Race',race:'Robot',selected:node.id}}));
  assert.match(html,/adm-skill-list/);assert.match(html,/id="admin-skill-editor"/);
  assert.match(html,/<textarea[^>]*>Corps mécanique\.\nVulnérable à la foudre\.<\/textarea>/);
  assert.match(html,/Ajouter une évolution/);assert.match(html,/Effet sur les personnages/);
  assert.doesNotMatch(html,/Appliquer au brouillon|Enregistrer les changements|Modifier la compétence/);
  const creation=renderToStaticMarkup(React.createElement(Skills,{...props,initialCreate:true,target:{page:'skills',family:'Race',race:'Robot'}}));
  assert.match(creation,/Trait inné/);assert.match(creation,/Bonus de caractéristique/);assert.match(creation,/Capacité à débloquer/);
  assert.match(creation,/<option value="Robot" selected="">Robot/);
  const catalog=renderToStaticMarkup(React.createElement(Catalog,{...props,onSaveTree:()=>{},kinds:['race','class'],target:{page:'creation',kind:'race',selected:race.id}}));
  assert.match(catalog,/Compétences de Robot/);assert.match(catalog,/Identité et disponibilité/);
  assert.doesNotMatch(catalog,/Voir les compétences de cette|Appliquer au brouillon/);
  assert.doesNotMatch(catalog,/<textarea[^>]*>Corps mécanique\./);
  assert.equal(JSON.stringify(workspace),before);
  const archived=structuredClone(workspace);
  archived.settings.categories.find(category=>category.id===race.id).archived=true;
  archived.tree=syncRaceSettings(archived.tree,archived.settings);
  const archive=renderToStaticMarkup(React.createElement(Catalog,{...props,workspace:archived,onSaveTree:()=>{},kinds:['race','class'],target:{page:'creation',kind:'race',selected:race.id}}));
  assert.match(archive,/<option value="archived" selected="">Archives/);
  assert.match(archive,/Traits raciaux/);
  assert.match(archive,/Restaurez-la pour ajouter ou publier des compétences/);
  const archivedEditor=renderToStaticMarkup(React.createElement(Skills,{...props,workspace:archived,target:{page:'skills',family:'Race',race:'Robot',selected:node.id}}));
  assert.match(archivedEditor,/<button[^>]*disabled=""[^>]*>Dupliquer<\/button>/);
 }finally{await rm(folder,{recursive:true,force:true})}
});
