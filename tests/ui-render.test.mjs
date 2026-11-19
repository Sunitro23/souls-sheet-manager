import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fresh,derive,entry} from '../lib/rules.ts';
import {defaultTree} from '../lib/progression.ts';
test('rendu initial : équipement, consultation, jauges accessibles et données inchangées',async()=>{
 const folder=await mkdtemp(resolve('.openai/render-test-'));
 try{
 await build({stdin:{contents:"export {default as Inventory} from './components/inventory-panel';export {default as Resource} from './components/resource-meter';export {default as Roster} from './components/character-roster';export {default as Graph} from './components/skill-tree';export {default as SkillDetails} from './components/skill-details';export {default as ItemForm} from './components/item-form';export {default as Creation} from './components/character-creation';",resolveDir:process.cwd(),loader:'tsx'},outfile:join(folder,'components.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic'});
 const {Inventory,Resource,Roster,Graph,SkillDetails,ItemForm,Creation}=await import(pathToFileURL(join(folder,'components.mjs')).href);
 const c=fresh(),tree=defaultTree();c.inventory.push(entry('Dague du sac','weapon',{category:'Dagues',damage:'1d4',description:'Description de la dague',special:{name:'Technique acquise test',description:'Description de la technique',end:2,mana:0,range:1,pattern:[[0,1]],damage:'1d4'}}));tree.nodes.push({...tree.nodes[0],id:'locked-render',name:'Technique verrouillée test',cost:1,kind:'technique',weapon:'Dagues',characterId:undefined});const before=JSON.stringify(c);
 const inventory=renderToStaticMarkup(React.createElement(Inventory,{mode:'Inventaire',character:c,derived:derive(c),tree,onEdit:()=>{},onInspect:()=>{},onEquip:()=>{}}));
 assert.match(inventory,/Objets équipés/);assert.match(inventory,/Arme 1/);assert.match(inventory,/Arme 2/);assert.match(inventory,/Talisman 2/);assert.match(inventory,/Dague du sac/);
 assert.match(inventory,/Rechercher un objet dans le sac/);assert.match(inventory,/Catégories du sac/);assert.doesNotMatch(inventory,/Technique acquise test|c-loadout-portrait/);assert.doesNotMatch(inventory,/Technique verrouillée test|Non équipé|c-item-badges|c-item-facts|À débloquer/);assert.doesNotMatch(inventory,/lucide-clock|is-unvalidated/);assert.match(inventory,/1d4 dégâts/);
 const selected=renderToStaticMarkup(React.createElement(Inventory,{mode:'Inventaire',character:c,derived:derive(c),tree,onEdit:()=>{},onEquip:()=>{},onDeleteItem:async()=>true,selectedItemId:c.inventory.at(-1).id}));
 assert.match(selected,/c-detail-sidebar/);assert.match(selected,/Description de la dague/);assert.match(selected,/Modifier/);assert.match(selected,/Supprimer/);assert.match(selected,/aria-pressed="true"/);assert.doesNotMatch(selected,/<form|<textarea/);
 const detail=renderToStaticMarkup(React.createElement(Inventory,{mode:'Inventaire',character:c,derived:derive(c),tree,onEdit:()=>{},detailItem:c.inventory.at(-1)}));
 assert.match(detail,/Description de la dague/);assert.match(detail,/Description de la technique/);assert.match(detail,/Techniques acquises/);assert.match(detail,/c-detail-techniques/);assert.match(detail,/2 END/);assert.match(detail,/patternUnits="userSpaceOnUse"/);assert.match(detail,/Swing/);assert.match(detail,/Estoc/);assert.doesNotMatch(detail,/Technique verrouillée test|c-item-badges|c-item-facts/);
 assert.doesNotMatch(detail,/Coût END non défini/);
 const sparse=entry('Objet sans texte','weapon',{category:'Singulier',description:' \n ',effects:'  ',damage:''}),sparseBefore=JSON.stringify(sparse);
 const sparseDetail=renderToStaticMarkup(React.createElement(Inventory,{mode:'Inventaire',character:c,derived:derive(c),tree,onEdit:()=>{},detailItem:sparse}));
 assert.doesNotMatch(sparseDetail,/<h3>(Description|Effets|Bonus d’équipement|Techniques acquises)|<dt>Dégâts|c-detail-section/);assert.match(sparseDetail,/<dt>Poids/);assert.equal(JSON.stringify(sparse),sparseBefore);
 const zeroCost=entry('Technique gratuite','weapon',{category:'Singulier',techniques:[{name:'Geste silencieux',description:' ',end:0,mana:0,range:0,pattern:[],friendlyFire:false}]});
 const zeroDetail=renderToStaticMarkup(React.createElement(Inventory,{mode:'Inventaire',character:c,derived:derive(c),tree,onEdit:()=>{},detailItem:zeroCost}));
 assert.match(zeroDetail,/0 END · 0 FP · Portée : 0 cases/);assert.doesNotMatch(zeroDetail,/c-prose|Coût END non défini/);
 const grimoire=renderToStaticMarkup(React.createElement(Inventory,{mode:'Grimoire',character:{...c,spells:[]},derived:derive(c),tree,onEdit:()=>{}}));assert.match(grimoire,/Aucun sort dans la bibliothèque/);assert.match(grimoire,/Créer un sort/);
 const resource=renderToStaticMarkup(React.createElement(Resource,{label:'PV',value:0,max:30,kind:'hp',disabled:false,onChange:()=>{}}));assert.match(resource,/min="0" max="30"/);assert.match(resource,/aria-label="Retirer 1 PV" disabled/);assert.match(resource,/aria-label="Ajouter 1 PV"/);
 const gm=renderToStaticMarkup(React.createElement(Roster,{characters:[c],members:[],user:{id:'gm',username:'MJ'},isGM:true,onOpen:()=>{}}));assert.doesNotMatch(gm,/c-roster-resources|c-roster-player|Niv\./);assert.match(gm,/c-roster-portraits/);
 const player=renderToStaticMarkup(React.createElement(Roster,{characters:[c],members:[],user:{id:'p',username:'joueur'},isGM:false,onOpen:()=>{}}));assert.doesNotMatch(player,/c-roster-resources/);
 const nodes=tree.nodes.filter(n=>n.family==='Lames'),graph=renderToStaticMarkup(React.createElement(Graph,{nodes,all:nodes,known:new Set(),available:0,character:c,label:'Lames',onSelect:()=>{}}));assert.match(graph,/Compétences : Lames/);assert.match(graph,/Fondamentaux/);assert.match(graph,/Maîtrises/);assert.match(graph,/Swipe/);assert.doesNotMatch(graph,/Zoom avant|Recentrer le graphe|Graphe interactif|c-skill-legend|États des compétences/);
 const locked={...nodes[0],id:'locked-test',cost:3,level:10,requires:['missing-test']};
 const lockedTree=renderToStaticMarkup(React.createElement(Graph,{nodes:[locked],known:new Set(),available:0,character:c,label:'Lames',selectedId:locked.id,detailsId:'skill-details',onSelect:()=>{}}));
 assert.match(lockedTree,/aria-controls="skill-details"/);assert.match(lockedTree,/aria-pressed="true"/);assert.match(lockedTree,/Verrouillée/);assert.doesNotMatch(lockedTree,/disabled=/);assert.match(lockedTree,/<progress value="0" max="1"/);
 const lockedDetails=renderToStaticMarkup(React.createElement(SkillDetails,{node:locked,tree,character:c,known:new Set(),points:0,busy:false,dirty:false,onUnlock:()=>{}}));
 assert.match(lockedDetails,/Niveau 10 requis/);assert.match(lockedDetails,/3 points supplémentaires nécessaires/);assert.match(lockedDetails,/Compétence retirée du catalogue/);assert.match(lockedDetails,/disabled=""/);
 const customDetails=renderToStaticMarkup(React.createElement(SkillDetails,{node:{...locked,draft:false,archived:false},tree,character:{...c,mode:'custom'},known:new Set(),points:0,busy:false,dirty:false,onUnlock:()=>{}}));assert.match(customDetails,/Accorder la compétence/);assert.doesNotMatch(customDetails,/Pourquoi cette compétence est verrouillée|<h3>Prérequis/);
 const acquiredDetails=renderToStaticMarkup(React.createElement(SkillDetails,{node:locked,tree,character:c,known:new Set(['locked-test']),points:0,busy:false,dirty:false,onUnlock:()=>{}}));
 assert.match(acquiredDetails,/Acquise/);assert.doesNotMatch(acquiredDetails,/Pourquoi cette compétence est verrouillée/);
 const bonus={...locked,kind:'bonus',stat:'FP',amount:2,description:'Une description complète. Une restriction à conserver.'};
 const bonusDetails=renderToStaticMarkup(React.createElement(SkillDetails,{node:bonus,tree,character:c,known:new Set(),points:0,busy:false,dirty:false,onUnlock:()=>{}}));assert.match(bonusDetails,/\+2 FP maximum/);assert.match(bonusDetails,/Une description complète\. Une restriction à conserver\./);
 for(const type of ['weapon','armor','talisman','consumable','spell','shield','catalyst','other']){
  const item=entry(`Objet ${type}`,type,{description:'Histoire conservée',effects:'Effet distinct'});
  const form=renderToStaticMarkup(React.createElement(ItemForm,{item,onChange:()=>{},onSave:()=>{},onDelete:()=>{},busy:false,existing:false}));
  assert.match(form,/Informations générales/);assert.match(form,type==='spell'?/Effets du sort/:/Effets de l’objet/);assert.doesNotMatch(form,/Validation MJ|validation|Supprimer cet objet/);assert.match(form,type==='spell'?/Créer le sort/:/Créer l’objet/);
  if(type==='spell'){assert.match(form,/Coût en focus/);assert.match(form,/Famille magique/);assert.match(form,/aria-label="Zone du sort"/);assert.match(form,/Cible à distance/);assert.equal((form.match(/aria-pressed=/g)??[]).length,81);assert.doesNotMatch(form,/Ajouter un bonus|Classe d’armure/)}
  else {assert.match(form,/Ajouter un bonus/);assert.doesNotMatch(form,/Coût en focus/)}
  if(!['weapon','shield'].includes(type))assert.doesNotMatch(form,/Associer une cendre/);
  const sheet=renderToStaticMarkup(React.createElement(Inventory,{mode:type==='spell'?'Grimoire':'Inventaire',character:c,derived:derive(c),tree,onEdit:()=>{},detailItem:item}));
  assert.match(sheet,/Histoire conservée/);assert.match(sheet,/Effet distinct/);assert.doesNotMatch(sheet,/<input|<textarea|Utiliser|Déclencher/);
 }
 const creation=renderToStaticMarkup(React.createElement(Creation,{races:['Giant'],suggestions:[],members:[],user:{id:'p',username:'Joueur'},isGM:false,busy:false,onCreate:()=>{}}));
 assert.match(creation,/Votre personnage/);assert.match(creation,/36 points à répartir/);assert.match(creation,/Affinité magique/);assert.match(creation,/Enraciné/);assert.doesNotMatch(creation,/<summary>(Affinité magique|Aptitudes|Traits)/);
 assert.equal(JSON.stringify(c),before);
 }finally{await rm(folder,{recursive:true,force:true})}
});
