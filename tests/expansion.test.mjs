import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,derive,entry,validate} from '../lib/rules.ts';
import {defaultTree,normalizeTree,unlock,validateTree} from '../lib/progression.ts';
import {classCatalog} from '../lib/classes.ts';
import {spellDamage,catalystTypes} from '../lib/bonuses.ts';
import {readNavigation,writeNavigation} from '../lib/navigation.ts';
const hero=()=>({...fresh(),level:8,className:'Magicien',unlocks:[]});
test('bonus équipés validés, ressources, attributs et sprint exact',()=>{
 const c=hero(),before=derive(c),ring=entry('Anneau','talisman',{status:'approved',equipped:true,bonuses:{HP:7,FP:3,END:2,FOR:2,DEX:2}});c.inventory.push(ring);
 const d=derive(c);assert.equal(d.hp,before.hp+7);assert.equal(d.mana,before.mana+3);assert.equal(d.end,before.end+2);assert.equal(d.stats.FOR,c.stats.FOR+2);assert.equal(d.sprint,Math.floor(d.move*2.5));assert.equal(c.stats.FOR,before.stats.FOR);
 ring.equipped=false;assert.deepEqual(derive(c),before);ring.equipped=true;ring.status='pending';assert.deepEqual(derive(c),before);
});
test('modifier un bonus exige une nouvelle validation, impossible de forger les acquis',()=>{
 const old=hero();old.inventory.push(entry('Anneau','talisman',{status:'approved',equipped:true,bonuses:{HP:2}}));
 const next=structuredClone(old);next.inventory.at(-1).bonuses.HP=10;next.unlocks=[{kind:'bonus',stat:'FP',amount:99}];
 const saved=validate(next,old);assert.equal(saved.inventory.at(-1).status,'pending');assert.equal(saved.inventory.at(-1).equipped,false);assert.deepEqual(saved.unlocks,old.unlocks);
 for(const bonuses of [{HP:-1},{FOR:1.5},{BAD:4},null]){const bad=structuredClone(old);bad.inventory.at(-1).bonuses=bonuses;assert.throws(()=>validate(bad,old,true));}
});
test('les six classes ont leurs deux bonus et trois aptitudes',()=>{
 const t=defaultTree();assert.equal(classCatalog.length,6);assert.equal(validateTree(t),t);
 for(const cls of classCatalog){const nodes=t.nodes.filter(n=>n.className===cls.name);assert.equal(nodes.length,5);let c={...hero(),className:cls.name};const before={...c.stats};for(const n of nodes)c=unlock(c,t,n.id);for(const stat of cls.stats)assert.equal(c.stats[stat],before[stat]+1);assert.equal(c.unlocks.filter(n=>n.kind==='competence').length,3);}
});
test('FP et dégâts fixes spécialisés, sans changement des dés ni des autres familles',()=>{
 const t=defaultTree();let c=hero(),base=derive(c).mana;c=unlock(c,t,'magic:fp:0');assert.equal(derive(c).mana,base+2);
 c=unlock(c,t,'magic:school:2:0');c=unlock(c,t,'magic:school:2:1');
 assert.equal(spellDamage({damage:'2d6+1',school:'Pyromancies'},c),'2d6+3');assert.equal(spellDamage({damage:'1d8',school:'Miracles'},c),'1d8');assert.equal(spellDamage({damage:'',school:'Pyromancies'},c),'—');assert.throws(()=>unlock(c,t,'magic:school:0:0'),/spécialisation/);
});
test('migration v4 additive et idempotente, contenu personnalisé conservé',()=>{
 const t=defaultTree(),old={...t,version:4,nodes:t.nodes.filter(n=>!['Classe','Magie'].includes(n.family))};old.nodes[0]={...old.nodes[0],name:'Personnalisée'};const before=JSON.stringify(old),next=normalizeTree(old);assert.equal(next.version,9);assert.equal(next.nodes[0].name,'Personnalisée');assert.equal(next.nodes.length,t.nodes.length);assert.deepEqual(normalizeTree(next),next);assert.equal(JSON.stringify(old),before);
});
test('instruments : poids variables et limite des deux mains',()=>{
 assert.ok(new Set(catalystTypes.map(c=>c.weight)).size>1);const c=hero();c.spells=[];c.inventory=[];c.inventory.push(entry('Flûte','catalyst',{category:'Flûte',weight:1,status:'approved',equipped:true}));assert.equal(derive(validate(structuredClone(c),c,true)).weight,1);
 c.inventory.push(entry('Luth','catalyst',{weight:2,status:'approved',equipped:true}),entry('Tambour','catalyst',{weight:3,status:'approved',equipped:true}));assert.throws(()=>validate(structuredClone(c),c,true),/Deux armes ou catalyseurs/);
});
test('équiper un sort conserve les contrôles de mémoire et de validation',()=>{
 const c=hero();c.spells=[];c.stats.SAG=18;c.magic='SAG';const spell=entry('Flamme','spell',{school:'Pyromancies',rank:1,status:'approved'});c.spells.push(spell);
 const next=structuredClone(c);next.spells[0].known=true;next.spells[0].memorized=true;assert.equal(validate(next,c).spells[0].memorized,true);
 const unknown=structuredClone(c);unknown.spells[0].memorized=true;unknown.spells[0].known=false;assert.throws(()=>validate(unknown,c),/connu/);
 const full=structuredClone(c);full.stats.SAG=8;full.spells[0].known=true;full.spells[0].memorized=true;assert.throws(()=>validate(full,c,true),/Mémoire/);
 const pending=structuredClone(c);pending.spells[0].school='Miracles';pending.spells[0].known=true;pending.spells[0].memorized=true;assert.throws(()=>validate(pending,c),/validé/);
});
test('navigation par compte, onglet restauré et stockage invalide toléré',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)},saved={campaignId:'campaign',characterId:'hero',tab:'Grimoire',branch:'Magie',gmPanel:false};writeNavigation(storage,'user',saved);assert.deepEqual(readNavigation(storage,'user'),saved);assert.equal(readNavigation(storage,'other'),null);map.set('cendres-navigation:user','bad');assert.equal(readNavigation(storage,'user'),null);assert.equal(readNavigation({getItem:()=>{throw Error()}},'user'),null);
});
test('Mélodies : migration v5 préserve les arbres MJ et bonus réservé aux sorts bardiques',()=>{
 const tree=defaultTree(),old={...tree,version:5,nodes:tree.nodes.filter(n=>n.magicPath!=='Mélodies'&&n.id!=='magic:fp:2')};
 old.nodes[0]={...old.nodes[0],name:'Choix du MJ'};
 const migrated=normalizeTree(old);assert.equal(migrated.version,9);assert.equal(migrated.nodes.length,old.nodes.length+3);assert.equal(migrated.nodes[0].name,'Choix du MJ');assert.ok(!migrated.nodes.some(n=>n.id==='magic:fp:2'));assert.deepEqual(normalizeTree(migrated),migrated);validateTree(migrated);
 let bard={...hero(),className:'Barde'};bard=unlock(bard,migrated,'magic:school:4:0');bard=unlock(bard,migrated,'magic:school:4:1');
 assert.equal(spellDamage({damage:'1d6',school:'Mélodies'},bard),'1d6+2');assert.equal(spellDamage({damage:'1d6',school:'Sorts'},bard),'1d6');assert.throws(()=>unlock(bard,migrated,'magic:school:0:0'),/spécialisation/);
 const song=entry('Refrain des braises','spell',{school:'Mélodies',status:'approved'});const next={...bard,spells:[song]};assert.equal(validate(next,next,true).spells[0].school,'Mélodies');
});
