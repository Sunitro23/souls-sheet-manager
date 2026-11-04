import OBR, { isPath, type Item, type Path } from '@owlbear-rodeo/sdk';
import { zoneExpiry, ZONE_DURATION } from './zone-expiry';

export const ZONE_EFFECT_KEY = 'de.sunitro.cendres/zone-effect';
const ARRIVAL = 600, FADE = 650, FRAME = 40;

// The shared deadline also dates the impact: reopening never replays it.
function appearance(source: Path, now: number, delay: number) {
  const remaining = zoneExpiry(source)! - now;
  const age = ZONE_DURATION - remaining - delay;
  const impact = age < 0 ? 0 : Math.max(0, 1 - Math.abs(age - 120) / 220);
  const fade = Math.min(1, Math.max(0, remaining / FADE));
  const opacity = fade * fade * (3 - 2 * fade);
  return {
    style: { ...source.style, fillOpacity: (0.08 + impact * 0.28) * opacity,
      strokeOpacity: (0.45 + impact * 0.5) * opacity, strokeWidth: source.style.strokeWidth + impact * 2 },
  };
}

// Animate local overlays only. The shared, selectable zone stays the fallback.
export function registerZoneEffects() {
  let disposed = false, dirty = true, requested = false, running = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let sources: Path[] = [];
  const effects = new Map<string, string>();
  const motion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : undefined;
  let clean = true, sceneVersion = 0;

  async function clear() {
    effects.clear();
    if (!await OBR.scene.isReady()) return;
    const old = await OBR.scene.local.getItems(item => item.metadata[ZONE_EFFECT_KEY] === true);
    if (old.length) await OBR.scene.local.deleteItems(old.map(item => item.id));
  }

  async function draw() {
    const version = sceneVersion;
    if (clean) { clean = false; await clear(); }
    if (disposed || !await OBR.scene.isReady()) { sources = []; effects.clear(); return; }
    if (dirty) {
      dirty = false;
      sources = (await OBR.scene.items.getItems()).filter((item): item is Path => isPath(item) && zoneExpiry(item) !== undefined);
    }
    if (disposed || version !== sceneVersion) return;
    const now = Date.now();
    const visible = sources.filter(item => item.visible && zoneExpiry(item)! > now);
    const removed = [...effects].filter(([id]) => !visible.some(item => item.id === id));
    if (removed.length) {
      await OBR.scene.local.deleteItems(removed.map(([, id]) => id));
      removed.forEach(([id]) => effects.delete(id));
    }
    if (disposed || !visible.length) return;
    if (version !== sceneVersion) return;
    const minX = Math.min(...visible.map(item => item.position.x));
    const minY = Math.min(...visible.map(item => item.position.y));
    const distances = visible.map(item => Math.hypot(item.position.x - minX, item.position.y - minY));
    const longest = Math.max(1, ...distances);
    const frames = new Map<string, ReturnType<typeof appearance>>();
    const added: Item[] = [];
    visible.forEach((source, index) => {
      let id = effects.get(source.id);
      const frame = motion?.matches ? { style: { ...source.style, fillOpacity: 0.14, strokeOpacity: 0.65 } } : appearance(source, now, distances[index] / longest * 180);
      if (!id) {
        id = crypto.randomUUID();
        // Attachment follows moving self-centred spells and their source cells.
        added.push({ ...structuredClone(source), ...frame, id, attachedTo: source.id,
          locked: true, disableHit: true, disableAttachmentBehavior: ['COPY'],
          metadata: { [ZONE_EFFECT_KEY]: true } });
        effects.set(source.id, id);
      }
      frames.set(id, frame);
    });
    if (added.length) await OBR.scene.local.addItems(added);
    if (disposed || version !== sceneVersion) return;
    await OBR.scene.local.updateItems([...frames.keys()], items => {
      for (const item of items) Object.assign(item, frames.get(item.id));
    }, true);
    if (disposed || version !== sceneVersion) return;
    // No repeated reads or updates during the quiet middle of the display.
    const next = Math.min(...visible.map(item => {
      const remaining = zoneExpiry(item)! - now;
      return motion?.matches ? remaining : remaining > ZONE_DURATION - ARRIVAL || remaining <= FADE ? FRAME : remaining - FADE;
    }));
    timer = setTimeout(request, Math.max(FRAME, next));
  }

  async function drain() {
    running = true;
    try {
      do { requested = false; clearTimeout(timer); await draw(); } while (requested && !disposed);
    } catch {
      // Rendering must not interrupt resolution, movement or the shared zone.
      clean = true;
      await clear().catch(() => {});
    } finally {
      running = false;
      if (disposed) await clear().catch(() => {});
    }
  }
  function request() {
    if (disposed) return;
    requested = true;
    if (!running) void drain();
  }
  const changed = () => { dirty = true; request(); };
  const sceneChanged = () => { ++sceneVersion; clean = true; changed(); };
  const stops = [OBR.scene.items.onChange(changed), OBR.scene.onReadyChange(sceneChanged)];
  motion?.addEventListener('change', request);
  request();
  return () => {
    disposed = true; clearTimeout(timer); stops.forEach(stop => stop());
    motion?.removeEventListener('change', request);
    if (!running) void clear().catch(() => {});
  };
}
