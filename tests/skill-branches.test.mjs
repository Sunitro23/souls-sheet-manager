import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultTree,knownNodeIds,nodesForFamily,remaining,unlock} from '../lib/progression.ts';
import {characterSkillNodes,skillBranches} from '../lib/skill-branches.ts';
import {skillState} from '../lib/skill-state.ts';
import {fresh,entry} from '../lib/rules.ts';

test('les armes du sac et équipées ouvrent uniquement leurs familles, sans doublons',()=>{
 const tree=defaultTree(),character={...fresh(),inventory:[]};
 const weaponFamilies=nodes=>[...new Set(nodes.filter(n=>n.family?.startsWith('Armes')||n.family==='Lames').map(n=>n.family))];
 assert.deepEqual(weaponFamilies(characterSkillNodes(tree,character)),[]);
 character.inventory.push(entry('Dague','weapon',{category:'Dagues',equipped:false}),entry('Épée','weapon',{category:'Épées',equipped:true}),entry('Arc','weapon',{category:'Arcs',equipped:false}),entry('Lance retirée','weapon',{category:'Lances',archived:true}),entry('Décoration','other',{category:'Marteaux'}));
 const before=JSON.stringify(character),nodes=characterSkillNodes(tree,character);
 assert.deepEqual(weaponFamilies(nodes),['Lames','Armes de tir']);
 const branches=skillBranches(nodes,'Voies du personnage').filter(b=>b.type==='Voie d’armes');
 assert.deepEqual(branches.map(b=>b.name),['Lames','Armes de tir']);assert.ok(branches.every(b=>b.nodes.length===5));
 assert.equal(JSON.stringify(character),before);
 character.inventory=character.inventory.filter(item=>item.category!=='Arcs');assert.deepEqual(weaponFamilies(characterSkillNodes(tree,character)),['Lames']);
});

test('la famille configurée de la catégorie prime sur le type de base',()=>{
 const tree=defaultTree();tree.categoryFamilies={'custom-bow':'Armes longues','weapon:Marteaux':'Lames'};
 const character={...fresh(),inventory:[entry('Arc spécial','weapon',{category:'Arcs',categoryId:'custom-bow'}),entry('Marteau','weapon',{category:'Marteaux'})]};
 const nodes=characterSkillNodes(tree,character);
 assert.ok(nodes.some(n=>n.family==='Armes longues'));assert.ok(nodes.some(n=>n.family==='Lames'));
 assert.ok(!nodes.some(n=>n.family==='Armes de tir'||n.family==='Armes d’impact'));
});

test('les voies propres au personnage restent visibles et les contenus étrangers sont exclus',()=>{
 const tree=defaultTree(),character={...fresh(),id:'hero',race:'Human',className:'Warrior',inventory:[]};
 const base={...tree.nodes[0],family:'Personnel',characterId:'hero',id:'personal'};
 tree.nodes.push(base,{...base,id:'other-player',characterId:'other'},{...base,id:'draft',draft:true},{...base,id:'archived',archived:true});
 const nodes=characterSkillNodes(tree,character);
 for(const family of ['Classe','Race','Personnel','Magie'])assert.ok(nodes.some(n=>n.family===family),family);
 assert.ok(nodes.every(n=>!n.className||n.className==='Warrior'));assert.ok(nodes.every(n=>!n.race||n.race==='Human'));
 assert.ok(nodes.some(n=>n.id==='personal'));assert.ok(!nodes.some(n=>['other-player','draft','archived'].includes(n.id)));
});

test('une compétence liée à un type d’arme précis nécessite ce type dans le sac',()=>{
 const tree=defaultTree(),base=tree.nodes[0];tree.nodes.push({...base,id:'dagger-only',weapon:'Dagues'},{...base,id:'sword-only',weapon:'Épées'});
 const character={...fresh(),inventory:[entry('Dague','weapon',{category:'Dagues'})]},nodes=characterSkillNodes(tree,character);
 assert.ok(nodes.some(n=>n.id==='dagger-only'));assert.ok(!nodes.some(n=>n.id==='sword-only'));
});

test('seules les familles des sorts connus apparaissent, même sans mémorisation',()=>{
 const tree=defaultTree(),character={...fresh(),inventory:[],spells:[]};
 const paths=()=>skillBranches(characterSkillNodes(tree,character),'Voies du personnage').filter(branch=>branch.nodes[0].magicPath).map(branch=>branch.name);
 assert.deepEqual(paths(),[]);
 for(const school of ['Miracles','Sorts','Pyromancies','Malédictions','Mélodies']){
  character.spells=[entry('Sort connu','spell',{school,known:true,memorized:false})];
  assert.deepEqual(paths(),[school]);
 }
 character.spells.push(entry('Deuxième mélodie','spell',{school:'Mélodies'}),entry('Miracle','spell',{school:'Miracles',memorized:true}));
 const before=JSON.stringify(character);assert.deepEqual(paths(),['Miracles','Mélodies']);assert.equal(JSON.stringify(character),before);
 assert.equal(characterSkillNodes(tree,character).filter(node=>node.family==='Magie'&&!node.magicPath).length,3);
});

test('les sorts inconnus, archivés et retirés ne révèlent pas leur spécialisation',()=>{
 const tree=defaultTree(),character={...fresh(),inventory:[entry('Sceau','catalyst',{category:'Sceau'})],spells:[entry('Sort inconnu','spell',{school:'Miracles',known:false}),entry('Sort archivé','spell',{school:'Malédictions',archived:true})]};
 assert.ok(characterSkillNodes(tree,character).every(node=>!node.magicPath));
 character.spells.push(entry('Sort ancien sans famille','spell'));
 assert.deepEqual([...new Set(characterSkillNodes(tree,character).map(node=>node.magicPath).filter(Boolean))],['Sorts']);
 character.spells=[];assert.ok(characterSkillNodes(tree,character).every(node=>!node.magicPath));
});

test('la spécialisation acquise reste visible après le retrait de ses sorts',()=>{
 const tree=defaultTree(),chosen=tree.nodes.find(node=>node.magicPath==='Pyromancies');
 const character={...fresh(),inventory:[],spells:[],unlocks:[chosen]};
 const nodes=characterSkillNodes(tree,character);
 assert.deepEqual([...new Set(nodes.map(node=>node.magicPath).filter(Boolean))],['Pyromancies']);
 assert.equal(nodes.filter(node=>node.magicPath==='Pyromancies').length,3);
});

test('les catégories restent dans une même voie, avec des rangs issus des prérequis',()=>{
 const nodes=defaultTree().nodes.filter(n=>n.family==='Lames'),before=JSON.stringify(nodes);
 const [branch,...others]=skillBranches([...nodes].reverse(),'Lames');
 assert.equal(others.length,0);assert.equal(branch.name,'Lames');assert.equal(branch.nodes.length,5);
 for(const node of nodes){assert.equal(branch.ranks.get(node.id),node.tier==='base'?1:node.tier==='expert'?3:2);for(const parent of node.requires)assert.ok(branch.nodes.findIndex(n=>n.id===parent)<branch.nodes.findIndex(n=>n.id===node.id))}
 assert.equal(JSON.stringify(nodes),before);
});

test('les spécialisations réelles restent distinctes, sans ajouter de rangs',()=>{
 const nodes=defaultTree().nodes.filter(n=>n.family==='Magie'),branches=skillBranches(nodes,'Magie');
 assert.equal(branches.length,6);assert.equal(new Set(branches.flatMap(b=>b.nodes.map(n=>n.id))).size,nodes.length);
 for(const branch of branches){assert.equal(branch.nodes.length,3);assert.deepEqual([...branch.ranks.values()],[1,2,3])}
});

test('les talents indépendants et les voies personnalisées conservent leur structure',()=>{
 const tree=defaultTree(),character={...fresh(),className:'Warrior',race:'Human'};
 const [independent]=skillBranches(nodesForFamily(tree,'Classe',character),'Classe');
 assert.equal(independent.linked,false);assert.ok([...independent.ranks.values()].every(rank=>rank===1));
 const base=tree.nodes[0],paths=['Confesseur','Sentinelle'].flatMap((classPath,j)=>Array.from({length:5},(_,i)=>({...base,family:'Classe',className:'Warrior',classPath,id:`path:${j}:${i}`,requires:i?[`path:${j}:${i-1}`]:[]})));
 const branches=skillBranches(paths,'Classe');assert.equal(branches.length,2);
 for(const branch of branches){assert.equal(branch.type,'Voie de classe');assert.deepEqual([...branch.ranks.values()],[1,2,3,4,5])}
});

test('une acquisition actualise points, progression et état du rang suivant',()=>{
 const tree=defaultTree(),character={...fresh(),level:3},[branch]=skillBranches(nodesForFamily(tree,'Magie',character),'Magie');
 const [first,next]=branch.nodes,before=skillState(next,character,knownNodeIds(character,tree),remaining(character,tree));assert.equal(before.available,false);
 const saved=JSON.parse(JSON.stringify(unlock(character,tree,first.id))),known=knownNodeIds(saved,tree),points=remaining(saved,tree);
 assert.equal(points,remaining(character,tree)-first.cost);assert.equal(branch.nodes.filter(n=>known.has(n.id)).length,1);
 assert.equal(skillState(first,saved,known,points).acquired,true);assert.equal(skillState(next,saved,known,points).available,true);
});
