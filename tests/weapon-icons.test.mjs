import test from 'node:test';
import assert from 'node:assert/strict';
import {access,mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {defaultSettings} from '../lib/campaign-settings.ts';
import {weaponIcons,weaponIconSource,prepareWeaponIcon,maxWeaponIconFileSize} from '../lib/weapon-icons.ts';
import {entry} from '../lib/rules.ts';

test('toutes les icônes proposées existent',async()=>{
 for(const icon of weaponIcons)await access(`public${weaponIconSource('Dagues',icon.id)}`);
});

test('l’import refuse les fichiers non pris en charge ou trop lourds avant de les décoder',async()=>{
 for(const type of ['image/svg+xml','image/gif','text/plain'])await assert.rejects(prepareWeaponIcon(new File(['test'],'icon',{type})),/PNG, WebP ou JPG/);
 await assert.rejects(prepareWeaponIcon(new File([new Uint8Array(maxWeaponIconFileSize+1)],'icon.png',{type:'image/png'})),/5 Mo/);
});

test('le catalogue et les objets affichent le choix de leur campagne sans modifier les objets',async()=>{
 const folder=await mkdtemp(resolve('.openai/weapon-icons-test-'));
 try{
  await build({stdin:{contents:"export {default as Artwork} from './components/item-artwork';export {default as Theme} from './components/campaign-theme';export {default as Catalog} from './components/admin/catalog';export {default as Picker} from './components/weapon-icon-picker';",resolveDir:process.cwd(),loader:'tsx'},outfile:join(folder,'components.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic'});
  const {Artwork,Theme,Catalog,Picker}=await import(pathToFileURL(join(folder,'components.mjs')).href);
  const settings=defaultSettings(),category=settings.categories.find(c=>c.baseKey==='Dagues');category.weaponIcon='axe';category.name='Lames du MJ';
  const legacy=entry('Dague','weapon',{category:'Dagues'}),linked={...legacy,categoryId:category.id},before=JSON.stringify([legacy,linked]);
  const render=(item,settings)=>renderToStaticMarkup(React.createElement(Theme,{settings},React.createElement(Artwork,{item})));
  for(const item of [legacy,linked])assert.match(render(item,settings),/src="\/ui\/dark-souls\/equipment\/axe.png"/);
  assert.match(render(linked,defaultSettings()),/src="\/ui\/dark-souls\/equipment\/dagger.png"/);
  const duplicate={...category,id:'second-dagger',weaponIcon:'bow'};settings.categories.push(duplicate);
  assert.match(render({...linked,categoryId:duplicate.id},settings),/src="\/ui\/dark-souls\/equipment\/bow.png"/);
  assert.match(render({...linked,image:'https://example.com/own.png'},settings),/src="https:\/\/example.com\/own.png"/);
  category.archived=true;assert.match(render(linked,settings),/src="\/ui\/dark-souls\/equipment\/axe.png"/);
  category.weaponIcon='';assert.match(render(linked,settings),/src="\/ui\/dark-souls\/equipment\/dagger.png"/);
  const uploaded='data:image/png;base64,iVBORw0KGgo=';
  category.weaponIcon=uploaded;
  for(const item of [legacy,linked])assert.ok(render(item,settings).includes(`src="${uploaded}"`));
  assert.match(render(legacy,undefined),/src="\/ui\/dark-souls\/equipment\/dagger.png"/);
  assert.match(render(undefined,settings),/src="\/ui\/dark-souls\/items\/bag.png"/);
  assert.equal(JSON.stringify([legacy,linked]),before);
  const props={workspace:{settings,characters:[],tree:{nodes:[]}},kinds:['weapon'],onSave:()=>{},onDirty:()=>{},busy:false};
  const catalog=renderToStaticMarkup(React.createElement(Catalog,{...props,initialCreate:true}));
  assert.match(catalog,/Icône d’arme/);assert.match(catalog,/Automatique selon le type d’arme/);
  assert.match(catalog,/type="file"/);assert.match(catalog,/importer depuis mon PC/);
  assert.match(catalog,/fond transparent/);assert.match(catalog,/256 × 256 px/);assert.match(catalog,/5 Mo/);assert.match(catalog,/sans déformation ni recadrage/);
  for(const icon of weaponIcons)assert.ok(catalog.includes(`<option value="${icon.id}">${icon.name}</option>`));
  assert.match(catalog,/alt="Aperçu de l’icône d’arme"/);
  assert.match(renderToStaticMarkup(React.createElement(Catalog,props)),/src="\/ui\/dark-souls\/equipment\/bow.png"/);
  const picker=renderToStaticMarkup(React.createElement(Picker,{value:uploaded,category:'Dagues',disabled:true,onChange:()=>{},onBusyChange:()=>{}}));
  assert.match(picker,/Retirer l’icône importée/);assert.match(picker,/<option value="uploaded" selected="">Icône importée/);
  assert.match(picker,/type="file"[^>]*disabled=""/);
 }finally{await rm(folder,{recursive:true,force:true})}
});
