import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fresh} from '../lib/rules.ts';
import {defaultTree} from '../lib/progression.ts';
import {resolve,join} from 'node:path';
import {mkdtemp,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

test('rafraîchir la fiche Owlbear verrouille les statistiques jusqu’à la réponse',async()=>{
 const folder=await mkdtemp(resolve('.openai/sheet-refresh-'));
 const character={...fresh(),id:'hero',campaignId:'campaign',revision:1};
 const workspace={campaign:{id:'campaign',isGM:true},characters:[character],tree:defaultTree(),settings:{}};
 const hooks=[];let cursor=0,release,loads=0;
 const calls=[];
 const seed=[true,true,{id:'user'},true,false,false,'','',[],workspace];
 globalThis.__sheetRefresh={
  useState(initial){const i=cursor++;if(!(i in hooks)){let value=i<seed.length?seed[i]:typeof initial==='function'?initial():initial;if(value?.getSnapshot){value.open(character);globalThis.__sheetRefresh.editor=value;}hooks[i]=value;}return [hooks[i],value=>{hooks[i]=typeof value==='function'?value(hooks[i]):value}];},
  useRef(initial){const i=cursor++;return hooks[i]??=( {current:initial} );},
  useEffect(){},useMemo:fn=>fn(),useSyncExternalStore:(_subscribe,get)=>get(),
  info:()=>new Promise(r=>{loads++;release=r}),
  api:async request=>{calls.push(request);if(request.op==='campaign')return workspace;if(request.op==='saveCharacter')return {character:{...request.character,revision:2}};throw Error('Unexpected '+request.op);},
 };
 try{
  await build({entryPoints:['app/page.tsx'],outfile:join(folder,'ui.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',plugins:[{name:'sheet',setup(b){
   b.onResolve({filter:/\/node_modules\/react\/index\.js$/},args=>({path:args.path,external:true}));
   b.onResolve({filter:/^react$/},()=>({path:'react',namespace:'mock'}));
   b.onResolve({filter:/^\.\.\/components\//},args=>({path:args.path,namespace:'component'}));
   b.onResolve({filter:/workspace-client$/},()=>({path:'workspace',namespace:'mock'}));
   b.onResolve({filter:/\/obr\/connection$/},()=>({path:'connection',namespace:'mock'}));
   b.onLoad({filter:/.*/,namespace:'component'},({path})=>({contents:`export default ${JSON.stringify(path.split('/').at(-1))};`}));
   b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:path==='react'?`export * from '${resolve('node_modules/react/index.js')}';export const {useState,useRef,useEffect,useMemo,useSyncExternalStore}=globalThis.__sheetRefresh;`:path==='workspace'?'export const workspaceCall=(...args)=>globalThis.__sheetRefresh.api(...args),characterForOwlbear=(...args)=>globalThis.__sheetRefresh.info(...args);':'export const connectOwlbear=async()=>null;'}));
  }}]});
  const {default:Page}=await import(pathToFileURL(join(folder,'ui.mjs')).href);
  const nodes=node=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...nodes(node.props?.children)];
  const render=()=>{cursor=0;return nodes(Page({})).find(node=>node.type==='owlbear-panel');};
  let panel=render();const staleEdit=panel.props.onEdit;
  const refresh=panel.props.onCharacter('hero');
  await panel.props.onCharacter('hero');
  assert.equal(loads,1,'deux événements rapprochés ne démarrent pas deux chargements');
  panel=render();assert.equal(panel.props.busy,true,'les statistiques doivent être désactivées pendant le chargement');
  staleEdit({hp:1});
  assert.equal(calls.filter(call=>call.op==='saveCharacter').length,0,'un ancien gestionnaire ne peut pas lancer une sauvegarde concurrente');
  release({campaignId:'campaign'});await refresh;
  panel=render();assert.equal(panel.props.busy,false);
  panel.props.onEdit({hp:2});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls.filter(call=>call.op==='saveCharacter').length,1);
  assert.equal(globalThis.__sheetRefresh.editor.getSnapshot().character.hp,2);
  globalThis.__sheetRefresh.info=async()=>{throw Error('Réseau indisponible')};
  await render().props.onCharacter('hero');
  assert.equal(render().props.busy,false,'un chargement échoué libère le verrou');
  assert.equal(globalThis.__sheetRefresh.editor.getSnapshot().character.hp,2,'la fiche reste disponible après l’échec');
 }finally{delete globalThis.__sheetRefresh;await rm(folder,{recursive:true,force:true});}
});
