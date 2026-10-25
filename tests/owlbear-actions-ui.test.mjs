import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {fresh} from '../lib/rules.ts';

test('Owlbear weapon preview requires explicit confirmation and can be cancelled',async()=>{
 const folder=await mkdtemp(resolve('.openai/owlbear-actions-ui-'));
 const previousWindow=globalThis.window,previousDocument=globalThis.document,previousStorage=globalThis.sessionStorage;
 const listeners={addEventListener(){},removeEventListener(){}};
 globalThis.window=listeners;globalThis.document=listeners;globalThis.sessionStorage={getItem:()=>null};
 const character={...fresh(),id:'hero',revision:1};
 const actor={id:'hero',characterId:'hero',tokenId:'hero-token',playerId:'alice',camp:'Joueurs',name:'Hero'};
 const enemy={id:'enemy',characterId:'enemy',tokenId:'enemy-token',playerId:'gm',camp:'Ennemis',name:'Chevalier'};
 const ally={id:'ally',characterId:'ally',tokenId:'ally-token',camp:'Joueurs',name:'Allié'};
 const combat={id:'combat',turn:0,phase:'ready',participants:[actor,enemy,ally],initiative:{rolls:[{participantId:'hero',d20:20},{participantId:'enemy',d20:1},{participantId:'ally',d20:1}],tieOrder:['hero','enemy','ally']}};
 const data={characterId:'hero',revision:1,weapons:[{id:character.inventory[0].id,name:'Épée longue',techniques:[{name:'Estoc',end:1,mana:0,pattern:[[0,-1]]}]},{id:'second',name:'Dague',techniques:[{name:'Estoc',end:1,mana:0,pattern:[[0,-1]]}]}],spells:[]};
 const state={runtime:{combat,state:{combat,revision:1,pending:null,resolution:null},playerId:'alice',ready:true,error:''},data,payments:[],clears:0,fail:false,enemyCell:{x:0,y:-1}};
 const hooks=[];let cursor=0,effects=[];
 const equal=(a,b)=>a&&b&&a.length===b.length&&a.every((value,i)=>Object.is(value,b[i]));
 globalThis.__actionsUI={state,
  useState(initial){const index=cursor++;hooks[index]??={value:initial};return [hooks[index].value,value=>{hooks[index].value=typeof value==='function'?value(hooks[index].value):value}];},
  useRef(initial){const index=cursor++;hooks[index]??={current:initial};return hooks[index];},
  useEffect(fn,deps){const index=cursor++;if(!equal(hooks[index]?.deps,deps)){const old=hooks[index];hooks[index]={deps,cleanup:old?.cleanup};effects.push(()=>{old?.cleanup?.();hooks[index].cleanup=fn()});}},
 };
 try{
  await build({entryPoints:['components/owlbear-tools.tsx'],outfile:join(folder,'ui.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',plugins:[{name:'ui-mocks',setup(b){
   b.onResolve({filter:/\/node_modules\/react\/index\.js$/},args=>({path:args.path,external:true}));
   b.onResolve({filter:/^react$/},()=>({path:'react',namespace:'mock'}));
   b.onResolve({filter:/use-owlbear-combat$|workspace-client$|^@owlbear-rodeo\/sdk$|\/owlbear\/(token|preview|actions)$|\/core\/links$/},args=>({path:args.path,namespace:'mock'}));
   b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:path==='react'?`export * from '${resolve('node_modules/react/index.js')}';export const {useState,useEffect,useRef}=globalThis.__actionsUI;`:path.endsWith('use-owlbear-combat')?'export const useOwlbearCombat=()=>globalThis.__actionsUI.state.runtime;':path.endsWith('workspace-client')?'export const characterForOwlbear=async()=>globalThis.__actionsUI.state.data;export const workspaceCall=async()=>({});':path==='@owlbear-rodeo/sdk'?`export const buildPath=()=>{},Command={},isImage=()=>false;const stop=()=>()=>{};export default {player:{getRole:async()=>'PLAYER',getId:async()=>'alice',onChange:stop},scene:{items:{onChange:callback=>{globalThis.__actionsUI.state.sceneChanged=callback;return()=>{}}},onReadyChange:stop,grid:{onChange:stop}},broadcast:{sendMessage:async()=>{},onMessage:stop}};`:path.endsWith('/token')?`export const characterToken=async()=>({id:'hero-token'}),selectedToken=async()=>({id:'hero-token'}),characterTokens=async()=>[{id:'hero-token',name:'Hero'}],tokenOrigin=async()=>({origin:{x:0,y:0},dpi:100,rotation:0});`:path.endsWith('/preview')?`export class Preview{async clear(){globalThis.__actionsUI.state.clears++}async show(fn){await fn()}}export const buildPattern=()=>[];`:path.endsWith('/actions')?`const s=globalThis.__actionsUI.state;export const boardSnapshot=async()=>({board:['enemy','ally'].map(id=>({tokenId:id+'-token',cell:id==='enemy'?s.enemyCell:{x:0,y:-1}}))});export const performCombatAction=async(...args)=>{if(s.fail)throw Error('Action refusée');s.payments.push(args);return true};`:'export const sharedLink=()=>null;export const TOKEN_LINK_KEY="link";'}));
  }}]});
  const {default:Tools}=await import(pathToFileURL(join(folder,'ui.mjs')).href);
  const props={character,characters:[character],section:'Actions',canAssign:false,onCharacter:async()=>{},onSection:()=>{}};
  const render=()=>{cursor=0;effects=[];const tree=Tools(props);effects.forEach(fn=>fn());return tree;};
  const settle=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
  const nodes=(node)=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...nodes(node.props?.children)];
  const text=node=>node==null||typeof node==='boolean'?'':typeof node==='string'||typeof node==='number'?String(node):Array.isArray(node)?node.map(text).join(''):text(node.props?.children);
  const button=(tree,label)=>nodes(tree).find(node=>node.props?.['aria-label']===label||node.type==='button'&&text(node).startsWith(label));
  render();await settle();let tree=render();await settle();tree=render();
  assert.ok(nodes(tree).some(node=>node.type==='h3'&&text(node)==='Épée longue'));
  assert.ok(nodes(tree).some(node=>node.type==='h3'&&text(node)==='Dague'));
  await button(tree,'Estoc').props.onClick();tree=render();
  assert.equal(state.payments.length,0);
  assert.match(text(tree),/Cibles : Chevalier/);assert.doesNotMatch(text(tree),/Cibles : .*Allié/);
  assert.match(text(tree),/Dégâts/);
  assert.match(text(tree),/Confirmer l’attaque · 1 END/);
  state.enemyCell={x:2,y:2};state.sceneChanged();await settle();tree=render();
  assert.match(text(tree),/Cibles : aucune dans la zone/);
  state.enemyCell={x:0,y:-1};state.sceneChanged();await settle();tree=render();
  assert.match(text(tree),/Cibles : Chevalier/);
  await button(tree,'Estoc').props.onClick();assert.equal(state.payments.length,0);
  const beforeCancel=state.clears;
  await button(tree,'Annuler').props.onClick();await settle();tree=render();
  assert.equal(button(tree,'Confirmer l’attaque'),undefined);assert.equal(state.payments.length,0);assert.ok(state.clears>beforeCancel);
  await button(tree,'Estoc').props.onClick();tree=render();
  await button(tree,'Confirmer l’attaque').props.onClick();await settle();tree=render();
  assert.deepEqual(state.payments,[['hero','hero-token',{kind:'weapon',weaponId:data.weapons[0].id,index:0}]]);
  assert.match(text(tree),/Attaque envoyée/);assert.equal(button(tree,'Confirmer l’attaque'),undefined);
  await button(tree,'Estoc').props.onClick();tree=render();state.fail=true;
  await button(tree,'Confirmer l’attaque').props.onClick();await settle();tree=render();
  assert.ok(nodes(tree).some(node=>node.props?.role==='alert'&&text(node)==='Action refusée'));
  assert.ok(button(tree,'Confirmer l’attaque'));
  state.runtime={...state.runtime,combat:{...combat,turn:1},state:{...state.runtime.state,combat:{...combat,turn:1}}};
  tree=render();assert.equal(button(tree,'Estoc').props.disabled,true);assert.equal(button(tree,'Confirmer l’attaque'),undefined);
 }finally{
  for(const hook of hooks)hook?.cleanup?.();
  await new Promise(resolve=>setImmediate(resolve));
  delete globalThis.__actionsUI;globalThis.window=previousWindow;globalThis.document=previousDocument;globalThis.sessionStorage=previousStorage;
  await rm(folder,{recursive:true,force:true});
 }
});
