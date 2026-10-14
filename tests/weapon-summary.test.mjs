import test from 'node:test';
import assert from 'node:assert/strict';
import {weaponSummary} from '../lib/weapon-summary.ts';
import {entry} from '../lib/rules.ts';
import {defaultTree} from '../lib/progression.ts';
import {predefinedTechniques} from '../lib/combat.ts';
test('armes : poids automatique, techniques de la famille et statut acquis',()=>{const tree=defaultTree(),item={...entry('Épée','weapon'),category:'Épées',damage:'1d8',weight:99};const node=tree.nodes.find(n=>n.family==='Lames');const result=weaponSummary(item,{unlocks:[{id:node.id}]},tree);assert.equal(result.weight,2);assert.equal(result.family,'Lames');assert.equal(result.techniques.length,5);assert.equal(result.techniques.filter(n=>n.learned).length,2);for(const t of result.techniques){const original=predefinedTechniques(item).find(n=>n.name===t.name);if(original){assert.equal(t.end,original.end);assert.deepEqual(t.pattern,original.pattern);assert.equal(t.damage,'1d8');}}});
test('attributions GM, filtrage personnage et technique spéciale conservés',()=>{const tree=defaultTree();tree.weaponFamilies['Épées']='Armes longues';tree.nodes.push({...tree.nodes[0],id:'other',family:'Armes longues',characterId:'another'});const item={...entry('Épée','weapon'),category:'Épées',damage:'1d8',special:{name:'Onde',description:'Repousse',end:4,mana:0,range:3,pattern:[[0,1]],damage:'2d6',friendlyFire:true}};const result=weaponSummary(item,{id:'me',unlocks:[]},tree);assert.equal(result.family,'Armes longues');assert.ok(!result.techniques.some(t=>t.id==='other'));assert.equal(result.techniques.find(t=>t.name==='Onde').damage,'2d6');});

test('les schémas et END correspondent au type réel de l’arme, bases acquises sans achat',()=>{
 const tree=defaultTree(),character={level:1,unlocks:[]};
 const dagger=weaponSummary({...entry('Dague','weapon'),category:'Dagues'},character,tree);
 const sword=weaponSummary({...entry('Épée','weapon'),category:'Épées'},character,tree);
 assert.equal(dagger.techniques.filter(t=>t.learned).length,2);
 assert.notDeepEqual(dagger.techniques[0].pattern,sword.techniques[0].pattern);
 for(const category of ['Dagues','Épées','Hallebardes','Marteaux','Arcs']){
  const item={...entry(category,'weapon'),category};
  for(const t of weaponSummary(item,character,tree).techniques){
   const source=predefinedTechniques(item).find(n=>n.name===t.name);
   assert.deepEqual(t.pattern,source.pattern);assert.equal(t.end,source.end);
  }
 }
});
