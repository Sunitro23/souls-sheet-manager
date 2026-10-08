import test from 'node:test';
import assert from 'node:assert/strict';
import {racialCatalog} from '../lib/races.ts';
import {defaultTree,normalizeTree,nodesForFamily,unlock,remaining,validateTree} from '../lib/progression.ts';
const tree=defaultTree();
const hero=race=>({id:'hero',race,className:'',level:4,stats:{FOR:10,DEX:10,CON:10,INT:10,SAG:10,CHA:10},unlocks:[]});
test('12 races, 24 voies et bonus exacts, sans défenses',()=>{
 assert.equal(racialCatalog.length,12);assert.equal(tree.races.length,12);validateTree(tree);
 for(const race of racialCatalog){const nodes=nodesForFamily(tree,'Race',hero(race.name));assert.equal(nodes.length,6);
 for(const path of race.paths){const branch=nodes.filter(n=>n.racialPath===path.name);let c=hero(race.name);assert.throws(()=>unlock(c,tree,branch[2].id),/Prérequis/);
 for(const n of branch)c=unlock(c,tree,n.id);
 assert.equal(c.stats[path.primary],12);assert.equal(c.stats[path.secondary],11);assert.equal(remaining(c,tree),3);
 assert.throws(()=>unlock(c,tree,nodes.find(n=>n.racialPath!==path.name).id),/autre voie/);
 assert.throws(()=>unlock(c,tree,branch[0].id),/Déjà/);
 }
 }
});
test('race, points disponibles et plafond des stats contrôlés',()=>{const n=tree.nodes.find(n=>n.family==='Race');assert.throws(()=>unlock(hero('autre race'),tree,n.id),/personnage/);assert.throws(()=>unlock({...hero(n.race),level:1},tree,n.id),/Points/);const c=hero(n.race);c.stats[n.stat]=28;assert.throws(()=>unlock(c,tree,n.id),/maximale/);});
test('migration des campagnes existantes une seule fois, modifications GM préservées',()=>{const old={version:3,pointsPerLevel:3,races:['Elfe'],nodes:[{...tree.nodes[0],name:'Personnalisé'}]};const next=normalizeTree(old);assert.equal(next.version,4);assert.equal(next.nodes[0].name,'Personnalisé');assert.ok(next.races.includes('Elfe'));assert.ok(next.races.includes('Humains'));assert.equal(next.nodes.length,73);const edited={...next,races:['Humains'],nodes:next.nodes.slice(0,2)};assert.deepEqual(normalizeTree(edited),edited);});
