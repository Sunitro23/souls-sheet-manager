import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,entry,validate} from '../lib/rules.ts';
import {newAshOfWar,useAshOfWar} from '../lib/ash-of-war.ts';
import {weaponSummary} from '../lib/weapon-summary.ts';
import {defaultTree} from '../lib/progression.ts';
const ash=()=>({...newAshOfWar('Quickstep'),mana:3,description:'Déplacement spécial'});
function character(){const c=fresh();c.inventory[0].ashOfWar=ash();return c;}

test('AoW indépendante des techniques et de leurs dégâts, persistance JSON',()=>{
 const c=character();validate(c,undefined,true);const item=c.inventory[0],before=weaponSummary({...item,ashOfWar:null},c,defaultTree());
 item.ashOfWar.damage='2d6';item.ashOfWar.damageType='Feu';
 validate(c,undefined,true);
 assert.deepEqual(weaponSummary(item,c,defaultTree()),before);
 assert.equal(item.ashOfWar.mana,3);assert.equal(item.ashOfWar.damage,'2d6');
 assert.deepEqual(JSON.parse(JSON.stringify(c)).inventory[0].ashOfWar,item.ashOfWar);
});
test('utilisation dépense exactement les FP et préserve END et inventaire',()=>{
 const c=character(),before=structuredClone(c),next=useAshOfWar(c,c.inventory[0].id);
 assert.equal(next.mana,c.mana-3);assert.equal(next.end,c.end);
 assert.deepEqual(c,before);assert.deepEqual(next.inventory,c.inventory);
 assert.throws(()=>useAshOfWar({...c,mana:2},c.inventory[0].id),/FP insuffisants/);
 c.inventory[0].equipped=false;assert.throws(()=>useAshOfWar(c,c.inventory[0].id),/équipé/);
 c.inventory[0].equipped=true;c.inventory[0].status='pending';assert.throws(()=>useAshOfWar(c,c.inventory[0].id),/validé/);
 assert.throws(()=>useAshOfWar(c,'missing'),/Aucune/);
});
test('coût positif, zone valide et équipement compatible requis',()=>{
 for(const mana of [0,-1,1.5,101,NaN]){const c=character();c.inventory[0].ashOfWar.mana=mana;assert.throws(()=>validate(c,undefined,true),/Coût FP/);}
 const c=character();c.inventory[0].ashOfWar.pattern=[[11,0]];assert.throws(()=>validate(c,undefined,true),/Pattern/);
 const invalid=fresh();invalid.inventory[1].ashOfWar=ash();assert.throws(()=>validate(invalid,undefined,true),/arme ou un bouclier/);
 const shield=fresh();shield.inventory.push(entry('Bouclier','shield',{ashOfWar:ash()}));assert.doesNotThrow(()=>validate(shield,undefined,true));
});
test('ajout, retrait et modification d’une AoW exigent une nouvelle validation MJ',()=>{
 const old=character();
 for(const change of [i=>i.ashOfWar.mana=4,i=>i.ashOfWar.description='Autre effet',i=>i.ashOfWar.damageType='Magie',i=>i.ashOfWar=null]){
  const c=structuredClone(old);change(c.inventory[0]);validate(c,old);
  assert.equal(c.inventory[0].status,'pending');assert.equal(c.inventory[0].equipped,false);
 }
 const legacy=fresh();delete legacy.inventory[0].ashOfWar;
 const unchanged=structuredClone(legacy);unchanged.inventory[0].ashOfWar=null;validate(unchanged,legacy);assert.equal(unchanged.inventory[0].status,'approved');
 const added=structuredClone(legacy);added.inventory[0].ashOfWar=ash();validate(added,legacy);assert.equal(added.inventory[0].status,'pending');
});

test('rendu AoW distinct, coût FP, effet et éditeur de zone',async()=>{
 const {mkdtemp,rm}=await import('node:fs/promises');
 const {resolve,join}=await import('node:path');
 const {pathToFileURL}=await import('node:url');
 const {build}=await import('esbuild');
 const {default:React}=await import('react');
 const {renderToStaticMarkup}=await import('react-dom/server');
 const folder=await mkdtemp(resolve('.openai/aow-render-'));
 try{
  await build({stdin:{contents:"export {default as Inventory} from './components/inventory-panel';export {default as Fields} from './components/ash-of-war-fields';",resolveDir:process.cwd(),loader:'tsx'},outfile:join(folder,'components.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic'});
  const {Inventory,Fields}=await import(pathToFileURL(join(folder,'components.mjs')).href);
  const c=character(),item=c.inventory[0];
  const props={mode:'Inventaire',character:c,tree:defaultTree(),detailItem:item,onEdit:()=>{},onUseAsh:()=>{}};
  const html=renderToStaticMarkup(React.createElement(Inventory,props));
  assert.match(html,/Cendre de guerre/);assert.match(html,/Quickstep/);assert.match(html,/3 FP/);assert.match(html,/Déplacement spécial/);assert.doesNotMatch(html,/>Utiliser|Déclencher/);
  const empty=renderToStaticMarkup(React.createElement(Inventory,{...props,character:{...c,mana:0}}));
  assert.doesNotMatch(empty,/Utiliser|FP insuffisants/);assert.match(empty,/3 FP/);
  const fields=renderToStaticMarkup(React.createElement(Fields,{item,onChange:()=>{}}));
  assert.match(fields,/Cendre personnalisée/);assert.match(fields,/Coût FP/);assert.match(fields,/Zone de l’Ash of War/);assert.match(fields,/aria-pressed="false"/);
 }finally{await rm(folder,{recursive:true,force:true})}
});
