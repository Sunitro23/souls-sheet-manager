import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,derive,entry,validate} from '../lib/rules.ts';
import {defaultTree,normalizeTree,unlock,validateTree} from '../lib/progression.ts';
import {classNodes} from '../lib/classes.ts';
test('armure : PV pleins préservés, blessure et dégâts simultanés conservés',()=>{
 const c=fresh();c.inventory=[];c.spells=[];c.hp=derive(c).hp;
 const armor=entry('Armure','armor',{armor:2,equipped:false,status:'approved'});c.inventory=[armor];
 const next=structuredClone(c);next.inventory[0].equipped=true;const saved=validate(next,c);assert.equal(saved.hp,derive(saved).hp);assert.ok(saved.hp>c.hp);
 const hurt={...c,hp:c.hp-2},hurtNext=structuredClone(hurt);hurtNext.inventory[0].equipped=true;assert.equal(validate(hurtNext,hurt).hp,hurt.hp);
 const damage=structuredClone(c);damage.inventory[0].equipped=true;damage.hp--;assert.equal(validate(damage,c).hp,c.hp-1);
 const unequip=structuredClone(saved);unequip.inventory[0].equipped=false;assert.equal(validate(unequip,saved).hp,derive(c).hp);
 const beforeRing=structuredClone(c);beforeRing.inventory.push(entry('Anneau','talisman',{equipped:false,status:'approved',bonuses:{HP:5}}));const ring=structuredClone(beforeRing);ring.inventory.at(-1).equipped=true;assert.equal(validate(ring,beforeRing).hp,c.hp);
});
test('aptitudes réservées à la classe et bonus effectifs',()=>{
 const tree=defaultTree();validateTree(tree);
 for(const n of classNodes()){
  let c={...fresh(),className:n.className,level:5,unlocks:[]};const before=c.stats[n.stat];c=unlock(c,tree,n.id);
  if(n.kind==='stat')assert.equal(c.stats[n.stat],before+1);
  assert.ok(c.unlocks.some(u=>u.id===n.id));assert.throws(()=>unlock({...fresh(),className:'Autre',level:5,unlocks:[]},tree,n.id),/personnage/);
 }
});
test('migration v8 archive les anciens talents et préserve les nœuds personnalisés',()=>{
 const tree=defaultTree(),oldTalent={...tree.nodes[0],id:'class:combat:fighter:talent',family:'Classe',className:'Guerrier',requires:[],name:'Second souffle'};
 const old={...tree,version:8,nodes:[...tree.nodes.filter(n=>!['Classe','Race'].includes(n.family)),oldTalent]};
 old.nodes[0]={...old.nodes[0],name:'Effet personnalisé du MJ'};
 const migrated=normalizeTree(old);assert.equal(migrated.version,9);assert.ok(!migrated.nodes.some(n=>n.id===oldTalent.id));assert.ok(migrated.legacyNodes.some(n=>n.id===oldTalent.id));assert.equal(migrated.nodes[0].name,'Effet personnalisé du MJ');assert.deepEqual(normalizeTree(migrated),migrated);validateTree(migrated);
 const dependent={...oldTalent,id:'custom',requires:[oldTalent.id]};const withCustom=normalizeTree({...old,nodes:[...old.nodes,dependent]});assert.ok(withCustom.nodes.some(n=>n.id===oldTalent.id));validateTree(withCustom);
});
test('tous les déplacements sont entiers, sprint x2,5 arrondi à la case inférieure',()=>{
 for(let dex=2;dex<=28;dex++)for(let armor=0;armor<5;armor++){
  const c=fresh();c.stats.DEX=dex;c.inventory=[entry('Armure','armor',{armor,status:'approved',equipped:true})];const d=derive(c);
  assert.ok(Number.isInteger(d.move)&&Number.isInteger(d.sprint)&&Number.isInteger(d.dodge));assert.equal(d.sprint,Math.floor(d.move*2.5));
 }
 const c=fresh();c.inventory=[];c.stats.DEX=14;assert.equal(derive(c).move,3);assert.equal(derive(c).sprint,7);
});
