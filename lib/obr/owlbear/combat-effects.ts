import OBR, { buildImage, buildPath, buildText, Command, isPath, isText, type Item, type PathCommand } from '@owlbear-rodeo/sdk';
import { COMBAT_AUDIO_CHANNEL, COMBAT_FEEDBACK_CHANNEL, FEEDBACK_MS, IMPACT_MS, validFeedback,
  type CombatFeedback } from '../core/combat-feedback';
import { COMBAT_KEY } from '../core/combat';
import type { Point } from '../core/types';
import { createCombatAudio } from './combat-audio';

export const COMBAT_EFFECT_KEY = 'de.sunitro.cendres/combat-effect';
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const direction = (from: Point, to: Point) => {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
};
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

type Visual = { item: Item; kind: 'sprite' | 'trail' | 'label'; start: number; end: number; position: Point; scale: Point };
function visuals(event: CombatFeedback, tokens: Item[], still: boolean): Visual[] {
  const result: Visual[] = [];
  const actor = tokens.find(item => item.id === event.actorTokenId);
  const color = event.kind === 'spell' ? '#c4acff' : event.kind === 'dodge' ? '#96eadd' : '#ffdd9c';
  const dpi = event.dpi;
  const decorate = <T extends Item>(item: T, token: Item) => Object.assign(item, {
    name: 'Cendres · Combat', attachedTo: token.id, locked: true, disableHit: true,
    layer: 'CHARACTER' as const, zIndex: token.zIndex + 10,
    disableAttachmentBehavior: ['COPY', 'ROTATION', 'SCALE'] as Item['disableAttachmentBehavior'],
    metadata: { [COMBAT_EFFECT_KEY]: true },
  });
  const add = (item: Item, token: Item, kind: Visual['kind'], start: number, end: number) => {
    decorate(item, token);
    result.push({ item, kind, start, end, position: { ...item.position }, scale: { ...item.scale } });
  };
  const sprite = (file: string, token: Item, position: Point, scale: number, rotation = 0) => {
    const item = buildImage({ url: new URL(`/owlbear/combat/${file}.png`, location.origin).href,
      width: 512, height: 512, mime: 'image/png' }, { dpi: 512, offset: { x: 256, y: 256 } })
      .position(position).scale({ x: scale, y: scale }).rotation(rotation).build();
    add(item, token, 'sprite', IMPACT_MS, 320);
  };
  const trail = (token: Item, to: Point) => {
    const from = token.position, v = direction(from, to);
    const length = Math.min(Math.hypot(to.x - from.x, to.y - from.y), dpi * 3);
    const commands: PathCommand[] = [[Command.MOVE, 0, 0],
      [Command.LINE, v.x * length * 0.6 - v.y * dpi * 0.06, v.y * length * 0.6 + v.x * dpi * 0.06],
      [Command.LINE, v.x * length, v.y * length],
      [Command.LINE, v.x * length * 0.6 + v.y * dpi * 0.06, v.y * length * 0.6 - v.x * dpi * 0.06], [Command.CLOSE]];
    add(buildPath().commands(commands).position(from).fillColor(color).fillOpacity(0).strokeOpacity(0).build(), token, 'trail', 0, 260);
  };
  if (actor && !still) {
    trail(actor, event.target);
    if (event.kind !== 'dodge') sprite(event.kind === 'spell' ? 'magic' : 'slash', actor, event.target, event.kind === 'spell' ? 1.8 : 1.3,
      Math.atan2(event.target.y - actor.position.y, event.target.x - actor.position.x) * 180 / Math.PI);
  }
  for (const token of tokens) {
    const hit = event.hitTokenIds.includes(token.id), dodged = event.dodgedTokenIds.includes(token.id);
    if (!hit && !dodged) continue;
    if (hit && !still) sprite('spark', token, token.position, 1.2);
    const label = buildText().plainText(hit ? 'Touché' : 'Esquivé').width(dpi * 2).height(dpi * 0.4)
      .position({ x: token.position.x - dpi, y: token.position.y - dpi * 0.8 })
      .fontSize(Math.max(12, dpi * 0.19)).fontWeight(800).textAlign('CENTER').padding(0)
      .fillColor(hit ? '#ffe0ad' : '#a3f0df').fillOpacity(0).strokeColor('#191521').strokeOpacity(0).strokeWidth(dpi * 0.035).build();
    add(label, token, 'label', IMPACT_MS, FEEDBACK_MS);
  }
  return result;
}

export async function registerCombatEffects() {
  const playerId = await OBR.player.getId();
  let disposed = false, generation = 0, audioBlocked = false;
  const jobs = new Set<Promise<void>>();
  const seen = new Set<string>();
  const audio = createCombatAudio(playerId, blocked => {
    if (blocked === audioBlocked) return;
    audioBlocked = blocked;
    void OBR.broadcast.sendMessage(COMBAT_AUDIO_CHANNEL, { playerId, blocked }, { destination: 'LOCAL' }).catch(() => {});
  });
  async function clear() {
    if (!await OBR.scene.isReady()) return;
    const items = await OBR.scene.local.getItems(item => item.metadata[COMBAT_EFFECT_KEY] === true);
    if (items.length) await OBR.scene.local.deleteItems(items.map(item => item.id));
  }
  await clear().catch(() => {});
  // Warm the tiny textures before the first attack, without publishing scene items.
  if (typeof Image !== 'undefined') for (const name of ['slash', 'spark', 'magic']) new Image().src = `/owlbear/combat/${name}.png`;

  async function play(event: CombatFeedback) {
    const version = generation;
    const active = () => !disposed && version === generation;
    if (!await OBR.scene.isReady() || ((await OBR.room.getMetadata())[COMBAT_KEY] as { id?: string } | undefined)?.id !== event.combatId || !active()) return;
    const ids = [...new Set([event.actorTokenId, ...event.hitTokenIds, ...event.dodgedTokenIds])];
    const tokens = (await OBR.scene.items.getItems(ids)).filter(item => item.visible && item.layer === 'CHARACTER');
    if (!tokens.length || !active()) return;
    const still = reducedMotion();
    const layers = visuals(event, tokens, still);
    for (const layer of layers) {
      if (layer.kind === 'sprite') layer.item.scale = { x: 0, y: 0 };
    }
    let swung = false, impacted = false;
    try {
      if (layers.length) await OBR.scene.local.addItems(layers.map(layer => layer.item));
      while (active()) {
        const age = Date.now() - event.at;
        if (age >= FEEDBACK_MS) break;
        if (age >= 0 && !swung) { swung = true; if (age < 320 && event.kind !== 'spell') audio.play(event.kind === 'dodge' ? 'dodge' : 'swing'); }
        if (age >= IMPACT_MS && !impacted) {
          impacted = true;
          if (age < 320 && event.kind !== 'dodge') {
            if (event.kind === 'spell') audio.play('spell');
            else if (tokens.some(token => event.hitTokenIds.includes(token.id))) audio.play('hit');
          }
        }
        if (layers.length) await OBR.scene.local.updateItems(layers.map(layer => layer.item.id), items => {
          for (const item of items) {
            const layer = layers.find(layer => layer.item.id === item.id)!;
            const t = (age - layer.start) / (layer.end - layer.start);
            const opacity = t < 0 || t >= 1 ? 0 : still ? 1 : Math.min(1, t * 10) * Math.min(1, (1 - t) * 3);
            if (layer.kind === 'sprite') {
              const scale = opacity ? 0.65 + Math.sin(t * Math.PI) * 0.55 : 0;
              item.scale = { x: layer.scale.x * scale, y: layer.scale.y * scale };
            } else if (isPath(item)) item.style.fillOpacity = opacity * 0.65;
            else if (isText(item)) {
              item.text.style.fillOpacity = opacity;
              item.text.style.strokeOpacity = opacity;
              item.position = { x: layer.position.x, y: layer.position.y - (still ? 0 : Math.max(0, t) * event.dpi * 0.22) };
            }
          }
        });
        await wait(still ? 80 : 30);
      }
    } finally {
      if (layers.length && await OBR.scene.isReady()) await OBR.scene.local.deleteItems(layers.map(layer => layer.item.id));
    }
  }
  const stops = [
    OBR.broadcast.onMessage(COMBAT_FEEDBACK_CHANNEL, ({ data }) => {
      if (disposed || !validFeedback(data)) return;
      const key = `${data.combatId}/${data.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      if (seen.size > 200) seen.delete(seen.values().next().value!);
      const job = play(data).catch(() => {}).finally(() => jobs.delete(job));
      jobs.add(job);
    }),
    OBR.broadcast.onMessage(COMBAT_AUDIO_CHANNEL, ({ data: value }) => {
      const data = value as { playerId?: string; settings?: unknown; unlock?: boolean; query?: boolean } | null;
      if (data?.playerId !== playerId) return;
      if (data.settings) audio.set(data.settings);
      if (data.unlock) audio.play('swing');
      if (data.query) void OBR.broadcast.sendMessage(COMBAT_AUDIO_CHANNEL, { playerId, blocked: audioBlocked, settings: audio.getSettings() }, { destination: 'LOCAL' }).catch(() => {});
    }),
    OBR.scene.onReadyChange(() => { generation++; void clear().catch(() => {}); }),
  ];
  return async () => {
    disposed = true; generation++; stops.forEach(stop => stop()); audio.stop();
    await Promise.allSettled(jobs);
    await clear().catch(() => {});
  };
}
