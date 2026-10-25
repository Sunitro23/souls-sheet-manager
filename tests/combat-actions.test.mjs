import test from 'node:test';
import assert from 'node:assert/strict';
import {validDodge,publicCombat,resolveAttack} from '../lib/obr/core/actions.ts';

const participants=['a','b','c'].map(id=>({id,characterId:id,name:id,dex:10,playerId:id,playerName:id,tokenId:id,camp:id==='a'?'A':'B'}));
const combat={version:1,phase:'ready',id:'combat',revision:1,campaignId:'campaign',createdBy:'a',participants,turn:0,initiative:{rolls:participants.map((p,i)=>({participantId:p.id,d20:20-i,source:'manual'})),usedDice:[],tieOrder:['a','b','c'],collector:null}};
const pending=()=>({id:'attack',actorId:'a',name:'Secret',cells:[{x:2,y:0}],dpi:100,defenders:['b','c'],answers:{},board:[{tokenId:'a',cell:{x:8,y:8},position:{x:850,y:850}},{tokenId:'b',cell:{x:0,y:0},position:{x:50,y:50}},{tokenId:'c',cell:{x:4,y:0},position:{x:450,y:50}}]});
const state=()=>({combat,revision:1,dodges:{b:1,c:1},pending:pending(),resolution:null,receipts:['secret']});
test('esquive : exactement deux cases dans huit directions',()=>{
 for(const x of [-2,0,2])for(const y of [-2,0,2])assert.equal(validDodge({x:0,y:0},{x,y}),!!(x||y));
 for(const p of [{x:1,y:0},{x:2,y:1},{x:3,y:0}])assert.equal(validDodge({x:0,y:0},p),false);
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
