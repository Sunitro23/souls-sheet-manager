import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const linkKey='de.sunitro.cendres/link',zoneKey='de.sunitro.cendres/spell-zone';
const token=(id,characterId='hero')=>({id,type:'IMAGE',layer:'CHARACTER',name:id,rotation:0,position:{x:50,y:50},metadata:{[linkKey]:{characterId,characterName:'Hero',playerId:'alice'}}});
const settle=async()=>{for(let count=0;count<12;count++)await new Promise(resolve=>setImmediate(resolve))};

test('Owlbear placement: automatic token, private preview, validation, cancellation and deletion',async()=>{
  const folder=await mkdtemp(resolve('.openai/owlbear-test-'));
  const state={items:[token('only')],local:[],spells:[{id:'fire',name:'Fire',origin:'target',range:2,pattern:[[0,0],[1,0]]}],role:'PLAYER',playerId:'alice',activeTool:'select',messages:[],callbacks:new Map(),modes:new Map(),actions:new Map(),menus:new Map()};
  const collection=key=>({
    getItems:async filter=>state[key].filter(item=>typeof filter==='function'?filter(item):!filter||filter.includes(item.id)),
    addItems:async items=>{state[key].push(...items)},
    deleteItems:async ids=>{if(key==='local')state.localDeletes=(state.localDeletes??0)+1;state[key]=state[key].filter(item=>!ids.includes(item.id))},
    updateItems:async(ids,update)=>{update(state[key].filter(item=>ids.includes(item.id)))},
    getItemBounds:async()=>({center:{x:50,y:50}}),
    onChange:()=>()=>{},
  });
  const sdk={isReady:true,room:{getMetadata:async()=>state.combat?{'de.sunitro.cendres/combat':state.combat}:{}},scene:{isReady:async()=>true,items:collection('items'),local:collection('local'),onReadyChange:()=>()=>{},grid:{getDpi:async()=>100,getType:async()=>'SQUARE',snapPosition:async point=>point,onChange:()=>()=>{}}},
    player:{getId:async()=>state.playerId,getRole:async()=>state.role,getSelection:async()=>undefined},
    notification:{show:async message=>{state.messages.push(message)}},action:{close:async()=>{}},
    broadcast:{sendMessage:async()=>{},onMessage:(channel,callback)=>{state.callbacks.set(channel,callback);return()=>state.callbacks.delete(channel)}},
    tool:{create:async()=>{state.placementTool=true},remove:async()=>{state.placementTool=false},createMode:async mode=>{state.modes.set(mode.id,mode)},removeMode:async()=>{},
      createAction:async action=>{state.actions.set(action.id,action)},removeAction:async()=>{},getActiveTool:async()=>state.activeTool,activateTool:async id=>{state.activeTool=id}},
    contextMenu:{create:async menu=>{state.menus.set(menu.id,menu)},remove:async()=>{}},
  };
  const oldLocation=globalThis.location, oldConfirm=globalThis.confirm;
  globalThis.confirm=()=>true;
  globalThis.location={origin:'https://test.invalid'};
  globalThis.__owlbearTest={sdk,state};
  let stop;
  try{
    await build({stdin:{contents:"export {showAttackPreview,Preview} from './lib/obr/owlbear/preview'; export {onMapInteraction} from './lib/obr/owlbear/interaction'; export {clearSpellZones} from './lib/obr/owlbear/clear-zones'; export {registerSpellPlacement} from './lib/obr/owlbear/spell-placement'; export {characterToken} from './lib/obr/owlbear/token';",resolveDir:process.cwd()},outfile:join(folder,'placement.mjs'),bundle:true,platform:'node',format:'esm',plugins:[{name:'owlbear-test',setup(builder){
      builder.onResolve({filter:/^@owlbear-rodeo\/sdk$/},()=>({path:'sdk',namespace:'mock'}));
      builder.onResolve({filter:/workspace-client$/},()=>({path:'client',namespace:'mock'}));
      builder.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:path==='client'?"export async function workspaceCall(data){return globalThis.__owlbearTest.call(data)} export async function characterForOwlbear(){return {revision:0,spells:globalThis.__owlbearTest.state.spells}}":`
        export default globalThis.__owlbearTest.sdk;
        export const isImage=item=>item.type==='IMAGE';
        export const Command={MOVE:0,LINE:1,CLOSE:2};
        export function buildPath(){const item={id:crypto.randomUUID(),metadata:{}};const builder=new Proxy({}, {get:(_target,key)=>key==='build'?()=>item:value=>{item[key]=value;return builder}});return builder;}
      `}));
    }}]});
    const {registerSpellPlacement,characterToken,clearSpellZones,onMapInteraction,showAttackPreview,Preview}=await import(pathToFileURL(join(folder,'placement.mjs')).href);
    assert.equal((await characterToken('hero')).id,'only');
    state.items.push(token('second'));
    await assert.rejects(characterToken('hero'),/Choisissez/);
    assert.equal((await characterToken('hero','second')).id,'second');
    await assert.rejects(characterToken('missing'),/Aucun token/);
    state.items=[token('only')];
    const interactions=[];
    onMapInteraction(async(source,active)=>{interactions.push({source,active});});
    stop=await registerSpellPlacement();
    assert.ok(!state.placementTool);
    const mode=state.modes.values().next().value;
    const begin=async()=>{state.callbacks.get('de.sunitro.cendres/cast')({data:{characterId:'hero',spellId:'fire',tokenId:'only'}});await settle()};
    await begin();
    assert.deepEqual(interactions.at(-1),{source:'spell',active:true},'le sort suspend le mouvement dès sa sélection');
    assert.equal(state.local.length,2);
    assert.equal(state.items.length,1);
    assert.equal(state.placementTool,true);
    const previewIds=state.local.map(item=>item.id);
    for(const position of [{x:101,y:1},{x:120,y:20},{x:199,y:99}]){
      mode.onToolMove({}, {pointerPosition:position});await settle();
      assert.deepEqual(state.local.map(item=>item.id),previewIds);
      assert.deepEqual(state.local[0].position,{x:100,y:0});
    }
    for(let column=0;column<40;column++)mode.onToolMove({}, {pointerPosition:{x:200+column,y:1}});
    await settle();
    assert.deepEqual(state.local.map(item=>item.id),previewIds);
    assert.deepEqual(state.local[0].position,{x:200,y:0});
    assert.equal(state.localDeletes??0,0);
    mode.onKeyDown({}, {key:'r'});await settle();
    await mode.onToolClick({}, {pointerPosition:{x:350,y:50}});
    assert.equal(state.items.length,1);
    assert.match(state.messages.at(-1),/portée/);
    state.items.push({id:'previous-zone',metadata:{[zoneKey]:{castId:'old',casterId:'bob'}}});
    await mode.onToolClick({}, {pointerPosition:{x:250,y:50}});
    assert.ok(!state.messages.some(message=>/Zone révélée pendant/.test(message)));
    const zones=state.items.filter(item=>item.metadata[zoneKey]);
    assert.equal(zones.length,2);
    assert.ok(!state.items.some(item=>item.id==='previous-zone'));
    assert.deepEqual(zones.map(item=>item.position),[{x:200,y:0},{x:200,y:100}]);
    assert.ok(zones.every(item=>item.metadata[zoneKey].casterId==='alice'));
    assert.equal(state.local.length,0);
    assert.equal(state.placementTool,false);
    assert.deepEqual(interactions.at(-1),{source:'spell',active:false},'un sort placé libère le mouvement');
    state.playerId='bob';
    await clearSpellZones();assert.equal(state.items.length,3);
    await assert.rejects(clearSpellZones(true),/GM/);
    state.role='GM';await clearSpellZones();assert.equal(state.items.length,3);
    state.role='PLAYER';state.playerId='alice';
    const remove=state.menus.values().next().value;
    state.playerId='bob';remove.onClick({items:[zones[0]]});await settle();
    assert.equal(state.items.length,3);
    state.role='GM';remove.onClick({items:[zones[0]]});await settle();
    assert.equal(state.items.length,1);
    state.role='PLAYER';state.playerId='alice';
    await begin();mode.onKeyDown({}, {key:'Escape'});await settle();
    assert.deepEqual(interactions.at(-1),{source:'spell',active:false},'Échap libère le mouvement');
    assert.equal(state.local.length,0);assert.equal(state.items.length,1);
    await begin();state.spells=[];
    await mode.onToolClick({}, {pointerPosition:{x:50,y:50}});
    assert.equal(state.items.length,1);assert.match(state.messages.at(-1),/disponible/);
    state.spells=[{id:'fire',name:'Fire',origin:'self',range:0,pattern:[[0,0]]}];
    await begin();await mode.onToolClick({}, {pointerPosition:{x:900,y:900}});
    assert.equal(state.items.at(-1).attachedTo,'only');
    assert.ok(state.items.at(-1).disableAttachmentBehavior.includes('VISIBLE'));
    await begin();
    assert.equal(state.local.length,1);
    await stop();stop=null;
    assert.equal(state.local.length,0);
    assert.equal(state.items.length,2);
    state.items.push({id:'other-zone',metadata:{[zoneKey]:{casterId:'bob',castId:'other'}}});
    await clearSpellZones();
    assert.deepEqual(state.items.map(item=>item.id),['only','other-zone']);
    state.role='GM';await clearSpellZones(true);
    assert.deepEqual(state.items.map(item=>item.id),['only']);
    // In combat the selected spell goes only to the server; nothing is published yet.
    const participant={id:'hero',characterId:'hero',name:'Hero',dex:10,playerId:'alice',playerName:'Alice',tokenId:'only',camp:'Joueurs'};
    state.combat={version:1,phase:'ready',id:'fight',revision:1,campaignId:'campaign',createdBy:'alice',turn:0,participants:[participant],initiative:{rolls:[{participantId:'hero',d20:10,source:'manual'}],usedDice:[],tieOrder:['hero'],collector:null}};
    state.runtime={combat:state.combat,revision:1,dodges:{},pending:null,resolution:null};
    const calls=[];
    globalThis.__owlbearTest.call=async data=>{calls.push(data);return {combatState:state.runtime}};
    state.spells=[{id:'fire',name:'Fire',origin:'target',range:3,pattern:[[0,0]],end:1,mana:2}];
    stop=await registerSpellPlacement();
    const combatMode=state.modes.values().next().value;
    await begin();
    globalThis.confirm=()=>{throw Error('Unexpected browser confirmation')};
    await combatMode.onToolClick({}, {pointerPosition:{x:150,y:50}});
    assert.ok(!state.messages.some(message=>/Sort confirmé/.test(message)));
    assert.equal(calls.filter(c=>c.command==='action').length,1);
    const committed=calls.find(c=>c.command==='action');
    assert.deepEqual(committed.choice,{kind:'spell',spellId:'fire'});
    assert.deepEqual(committed.target,{x:1,y:0});
    assert.deepEqual(committed.expectedCost,{end:1,mana:2,name:'Fire'});
    assert.equal(state.items.length,1);
    assert.equal(state.local.length,0);
    await showAttackPreview({attackPreview:{id:'attack',name:'Fire',dpi:100,cells:[{x:1,y:0}]}});
    assert.equal(state.local.length,1);
    await new Preview().clear();
    assert.equal(state.local.length,1,'fermer la prévisualisation ne retire pas l’attaque en attente');
    await showAttackPreview({resolution:{id:'attack'}});
    assert.equal(state.local.length,1,'zone conservée pendant la résolution');
    await showAttackPreview({resolution:null});
    assert.equal(state.local.length,0,'zone privée retirée après révélation');

  }finally{if(stop)await stop();globalThis.location=oldLocation;globalThis.confirm=oldConfirm;delete globalThis.__owlbearTest;await rm(folder,{recursive:true,force:true})}
});
