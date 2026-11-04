import test from 'node:test';
import assert from 'node:assert/strict';
import {validDodge,publicCombat,resolveAttack} from '../lib/obr/core/actions.ts';

const participants=['a','b','c'].map(id=>({id,characterId:id,name:id,dex:10,playerId:id,playerName:id,tokenId:id,camp:id==='a'?'A':'B'}));
const combat={version:1,phase:'ready',id:'combat',revision:1,campaignId:'campaign',createdBy:'a',participants,turn:0,initiative:{rolls:participants.map((p,i)=>({participantId:p.id,d20:20-i,source:'manual'})),usedDice:[],tieOrder:['a','b','c'],collector:null}};
const pending=()=>({id:'attack',actorId:'a',name:'Secret',cells:[{x:2,y:0}],dpi:100,defenders:['b','c'],answers:{},board:[{tokenId:'a',cell:{x:8,y:8},position:{x:850,y:850}},{tokenId:'b',cell:{x:0,y:0},position:{x:50,y:50}},{tokenId:'c',cell:{x:4,y:0},position:{x:450,y:50}}]});
const state=()=>({combat,revision:1,dodges:{b:1,c:1},pending:pending(),resolution:null,receipts:['secret']});
test('esquive : toutes les cases de la grille à deux cases maximum',()=>{
 for(const x of [-2,-1,0,1,2])for(const y of [-2,-1,0,1,2])assert.equal(validDodge({x:0,y:0},{x,y}),!!(x||y));
 for(const p of [{x:0,y:0},{x:0.5,y:1},{x:3,y:0},{x:NaN,y:0}])assert.equal(validDodge({x:0,y:0},p),false);
});
test('la vue partagée ne révèle ni technique, ni zone, ni réponses secrètes',()=>{
 const s=state();s.pending.answers.b={x:2,y:0};
 const view=publicCombat(s);
 assert.deepEqual(view.pending,{id:'attack',actorId:'a',defenders:['b','c'],answered:['b']});
 assert.equal('receipts' in view,false);
 resolveAttack(s);assert.equal(s.resolution,null);
});
test('collision simultanée : priorité initiative, une seule arrivée',()=>{
 const s=state();s.pending.answers={b:{x:2,y:0},c:{x:2,y:0}};
 resolveAttack(s);
 assert.equal(s.pending,null);
 assert.deepEqual(s.resolution.moves,[{tokenId:'b',position:{x:250,y:50},positions:[{x:50,y:50},{x:150,y:50},{x:250,y:50}]}]);
 assert.deepEqual(s.resolution.cells,[{x:2,y:0}]);
});
test('passer ne déplace pas, et une case occupée bloque la destination',()=>{
 const s=state();s.pending.board.push({tokenId:'obstacle-token',cell:{x:2,y:0},position:{x:250,y:50}});s.pending.answers={b:{x:2,y:0},c:null};
 resolveAttack(s);assert.deepEqual(s.resolution.moves,[]);
});

test('esquive : un pion intermédiaire bloque aussi le déplacement',()=>{
 const s=state();s.pending.board.push({tokenId:'blocker',cell:{x:1,y:0},position:{x:150,y:50}});s.pending.answers={b:{x:2,y:0},c:null};
 resolveAttack(s);assert.deepEqual(s.resolution.moves,[]);
});

test('zone privée maintenue pour l’attaquant et le MJ seulement',()=>{
 const s=state();
 assert.deepEqual(publicCombat(s,'a').attackPreview.cells,s.pending.cells);
 assert.equal(publicCombat(s,'b').attackPreview,undefined);
 assert.deepEqual(publicCombat(s,'gm',true).attackPreview.cells,s.pending.cells);
 s.pending.answers={b:null,c:null};resolveAttack(s);
 assert.equal(publicCombat(s,'a').attackPreview,undefined);
});
test('touchés calculés après esquives, y compris une esquive dans la zone',()=>{
 const s=state();s.pending.cells=[{x:0,y:0},{x:2,y:0}];
 s.pending.answers={b:{x:0,y:2},c:{x:2,y:0}};
 resolveAttack(s);assert.deepEqual(s.resolution.hitParticipants,['c']);
 assert.equal(publicCombat(s).lastAttack,undefined,'annonce après confirmation de la révélation');
});

test('esquive : une case proche ou une diagonale intermédiaire est résolue',()=>{
 for(const target of [{x:1,y:0},{x:2,y:1}]) {
  const s=state();s.pending.answers={b:target,c:null};resolveAttack(s);
  assert.deepEqual(s.resolution.moves[0].position,{x:target.x*100+50,y:target.y*100+50});
 }
});

test('journal : les actions en préparation et les coûts restent privés jusqu’à leur révélation',()=>{
 const state={combat:{participants:[{id:'actor',playerId:'alice'},{id:'other',playerId:'bob'}]},pending:null,resolution:null,history:[
  {id:'pending',actorId:'actor',turn:0,kind:'action',name:'Sort secret',end:1,mana:4,resolved:false},
  {id:'done',actorId:'actor',turn:0,kind:'action',name:'Estoc',end:2,mana:0,resolved:true,hitParticipants:['other']},
 ]};
 const own=publicCombat(state,'alice').history,other=publicCombat(state,'bob').history,gm=publicCombat(state,'gm',true).history;
 assert.equal(own.length,2);assert.equal(gm.length,2);assert.equal(other.length,1);
 assert.equal(other[0].id,'done');assert.equal(other[0].end,undefined);assert.equal(other[0].mana,undefined);
 assert.deepEqual(other[0].hitParticipants,['other']);assert.equal(own[0].mana,4);
 state.history[0].resolved=true;
 assert.equal(publicCombat(state,'bob').history.length,2);
});
