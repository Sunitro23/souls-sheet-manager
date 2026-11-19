import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {access, mkdtemp, rm} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {defaultSettings, validateSettings, readSettings} from '../lib/campaign-settings.ts';
import {maxWeaponIconLength} from '../lib/weapon-icons.ts';
import {entry} from '../lib/rules.ts';

let folder, Catalog, Theme, Artwork, SpellIcon;
const uploaded='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
before(async()=>{
 folder=await mkdtemp(resolve('.openai/spell-icons-test-'));
 await build({stdin:{contents:"export {default as Catalog} from './components/admin/catalog';export {default as Theme} from './components/campaign-theme';export {default as Artwork} from './components/item-artwork';export {default as SpellIcon} from './components/spell-icon';",resolveDir:process.cwd(),loader:'tsx'},outfile:join(folder,'components.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic'});
 ({Catalog,Theme,Artwork,SpellIcon}=await import(pathToFileURL(join(folder,'components.mjs')).href));
});
after(async()=>{if(folder)await rm(folder,{recursive:true,force:true});});
const render=(component,props,settings)=>renderToStaticMarkup(React.createElement(Theme,{settings},React.createElement(component,props)));
const catalogProps=settings=>({workspace:{settings,characters:[],tree:{nodes:[]}},kinds:['magic'],onSave:()=>{},onDirty:()=>{},busy:false});

test('les écoles proposent un import et des icônes intégrées à la création et à l’édition',()=>{
 const settings=defaultSettings(),category=settings.categories.find(c=>c.kind==='magic');
 for(const selection of [{initialCreate:true},{target:{selected:category.id}}]){
  const html=render(Catalog,{...catalogProps(settings),...selection},settings);
  assert.match(html,/Icône de magie/);
  assert.match(html,/type="file"/);
  assert.match(html,/Automatique selon l’école de magie/);
  assert.match(html,/Aperçu de l’icône de magie/);
  for(const name of ['Sorts','Miracles','Pyromancies','Malédictions','Mélodies'])assert.ok(html.includes(`>${name}</option>`));
 }
 category.spellIcon=uploaded;
 const edit=render(Catalog,{...catalogProps(settings),target:{selected:category.id}},settings);
 assert.ok(edit.includes(`src="${uploaded}"`));
 assert.match(edit,/Retirer l’icône importée/);
 assert.match(edit,/<option value="uploaded" selected="">Icône importée/);
 assert.ok(render(Catalog,catalogProps(settings),settings).includes(`src="${uploaded}"`));
});

test('les sorts et filtres utilisent le choix de leur école et de leur campagne sans modifier les sorts',()=>{
 const settings=defaultSettings(),category=settings.categories.find(c=>c.kind==='magic'&&c.baseKey==='Sorts');
 const legacy=entry('Éclat','spell',{school:'Sorts'}),linked={...legacy,categoryId:category.id},before=JSON.stringify([legacy,linked]);
 category.name='École du MJ';category.spellIcon='miracle';
 for(const item of [legacy,linked])assert.match(render(Artwork,{item},settings),/src="\/ui\/dark-souls\/spells\/miracle.png"/);
 for(const school of [category.id,category.baseKey])assert.match(render(SpellIcon,{school},settings),/src="\/ui\/dark-souls\/spells\/miracle.png"/);
 assert.match(render(Artwork,{item:linked},defaultSettings()),/src="\/ui\/dark-souls\/items\/spell.png"/);
 const duplicate={...category,id:'second-school',spellIcon:'pyromancy'};settings.categories.push(duplicate);
 assert.match(render(Artwork,{item:{...linked,categoryId:duplicate.id}},settings),/src="\/ui\/dark-souls\/spells\/pyromancy.png"/);
 assert.match(render(Artwork,{item:{...linked,image:'https://example.com/own.png'}},settings),/src="https:\/\/example.com\/own.png"/);
 category.archived=true;
 assert.match(render(Artwork,{item:linked},settings),/src="\/ui\/dark-souls\/spells\/miracle.png"/);
 category.spellIcon=uploaded;
 for(const item of [legacy,linked])assert.ok(render(Artwork,{item},settings).includes(`src="${uploaded}"`));
 category.spellIcon='';
 assert.match(render(Artwork,{item:linked},settings),/src="\/ui\/dark-souls\/items\/spell.png"/);
 assert.match(render(Artwork,{item:legacy},undefined),/src="\/ui\/dark-souls\/items\/spell.png"/);
 assert.equal(JSON.stringify([legacy,linked]),before);
});

test('les icônes des écoles sont conservées et les valeurs invalides sont refusées',()=>{
 const old=defaultSettings(),next=structuredClone(old),category=next.categories.find(c=>c.kind==='magic');
 assert.doesNotThrow(()=>validateSettings(old,old));
 for(const icon of ['','spell','miracle','pyromancy','curse','melody',uploaded]){
  category.spellIcon=icon;
  const saved=readSettings(JSON.stringify(validateSettings(next,old)));
  assert.equal(saved.categories.find(c=>c.id===category.id).spellIcon,icon);
 }
 for(const invalid of ['inconnue','../spell','https://example.com/icon.png',null,42,'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=','data:image/gif;base64,R0lGODlh','data:image/png;base64,','data:image/png;base64,not-an-image',`data:image/png;base64,${'A'.repeat(maxWeaponIconLength)}`]){
  category.spellIcon=invalid;
  assert.throws(()=>validateSettings(next,old),/Icône de magie/);
 }
});

test('les illustrations automatiques des cinq écoles existent',async()=>{
 const settings=defaultSettings();
 for(const category of settings.categories.filter(c=>c.kind==='magic')){
  const html=render(SpellIcon,{school:category.id},settings);
  await access(`public${/<img[^>]*src="([^"]+)"/.exec(html)[1]}`);
 }
});
