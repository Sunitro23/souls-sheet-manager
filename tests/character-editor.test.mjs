import test from 'node:test';
import assert from 'node:assert/strict';
import {createCharacterEditor} from '../lib/character-editor.ts';

const hero=()=>({id:'hero',campaignId:'campaign',revision:2,playerId:'alice',name:'Héros',notes:'Avant',inventory:[],spells:[],unlocks:[]});
function setup(call=async request=>({character:{...request.character,revision:3}})){
 const committed=[];
 const editor=createCharacterEditor({call,committed:c=>committed.push(c)});
 editor.open(hero());
 return {editor,committed};
}
test('échec puis nouvelle tentative : brouillon conservé, liste actualisée uniquement au succès',async()=>{
 let fail=true;const calls=[];
 const {editor,committed}=setup(async r=>{calls.push(r);if(fail)throw Error('Réseau');return {character:{...r.character,revision:3}}});
 editor.edit({notes:'Brouillon'});
 await assert.rejects(editor.save(),/Réseau/);
 assert.equal(editor.getSnapshot().character.notes,'Brouillon');assert.equal(editor.getSnapshot().dirty,true);assert.equal(editor.getSnapshot().status,'error');assert.equal(committed.length,0);
 fail=false;await editor.save();
 assert.equal(editor.getSnapshot().dirty,false);assert.equal(editor.getSnapshot().status,'saved');assert.equal(committed[0].revision,3);assert.equal(committed[0].playerId,'alice');assert.equal(calls[1].revision,2);
});
test('conflit : export exact, refus de remplacer, échec du chargement puis remplacement confirmé',async()=>{
 const {editor,committed}=setup(async()=>{throw Object.assign(Error('Conflit'),{status:409})});
 editor.edit({notes:'À récupérer'});await assert.rejects(editor.save());
 const exported=editor.exportDraft();assert.equal(editor.getSnapshot().conflict,true);
 assert.equal(await editor.reload(()=>{throw Error('Ne doit pas charger')},()=>false),false);
 await assert.rejects(editor.reload(async()=>{throw Error('Indisponible')},()=>true));
 assert.equal(editor.exportDraft(),exported);assert.equal(editor.getSnapshot().pending,false);assert.equal(committed.length,0);
 await editor.reload(async()=>({...hero(),notes:'Distant',revision:5}),()=>true);
 assert.equal(editor.getSnapshot().character.notes,'Distant');assert.equal(editor.getSnapshot().conflict,false);assert.equal(editor.getSnapshot().dirty,false);assert.equal(committed[0].revision,5);
});
test('équipement immédiat : conserver aussi la proposition en cas de rejet',async()=>{
 const {editor}=setup(async()=>{throw Error('Refus')});
 const next={...hero(),inventory:[{id:'sword',equipped:true}]};
 await assert.rejects(editor.save(next));
 assert.deepEqual(editor.getSnapshot().character.inventory,next.inventory);assert.equal(editor.getSnapshot().dirty,true);
});
test('acquisition : bloque le brouillon puis synchronise personnage et liste',async()=>{
 const calls=[];const {editor,committed}=setup(async r=>{calls.push(r);return {character:{...hero(),revision:3,unlocks:[{id:r.nodeId}]}}});
 editor.edit({notes:'Non enregistré'});await assert.rejects(editor.unlock('node'),/Enregistrez/);assert.equal(calls.length,0);
 editor.open(hero());await editor.unlock('node');
 assert.equal(calls[0].op,'unlock');assert.equal(committed[0].unlocks[0].id,'node');assert.equal(editor.getSnapshot().character.revision,3);
});
test('opération en cours : interdit édition, départ et double sauvegarde',async()=>{
 let resolve;const {editor}=setup(()=>new Promise(r=>{resolve=r}));
 editor.edit({notes:'En cours'});const saving=editor.save();
 editor.edit({notes:'Trop tard'});editor.open({...hero(),id:'autre'});
 assert.equal(editor.canLeave(()=>true),false);await assert.rejects(editor.save(),/déjà en cours/);
 assert.equal(editor.getSnapshot().character.notes,'En cours');assert.equal(editor.getSnapshot().character.id,'hero');
 resolve({character:{...hero(),notes:'En cours',revision:3}});await saving;
 assert.equal(editor.getSnapshot().pending,false);
});
test('changement de personnage : annulation préserve le brouillon, acceptation ouvre une copie isolée',()=>{
 const {editor}=setup();editor.edit({notes:'À conserver'});
 assert.equal(editor.canLeave(()=>false),false);assert.equal(editor.getSnapshot().character.notes,'À conserver');
 const other={...hero(),id:'autre'};
 if(editor.canLeave(()=>true))editor.open(other);
 other.notes='Mutation extérieure';assert.equal(editor.getSnapshot().character.notes,'Avant');assert.equal(editor.getSnapshot().dirty,false);
});
test('rechargement ne remplace jamais par un personnage absent ou différent',async()=>{
 const {editor}=setup();editor.edit({notes:'Conservé'});
 for(const remote of [undefined,{...hero(),id:'autre'}])await assert.rejects(editor.reload(async()=>remote,()=>true),/inaccessible/);
 assert.equal(editor.getSnapshot().character.notes,'Conservé');assert.equal(editor.getSnapshot().dirty,true);
});
