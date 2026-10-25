import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const settle=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve))};

test('zones révélées : expiration à 5 secondes, reconnexion et conservation des autres éléments',async t=>{
 t.mock.timers.enable({apis:['Date','setTimeout'],now:1000});
 const key='de.sunitro.cendres/spell-zone';
 const folder=await mkdtemp(resolve('.openai/zone-expiry-test-'));
 let items=[{id:'token',metadata:{}},{id:'preview',metadata:{preview:true}},{id:'legacy',metadata:{[key]:{castId:'legacy'}}}];
 let onChange=()=>{};
 globalThis.__expirySdk={scene:{isReady:async()=>true,onReadyChange:()=>()=>{},items:{getItems:async()=>items,deleteItems:async ids=>{items=items.filter(i=>!ids.includes(i.id));onChange()},onChange:callback=>{onChange=callback;return()=>{onChange=()=>{}}}}},notification:{show:async error=>{throw Error(error)}}};
 let stop;
 try{
  await build({entryPoints:['lib/obr/owlbear/zone-expiry.ts'],outfile:join(folder,'expiry.mjs'),bundle:true,platform:'node',format:'esm',plugins:[{name:'sdk',setup(b){b.onResolve({filter:/^@owlbear-rodeo\/sdk$/},()=>({path:'sdk',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export default globalThis.__expirySdk;'}))}}]});
  const {registerZoneExpiry,ZONE_DURATION}=await import(pathToFileURL(join(folder,'expiry.mjs')).href);
  assert.equal(ZONE_DURATION,5000);
  stop=registerZoneExpiry();await settle();
  items.push({id:'attack',metadata:{[key]:{castId:'attack',expiresAt:Date.now()+ZONE_DURATION}}});onChange();await settle();
  assert.ok(!items.some(i=>i.id==='legacy'));
  t.mock.timers.tick(3000);await settle();assert.ok(items.some(i=>i.id==='attack'));
  stop();stop=registerZoneExpiry();await settle();
  t.mock.timers.tick(1999);await settle();assert.ok(items.some(i=>i.id==='attack'));
  t.mock.timers.tick(1);await settle();assert.deepEqual(items.map(i=>i.id),['token','preview']);
  items.push(...['older','newer-a','newer-b'].map((id,index)=>({id,metadata:{[key]:{castId:index===0?'older':'newer',expiresAt:Date.now()+ZONE_DURATION+(index===0?0:1)}}})));
  onChange();await settle();assert.deepEqual(items.map(i=>i.id),['token','preview','newer-a','newer-b']);
  items=items.filter(i=>!i.metadata[key]);
  stop();items.push({id:'expired' ,metadata:{[key]:{expiresAt:Date.now()-1}}});
  stop=registerZoneExpiry();await settle();assert.equal(items.some(i=>i.id==='expired'),false);
 }finally{stop?.();delete globalThis.__expirySdk;await rm(folder,{recursive:true,force:true});t.mock.timers.reset()}
});
