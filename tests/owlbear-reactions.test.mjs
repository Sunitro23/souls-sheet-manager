import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const settle=async()=>{for(let i=0;i<15;i++)await new Promise(resolve=>setImmediate(resolve))};

test('Owlbear : choix secret, déplacement avant révélation, reprise sans doublon',async()=>{
 const folder=await mkdtemp(resolve('.openai/reactions-test-'));
 const oldLocation=globalThis.location;globalThis.location={origin:'https://test.invalid'};
 const combat={id:'combat',participants:[{id:'attacker',playerId:'alice'},{id:'defender',playerId:'bob',tokenId:'token'}]};
 const state={view:{combat,revision:1,dodges:{defender:1},pending:{id:'attack',actorId:'attacker',defenders:['defender'],answered:[]},resolution:null},playerId:'bob',role:'PLAYER',tool:'select',callbacks:new Map(),items:[{id:'token',position:{x:50,y:50},metadata:{}}],events:[],failAck:true};
 const sdk={interaction:{startItemInteraction:async token=>{const draft=structuredClone(token);return [update=>update(draft),()=>{}]}},party:{getPlayers:async()=>[]},player:{getId:async()=>state.playerId,getRole:async()=>state.role},room:{onMetadataChange:()=>()=>{}},
  scene:{grid:{getDpi:async()=>100,onChange:()=>()=>{}},items:{onChange:()=>()=>{},getItems:async ids=>state.items.filter(i=>!ids||ids.includes(i.id)),updateItems:async(ids,change)=>{state.events.push('move');change(state.items.filter(i=>ids.includes(i.id)))},deleteItems:async ids=>{state.items=state.items.filter(item=>!ids.includes(item.id))},addItems:async items=>{state.events.push('reveal');state.items.push(...items)}}},
  notification:{show:async message=>{(state.notifications??=[]).push(message)}},action:{close:async()=>{},open:async()=>{state.opened=true}},broadcast:{sendMessage:async(channel,data)=>{state.events.push({channel,data})},onMessage:(key,cb)=>{state.callbacks.set(key,cb);return()=>state.callbacks.delete(key)}},
  tool:{createMode:async mode=>{state.mode=mode},create:async()=>{},remove:async()=>{},removeMode:async()=>{},getActiveTool:async()=>state.tool,activateTool:async tool=>{state.tool=tool}}};
 globalThis.__reactionTest={state,sdk,mutate:async(_view,command,data)=>{
  if(command==='answer'){state.answer=data;return state.view;}
  if(command==='ack'){state.events.push('ack');if(state.failAck)throw Error('Network interrupted');state.view.resolution=null;return state.view;}
 }};
 let stop;
 try{
  await build({entryPoints:['lib/obr/owlbear/reactions.ts'],outfile:join(folder,'reactions.mjs'),bundle:true,platform:'node',format:'esm',plugins:[{name:'mocks',setup(b){
   b.onResolve({filter:/^@owlbear-rodeo\/sdk$/},()=>({path:'sdk',namespace:'mock'}));
   b.onResolve({filter:/^\.\/actions$/},()=>({path:'actions',namespace:'mock'}));
   b.onResolve({filter:/^\.\/preview$/},()=>({path:'preview',namespace:'mock'}));
   b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:path==='sdk'?'export default globalThis.__reactionTest.sdk;':path==='actions'?`export async function currentCombat(){return globalThis.__reactionTest.state.view.combat} export async function combatCall(){return structuredClone(globalThis.__reactionTest.state.view)} export async function boardSnapshot(){return {dpi:100,board:[{tokenId:'token',cell:{x:0,y:0},position:{x:50,y:50}}]}} export const mutateCombat=(...args)=>globalThis.__reactionTest.mutate(...args);`:`export async function showAttackPreview(){} export class Preview {async clear(){globalThis.__reactionTest.state.preview=[]} async show(resolve){globalThis.__reactionTest.state.preview=await resolve()}} export const PREVIEW_KEY='preview'; export function buildPattern(origin,dpi,technique){return technique.pattern.map(([x,y])=>({id:crypto.randomUUID(),metadata:{preview:true},position:{x:x*dpi,y:y*dpi}}))}`}));
  }}]});
  const {registerCombatReactions,DODGE_CHANNEL}=await import(pathToFileURL(join(folder,'reactions.mjs')).href);
  stop=await registerCombatReactions();await settle();
  assert.equal(state.opened,true);
  state.playerId='alice';state.role='GM';state.opened=false;
  await stop();stop=await registerCombatReactions();await settle();
  assert.equal(state.opened,false,'le MJ ne reçoit pas la demande du défenseur');
  state.callbacks.get(DODGE_CHANNEL)({data:{participantId:'defender',attackId:'attack'}});await settle();
  assert.equal(state.tool,'select','le MJ ne choisit pas la destination du joueur');
  state.playerId='bob';state.role='PLAYER';
  state.callbacks.get('de.sunitro.cendres/combat-refresh')({});await settle();
  assert.equal(state.opened,true);
  assert.ok(state.events.some(event=>event.channel==='de.sunitro.cendres/attack-threat'&&event.data.participantIds.includes('defender')));
  state.events=[];
  state.callbacks.get(DODGE_CHANNEL)({data:{participantId:'defender',attackId:'attack'}});await settle();
  assert.equal(state.preview.length,8,'huit cases d’esquive prévisualisées');
  await state.mode.onToolClick({}, {pointerPosition:{x:250,y:50}});
  assert.deepEqual(state.answer,{participantId:'defender',attackId:'attack',destination:{x:2,y:0}});
  assert.equal(state.items.length,1);assert.deepEqual(state.items[0].position,{x:50,y:50});
  state.view.pending=null;state.view.resolution={id:'attack',actorId:'attacker',name:'Frappe',cells:[{x:0,y:0},{x:1,y:0}],dpi:100,moves:[{tokenId:'token',position:{x:250,y:50},positions:[{x:50,y:50},{x:150,y:50},{x:250,y:50}]}]};
  const refresh=()=>{state.callbacks.get('de.sunitro.cendres/combat-refresh')({});return settle()};
  await refresh();assert.equal(state.items.length,1,'defender does not resolve the attack');
  state.items.push({id:'old-zone',metadata:{'de.sunitro.cendres/spell-zone':{castId:'old',casterId:'bob'}}});
  state.playerId='alice';await refresh();
  for(let i=0;i<200&&!state.events.includes('ack');i++)await new Promise(resolve=>setTimeout(resolve,5));
  assert.deepEqual(state.events.filter(e=>typeof e==='string'),['move','move','reveal','ack']);
  assert.deepEqual(state.items[0].position,{x:250,y:50});
  assert.equal(state.items.length,3);
  assert.ok(state.items.slice(1).every(i=>!i.metadata.preview&&i.layer==='DRAWING'&&i.disableHit===false&&i.metadata['de.sunitro.cendres/spell-zone'].castId==='attack'));
  const ids=state.items.map(i=>i.id);
  state.failAck=false;await refresh();
  for(let i=0;i<200&&state.view.resolution;i++)await new Promise(resolve=>setTimeout(resolve,5));
  assert.deepEqual(state.items.map(i=>i.id),ids);
  assert.deepEqual(state.items[0].position,{x:250,y:50});
  assert.equal(state.view.resolution,null);
  assert.equal(state.items[0].rotation,90);
  assert.equal(state.events.filter(e=>e==='move').length,2,'aucun déplacement répété lors de la reprise');
  state.view.unpreparedHit={id:'no-dodge',defenders:['defender']};
  state.playerId='bob';
  await refresh();await refresh();
  assert.equal(state.opened,true,'ouvrir le panneau pour afficher l’attaque sans esquive');
  assert.equal((state.notifications??[]).length,0,'aucune popup de réaction');
  state.playerId='alice';
  const beforeTurn={...state.items[0].position};
  state.view.resolution={id:'turn',actorId:'attacker',name:'Se tourner',cells:[],dpi:1,moves:[],facing:{tokenId:'token',rotation:270}};
  await refresh();
  assert.equal(state.items[0].rotation,270);
  assert.deepEqual(state.items[0].position,beforeTurn,'se tourner ne déplace pas le pion');
  assert.equal(state.view.resolution,null);
 }finally{await stop?.();globalThis.location=oldLocation;delete globalThis.__reactionTest;await rm(folder,{recursive:true,force:true})}
});

 test('réactions : seul le joueur ciblé reçoit les boutons',async()=>{
 const folder=await mkdtemp(resolve('.openai/reaction-ui-test-'));
 try {
  await build({entryPoints:['components/owlbear-reactions.tsx'],outfile:join(folder,'ui.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',plugins:[{name:'sdk',setup(b){b.onResolve({filter:/lib\/obr\/owlbear\/(actions|reactions)$/},args=>({path:args.path,external:true}));b.onResolve({filter:/^@owlbear-rodeo\/sdk$/},()=>({path:'sdk',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export default {}; export const buildPath=()=>{}, Command={}, isImage=()=>false;'}));}}]});
  const [{default:Reactions},{default:React},{renderToStaticMarkup}]=await Promise.all([import(pathToFileURL(join(folder,'ui.mjs')).href),import('react'),import('react-dom/server')]);
  const state={combat:{participants:[{id:'baboon',name:'Baboon',playerId:'bob'}]},dodges:{baboon:1},pending:{id:'attack',defenders:['baboon'],answered:[]}};
  const render=(playerId,gm)=>renderToStaticMarkup(React.createElement(Reactions,{state,playerId,gm}));
  assert.doesNotMatch(render('sun',true),/<button/);
  assert.match(render('bob',false),/Ne pas esquiver/);
  state.combat.participants[0].playerId='sun';
  assert.match(render('sun',true),/Ne pas esquiver/);
  state.pending=null;state.lastAttack={id:'attack',name:'Frappe',hitParticipants:['baboon']};
  assert.match(render('anyone',false),/Touchés : Baboon/);
  state.lastAttack.hitParticipants=[];
  assert.match(render('anyone',false),/Aucun participant touché/);
 } finally {await rm(folder,{recursive:true,force:true});}
 });
