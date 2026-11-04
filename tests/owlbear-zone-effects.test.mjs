import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const settle=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve))};

test('zones : onde locale, fondu, reconnexion, mouvements réduits et nettoyage',async t=>{
 t.mock.timers.enable({apis:['Date','setTimeout'],now:1000});
 const folder=await mkdtemp(resolve('.openai/zone-effects-test-'));
 const key='de.sunitro.cendres/spell-zone';
 const zone=(id,x=0,expiresAt=6000)=>({id,type:'PATH',visible:true,layer:'DRAWING',position:{x,y:0},style:{fillOpacity:0.14,strokeOpacity:0.65,strokeWidth:2},metadata:{[key]:{castId:'cast',expiresAt}}});
 let shared=[zone('near'),zone('far',100),{...zone('hidden'),visible:false},{...zone('preview'),metadata:{preview:true}}],local=[];
 let onChange=()=>{},onScene=()=>{},motionChange=()=>{},ready=true,updates=0,reads=0;
 const original=structuredClone(shared);
 const oldMedia=globalThis.matchMedia;
 const media={matches:false,addEventListener:(_,cb)=>{motionChange=cb},removeEventListener:()=>{motionChange=()=>{}}};
 globalThis.matchMedia=()=>media;
 globalThis.__zoneEffects={scene:{isReady:async()=>ready,onReadyChange:cb=>{onScene=cb;return()=>{onScene=()=>{}}},items:{
  getItems:async()=>{reads++;return structuredClone(shared)},onChange:cb=>{onChange=cb;return()=>{onChange=()=>{}}},
  addItems:async()=>{throw Error('Animations must not publish items')},updateItems:async()=>{throw Error('Animations must not change shared items')},deleteItems:async()=>{throw Error('Animations must not delete shared items')},
 },local:{getItems:async filter=>local.filter(filter),addItems:async items=>{local.push(...structuredClone(items))},deleteItems:async ids=>{local=local.filter(i=>!ids.includes(i.id))},updateItems:async(ids,fn,fast)=>{assert.equal(fast,true);updates++;fn(local.filter(i=>ids.includes(i.id)))}}}};
 let stop;
 const advance=async ms=>{t.mock.timers.tick(ms);await settle()};
 try{
  await build({entryPoints:['lib/obr/owlbear/zone-effects.ts'],outfile:join(folder,'effects.mjs'),bundle:true,platform:'node',format:'esm',plugins:[{name:'sdk',setup(b){b.onResolve({filter:/^@owlbear-rodeo\/sdk$/},()=>({path:'sdk',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:"export default globalThis.__zoneEffects; export const isPath=item=>item.type==='PATH';"}))}}]});
  const {registerZoneEffects}=await import(pathToFileURL(join(folder,'effects.mjs')).href);
  stop=registerZoneEffects();await settle();
  assert.equal(local.length,2,'only revealed, visible zones animate');
  assert.deepEqual(local.map(i=>i.attachedTo),['near','far']);
  assert.ok(local.every(i=>i.disableHit&&i.locked&&!i.metadata[key]));
  const ids=local.map(i=>i.id);
  await advance(120);
  assert.ok(local[0].style.fillOpacity>local[1].style.fillOpacity,'impact travels across the area');
  assert.ok(local[0].style.strokeWidth>2);
  await advance(580);
  const quietUpdates=updates;
  await advance(2000);
  assert.equal(updates,quietUpdates,'no frame updates while the zone is stable');
  assert.equal(reads,1,'animation does not poll shared items');
  assert.deepEqual(local.map(i=>i.id),ids,'stable overlay IDs');
  assert.deepEqual(shared,original,'no mutation of the shared scene');
  stop();await settle();assert.equal(local.length,0);
  stop=registerZoneEffects();await settle();
  assert.equal(local[0].style.fillOpacity,0.08,'reopening does not replay impact');
  await advance(1900);
  assert.ok(local[0].style.fillOpacity>0&&local[0].style.fillOpacity<0.08,'fade before the original deadline');
  await advance(400);assert.equal(local.length,0,'local effects expire without a shared deletion event');
  shared=[zone('next',0,Date.now()+5000)];onChange();await settle();
  media.matches=true;motionChange();await settle();
  assert.equal(local[0].style.fillOpacity,0.14);assert.equal(local[0].style.strokeOpacity,0.65);
  const stillUpdates=updates;await advance(1000);assert.equal(updates,stillUpdates,'reduced motion is static');
  media.matches=false;motionChange();await settle();assert.equal(local[0].style.fillOpacity,0.08);
  shared=[];onChange();await settle();assert.equal(local.length,0,'manual removal clears overlays');
  shared=[zone('scene',0,Date.now()+5000)];onChange();await settle();assert.equal(local.length,1);
  ready=false;onScene();await settle();local=[];
  ready=true;shared=[];onScene();await settle();assert.equal(local.length,0);
  stop();await settle();const finalUpdates=updates;await advance(10000);assert.equal(updates,finalUpdates);
  let release;
  shared=[zone('late',0,Date.now()+5000)];
  globalThis.__zoneEffects.scene.local.addItems=async items=>{await new Promise(resolve=>{release=resolve});local.push(...items)};
  stop=registerZoneEffects();await settle();assert.ok(release);
  stop();release();await settle();assert.equal(local.length,0,'unmount during a slow add leaves no effects');
 }finally{stop?.();await settle();globalThis.matchMedia=oldMedia;delete globalThis.__zoneEffects;t.mock.timers.reset();await rm(folder,{recursive:true,force:true})}
});
