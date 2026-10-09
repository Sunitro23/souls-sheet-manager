import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import {readFile,readdir,rm} from 'node:fs/promises';
const db=new DatabaseSync(':memory:');
for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())db.exec(await readFile(`drizzle/${f}`,'utf8'));
db.exec("INSERT INTO accounts VALUES ('a','tester','password-hash','salt'); INSERT INTO sessions VALUES('session','a',9999999999999); INSERT INTO campaigns(id,token_hash,name) VALUES('camp','token','Camp'); INSERT INTO characters(id,token_hash,data,campaign_id) VALUES('hero','token','{}','camp'); INSERT INTO campaign_members VALUES('m','camp','a');");
globalThis.resetEnv={CENDRES_RESET_TOKEN:'test-secret',CENDRES_RESET_EXPIRES:String(Date.now()+60000),DB:{prepare:sql=>sql,batch:async statements=>{db.exec('BEGIN');try{const result=statements.map(sql=>({results:db.prepare(sql).all()}));db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}}};
await build({entryPoints:['app/api/maintenance-reset/route.ts'],outfile:'.openai/reset-route-test.mjs',bundle:true,format:'esm',platform:'node',plugins:[{name:'env',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env=globalThis.resetEnv;',loader:'js'}));}}]});
try{const {POST}=await import('./reset-route-test.mjs');const request=(token,body='DELETE_CAMPAIGNS_AND_CHARACTERS_KEEP_ACCOUNTS')=>new Request('https://cendres.test/api/maintenance-reset',{method:'POST',headers:{authorization:`Bearer ${token}`},body});
assert.equal((await POST(request('wrong'))).status,403);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM campaigns').get().n,1);
assert.equal((await POST(request('test-secret','wrong scope'))).status,400);
const r=await POST(request('test-secret'));assert.equal(r.status,200);assert.deepEqual(await r.json(),{before:{accounts:1,campaigns:1,characters:1},after:{accounts:1,campaigns:0,characters:0}});
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM campaign_members').get().n,0);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n,1);assert.equal(db.prepare('SELECT password_hash FROM accounts').get().password_hash,'password-hash');
globalThis.resetEnv.CENDRES_RESET_EXPIRES='1';assert.equal((await POST(request('test-secret'))).status,404);console.log('Reset verified: authorization, scope, expiry, accounts and sessions preserved.');
}finally{db.close();delete globalThis.resetEnv;await rm('.openai/reset-route-test.mjs');}
