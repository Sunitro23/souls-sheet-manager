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
test('rendu initial : équipement, contenu replié, jauges accessibles et données inchangées',async()=>{
 const folder=await mkdtemp(resolve('.openai/render-test-'));
 try{
 await build({stdin:{contents:"export {default as Inventory} from './components/inventory-panel';export {default as Resource} from './components/resource-meter';export {default as Roster} from './components/character-roster';export {default as Graph} from './components/skill-tree';",resolveDir:process.cwd(),loader:'tsx'},outfile:join(folder,'components.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic'});
 const {Inventory,Resource,Roster,Graph}=await import(pathToFileURL(join(folder,'components.mjs')).href);
 const c=fresh(),tree=defaultTree();c.inventory.push(entry('Dague du sac','weapon',{category:'Dagues',damage:'1d4',description:'Description de la dague',special:{name:'Technique acquise test',description:'Description de la technique',end:2,mana:0,range:1,pattern:[[0,1]],damage:'1d4'}}));tree.nodes.push({...tree.nodes[0],id:'locked-render',name:'Technique verrouillée test',cost:1,kind:'technique',weapon:'Dagues',characterId:undefined});const before=JSON.stringify(c);
 const inventory=renderToStaticMarkup(React.createElement(Inventory,{mode:'Inventaire',character:c,derived:derive(c),tree,onEdit:()=>{},onInspect:()=>{},onEquip:()=>{}}));
 assert.match(inventory,/Objets équipés/);assert.match(inventory,/Arme 1/);assert.match(inventory,/Arme 2/);assert.match(inventory,/Talisman 2/);assert.match(inventory,/c-weapon-techniques" hidden=""/);assert.match(inventory,/Dague du sac/);
 assert.match(inventory,/Technique acquise test/);assert.doesNotMatch(inventory,/Technique verrouillée test|Non équipé|c-item-badges|c-item-facts|À débloquer/);assert.match(inventory,/lucide-clock/);assert.match(inventory,/is-unvalidated/);assert.match(inventory,/1d4 dégâts/);
 const detail=renderToStaticMarkup(React.createElement(Inventory,{mode:'Inventaire',character:c,derived:derive(c),tree,onEdit:()=>{},detailItem:c.inventory.at(-1)}));
 assert.match(detail,/Description de la dague/);assert.doesNotMatch(detail,/Description de la technique|Portée et zone|c-technique-values/);assert.match(detail,/c-technique-grid/);assert.match(detail,/2 END/);assert.match(detail,/patternUnits="userSpaceOnUse"/);assert.match(detail,/Swing/);assert.match(detail,/Estoc/);assert.doesNotMatch(detail,/Technique verrouillée test|c-item-badges|c-item-facts/);
 const grimoire=renderToStaticMarkup(React.createElement(Inventory,{mode:'Grimoire',character:{...c,spells:[]},derived:derive(c),tree,onEdit:()=>{}}));assert.match(grimoire,/Aucun sort dans la bibliothèque/);assert.match(grimoire,/Ajouter un sort/);
 const resource=renderToStaticMarkup(React.createElement(Resource,{label:'PV',value:0,max:30,kind:'hp',disabled:false,onChange:()=>{}}));assert.match(resource,/min="0" max="30"/);assert.match(resource,/aria-label="Retirer 1 PV" disabled/);assert.match(resource,/aria-label="Ajouter 1 PV"/);
 const gm=renderToStaticMarkup(React.createElement(Roster,{characters:[c],members:[],user:{id:'gm',username:'MJ'},isGM:true,onOpen:()=>{}}));assert.doesNotMatch(gm,/c-roster-resources|c-roster-player|Niv\./);assert.match(gm,/c-roster-portraits/);
 const player=renderToStaticMarkup(React.createElement(Roster,{characters:[c],members:[],user:{id:'p',username:'joueur'},isGM:false,onOpen:()=>{}}));assert.doesNotMatch(player,/c-roster-resources/);
 const nodes=tree.nodes.filter(n=>n.family==='Lames'),graph=renderToStaticMarkup(React.createElement(Graph,{nodes,all:nodes,known:new Set(),available:0,character:c,label:'Lames',onSelect:()=>{}}));assert.match(graph,/Compétences : Lames/);assert.match(graph,/Fondamentaux/);assert.match(graph,/Maîtrises/);assert.match(graph,/Swipe/);assert.doesNotMatch(graph,/Zoom avant|Recentrer le graphe|Graphe interactif/);
 assert.equal(JSON.stringify(c),before);
 }finally{await rm(folder,{recursive:true,force:true})}
});
