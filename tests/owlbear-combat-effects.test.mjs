import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const settle = async () => { for (let i = 0; i < 20; i++) await new Promise(resolve => setImmediate(resolve)); };

test('effets : diffusion locale, impacts synchronisés, doublons, sons et nettoyage', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 10000 });
  const folder = await mkdtemp(resolve('.openai/combat-effects-'));
  const previous = Object.fromEntries(['location', 'matchMedia', 'Audio', 'localStorage'].map(k => [k, globalThis[k]]));
  globalThis.location = { origin: 'https://test.invalid' };
  let reduced = false, ready = true, onReady = () => {}, local = [], plays = [], stopped = 0;
  const callbacks = new Map(), preferences = new Map();
  globalThis.localStorage = { getItem: k => preferences.get(k) ?? null, setItem: (k, v) => preferences.set(k, v) };
  globalThis.matchMedia = () => ({ matches: reduced });
  globalThis.Audio = class { constructor(url) { this.url = url; } play() { plays.push({ url: this.url, at: Date.now(), volume: this.volume }); return Promise.resolve(); } pause() { stopped++; } };
  const token = (id, x, visible = true) => ({ id, type: 'IMAGE', visible, layer: 'CHARACTER', position: { x, y: 50 }, scale: { x: 1, y: 1 }, zIndex: 1, metadata: {} });
  const shared = [token('actor', 50), token('hit', 150), token('safe', 250), token('hidden', 350, false)];
  const original = structuredClone(shared);
  const sdk = { room: { getMetadata: async () => ({ 'de.sunitro.cendres/combat': { id: 'scene' } }) }, player: { getId: async () => 'alice' }, scene: {
    isReady: async () => ready, onReadyChange: cb => { onReady = cb; return () => { onReady = () => {}; }; },
    items: { getItems: async ids => structuredClone(shared.filter(i => ids.includes(i.id))), updateItems: async () => { throw Error('No shared writes'); } },
    local: { getItems: async filter => local.filter(filter), addItems: async items => { local.push(...structuredClone(items)); },
      updateItems: async (ids, fn, fast) => { assert.equal(fast, undefined, 'opacity changes need the full local update path'); fn(local.filter(i => ids.includes(i.id))); },
      deleteItems: async ids => { local = local.filter(i => !ids.includes(i.id)); } },
  }, broadcast: { onMessage: (channel, cb) => { callbacks.set(channel, cb); return () => callbacks.delete(channel); },
    sendMessage: async (channel, data, options) => { assert.equal(options.destination, 'LOCAL'); callbacks.get(channel)?.({ data }); } } };
  function builder(type) {
    const item = { id: crypto.randomUUID(), type, position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, visible: true,
      metadata: {}, style: {}, text: { style: {} } };
    let proxy;
    proxy = new Proxy({}, { get: (_, key) => key === 'build' ? () => structuredClone(item) : value => {
      if (['fillColor', 'fillOpacity', 'strokeColor', 'strokeWidth', 'strokeOpacity'].includes(key)) (type === 'TEXT' ? item.text.style : item.style)[key] = value;
      else if (key === 'plainText') item.text.plainText = value;
      else item[key] = value;
      return proxy;
    } });
    return proxy;
  }
  globalThis.__combatFx = { sdk, builder };
  let stop;
  const advance = async ms => { t.mock.timers.tick(ms); await settle(); };
  try {
    await build({ entryPoints: ['lib/obr/owlbear/combat-effects.ts'], outfile: join(folder, 'fx.mjs'), bundle: true, platform: 'node', format: 'esm',
      plugins: [{ name: 'sdk', setup(b) {
        b.onResolve({ filter: /^@owlbear-rodeo\/sdk$/ }, () => ({ path: 'sdk', namespace: 'mock' }));
        b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: `export default globalThis.__combatFx.sdk;
          export const buildImage=()=>globalThis.__combatFx.builder('IMAGE'), buildPath=()=>globalThis.__combatFx.builder('PATH'), buildText=()=>globalThis.__combatFx.builder('TEXT');
          export const isPath=i=>i.type==='PATH',isText=i=>i.type==='TEXT',Command={MOVE:0,LINE:1,CLOSE:5};` }));
      } }] });
    const { registerCombatEffects } = await import(pathToFileURL(join(folder, 'fx.mjs')).href);
    stop = await registerCombatEffects();
    const channel = 'de.sunitro.cendres/combat-feedback', soundChannel = 'de.sunitro.cendres/combat-audio';
    const event = { id: 'one', combatId: 'scene', at: Date.now() + 80, kind: 'weapon', dpi: 100, actorTokenId: 'actor',
      hitTokenIds: ['hit', 'hidden'], dodgedTokenIds: ['safe'], target: { x: 150, y: 50 } };
    const send = async data => { callbacks.get(channel)({ data }); await settle(); };
    await send(event);
    assert.ok(local.length > 0);
    assert.ok(local.every(i => i.locked && i.disableHit && i.layer === 'CHARACTER' && i.attachedTo !== 'hidden'));
    const count = local.length;
    await send(event); assert.equal(local.length, count, 'pas de doublon');
    assert.equal(plays.length, 0, 'pas de son avant le départ');
    await advance(80); assert.match(plays[0].url, /swing/);
    assert.equal(plays.length, 1);
    await advance(120); assert.match(plays[1].url, /hit/);
    await advance(60);
    const labels = local.filter(i => i.type === 'TEXT');
    assert.deepEqual(labels.map(i => i.text.plainText), ['Touché', 'Esquivé']);
    assert.ok(labels.every(i => i.text.style.fillOpacity > 0));
    await advance(600); assert.equal(local.length, 0);
    assert.deepEqual(shared, original);
    await send({ ...event, id: 'stale', at: Date.now() - 5000 });
    await send({ ...event, id: 'other-scene', combatId: 'elsewhere', at: Date.now() });
    assert.equal(local.length, 0);
    reduced = true;
    callbacks.get(soundChannel)({ data: { playerId: 'alice', settings: { muted: true, volume: 0.8 } } });
    const before = plays.length;
    await send({ ...event, id: 'two', at: Date.now(), kind: 'spell' });
    assert.ok(local.every(i => i.type === 'TEXT'), 'mouvements réduits : libellés seuls');
    const positions = local.map(i => ({ ...i.position }));
    await advance(200); assert.equal(plays.length, before); assert.deepEqual(local.map(i => i.position), positions);
    ready = false; onReady(); local = [];
    await advance(100); ready = true; onReady(); await settle(); assert.equal(local.length, 0);
    reduced = false;
    callbacks.get(soundChannel)({ data: { playerId: 'alice', settings: { muted: false, volume: 0.2 } } });
    await send({ ...event, id: 'three', at: Date.now(), kind: 'dodge', hitTokenIds: [], dodgedTokenIds: [] });
    assert.match(plays.at(-1).url, /dodge/); assert.equal(plays.at(-1).volume, 0.2);
    const ending = stop(); await advance(100); await ending; stop = undefined;
    assert.equal(local.length, 0); assert.equal(callbacks.size, 0); assert.ok(stopped > 0);
  } finally {
    if (stop) { const ending = stop(); await advance(1000); await ending; }
    for (const [key, value] of Object.entries(previous)) globalThis[key] = value;
    delete globalThis.__combatFx; t.mock.timers.reset(); await rm(folder, { recursive: true, force: true });
  }
});
