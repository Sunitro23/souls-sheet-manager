import test from 'node:test';
import assert from 'node:assert/strict';
import {COMBAT_KEY, changeTurn, readCombat} from '../lib/obr/core/combat.ts';
import {updateTurn} from '../lib/obr/owlbear/combat.ts';
const combat=()=>({version:1,id:'fight',campaignId:'campaign',createdBy:'gm',revision:1,phase:'ready',participants:[
  {id:'hero',characterId:'hero',name:'Hero',dex:14,playerId:'alice',playerName:'Alice'},
  {id:'enemy',characterId:'enemy',name:'Enemy',dex:10,playerId:'gm',playerName:'MJ'}
],initiative:{rolls:[{participantId:'hero',d20:18,source:'manual'},{participantId:'enemy',d20:10,source:'manual'}],usedDice:[],tieOrder:['hero','enemy'],collector:null}});
const gm={playerId:'gm',isGM:true},alice={playerId:'alice',isGM:false};
test('active player ends their turn; only GM can go back or select another participant',()=>{
  const first=combat(),second=changeTurn(first,{type:'next'},alice);
  assert.equal(second.turn,1);assert.equal(first.turn,undefined);
  assert.throws(()=>changeTurn(second,{type:'next'},alice),/propre tour/);
  assert.throws(()=>changeTurn(first,{type:'previous'},alice),/propre tour/);
  assert.throws(()=>changeTurn(first,{type:'select',participantId:'enemy'},alice),/propre tour/);
  assert.equal(changeTurn(second,{type:'next'},gm).turn,2);
  assert.equal(changeTurn(second,{type:'previous'},gm).turn,0);
  assert.equal(changeTurn(first,{type:'previous'},gm).turn,0);
  assert.equal(changeTurn(first,{type:'select',participantId:'enemy'},gm).turn,1);
  assert.throws(()=>changeTurn(first,{type:'select',participantId:'missing'},gm),/introuvable/);
  assert.throws(()=>changeTurn({...first,phase:'collecting'},{type:'next'},gm),/initiatives/);
});
test('legacy combat starts at first participant and invalid persisted turns are rejected',()=>{
  assert.equal(readCombat({[COMBAT_KEY]:combat()}).turn,undefined);
  for(const turn of [-1,1.2,'1',Infinity])assert.throws(()=>readCombat({[COMBAT_KEY]:{...combat(),turn}}),/incompatible/);
});
test('turn writes reject stale revisions, duplicate clicks and other players',async()=>{
  let metadata={[COMBAT_KEY]:combat()};
  const source={player:{getRole:async()=>'PLAYER',getId:async()=>'alice'},room:{getMetadata:async()=>structuredClone(metadata),setMetadata:async update=>{metadata={...metadata,...update}}}};
  const results=await Promise.allSettled([updateTurn(source,combat(),{type:'next'}),updateTurn(source,combat(),{type:'next'})]);
  assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');
  assert.equal(metadata[COMBAT_KEY].turn,1);assert.equal(metadata[COMBAT_KEY].revision,2);
  await assert.rejects(updateTurn(source,metadata[COMBAT_KEY],{type:'next'}),/propre tour/);
  assert.equal(metadata[COMBAT_KEY].turn,1);
});
