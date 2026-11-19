import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSettings,validateSettings,validateCategoryReferences,categoryFor,palettes} from '../lib/campaign-settings.ts';
import {defaultTree,unlock,knownNodeIds,validateTree,nodesForFamily} from '../lib/progression.ts';
import {fresh,entry} from '../lib/rules.ts';
import {maxWeaponIconLength} from '../lib/weapon-icons.ts';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';

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
test('archive de compétence inaccessible à l’achat, acquis conservés',()=>{
 const tree=defaultTree(),c=fresh(),node=tree.nodes.find(n=>n.family==='Lames'&&n.cost===0);node.archived=true;
 assert.ok(!knownNodeIds(c,tree).has(node.id));assert.ok(!nodesForFamily(tree,'Lames',c).some(n=>n.id===node.id));
 assert.throws(()=>unlock(c,tree,node.id),/archivée/);
 c.unlocks=[{...node,cost:1}];assert.ok(knownNodeIds(c,tree).has(node.id));assert.throws(()=>validateTree(tree),/prérequis/);
});

test('la migration accorde le rôle administrateur au seul compte Sun existant',async()=>{
 const sqlite=new DatabaseSync(':memory:');
 try{
  for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){
   if(file==='0006_account_administrator.sql')for(const name of ['Sun','sunshine','gm'])sqlite.prepare('insert into accounts(id,username,password_hash,salt) values(?,?,?,?)').run(name,name,'unused','unused');
   sqlite.exec(await readFile(`drizzle/${file}`,'utf8'));
  }
  assert.deepEqual(sqlite.prepare('select username from accounts where is_admin=1').all().map(r=>r.username),['Sun']);
  sqlite.prepare('insert into accounts(id,username,password_hash,salt) values(?,?,?,?)').run('new','new','unused','unused');
  assert.equal(sqlite.prepare('select is_admin from accounts where id=?').get('new').is_admin,0);
 }finally{sqlite.close()}
});

test('les icônes d’armes acceptent les images importées et refusent les formats ou tailles invalides',()=>{
 const old=defaultSettings(),next=structuredClone(old),category=next.categories.find(c=>c.kind==='weapon');
 assert.doesNotThrow(()=>validateSettings(old,old));
 category.weaponIcon='axe';assert.equal(validateSettings(next,old).categories.find(c=>c.id===category.id).weaponIcon,'axe');
 category.weaponIcon='';assert.doesNotThrow(()=>validateSettings(next,old));
 category.weaponIcon='data:image/png;base64,iVBORw0KGgo=';
 assert.equal(validateSettings(next,old).categories.find(c=>c.id===category.id).weaponIcon,category.weaponIcon);
 for(const invalid of ['inconnue','../sword','https://example.com/icon.png',null,42,
  'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', 'data:image/gif;base64,R0lGODlh',
  'data:image/png;base64,', 'data:image/png;base64,not-an-image',
  `data:image/png;base64,${'A'.repeat(maxWeaponIconLength)}`]){
  category.weaponIcon=invalid;assert.throws(()=>validateSettings(next,old),/Icône d’arme/);
 }
});
