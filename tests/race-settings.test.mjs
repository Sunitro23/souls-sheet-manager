import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFile,readdir,mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {drizzle} from 'drizzle-orm/d1';
import {makeCategory} from '../lib/campaign-settings.ts';
import {knownNodeIds,validateTree} from '../lib/progression.ts';

test('les races et leurs compétences restent cohérentes via les routes',async t=>{
 const sqlite=new DatabaseSync(':memory:');
 for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(await readFile(join('drizzle',file),'utf8'));
 const d1={prepare(query){let params=[];const stmt=sqlite.prepare(query);const obj={bind(...v){params=v;return obj},async raw(){stmt.setReturnArrays(true);return stmt.all(...params)},async all(){return {results:stmt.all(...params),success:true,meta:{}}},async run(){const r=stmt.run(...params);return {success:true,meta:{changes:Number(r.changes)}}}};return obj},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push({results:await statement.raw(),success:true,meta:{}});sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}};
 globalThis.__cendresRaceTestDb=drizzle(d1);
 const folder=await mkdtemp(resolve('.openai/race-test-'));
 try{
  await build({entryPoints:['lib/workspace-service.ts'],outfile:join(folder,'route.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'test-db',setup(b){b.onResolve({filter:/^\.\.\/db$/},()=>({path:'db',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const getDb=()=>globalThis.__cendresRaceTestDb;',loader:'js'}));}}]});
  const {executeWorkspace}=await import(pathToFileURL(join(folder,'route.mjs')).href);
  sqlite.prepare('insert into accounts(id,username,password_hash,salt) values(?,?,?,?)').run('gm','gm','unused','unused');
  sqlite.prepare('insert into sessions(id,account_id,expires) values(?,?,?)').run(createHash('sha256').update('gm').digest('hex'),'gm',Date.now()+60000);
  const call=async data=>{const response=await executeWorkspace(new Request('https://cendres.test/api/workspace',{method:'POST',headers:{origin:'https://cendres.test','Content-Type':'application/json',cookie:'cendres_session=gm'},body:JSON.stringify(data)}));return {status:response.status,...await response.json()}};
  const create=async()=>{
   const campaign=await call({op:'createCampaign',name:'Races'});
   assert.equal(campaign.status,200,campaign.error);
   return call({op:'campaign',campaignId:campaign.id});
  };
  const save=async workspace=>{
   const result=await call({op:'saveSettings',campaignId:workspace.campaign.id,revision:workspace.campaign.revision,settings:workspace.settings});
   assert.equal(result.status,200,result.error);
   return call({op:'campaign',campaignId:workspace.campaign.id});
  };
  await t.test('modifier une identité refuse les races et classes archivées sans bloquer les fiches existantes',async()=>{
   let workspace=await create();
   const campaignId=workspace.campaign.id;
   const created=await call({op:'createCharacter',campaignId,name:'Identité',race:'Giant',className:'Chevalier',stats:{FOR:16,DEX:16,CON:16,INT:8,SAG:8,CHA:8}});
   assert.equal(created.status,200,created.error);
   const race=workspace.settings.categories.find(c=>c.kind==='race'&&c.baseKey==='Giant');
   const nextRace=workspace.settings.categories.find(c=>c.kind==='race'&&c.baseKey!=='Giant');
   const cls=workspace.settings.categories.find(c=>c.kind==='class'&&c.baseKey!=='Chevalier');
   race.name='Race renommée';race.archived=true;nextRace.archived=true;cls.archived=true;
   workspace=await save(workspace);
   const saveCharacter=character=>call({op:'saveCharacter',campaignId,id:character.id,revision:character.revision,character});
   const unchanged=await saveCharacter({...created.character,notes:'Fiche encore modifiable'});
   assert.equal(unchanged.status,200,unchanged.error);
   assert.equal(unchanged.character.race,'Giant');
   for(const patch of [{race:nextRace.baseKey},{className:cls.baseKey}]){
    const rejected=await saveCharacter({...unchanged.character,...patch});
    assert.equal(rejected.status,400);assert.match(rejected.error,/indisponible/);
   }
   nextRace.archived=false;nextRace.available=false;
   workspace.settings.categories=workspace.settings.categories.map(c=>c.id===nextRace.id?nextRace:c);
   workspace=await save(workspace);
   assert.equal((await saveCharacter({...unchanged.character,race:nextRace.baseKey})).status,400);
   workspace.settings.categories.find(c=>c.id===nextRace.id).available=true;
   await save(workspace);
   const accepted=await saveCharacter({...unchanged.character,race:nextRace.baseKey});
   assert.equal(accepted.status,200,accepted.error);
   assert.equal(accepted.character.race,nextRace.baseKey);
  });
  await t.test('archiver Géants archive ses compétences',async()=>{
   const workspace=await create();
   const campaignId=workspace.campaign.id;
   const created=await call({op:'createCharacter',campaignId,name:'Géant',race:'Giant',stats:{FOR:16,DEX:16,CON:16,INT:8,SAG:8,CHA:8}});
   assert.equal(created.status,200,created.error);
   const leveled=await call({op:'saveCharacter',campaignId,id:created.character.id,revision:0,character:{...created.character,level:2}});
   assert.equal(leveled.status,200,leveled.error);
   const bonus=workspace.tree.nodes.find(n=>n.race==='Giant'&&n.kind==='stat');
   const unlocked=await call({op:'unlock',campaignId,id:created.character.id,revision:leveled.character.revision,nodeId:bonus.id});
   assert.equal(unlocked.status,200,unlocked.error);
   const giant=workspace.settings.categories.find(c=>c.kind==='race'&&c.baseKey==='Giant');
   giant.name='Géants';giant.archived=true;giant.available=false;
   const saved=await save(workspace);
   const nodes=saved.tree.nodes.filter(n=>n.family==='Race'&&n.race==='Giant');
   assert.equal(nodes.length,3);
   assert.ok(nodes.every(n=>n.archived),'Les compétences des Géants doivent être archivées');
   assert.deepEqual(saved.tree.nodes.filter(n=>n.race!=='Giant'),workspace.tree.nodes.filter(n=>n.race!=='Giant'));
   assert.deepEqual(saved.characters[0].unlocks,unlocked.character.unlocks);
   assert.deepEqual(saved.characters[0].stats,unlocked.character.stats);
   assert.ok(knownNodeIds(saved.characters[0],saved.tree).has(bonus.id));
   const locked=await call({op:'unlock',campaignId,id:created.character.id,revision:unlocked.character.revision,nodeId:nodes.find(n=>n.kind==='stat'&&n.id!==bonus.id).id});
   assert.equal(locked.status,400);assert.match(locked.error,/archivée/);
   const stored=JSON.parse(sqlite.prepare('select tree from campaigns where id=?').get(campaignId).tree);
   assert.ok(stored.nodes.filter(n=>n.race==='Giant').every(n=>n.archived));
  });
  await t.test('créer Robot crée ses compétences',async()=>{
   const workspace=await create();
   workspace.settings.categories.push({...makeCategory('race','Robot'),traits:'Corps mécanique.',weaknesses:'Vulnérable à la foudre.'});
   const saved=await save(workspace);
   const nodes=saved.tree.nodes.filter(n=>n.family==='Race'&&n.race==='Robot');
   assert.ok(nodes.length>0,'Robot doit avoir des compétences raciales');
   const traits=nodes.find(n=>n.kind==='rp');
   assert.ok(traits.description.includes('Corps mécanique.'));
   assert.ok(traits.description.includes('Vulnérable à la foudre.'));
   assert.ok(saved.tree.races.includes('Robot'));
   assert.doesNotThrow(()=>validateTree(saved.tree));
   assert.deepEqual((await save(saved)).tree.nodes,saved.tree.nodes);
   const stored=JSON.parse(sqlite.prepare('select tree from campaigns where id=?').get(saved.campaign.id).tree);
   assert.deepEqual(stored.nodes.filter(n=>n.race==='Robot'),nodes);
  });
  await t.test('restaurer une race préserve les archives individuelles et les brouillons',async()=>{
   let workspace=await create();
   const nodes=workspace.tree.nodes.filter(n=>n.race==='Giant');
   nodes[0].archived=true;nodes[1].draft=true;
   const result=await call({op:'saveCampaign',campaignId:workspace.campaign.id,revision:workspace.campaign.revision,name:'Races',img:'',tree:workspace.tree});
   assert.equal(result.status,200,result.error);
   workspace=await call({op:'campaign',campaignId:workspace.campaign.id});
   workspace.settings.categories.find(c=>c.kind==='race'&&c.baseKey==='Giant').archived=true;
   workspace=await save(workspace);
   workspace.settings.categories.find(c=>c.kind==='race'&&c.baseKey==='Giant').archived=false;
   workspace=await save(workspace);
   assert.equal(workspace.tree.nodes.find(n=>n.id===nodes[0].id).archived,true);
   assert.equal(workspace.tree.nodes.find(n=>n.id===nodes[1].id).archived,false);
   assert.equal(workspace.tree.nodes.find(n=>n.id===nodes[1].id).draft,true);
   assert.equal(workspace.tree.nodes.find(n=>n.id===nodes[2].id).archived,false);
  });
  await t.test('les campagnes déjà incohérentes sont corrigées au chargement',async()=>{
   const workspace=await create();
   workspace.settings.categories.find(c=>c.kind==='race'&&c.baseKey==='Giant').archived=true;
   workspace.settings.categories.push(makeCategory('race','Robot'));
   sqlite.prepare('update campaigns set settings=? where id=?').run(JSON.stringify(workspace.settings),workspace.campaign.id);
   const loaded=await call({op:'campaign',campaignId:workspace.campaign.id});
   assert.ok(loaded.tree.nodes.filter(n=>n.race==='Giant').every(n=>n.archived));
   assert.equal(loaded.tree.nodes.filter(n=>n.race==='Robot').length,1);
   assert.deepEqual((await save(loaded)).tree.nodes,loaded.tree.nodes);
  });
  await t.test('un conflit de révision ne modifie ni les races ni les compétences',async()=>{
   const workspace=await create();
   await save(workspace);
   const before=sqlite.prepare('select settings,tree from campaigns where id=?').get(workspace.campaign.id);
   workspace.settings.categories.push(makeCategory('race','Robot'));
   const result=await call({op:'saveSettings',campaignId:workspace.campaign.id,revision:workspace.campaign.revision,settings:workspace.settings});
   assert.equal(result.status,409);
   assert.deepEqual(sqlite.prepare('select settings,tree from campaigns where id=?').get(workspace.campaign.id),before);
  });
  await t.test('modifier l’arbre ne réactive pas les compétences d’une race archivée',async()=>{
   let workspace=await create();
   workspace.settings.categories.find(c=>c.kind==='race'&&c.baseKey==='Giant').archived=true;
   workspace=await save(workspace);
   const node=workspace.tree.nodes.find(n=>n.race==='Giant');
   node.archived=false;
   const result=await call({op:'saveCampaign',campaignId:workspace.campaign.id,revision:workspace.campaign.revision,name:'Races',img:'',tree:workspace.tree});
   assert.equal(result.status,200,result.error);
   const stored=JSON.parse(sqlite.prepare('select tree from campaigns where id=?').get(workspace.campaign.id).tree);
   assert.equal(stored.nodes.find(n=>n.id===node.id).archived,true);
  });
  await t.test('les longs traits et faiblesses restent complets et valides',async()=>{
   const workspace=await create();
   workspace.settings.categories.push({...makeCategory('race','Robot'),traits:'T'.repeat(3000),weaknesses:'F'.repeat(3000)});
   const saved=await save(workspace);
   const nodes=saved.tree.nodes.filter(n=>n.race==='Robot');
   assert.deepEqual(nodes.map(n=>n.description),['T'.repeat(3000),'F'.repeat(3000)]);
   assert.doesNotThrow(()=>validateTree(saved.tree));
  });
 }finally{delete globalThis.__cendresRaceTestDb;sqlite.close();await rm(folder,{recursive:true,force:true});}
});
