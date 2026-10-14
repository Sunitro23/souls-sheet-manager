import test from 'node:test';
import assert from 'node:assert/strict';
import {racialCatalog} from '../lib/races.ts';
import {defaultTree,normalizeTree,nodesForFamily,unlock,remaining,validateTree,knownNodeIds,migrateProgress} from '../lib/progression.ts';
const tree=defaultTree();
const hero=race=>({id:'hero',race,className:'',level:4,stats:{FOR:10,DEX:10,CON:10,INT:10,SAG:10,CHA:10},unlocks:[]});
test('six races, deux bonus exacts et traits innés avec faiblesse',()=>{
 assert.deepEqual(racialCatalog.map(r=>[r.name,...r.stats]),[['Giant','CON','FOR'],['Godlike','SAG','CHA'],['Gyrm','INT','CHA'],['Demon','SAG','FOR'],['Human','DEX','INT'],['Demi-Human','DEX','CON']]);
 assert.equal(tree.races.length,6);validateTree(tree);
 for(const race of racialCatalog){const nodes=nodesForFamily(tree,'Race',hero(race.name));assert.equal(nodes.length,3);let c=hero(race.name);
 for(const n of nodes.filter(n=>n.kind==='stat'))c=unlock(c,tree,n.id);
 for(const stat of race.stats)assert.equal(c.stats[stat],11);
 assert.equal(remaining(c,tree),4);const traits=nodes.find(n=>n.kind==='rp');assert.ok(knownNodeIds(c,tree).has(traits.id));assert.ok(traits.description.includes(race.trait));assert.ok(traits.description.includes(race.weakness));assert.throws(()=>unlock(c,tree,nodes[0].id),/Déjà/);
 }
});
test('anciens noms convertis sans toucher aux acquis',()=>{const old={...hero('Humains'),className:'Guerrier',unlocks:[{id:'old',cost:1}]};const c=migrateProgress(old);assert.equal(c.race,'Human');assert.equal(c.className,'Warrior');assert.deepEqual(c.unlocks,old.unlocks);});
test('race, points disponibles et plafond des stats contrôlés',()=>{const n=tree.nodes.find(n=>n.family==='Race');assert.throws(()=>unlock(hero('autre race'),tree,n.id),/personnage/);assert.throws(()=>unlock({...hero(n.race),level:1},tree,n.id),/Points/);const c=hero(n.race);c.stats[n.stat]=28;assert.throws(()=>unlock(c,tree,n.id),/maximale/);});
test('migration des campagnes existantes une seule fois, modifications GM préservées',()=>{const old={version:3,pointsPerLevel:3,races:['Elfe'],nodes:[{...tree.nodes[0],name:'Personnalisé'}]};const next=normalizeTree(old);assert.equal(next.version,9);assert.equal(next.nodes[0].name,'Personnalisé');assert.ok(next.races.includes('Elfe'));assert.ok(next.races.includes('Human'));assert.equal(next.nodes.length,1+tree.nodes.filter(n=>['Classe','Race','Magie'].includes(n.family)).length);const edited={...next,races:['Humains'],nodes:next.nodes.slice(0,2)};assert.deepEqual(normalizeTree(edited),edited);});
