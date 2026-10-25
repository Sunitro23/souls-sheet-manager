import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const settle=async()=>{for(let i=0;i<25;i++)await new Promise(resolve=>setImmediate(resolve))};
const channel='de.sunitro.cendres/movement',lock=`${channel}/lock`;

for (const role of ['PLAYER', 'GM']) test(`mouvement Owlbear (${role}) : son propre personnage, verrouillage, coûts et restauration`,async()=>{
 const folder=await mkdtemp(resolve('.openai/movement-test-'));
 const oldLocation=globalThis.location;globalThis.location={origin:'https://test.invalid'};
 const makeToken=(id,x,locked=false)=>({id,type:'IMAGE',layer:'CHARACTER',position:{x:x*100+50,y:50},rotation:0,locked,metadata:{}});
 const actor={id:'actor',tokenId:'hero',characterId:'char',playerId:'alice'};
 const combat={id:'combat',phase:'ready',turn:0,participants:[actor],initiative:{rolls:[{participantId:'actor',d20:20}],tieOrder:['actor']}};
 const state={combat,view:{combat,revision:0,pending:null,resolution:null},items:[makeToken('hero',0),makeToken('other',4,true)],local:[],callbacks:new Map(),menus:new Map(),role,tool:'select',messages:[],data:{movement:{move:2,sprint:5,end:3}},payments:[],loads:0,snapshots:0,tools:0,updates:[]};
 const collection=key=>({getItems:async filter=>state[key].filter(i=>typeof filter==='function'?filter(i):!filter||filter.includes(i.id)),
  updateItems:async(ids,update)=>{if(key==='local')state.updates.push([...ids]);update(state[key].filter(i=>ids.includes(i.id)))},addItems:async items=>state[key].push(...items),deleteItems:async ids=>{state[key]=state[key].filter(i=>!ids.includes(i.id))},
  onChange:cb=>{state.changed=cb;return()=>{}},getItemBounds:async ids=>({center:state.items.find(i=>i.id===ids[0]).position})});
 const sdk={isReady:true,scene:{isReady:async()=>true,items:collection('items'),local:collection('local'),grid:{getDpi:async()=>100,getType:async()=>'SQUARE',snapPosition:async p=>p,onChange:cb=>{state.gridChanged=cb;return()=>{}}},onReadyChange:()=>()=>{}},
  player:{getId:async()=>'alice',getRole:async()=>state.role,getSelection:async()=>[],onChange:cb=>{state.playerChanged=cb;return()=>{}}},room:{onMetadataChange:cb=>{state.roomChanged=cb;return()=>{}}},
  tool:{createMode:async mode=>{state.mode=mode},create:async()=>{state.tools++},remove:async()=>{state.tools--},removeMode:async()=>{},getActiveTool:async()=>state.tool,activateTool:async id=>{const previous=state.tool;state.tool=id;if(previous===`${channel}/tool`&&id!==previous)state.mode.onDeactivate()}},
  contextMenu:{create:async menu=>state.menus.set(menu.id,menu),remove:async()=>{}},broadcast:{sendMessage:async(key,data)=>{state.callbacks.get(key)?.({data})},onMessage:(key,cb)=>{state.callbacks.set(key,cb);return()=>state.callbacks.delete(key)}},
  notification:{show:async message=>{assert.ok(typeof message==='string'&&message.length,'notification non vide');state.messages.push(message)}},action:{close:async()=>{}}};
 globalThis.__movementTest={sdk,state};let stop;
 try {
  await build({stdin:{contents:"export {registerMovement} from './lib/obr/owlbear/movement';export {setMapInteraction} from './lib/obr/owlbear/interaction';",resolveDir:process.cwd()},outfile:join(folder,'movement.mjs'),bundle:true,platform:'node',format:'esm',plugins:[{name:'mock',setup(b){
   b.onResolve({filter:/^@owlbear-rodeo\/sdk$/},()=>({path:'sdk',namespace:'mock'}));
   b.onResolve({filter:/workspace-client$/},()=>({path:'client',namespace:'mock'}));
   b.onResolve({filter:/^\.\/actions$/},()=>({path:'actions',namespace:'mock'}));
   b.onResolve({filter:/^\.\/token$/},()=>({path:'token',namespace:'mock'}));
   b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({resolveDir:process.cwd(),contents:{
    sdk:`export default globalThis.__movementTest.sdk;
      import {PathBuilder} from '${resolve('node_modules/@owlbear-rodeo/sdk/lib/builders/PathBuilder.js')}';
      import {TextBuilder} from '${resolve('node_modules/@owlbear-rodeo/sdk/lib/builders/TextBuilder.js')}';
      export {Command,isPath} from '${resolve('node_modules/@owlbear-rodeo/sdk/lib/types/items/Path.js')}';
      export const buildPath=()=>new PathBuilder({id:'alice'}), buildText=()=>new TextBuilder({id:'alice'});`,
    client:`export async function characterForOwlbear(){globalThis.__movementTest.state.loads++;if(globalThis.__movementTest.state.failure)throw globalThis.__movementTest.state.failure;return globalThis.__movementTest.state.data}`,
    token:`export async function characterToken(){return {id:'hero'}} export async function tokenOrigin(id){const item=globalThis.__movementTest.state.items.find(i=>i.id===id);return {origin:{x:Math.floor(item.position.x/100),y:Math.floor(item.position.y/100)},dpi:100,rotation:0}}`,
    actions:`import {planMovement} from '${resolve('lib/obr/core/movement.ts')}'; const s=globalThis.__movementTest.state; export async function currentCombat(){return s.combat} export async function combatCall(){return s.view} export async function boardSnapshot(){s.snapshots++;return {dpi:100,board:s.items.map(i=>({tokenId:i.id,cell:{x:Math.floor(i.position.x/100),y:Math.floor(i.position.y/100)},position:i.position}))}} export async function performCombatAction(characterId,tokenId,choice,placement){if(choice.kind==='turn'){if(s.data.movement.end<1)throw Error('Ressources insuffisantes.');s.payments.push({choice,end:1});s.data.movement.end--;s.view.revision++;return true;}const plan=planMovement((await boardSnapshot()).board,tokenId,placement.target,s.data.movement.move,s.data.movement.sprint);if(plan.end>s.data.movement.end)throw Error('Ressources insuffisantes.');s.payments.push({choice,...placement,end:plan.end});s.data.movement.end-=plan.end;s.view.revision++;return true}`,
   }[path]}));
  }}]});
  const {registerMovement,setMapInteraction}=await import(pathToFileURL(join(folder,'movement.mjs')).href);
  stop=await registerMovement();
  assert.equal(state.tools,1,'mouvement activé automatiquement au début du tour');
  assert.equal(state.tool,`${channel}/tool`);
  state.mode.onKeyDown({}, {key:'Escape'});await settle();
  assert.equal(state.tools,0,'Échap masque le mouvement');
  state.callbacks.get('de.sunitro.cendres/combat-refresh')({});await settle();
  assert.equal(state.tools,0,'le rafraîchissement ne réactive pas un mouvement masqué');
  state.playerChanged({selection:['hero']});await settle();
  assert.equal(state.tools,1,'sélectionner son pion réactive le mouvement');
  await setMapInteraction('weapon',true);
  assert.equal(state.local.length,0,'sélectionner une attaque masque le mouvement');
  await state.mode.onToolClick({}, {pointerPosition:{x:150,y:50}});
  assert.equal(state.payments.length,0,'un clic de visée ne déplace pas le pion');
  state.mode.onKeyDown({}, {key:'Escape'});await settle();
  assert.ok(state.local.length,'Échap annule la visée et revient au mouvement');
  await setMapInteraction('spell',true);
  assert.equal(state.tools,0,'le mouvement cède la place au sort');
  state.callbacks.get('de.sunitro.cendres/combat-refresh')({});await settle();
  assert.equal(state.tools,0,'aucune réactivation pendant le placement');
  await setMapInteraction('weapon',false);
  assert.equal(state.tools,0,'fermer le panneau ne coupe pas le sort');
  await setMapInteraction('spell',false);
  assert.equal(state.tools,1,'annuler le sort revient au mouvement');
  assert.ok(state.items.every(i=>i.locked));assert.equal(state.items[0].metadata[lock],false);assert.equal(state.items[1].metadata[lock],true);
  const start=async()=>{state.callbacks.get(channel)({data:{characterId:'char',tokenId:'hero'}});await settle()};
  const hover=async(x,y=0)=>{state.mode.onToolMove({}, {pointerPosition:{x:x*100+50,y:y*100+50}});await settle()};
  const click=async(x,y=0)=>state.mode.onToolClick({}, {pointerPosition:{x:x*100+50,y:y*100+50}});
  await start();
  assert.ok(state.local.filter(i=>i.type==='PATH').every(i=>!('fillColor' in i)&&!('strokeColor' in i)), 'les couleurs doivent être dans style, pas à la racine');
  assert.ok(state.local.filter(i=>i.type==='TEXT').every(i=>i.text.type==='PLAIN'), 'les coûts doivent utiliser le texte réellement rendu');
  assert.ok(state.local.some(i=>i.type==='PATH' && i.position?.x===-500), 'la limite de course doit être visible avant le survol');assert.ok(!state.local.some(i=>/Marche|Course|END disponible/.test(i.text?.plainText??'')), 'pas de texte de portée sur le plateau');const arrows=state.local.filter(i=>i.name==='Se tourner · 1 END');assert.equal(arrows.length,4);assert.ok(arrows.every(i=>i.type==='PATH'&&i.commands.length===8),'les flèches sont des tracés et ne dépendent pas des glyphes');await hover(2);assert.ok(state.local.some(i=>i.text?.plainText==='1 END'));
  const before={loads:state.loads,snapshots:state.snapshots,ids:state.local.map(i=>i.id)};
  await hover(3);
  assert.equal(state.loads,before.loads,'aucun appel serveur au survol');
  assert.equal(state.snapshots,before.snapshots,'aucune relecture des pions au survol');
  assert.deepEqual(state.local.map(i=>i.id),before.ids,'les objets restent stables lorsque le trajet change de longueur');
  assert.ok(state.local.some(i=>i.text?.plainText==='2 END'));
  const burstStart=state.updates.length;
  const rangeIds=state.local.filter(i=>i.metadata[`${channel}/tool/range`]).map(i=>i.id);
  for(let i=0;i<50;i++)state.mode.onToolMove({}, {pointerPosition:{x:(i%3+1)*100+50,y:50}});
  await settle();
  assert.ok(state.updates.length-burstStart<=2,'les survols rapides sont regroupés');
  assert.ok(state.updates.slice(burstStart).every(ids=>ids.length<=6 && !ids.some(id=>rangeIds.includes(id))), 'seuls les petits objets du trajet sont mis à jour');
  assert.equal(state.loads,before.loads);assert.equal(state.snapshots,before.snapshots);
  await click(0);assert.equal(state.payments.length,0);
  await hover(4);assert.ok(state.local.some(i=>/bloque/.test(i.text?.plainText??'')));
  await click(4);assert.equal(state.payments.length,0);
  await click(7);assert.equal(state.payments.length,0);
  state.data.movement.end=1;state.view.revision++;state.callbacks.get('de.sunitro.cendres/combat-refresh')({});await settle();await hover(3);assert.ok(state.local.some(i=>/insuffisante/.test(i.text?.plainText??'')));
  await click(3);assert.equal(state.payments.length,0);
  await click(2);assert.equal(state.payments.length,1);assert.equal(state.payments[0].end,1);assert.equal(state.local.length,0);assert.equal(state.tool,'select');assert.equal(state.tools,0,'outil temporaire supprimé après validation');
  state.data.movement.end=3;
  await start();state.mode.onKeyDown({}, {key:'Escape'});await settle();assert.equal(state.local.length,0);assert.equal(state.payments.length,1);
  await start();state.view={...state.view,pending:{id:'attack'}};await click(1);assert.equal(state.payments.length,1);state.view.pending=null;
  state.role='GM';state.menus.values().next().value.onClick({items:[state.items[0]]});await settle();await click(15);
  assert.equal(state.items[0].position.x,1550);assert.equal(state.payments.length,1);assert.equal(state.items[0].locked,true);
  state.failure={error:{name:'ValidationError',message:'Erreur SDK de test'}};
  await start();assert.ok(state.messages.includes('Erreur SDK de test'),'la cause RPC doit être affichée');
  delete state.failure;
  actor.playerId=null;state.view.revision++;state.roomChanged();await settle();
  assert.equal(state.tools,1,'le GM déplace automatiquement les personnages sans joueur');
  state.view.pending={id:'attack'};state.callbacks.get('de.sunitro.cendres/combat-refresh')({});await settle();
  assert.equal(state.tools,0,'aucun mouvement pendant les réactions');
  state.view.pending=null;state.view.resolution={id:'resolution'};state.view.revision++;state.callbacks.get('de.sunitro.cendres/combat-refresh')({});await settle();
  assert.equal(state.tools,0,'aucun mouvement pendant les animations');
  state.view.resolution=null;state.view.revision++;state.callbacks.get('de.sunitro.cendres/combat-refresh')({});await settle();
  assert.equal(state.tools,1,'retour automatique après résolution');
  await click(16);await settle();
  assert.equal(state.tools,1,'retour automatique après un déplacement avec END restante');
  assert.equal(state.payments.length,2);
  const positionBeforeTurn={...state.items[0].position};
  await click(21);await settle();
  assert.deepEqual(state.payments.at(-1),{choice:{kind:'turn',rotation:90},end:1},'la flèche droite déclenche une rotation à 1 END');
  assert.deepEqual(state.items[0].position,positionBeforeTurn);
  actor.playerId='bob';state.view.revision++;state.roomChanged();await settle();
  assert.equal(state.tools,0,'le GM ne prend pas le mouvement d’un autre joueur');
  state.role='PLAYER';actor.playerId='bob';state.playerChanged({selection:[]});await settle();
  assert.equal(state.tools,0,'aucun mouvement hors de son tour');
  actor.playerId='alice';combat.turn++;state.roomChanged();await settle();
  assert.equal(state.tools,1,'réactivation au nouveau tour du joueur');
  state.combat=null;state.roomChanged();await settle();
  assert.equal(state.items[0].locked,false);assert.equal(state.items[1].locked,true);assert.ok(state.items.every(i=>!(lock in i.metadata)));
 }finally{await stop?.();globalThis.location=oldLocation;delete globalThis.__movementTest;await rm(folder,{recursive:true,force:true})}
});

test('animation : une case par étape, reprise sans recul après interruption',async()=>{
 const folder=await mkdtemp(resolve('.openai/movement-animation-'));
 const item={id:'hero',position:{x:50,y:50},metadata:{}};const positions=[],rotations=[],frames=[];let interactions=0,stops=0;
 globalThis.__animationTest={interaction:{startItemInteraction:async token=>{interactions++;const draft=structuredClone(token);return [update=>{update(draft);frames.push({...draft.position});},()=>{stops++}]}},scene:{items:{getItems:async()=>[item],updateItems:async(_ids,update)=>{update([item]);positions.push({...item.position});rotations.push(item.rotation)}}}};
 try {
  await build({entryPoints:['lib/obr/owlbear/movement-animation.ts'],outfile:join(folder,'animation.mjs'),bundle:true,platform:'node',format:'esm',plugins:[{name:'mock',setup(b){b.onResolve({filter:/^@owlbear-rodeo\/sdk$/},()=>({path:'sdk',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export default globalThis.__animationTest;'}))}}]});
  const {animateMovement}=await import(pathToFileURL(join(folder,'animation.mjs')).href);
  const resolution={id:'move',movement:{tokenId:'hero',positions:[{x:50,y:50},{x:150,y:50},{x:250,y:150},{x:350,y:150}]}};
  await assert.rejects(animateMovement(resolution,()=>positions.length>=1),/interrompu/);
  assert.equal(positions.length,1,'un pas ne doit produire qu’une écriture persistante');
  await animateMovement(resolution,()=>false);
  await animateMovement(resolution,()=>false);
  assert.deepEqual(positions,resolution.movement.positions.slice(1));
  assert.ok(frames[1].y<50,'le pion saute au-dessus du trajet');
  assert.equal(positions.length,3,'une seule écriture persistante par case');
  assert.equal(interactions,stops,'les interactions sont fermées même après interruption');
  assert.equal(item.rotation,90,'le pion doit regarder vers la droite');
  assert.ok(rotations.every(rotation=>rotation===90),'les diagonales conservent une orientation cardinale');
  globalThis.__animationTest.scene.items.updateItems=async()=>{throw Error('Échec de sauvegarde')};
  await assert.rejects(animateMovement({...resolution,id:'failed'},()=>false),/Échec de sauvegarde/);
  assert.equal(interactions,stops,'une erreur ferme aussi l’interaction');
 }finally{delete globalThis.__animationTest;await rm(folder,{recursive:true,force:true})}
});
