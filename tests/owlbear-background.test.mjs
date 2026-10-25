import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';

test('barre Owlbear : actions sur le participant actif, droits et nettoyage',async()=>{
 const folder=await mkdtemp(resolve('.openai/toolbar-'));
 const oldLocation=globalThis.location;globalThis.location={origin:'https://test.invalid'};
 const state={tools:new Map(),messages:[],payments:[],notices:[],player:'alice',actor:{characterId:'hero',tokenId:'token',playerId:'alice'},pending:null};
 const sdk={isReady:true,player:{getRole:async()=>'PLAYER',getId:async()=>state.player},tool:{create:async tool=>state.tools.set(tool.id,tool),remove:async id=>state.tools.delete(id)},contextMenu:{create:async()=>{},remove:async()=>{}},broadcast:{sendMessage:async(channel,data)=>state.messages.push({channel,data})},notification:{show:async message=>state.notices.push(message)}};
 globalThis.__toolbar={state,sdk};
 try {
  await build({entryPoints:['components/owlbear-background.tsx'],outfile:join(folder,'ui.mjs'),bundle:true,platform:'node',format:'esm',plugins:[{name:'toolbar-mocks',setup(b){
   b.onResolve({filter:/^(react|@owlbear-rodeo\/sdk)$|\/obr\//},args=>({path:args.path,namespace:'mock'}));
   b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:path==='react'?'export const useEffect=fn=>{globalThis.__toolbar.cleanup=fn()};':path==='@owlbear-rodeo/sdk'?'export default globalThis.__toolbar.sdk;':path.endsWith('/connection')?'export const connectOwlbear=async()=>globalThis.__toolbar.sdk;':path.endsWith('/owlbear/actions')?`const s=globalThis.__toolbar.state;export const currentCombat=async()=>({});export const combatCall=async()=>({combat:{},pending:s.pending});export const performCombatAction=async(...args)=>{s.payments.push(args);return true};`:path.endsWith('/core/actions')?'export const activeParticipant=()=>globalThis.__toolbar.state.actor;':path.endsWith('/core/movement')?"export const MOVEMENT_CHANNEL='movement';":'export const registerZoneExpiry=()=>()=>{};export const registerSpellPlacement=async()=>async()=>{};export const registerCombatReactions=async()=>async()=>{};export const registerMovement=async()=>async()=>{};'}));
  }}]});
  const {default:Background}=await import(pathToFileURL(join(folder,'ui.mjs')).href);Background();
  for(let i=0;i<15;i++)await new Promise(resolve=>setImmediate(resolve));
  const buttons=[...state.tools.values()];
  assert.deepEqual(buttons.map(button=>button.icons[0].label),['Se déplacer','Préparer une esquive']);
  await buttons[0].onClick();
  assert.deepEqual(state.messages,[{channel:'movement',data:{characterId:'hero',tokenId:'token'}}]);
  await buttons[1].onClick();
  assert.deepEqual(state.payments,[['hero','token',{kind:'dodge'}]]);
  state.player='bob';await buttons[1].onClick();await buttons[0].onClick();
  assert.equal(state.payments.length,1);assert.equal(state.messages.length,1);assert.match(state.notices.at(-1),/votre tour/);
  state.player='alice';state.pending={};await buttons[1].onClick();assert.equal(state.payments.length,1);
  globalThis.__toolbar.cleanup();
  for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(state.tools.size,0);
 }finally{globalThis.location=oldLocation;delete globalThis.__toolbar;await rm(folder,{recursive:true,force:true})}
});
