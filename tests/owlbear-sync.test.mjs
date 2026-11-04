import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombatSync, emptyCombatSnapshot, COMBAT_POLL_MS } from '../lib/obr/core/combat-sync.ts';

const flush = () => new Promise(resolve => setImmediate(resolve));
test('plusieurs vues partagent une lecture et rejouent un événement reçu pendant la requête', async t => {
  let loads = 0, observed = 0, cleaned = 0, refresh, resolve;
  const sync = createCombatSync(() => { loads++; return new Promise(done => { resolve = done; }); }, async callback => { observed++; refresh = callback; return () => { cleaned++; }; });
  let changes = 0;
  const stopA = sync.subscribe(() => { changes++; }), stopB = sync.subscribe(() => { changes++; });
  t.after(() => { stopA(); stopB(); });
  await flush();
  assert.equal(loads, 1); assert.equal(observed, 1);
  refresh(); refresh();
  resolve({ ...emptyCombatSnapshot, ready: true, playerId: 'alice' }); await flush();
  assert.equal(loads, 2, 'une invalidation pendant la lecture ne doit pas être perdue');
  resolve({ ...emptyCombatSnapshot, ready: true, playerId: 'bob' }); await flush();
  assert.equal(sync.getSnapshot().playerId, 'bob'); assert.equal(changes, 4);
  stopA(); assert.equal(cleaned, 0); stopB(); assert.equal(cleaned, 1);
});

test('rafraîchissement de secours, récupération réseau et réponse ignorée après fermeture', async t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  let loads = 0, fail = false, release;
  const sync = createCombatSync(async () => {
    loads++;
    if (fail) throw Error('Hors ligne');
    if (loads === 4) return new Promise(resolve => { release = resolve; });
    return { ...emptyCombatSnapshot, ready: true, playerId: 'alice' };
  }, async () => () => {});
  const stop = sync.subscribe(() => {}); t.after(stop);
  await flush(); fail = true;
  t.mock.timers.tick(COMBAT_POLL_MS); await flush();
  assert.equal(sync.getSnapshot().error, 'Hors ligne'); assert.equal(sync.getSnapshot().ready, false);
  fail = false; t.mock.timers.tick(COMBAT_POLL_MS); await flush();
  assert.equal(sync.getSnapshot().error, ''); assert.equal(sync.getSnapshot().ready, true);
  t.mock.timers.tick(COMBAT_POLL_MS); await flush(); stop();
  release({ ...emptyCombatSnapshot, playerId: 'stale', ready: true }); await flush();
  assert.equal(sync.getSnapshot(), emptyCombatSnapshot);
  t.mock.timers.tick(COMBAT_POLL_MS); assert.equal(loads, 4);
});

test('lectures réseau concurrentes mutualisées, puis invalidées après une mutation', async()=>{
 const {build}=await import('esbuild');
 const {mkdtemp,rm}=await import('node:fs/promises');
 const {resolve,join}=await import('node:path');
 const {pathToFileURL}=await import('node:url');
 const folder=await mkdtemp(resolve('.openai/combat-reads-'));
 const calls=[];globalThis.__combatReads={call:request=>new Promise(done=>calls.push({request,done}))};
 try{
  await build({stdin:{contents:"export {combatCall} from './lib/obr/owlbear/actions';",resolveDir:process.cwd(),loader:'ts'},outfile:join(folder,'api.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'reads',setup(b){
   b.onResolve({filter:/workspace-client$|^@owlbear-rodeo\/sdk$/},args=>({path:args.path,namespace:'fixture'}));
   b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({contents:path.endsWith('workspace-client')?'export const workspaceCall=request=>globalThis.__combatReads.call(request);export const characterForOwlbear=async()=>({});':'export default {};export const buildShape=()=>{},buildPath=()=>{},isImage=()=>false,Command={};'}));
  }}]});
  const {combatCall}=await import(pathToFileURL(join(folder,'api.mjs')).href);
  const combat={campaignId:'campaign',id:'combat'};
  const first=combatCall(combat,'get'),second=combatCall(combat,'get');
  assert.equal(first,second);assert.equal(calls.length,1);
  const mutation=combatCall(combat,'action');
  const fresh=combatCall(combat,'get');assert.notEqual(first,fresh);assert.equal(calls.length,3);
  calls[0].done({combatState:{revision:0}});calls[1].done({combatState:{revision:1}});calls[2].done({combatState:{revision:1}});
  await Promise.all([first,second,mutation,fresh]);
  const next=combatCall(combat,'get');assert.equal(calls.length,4,'aucune réponse périmée ne reste en cache');
  calls[3].done({combatState:{revision:2}});assert.equal((await next).revision,2);
 }finally{delete globalThis.__combatReads;await rm(folder,{recursive:true,force:true});}
});
