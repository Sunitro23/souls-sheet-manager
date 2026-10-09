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
 const c=fresh(),tree=defaultTree();c.inventory.push(entry('Dague du sac','weapon',{category:'Dagues',damage:'1d4'}));const before=JSON.stringify(c);
 const inventory=renderToStaticMarkup(React.createElement(Inventory,{mode:'Inventaire',character:c,derived:derive(c),tree,onEdit:()=>{},onInspect:()=>{},onEquip:()=>{}}));
 assert.match(inventory,/Objets équipés/);assert.match(inventory,/Arme 1/);assert.match(inventory,/Arme 2/);assert.match(inventory,/Talisman 2/);assert.match(inventory,/c-weapon-techniques" hidden=""/);assert.match(inventory,/Dague du sac/);
 const grimoire=renderToStaticMarkup(React.createElement(Inventory,{mode:'Grimoire',character:{...c,spells:[]},derived:derive(c),tree,onEdit:()=>{}}));assert.match(grimoire,/Votre grimoire est vide/);assert.match(grimoire,/Ajouter un sort/);
 const resource=renderToStaticMarkup(React.createElement(Resource,{label:'PV',value:0,max:30,kind:'hp',disabled:false,onChange:()=>{}}));assert.match(resource,/min="0" max="30"/);assert.match(resource,/aria-label="Retirer 1 PV" disabled/);assert.match(resource,/aria-label="Ajouter 1 PV"/);
 const gm=renderToStaticMarkup(React.createElement(Roster,{characters:[c],members:[],user:{id:'gm',username:'MJ'},isGM:true,onOpen:()=>{}}));assert.match(gm,/c-roster-resources/);
 const player=renderToStaticMarkup(React.createElement(Roster,{characters:[c],members:[],user:{id:'p',username:'joueur'},isGM:false,onOpen:()=>{}}));assert.doesNotMatch(player,/c-roster-resources/);
 const nodes=tree.nodes.filter(n=>n.family==='Lames'),graph=renderToStaticMarkup(React.createElement(Graph,{nodes,all:nodes,known:new Set(),available:0,character:c,label:'Lames',onSelect:()=>{}}));assert.match(graph,/Zoom avant/);assert.match(graph,/Recentrer le graphe/);assert.match(graph,/Adapter/);assert.match(graph,/Graphe interactif de compétences/);
 assert.equal(JSON.stringify(c),before);
 }finally{await rm(folder,{recursive:true,force:true})}
});
