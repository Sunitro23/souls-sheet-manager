import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFile,readdir,mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {drizzle} from 'drizzle-orm/d1';
import {fresh,entry,derive} from '../lib/rules.ts';

test('combat réel : droits, paiement atomique, secret, réactions et récupération',async()=>{
 const sqlite=new DatabaseSync(':memory:');
 for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(await readFile(join('drizzle',file),'utf8'));
 const d1={prepare(query){let params=[];const statement=sqlite.prepare(query);const obj={bind(...values){params=values;return obj},async raw(){statement.setReturnArrays(true);return statement.all(...params)},async all(){return {results:statement.all(...params),success:true,meta:{}}},async run(){const r=statement.run(...params);return {success:true,meta:{changes:Number(r.changes)}}}};return obj},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push({results:await statement.raw(),success:true,meta:{}});sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}};
 globalThis.__combatTestDb=drizzle(d1);
 const folder=await mkdtemp(resolve('.openai/combat-test-'));
 try{
  await build({entryPoints:['lib/workspace-service.ts'],outfile:join(folder,'route.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'test-db',setup(b){b.onResolve({filter:/^\.\.\/db$/},()=>({path:'db',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const getDb=()=>globalThis.__combatTestDb;',loader:'js'}));}}]});
  const {executeWorkspace:POST}=await import(pathToFileURL(join(folder,'route.mjs')).href);
  for(const id of ['gm','alice','bob','eve']){sqlite.prepare('insert into accounts(id,username,owlbear_id,password_hash,salt) values(?,?,?,?,?)').run(id,id,id,'unused','unused');sqlite.prepare('insert into sessions(id,account_id,expires) values(?,?,?)').run(createHash('sha256').update(id).digest('hex'),id,Date.now()+60000);}
  const call=async(user,data)=>{const r=await POST(new Request('https://cendres.test/api/workspace',{method:'POST',headers:{origin:'https://cendres.test','Content-Type':'application/json',cookie:`cendres_session=${user}`},body:JSON.stringify(data)}));return {status:r.status,...await r.json()}};
  const created=await call('gm',{op:'createCampaign',name:'Combat'});assert.equal(created.status,200,created.error);const campaignId=created.id;
  for(const username of ['alice','bob','eve'])await call('gm',{op:'addPlayer',campaignId,username});
  for(const id of ['alice','bob','gm']){
   const c={...fresh(),id,name:id,campaignId,end:0,mana:20,inventory:[],spells:[]};
   c.spells=['Soin','Flamme'].map((name,index)=>entry(name,'spell',{id:name,status:'approved',known:true,memorized:true,end:0,mana:0,damage:index?'1d6':'',pattern:index?[[-2,-2],[2,-2]]:[[0,0]],origin:'self'}));
   c.inventory=[entry('Lame','weapon',{id:'weapon',status:'approved',equipped:true,category:'custom',techniques:[{name:'Frappe secrète',end:1,mana:2,pattern:[[-2,-2],[2,-2]],damage:'1d6',range:1,friendlyFire:false,description:''}]})];
   sqlite.prepare('insert into characters(id,campaign_id,player_id,token_hash,data,revision) values(?,?,?,?,?,0)').run(id,campaignId,id,'unused',JSON.stringify(c));
  }
  const participants=['alice','bob','gm'].map((id,i)=>({id,characterId:id,name:id,dex:10,playerId:id==='bob'?'stale-bob':id,playerName:id,tokenId:id,camp:i<2?'Joueurs':'Ennemis'}));
  const combat={version:1,phase:'ready',id:'combat',revision:1,campaignId,createdBy:'gm',participants,turn:0,initiative:{rolls:participants.map((p,i)=>({participantId:p.id,d20:20-i,source:'manual'})),usedDice:[],tieOrder:participants.map(p=>p.id),collector:null}};
  let state;
  const cmd=async(user,command,data={})=>{if(command==='action'){const c=JSON.parse(sqlite.prepare('select data from characters where id=?').get(data.participantId).data);data={characterRevision:c.revision,expectedCost:data.choice.kind==='weapon'?{end:1,mana:2,name:'Frappe secrète'}:{end:1,mana:0,name:'Préparer une esquive'},...data}}const result=await call(user,{op:'combat',campaignId,combatId:'combat',command,revision:state?.revision,requestId:crypto.randomUUID(),...data});if(result.status===200)state=result.combatState;return result};
  const character=id=>JSON.parse(sqlite.prepare('select data from characters where id=?').get(id).data);
  assert.equal((await cmd('alice','init',{combat})).status,403);
  assert.equal((await cmd('gm','init',{combat})).status,200);
  assert.equal(state.combat.participants.find(p=>p.id==='bob').playerId,'bob');
  assert.equal(character('alice').end,derive(character('alice')).end);
  assert.equal((await cmd('bob','action',{participantId:'bob',choice:{kind:'dodge'}})).status,403);
  assert.equal((await cmd('eve','action',{participantId:'alice',choice:{kind:'dodge'}})).status,403);
  const requestId='prepare-alice',revision=state.revision;
  assert.equal((await cmd('alice','action',{requestId,participantId:'alice',choice:{kind:'dodge'}})).status,200);
  const after=character('alice').end;
  assert.equal((await cmd('alice','action',{requestId,revision,participantId:'alice',choice:{kind:'dodge'}})).status,200);
  assert.equal(character('alice').end,after);assert.equal(state.dodges.alice,1);
  assert.equal((await cmd('alice','turn',{action:{type:'next'}})).status,200);
  assert.equal(character('bob').end,derive(character('bob')).end);
  await cmd('bob','action',{participantId:'bob',choice:{kind:'dodge'}});
  await cmd('bob','turn',{action:{type:'next'}});
  const board=[{tokenId:'alice',cell:{x:0,y:0},position:{x:50,y:50}},{tokenId:'bob',cell:{x:4,y:0},position:{x:450,y:50}},{tokenId:'gm',cell:{x:2,y:2},position:{x:250,y:250}}];
  // No reaction outside the attack zone, even with a prepared dodge.
  const outside=await cmd('gm','action',{requestId:'outside',participantId:'gm',choice:{kind:'spell',spellId:'Flamme'},expectedCost:{end:0,mana:0,name:'Flamme'},board,dpi:100,rotation:180,target:{x:2,y:2}});
  assert.equal(outside.status,200,outside.error);assert.equal(state.pending,null);
  await cmd('gm','ack',{attackId:'outside'});
  // The server classifies spells from their saved damage, ignoring obsolete client overrides.
  for(const [spellId,offensive] of [['Soin',true],['Flamme',false]]){
    const cast=await cmd('gm','action',{requestId:spellId,participantId:'gm',choice:{kind:'spell',spellId},expectedCost:{end:0,mana:0,name:spellId},board,dpi:100,rotation:0,target:{x:2,y:2},offensive});
    assert.equal(cast.status,200,cast.error);
    if(spellId==='Soin')assert.equal(state.pending,null);
    else {
      assert.deepEqual(state.pending.defenders,['alice','bob']);
      await cmd('alice','answer',{participantId:'alice',attackId:spellId,destination:null});
      await cmd('bob','answer',{participantId:'bob',attackId:spellId,destination:null});
    }
    assert.equal(state.resolution.id,spellId);
    await cmd('gm','ack',{attackId:spellId});
  }
  const attack=await cmd('gm','action',{requestId:'attack',participantId:'gm',choice:{kind:'weapon',weaponId:'weapon',index:0},board,dpi:100,rotation:0});
  assert.equal(attack.status,200,attack.error);
  assert.equal(character('gm').end,derive(character('gm')).end-1);assert.equal(character('gm').mana,18);
  assert.deepEqual(state.pending.defenders,['alice','bob']);
  assert.equal(state.attackPreview.name,'Frappe secrète');
  const defenderView=await call('alice',{op:'combat',campaignId,combatId:'combat',command:'get'});
  assert.equal(defenderView.combatState.attackPreview,undefined);
  assert.equal('cells' in state.pending,false);
  assert.equal((await cmd('gm','turn',{action:{type:'next'}})).status,400);
  assert.equal((await cmd('gm','close')).status,400);
  assert.equal((await cmd('eve','answer',{participantId:'alice',attackId:'attack',destination:null})).status,403);
  assert.equal((await cmd('alice','answer',{participantId:'alice',attackId:'attack',destination:{x:1,y:0}})).status,400);
  assert.equal(state.dodges.alice,1);
  const answerRev=state.revision;
  assert.equal((await cmd('alice','answer',{participantId:'alice',attackId:'attack',destination:{x:2,y:0}})).status,200);
  assert.equal(state.resolution,null);assert.equal('answers' in state.pending,false);
  assert.equal((await cmd('bob','answer',{revision:answerRev,participantId:'bob',attackId:'attack',destination:{x:2,y:0}})).status,409);
  assert.equal((await cmd('bob','answer',{participantId:'bob',attackId:'attack',destination:{x:2,y:0}})).status,200);
  assert.equal(state.pending,null);assert.equal(state.dodges.bob,0);assert.equal(state.dodges.alice,0);
  assert.deepEqual(state.resolution.moves,[{tokenId:'alice',position:{x:250,y:50},positions:[{x:50,y:50},{x:150,y:50},{x:250,y:50}]}]);
  assert.equal((await cmd('alice','ack',{attackId:'attack'})).status,403);
  assert.equal((await cmd('gm','ack',{attackId:'attack'})).status,200);
  const noDodge=await cmd('gm','action',{requestId:'no-dodge',participantId:'gm',choice:{kind:'spell',spellId:'Flamme'},expectedCost:{end:0,mana:0,name:'Flamme'},board,dpi:100,rotation:0,target:{x:2,y:2}});
  assert.equal(noDodge.status,200,noDodge.error);
  assert.equal(state.pending,null,'aucune esquive : résolution immédiate');
  assert.deepEqual(state.unpreparedHit,{id:'no-dodge',defenders:['alice','bob']});
  await cmd('gm','ack',{attackId:'no-dodge'});
  assert.deepEqual(state.lastAttack.hitParticipants,['alice','bob']);
  assert.deepEqual(state.unpreparedHit,{id:'no-dodge',defenders:['alice','bob']},'notification conservée après ack');
  await cmd('gm','turn',{action:{type:'next'}});
  assert.equal(character('alice').end,derive(character('alice')).end);
  // Unused preparations expire on their owner's next turn, passing is free.
  await cmd('alice','action',{participantId:'alice',choice:{kind:'dodge'}});
  await cmd('alice','turn',{action:{type:'next'}});
  await cmd('bob','turn',{action:{type:'next'}});
  await cmd('gm','action',{requestId:'second',participantId:'gm',choice:{kind:'weapon',weaponId:'weapon',index:0},board,dpi:100,rotation:0});
  assert.equal((await cmd('gm','answer',{participantId:'alice',attackId:'second',destination:null})).status,403);
  assert.ok(state.pending.answered.includes('bob'),'sans esquive, aucune réponse manuelle attendue');
  await cmd('alice','answer',{participantId:'alice',attackId:'second',destination:null});
  assert.equal(state.dodges.alice,1);
  assert.equal(state.pending,null);
  assert.deepEqual(state.unpreparedHit,{id:'second',defenders:['bob']});
  assert.equal((await cmd('bob','answer',{participantId:'bob',attackId:'second',destination:{x:2,y:0}})).status,400);
  assert.equal((await cmd('bob','answer',{participantId:'bob',attackId:'second',destination:null})).status,400);
  await cmd('gm','ack',{attackId:'second'});
  await cmd('gm','turn',{action:{type:'next'}});
  assert.equal(state.dodges.alice,0);
  const beforeStale=character('alice').end;
  assert.equal((await cmd('alice','action',{participantId:'alice',choice:{kind:'dodge'},characterRevision:-1})).status,409);
  assert.equal((await cmd('alice','action',{participantId:'alice',choice:{kind:'dodge'},expectedCost:{end:0,mana:0,name:'Préparer une esquive'}})).status,409);
  assert.equal(character('alice').end,beforeStale);
  // Movement is an action: permissions, server-derived price, atomic debit and replay.
  const movement = {participantId:'alice',choice:{kind:'movement'},board,dpi:100,target:{x:0,y:1},expectedCost:{end:1,mana:0,name:'Mouvement'}};
  const initialEnd=character('alice').end;
  assert.equal((await cmd('bob','action',movement)).status,403);
  for(const target of [{x:0,y:0},{x:100,y:0},{x:4,y:0},{x:2,y:2}]) {
    assert.equal((await cmd('alice','action',{...movement,target})).status,400);
    assert.equal(character('alice').end,initialEnd);
    assert.equal(state.resolution,null);
  }
  assert.equal((await cmd('alice','action',{...movement,expectedCost:{end:0,mana:0,name:'Mouvement'}})).status,409);
  const moved=await cmd('alice','action',{...movement,requestId:'walk'});
  assert.equal(moved.status,200,moved.error);
  assert.equal(character('alice').end,initialEnd-1);
  assert.deepEqual(state.resolution.movement,{tokenId:'alice',positions:[{x:50,y:50},{x:50,y:150}]});
  assert.equal((await cmd('alice','action',{...movement,requestId:'walk'})).status,200);
  assert.equal(character('alice').end,initialEnd-1);
  assert.equal((await cmd('alice','action',movement)).status,400);
  assert.equal((await cmd('alice','turn',{action:{type:'next'}})).status,400);
  await cmd('alice','ack',{attackId:'walk'});
  const running={...movement,target:{x:0,y:derive(character('alice')).move+1},expectedCost:{end:2,mana:0,name:'Mouvement'}};
  assert.equal((await cmd('alice','action',{...running,expectedCost:movement.expectedCost})).status,409);
  const run=await cmd('alice','action',{...running,requestId:'run'});
  assert.equal(run.status,200,run.error);
  assert.equal(character('alice').end,initialEnd-3);
  await cmd('alice','ack',{attackId:'run'});
  assert.equal((await cmd('alice','action',running)).status,400);
  // Rotation is paid once, restricted to four directions and does not create a path.
  await cmd('alice','turn',{action:{type:'next'}});
  await cmd('bob','turn',{action:{type:'next'}});
  await cmd('gm','turn',{action:{type:'next'}});
  const turning={participantId:'alice',choice:{kind:'turn',rotation:90},expectedCost:{end:1,mana:0,name:'Se tourner'}};
  const beforeTurn=character('alice').end;
  assert.equal((await cmd('bob','action',turning)).status,403);
  assert.equal((await cmd('alice','action',{...turning,choice:{kind:'turn',rotation:45}})).status,400);
  assert.equal(character('alice').end,beforeTurn);
  assert.equal((await cmd('alice','action',{...turning,requestId:'face'})).status,200);
  assert.equal(character('alice').end,beforeTurn-1);
  assert.deepEqual(state.resolution.facing,{tokenId:'alice',rotation:90});
  assert.equal(state.resolution.movement,undefined);
  assert.equal((await cmd('alice','action',{...turning,requestId:'face'})).status,200);
  assert.equal(character('alice').end,beforeTurn-1);
  await cmd('alice','ack',{attackId:'face'});
  // Insufficient resources cannot change either state or resources.
  while(character('alice').end>0)assert.equal((await cmd('alice','action',{participantId:'alice',choice:{kind:'dodge'}})).status,200);
  assert.equal((await cmd('alice','action',turning)).status,400);
  const lastRevision=state.revision;
  assert.equal((await cmd('alice','action',{participantId:'alice',choice:{kind:'dodge'}})).status,400);
  assert.equal(state.revision,lastRevision);assert.equal(character('alice').end,0);
 }finally{sqlite.close();await rm(folder,{recursive:true,force:true});delete globalThis.__combatTestDb;}
});
