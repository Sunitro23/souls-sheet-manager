import test from 'node:test';
import assert from 'node:assert/strict';
import {bagItems,equipUnavailableReason} from '../lib/inventory.ts';
import {derive,entry,fresh,validate} from '../lib/rules.ts';

test('le sac combine nom, accents et catégorie sans modifier les objets',()=>{
 const items=[entry('Épée de cendres','weapon'),entry('Écu de cendres','shield'),entry('Cendres anciennes','other'),entry('Épée portée','weapon',{equipped:true}),entry('Épée archivée','weapon',{archived:true})];
 const before=structuredClone(items);
 assert.deepEqual(bagItems(items,'  EPEE ','weapon').map(i=>i.name),['Épée de cendres']);
 assert.deepEqual(bagItems(items,'cendres','armor').map(i=>i.name),['Écu de cendres']);
 assert.equal(bagItems(items,'inexistant').length,0);
 assert.equal(bagItems(items).length,3);
 assert.deepEqual(items,before);
});
test('un emplacement vide ne propose que les types compatibles',()=>{
 const items=['weapon','catalyst','armor','shield','talisman','consumable','other'].map(type=>entry(type,type));
 assert.deepEqual(bagItems(items,'','all','weapon').map(i=>i.type),['weapon','catalyst']);
 assert.deepEqual(bagItems(items,'','armor').map(i=>i.type),['armor','shield']);
 assert.deepEqual(bagItems(items,'','armor','armor').map(i=>i.type),['armor']);
 assert.deepEqual(bagItems(items,'','talisman','talisman').map(i=>i.type),['talisman']);
});
test('les limites des cinq emplacements suivent les règles existantes',()=>{
 for(const [type,occupied,match] of [['armor',['armor'],/armure/],['weapon',['weapon','catalyst'],/arme ou un catalyseur/],['catalyst',['weapon','weapon'],/arme ou un catalyseur/],['talisman',['talisman','talisman'],/talisman/]]){
  const c=fresh(),candidate=entry('À équiper',type);
  c.inventory=[...occupied.map(t=>entry('Porté',t,{equipped:true})),candidate];
  assert.match(equipUnavailableReason(c,candidate),match);
  assert.equal(equipUnavailableReason(c,c.inventory[0]),'');
 }
});
test('la charge prospective conserve la surcharge autorisée et les bonus de force',()=>{
 const c=fresh();c.inventory=[];
 const capacity=derive(c).capacity;
 const item=entry('Charge','other',{weight:capacity+2});c.inventory=[item];
 const before=structuredClone(c);
 assert.equal(equipUnavailableReason(c,item),'');
 assert.doesNotThrow(()=>validate({...structuredClone(c),inventory:[{...item,equipped:true}]},structuredClone(c),true));
 assert.deepEqual(c,before);
 item.weight++;
 assert.match(equipUnavailableReason(c,item),/Charge maximale/);
 assert.throws(()=>validate({...structuredClone(c),inventory:[{...item,equipped:true}]},structuredClone(c),true),/trop lourd/);
 item.bonuses={FOR:10};
 assert.equal(equipUnavailableReason(c,item),'');
 assert.doesNotThrow(()=>validate({...structuredClone(c),inventory:[{...item,equipped:true}]},structuredClone(c),true));
});
