import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFile,readdir,mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {drizzle} from 'drizzle-orm/d1';

test('création, droits de suppression, corbeille et restauration via les vraies routes',async()=>{
 const sqlite=new DatabaseSync(':memory:');
 for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(await readFile(join('drizzle',file),'utf8'));
 const d1={prepare(query){let params=[];const stmt=sqlite.prepare(query);const obj={bind(...v){params=v;return obj},async raw(){stmt.setReturnArrays(true);return stmt.all(...params)},async all(){return {results:stmt.all(...params),success:true,meta:{}}},async run(){const r=stmt.run(...params);return {success:true,meta:{changes:Number(r.changes)}}}};return obj}};
 globalThis.__cendresTestDb=drizzle(d1);
 const folder=await mkdtemp(resolve('.openai/route-test-'));
 try{
  await build({entryPoints:['app/api/workspace/route.ts'],outfile:join(folder,'route.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'test-db',setup(b){b.onResolve({filter:/^\.\.\/\.\.\/\.\.\/db$/},()=>({path:'db',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const getDb=()=>globalThis.__cendresTestDb;',loader:'js'}));}}]});
  const {POST}=await import(pathToFileURL(join(folder,'route.mjs')).href);
  for(const id of ['gm','alice','bob','outsider']){sqlite.prepare('insert into accounts(id,username,password_hash,salt) values(?,?,?,?)').run(id,id,'unused','unused');sqlite.prepare('insert into sessions(id,account_id,expires) values(?,?,?)').run(createHash('sha256').update(id).digest('hex'),id,Date.now()+60000);}
  const call=async(user,data)=>{const r=await POST(new Request('https://cendres.test/api/workspace',{method:'POST',headers:{'Content-Type':'application/json',cookie:`cendres_session=${user}`},body:JSON.stringify(data)}));return {status:r.status,...await r.json()}};
  const campaign=await call('gm',{op:'createCampaign',name:'Test table'});assert.equal(campaign.status,200);
  const campaignId=campaign.id;
  assert.equal((await call('gm',{op:'addPlayer',campaignId,username:'alice'})).status,200);
  assert.equal((await call('gm',{op:'addPlayer',campaignId,username:'bob'})).status,200);
  const invalid=await call('alice',{op:'createCharacter',campaignId,name:'Hero',stats:{FOR:20,DEX:20,CON:20,INT:20,SAG:20,CHA:20}});assert.equal(invalid.status,400);
  const portrait='data:image/png;base64,iVBORw0KGgo=';
  const created=await call('alice',{op:'createCharacter',campaignId,name:'Hero',race:'Humain',portrait,stats:{FOR:16,DEX:16,CON:16,INT:8,SAG:8,CHA:8},magic:'SAG'});assert.equal(created.status,200,created.error);const id=created.character.id;assert.equal(created.character.portrait,portrait);
  assert.equal((await call('bob',{op:'deleteCharacter',campaignId,id,revision:0,confirmName:'Hero'})).status,403);
  assert.equal((await call('outsider',{op:'campaign',campaignId})).status,403);
  assert.equal((await call('alice',{op:'deleteCharacter',campaignId,id,revision:0,confirmName:'wrong'})).status,400);
  assert.equal((await call('alice',{op:'deleteCharacter',campaignId,id,revision:9,confirmName:'Hero'})).status,409);
  assert.equal((await call('alice',{op:'deleteCharacter',campaignId,id,revision:0,confirmName:'Hero'})).status,200);
  assert.equal((await call('alice',{op:'campaign',campaignId})).characters.length,0);
  assert.equal((await call('alice',{op:'trashCharacters',campaignId})).characters.length,1);
  assert.equal((await call('bob',{op:'trashCharacters',campaignId})).characters.length,0);
  assert.equal((await call('bob',{op:'restoreCharacter',campaignId,id})).status,403);
  assert.equal((await call('gm',{op:'restoreCharacter',campaignId,id})).status,200);
  const restored=(await call('alice',{op:'campaign',campaignId})).characters[0];assert.equal(restored.revision,2);assert.equal(restored.portrait,portrait);
  assert.equal((await call('alice',{op:'saveCharacter',campaignId,id,revision:restored.revision,character:{...restored,notes:'Retrouvé'}})).status,200);
  assert.equal((await call('alice',{op:'deleteCampaign',campaignId,revision:0,confirmName:'Test table'})).status,403);
  assert.equal((await call('gm',{op:'deleteCampaign',campaignId,revision:0,confirmName:'Test table'})).status,200);
  assert.equal((await call('alice',{op:'campaigns'})).campaigns.length,0);
  assert.equal((await call('alice',{op:'campaign',campaignId})).status,404);
  assert.equal((await call('alice',{op:'restoreCampaign',campaignId})).status,403);
  assert.equal((await call('gm',{op:'trashCampaigns'})).campaigns.length,1);
  assert.equal((await call('gm',{op:'restoreCampaign',campaignId})).status,200);
  assert.equal((await call('alice',{op:'campaign',campaignId})).characters[0].notes,'Retrouvé');
  const current=await call('gm',{op:'campaign',campaignId});current.tree.races=['Elfe'];
  assert.equal((await call('gm',{op:'saveCampaign',campaignId,revision:current.campaign.revision,name:current.campaign.name,img:'',tree:current.tree})).status,200);
  assert.equal((await call('alice',{op:'createCharacter',campaignId,name:'Other',race:'Humain',stats:{FOR:16,DEX:16,CON:16,INT:8,SAG:8,CHA:8}})).status,400);
  assert.equal((await call('gm',{op:'removePlayer',campaignId,playerId:'alice'})).status,200);
  assert.equal((await call('alice',{op:'campaign',campaignId})).status,403);
  assert.equal((await call('gm',{op:'campaign',campaignId})).characters.length,1);
 }finally{delete globalThis.__cendresTestDb;sqlite.close();await rm(folder,{recursive:true,force:true});}
});
