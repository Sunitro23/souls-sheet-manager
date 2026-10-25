import test from 'node:test';
import assert from 'node:assert/strict';
import {createCharacter,derive,validate,entry,statNames,armors} from '../lib/rules.ts';
import {defaultTree,unlock,nodesForFamily,knownNodeIds,remaining} from '../lib/progression.ts';
import {skillState} from '../lib/skill-state.ts';
const custom=()=>createCharacter({name:'Boss',mode:'custom',resourceBases:{hp:5000,mana:200,end:30},level:1,stats:Object.fromEntries(statNames.map(s=>[s,60])),magic:'SAG'});
test('bases custom fixes, caractéristiques au-delà de 28 et ressources initialement pleines',()=>{
 const c=custom();assert.equal(derive(c).stats.FOR,60);assert.equal(c.hp,5000);assert.equal(c.mana,200);assert.equal(c.end,30);
 c.level=100;c.stats.CON=100;c.stats.SAG=80;
 assert.equal(derive(c).hp,5000);assert.equal(derive(c).mana,200);assert.equal(derive(c).end,30);assert.equal(derive(c).memory,35);
});
test('armure, surcharge et bonus restent appliqués aux bases custom',()=>{
 const c=custom();c.stats.FOR=10;c.inventory=[entry('Armure','armor',{armor:1,equipped:true,status:'approved',bonuses:{HP:10,END:2,FP:3}}),entry('Charge','other',{weight:3,equipped:true,status:'approved'})];
 const d=derive(c);assert.equal(d.hp,Math.round(5000*armors[1].hp)+10);assert.equal(d.mana,203);assert.equal(d.end,30-d.overload+2);assert.ok(d.overload>0);
 assert.doesNotThrow(()=>validate(c,structuredClone(c),true));
});
test('mode immutable, bases entières positives et accès MJ',()=>{
 const c=custom();assert.throws(()=>validate(structuredClone(c),c,false),/MJ/);
 for(const value of [0,-1,1.5,Infinity])assert.throws(()=>validate({...c,resourceBases:{...c.resourceBases,hp:value}},c,true));
 assert.throws(()=>validate({...c,mode:undefined},c,true),/mode/);
 assert.throws(()=>validate({...c,mode:undefined,resourceBases:undefined},undefined,true),/FOR/);
});
test('acquisitions libres de toutes origines, sans coûts, niveaux ou prérequis ; pas de doublons',()=>{
 let c={...custom(),className:'',race:'',id:'boss'};const tree=defaultTree();
 const node={...tree.nodes[0],id:'custom-test',family:'Classe',className:'Autre classe',race:'Autre race',characterId:'autre',kind:'stat',stat:'FOR',amount:1,cost:20,level:100,requires:['absent'],draft:false,archived:false};
 const t={...tree,nodes:[node]};assert.equal(nodesForFamily(t,'Classe',c).length,1);
 assert.equal(skillState(node,c,knownNodeIds(c,t),remaining(c,t)).available,true);
 c=unlock(c,t,node.id);assert.equal(c.stats.FOR,61);assert.equal(c.unlocks[0].cost,0);assert.equal(remaining(c,t),0);assert.throws(()=>unlock(c,t,node.id),/Déjà/);
 for(const flag of ['archived','draft']){const n={...node,[flag]:true};assert.throws(()=>unlock(custom(),{...t,nodes:[n]},n.id));assert.equal(skillState(n,custom(),new Set(),0).available,false)}
});
