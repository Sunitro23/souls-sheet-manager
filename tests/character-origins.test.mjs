import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {defaultSettings} from '../lib/campaign-settings.ts';
import {fresh,derive} from '../lib/rules.ts';

test('les identités utilisent les noms de campagne et excluent les choix archivés',async()=>{
 const folder=await mkdtemp(resolve('.openai/character-origins-'));
 try{
  await build({stdin:{contents:"export {default as Select} from './components/character-origin-select';export {default as Theme} from './components/campaign-theme';export {default as Overview} from './components/character-overview';",resolveDir:process.cwd(),loader:'tsx'},outfile:join(folder,'components.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic'});
  const {Select,Theme,Overview}=await import(pathToFileURL(join(folder,'components.mjs')).href);
  const settings=defaultSettings();
  const render=element=>renderToStaticMarkup(React.createElement(Theme,{settings},element));
  for(const kind of ['race','class']){
   const [active,archived,unavailable]=settings.categories.filter(c=>c.kind===kind);
   active.name=`${kind} renommée`;archived.archived=true;unavailable.available=false;
   const props={kind,value:active.baseKey,fallback:[archived.baseKey,'Ancien catalogue'],disabled:false,onChange:()=>{}};
   const html=render(React.createElement(Select,props));
   assert.ok(html.includes(`value="${active.baseKey}" selected="">${active.name}</option>`));
   assert.ok(!html.includes(archived.baseKey));
   assert.ok(!html.includes(unavailable.baseKey));
   assert.ok(!html.includes('Ancien catalogue'));
   const existing=render(React.createElement(Select,{...props,value:archived.baseKey}));
   assert.match(existing,/<option[^>]*disabled=""[^>]*hidden=""[^>]*selected=""/,'L’identité historique reste sélectionnée mais absente des choix');
  }
  const c=fresh();c.race=settings.categories.find(c=>c.kind==='race').baseKey;c.className=settings.categories.find(c=>c.kind==='class').baseKey;
  const before=JSON.stringify(c);
  const overview=render(React.createElement(Overview,{character:c,derived:derive(c),isGM:true,busy:false,onEdit:()=>{},onIdentity:()=>{},onStats:()=>{}}));
  assert.ok(overview.includes('class renommée · race renommée'));
  assert.equal(JSON.stringify(c),before,'Le renommage ne modifie pas les clés mécaniques');
  for(const category of settings.categories)category.archived=true;
  const empty=render(React.createElement(Select,{kind:'race',value:'',fallback:['Ancien catalogue'],disabled:false,onChange:()=>{}}));
  assert.equal((empty.match(/<option/g)||[]).length,1);
 }finally{await rm(folder,{recursive:true,force:true});}
});
