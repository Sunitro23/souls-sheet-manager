import test from 'node:test';
import assert from 'node:assert/strict';
import {skillTechniques} from '../lib/skill-techniques.ts';
import {defaultTree} from '../lib/progression.ts';
import {entry,fresh,derive,validate,createCharacter} from '../lib/rules.ts';
import {predefinedTechniques} from '../lib/combat.ts';
test('schéma réel de la technique, arme équipée prioritaire et variantes consultables',()=>{
 const tree=defaultTree(),node=tree.nodes.find(n=>n.name==='Swipe'&&n.family==='Lames');
 const previews=skillTechniques(node,[entry('Dague','weapon',{category:'Dagues',equipped:true})],tree);
 assert.equal(previews[0].category,'Dagues');assert.deepEqual(previews[0].pattern,predefinedTechniques({category:'Dagues',damage:''}).find(t=>t.name==='Swipe').pattern);
 assert.ok(previews.some(t=>t.category==='Épées'));assert.deepEqual(skillTechniques({...node,kind:'stat'},[],tree),[]);assert.deepEqual(skillTechniques({...node,name:'Technique du MJ sans schéma'},[],tree),[]);
});
test('2 CON : au moins 1 PV maximum, création vivante, blessures à zéro conservées',()=>{
 const c=createCharacter({name:'Fragile',level:1,stats:{FOR:8,DEX:8,CON:2,INT:8,SAG:8,CHA:8},magic:'INT'});
 assert.equal(derive(c).hp,1);assert.equal(c.hp,1);
 c.hp=0;assert.equal(validate(structuredClone(c),c,true).hp,0);
 for(let con=2;con<=28;con++){const hero=fresh();hero.level=1;hero.stats.CON=con;hero.inventory=[];assert.ok(derive(hero).hp>=1);}
});
