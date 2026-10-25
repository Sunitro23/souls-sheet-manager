import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

test('le conflit 409 traverse l’action serveur et le client sans perdre son statut',async()=>{
 const previousLocation=Object.getOwnPropertyDescriptor(globalThis,'location');
 const calls=[];
 globalThis.__workspaceTransport={
  headers:async()=>new Headers({origin:'https://cendres.test',host:'cendres.test'}),
  cookies:async()=>({get:()=>({value:'session'}),set:()=>{}}),
  execute:async request=>{calls.push(await request.json());return Response.json({error:'Personnage modifié ailleurs.'},{status:409})},
 };
 Object.defineProperty(globalThis,'location',{value:{search:''},configurable:true});
 try{
  const bundle=await build({entryPoints:['lib/workspace-client.ts'],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'transport-fixtures',setup(b){
   b.onResolve({filter:/^(next\/headers|\.\.\/lib\/workspace-service)$/},args=>({path:args.path,namespace:'fixture'}));
   b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='next/headers'?'export const headers=globalThis.__workspaceTransport.headers,cookies=globalThis.__workspaceTransport.cookies;':'export const executeWorkspace=globalThis.__workspaceTransport.execute;',loader:'js'}));
  }}]});
  const {workspaceCall}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  await assert.rejects(workspaceCall({op:'saveCharacter',revision:2}),error=>error.status===409&&error.message==='Personnage modifié ailleurs.');
  assert.deepEqual(calls,[{op:'saveCharacter',revision:2}]);
 }finally{
  delete globalThis.__workspaceTransport;
  if(previousLocation)Object.defineProperty(globalThis,'location',previousLocation);else delete globalThis.location;
 }
});
