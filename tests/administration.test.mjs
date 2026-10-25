import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSettings,validateSettings,validateCategoryReferences,categoryFor,palettes} from '../lib/campaign-settings.ts';
import {reviewRows,decideReview} from '../lib/reviews.ts';
import {defaultTree,unlock,knownNodeIds,validateTree,nodesForFamily} from '../lib/progression.ts';
import {fresh,entry} from '../lib/rules.ts';

test('palettes lisibles et rejet des palettes sans contraste',()=>{
 const old=defaultSettings();
 for(const palette of palettes)assert.doesNotThrow(()=>validateSettings({...old,appearance:{...old.appearance,...palette}},old));
 assert.throws(()=>validateSettings({...old,appearance:{...old.appearance,surface:'#ffffff'}},old),/contrastée/);
});
test('renommer et archiver conserve les identifiants et références mécaniques',()=>{
 const old=defaultSettings(),next=structuredClone(old),category=next.categories.find(c=>c.kind==='weapon');category.name='Lames anciennes';category.archived=true;
 assert.equal(validateSettings(next,old).categories[0].id,old.categories[0].id);
 assert.throws(()=>validateSettings({...next,categories:next.categories.slice(1)},old),/Archivez/);
 category.baseKey='Inconnue';assert.throws(()=>validateSettings(next,old),/mécanique/);
});
test('parents absents et cycles de catégories refusés',()=>{
 const old=defaultSettings(),next=structuredClone(old),[a,b]=next.categories;
 a.parentId='absent';assert.throws(()=>validateSettings(next,old),/parente/);
 a.parentId=b.id;b.parentId=a.id;assert.throws(()=>validateSettings(next,old),/boucle/);
});
test('catégorie archivée utilisable par son ancien objet mais pas par un nouveau',()=>{
 const settings=defaultSettings(),category=settings.categories.find(c=>c.kind==='weapon');
 const item=entry('Objet historique','weapon',{category:category.baseKey,categoryId:category.id});
 category.archived=true;const c={inventory:[item],spells:[]};
 assert.doesNotThrow(()=>validateCategoryReferences(c,structuredClone(c),settings));
 assert.throws(()=>validateCategoryReferences(c,{inventory:[]},settings),/indisponible/);
 category.name='Nom visible';assert.equal(categoryFor(settings,item).name,'Nom visible');
 assert.equal(item.category,category.baseKey);
});
test('file centralisée, demandes de correction et historique immuable',()=>{
 const c=fresh();c.reviewStatus='pending';c.inventory=[entry('Lame','weapon')];c.spells=[entry('Flamme','spell')];c.personalSkills=[];
 assert.equal(reviewRows([c]).filter(r=>r.status==='pending').length,3);
 const next=decideReview(c,{kind:'inventory',itemId:c.inventory[0].id,decision:'correction',comment:'Préciser le coût'},'MJ',100);
 assert.equal(c.reviewHistory,undefined);assert.equal(next.reviewHistory.length,1);assert.equal(reviewRows([next]).find(r=>r.kind==='inventory').correction,true);
 const approved=decideReview(next,{kind:'inventory',itemId:c.inventory[0].id,decision:'approved',comment:''},'MJ',101);
 assert.equal(approved.inventory[0].status,'approved');assert.equal(approved.reviewHistory.length,2);
 assert.throws(()=>decideReview(approved,{kind:'inventory',itemId:c.inventory[0].id,decision:'approved',comment:''},'MJ',102),/déjà/);
 assert.throws(()=>decideReview(c,{kind:'inventory',itemId:'absent',decision:'approved',comment:''},'MJ',102),/introuvable/);
});
test('archive de compétence inaccessible à l’achat, acquis conservés',()=>{
 const tree=defaultTree(),c=fresh(),node=tree.nodes.find(n=>n.family==='Lames'&&n.cost===0);node.archived=true;
 assert.ok(!knownNodeIds(c,tree).has(node.id));assert.ok(!nodesForFamily(tree,'Lames',c).some(n=>n.id===node.id));
 assert.throws(()=>unlock(c,tree,node.id),/archivée/);
 c.unlocks=[{...node,cost:1}];assert.ok(knownNodeIds(c,tree).has(node.id));assert.throws(()=>validateTree(tree),/prérequis/);
});
