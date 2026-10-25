import OBR from '@owlbear-rodeo/sdk';
import type { Item } from '@owlbear-rodeo/sdk';
import { SPELL_ZONE_KEY } from '../core/spells';

export const ZONE_DURATION = 5000;
export function zoneExpiry(item: Item): number | undefined {
  const metadata = item.metadata[SPELL_ZONE_KEY] as {expiresAt?: unknown} | undefined;
  return typeof metadata?.expiresAt === 'number' && Number.isFinite(metadata.expiresAt) ? metadata.expiresAt : undefined;
}

// Preserve every cell of the current cast, including retries after a lost acknowledgement.
export async function clearPreviousZones(castId: string) {
  const items = await OBR.scene.items.getItems();
  const previous = items.filter(item => {
    const zone = item.metadata[SPELL_ZONE_KEY] as {castId?: string} | undefined;
    return zone && zone.castId !== castId;
  });
  if (previous.length) await OBR.scene.items.deleteItems(previous.map(item => item.id));
}

// Shared deadlines survive closing the panel or reconnecting to the scene.
export function registerZoneExpiry() {
  let disposed = false, timer: ReturnType<typeof setTimeout> | undefined, generation = 0;
  const report = (error: unknown) => { if (!disposed) void OBR.notification.show((error as Error).message, 'ERROR'); };
  async function refresh() {
    const request = ++generation;
    clearTimeout(timer);
    if (!await OBR.scene.isReady() || disposed) return;
    const items = await OBR.scene.items.getItems();
    if (disposed || request !== generation) return;
    const now = Date.now();
    // Concurrent publications converge on the newest cast; ties use its shared ID.
    const casts = items.filter(item => zoneExpiry(item) !== undefined).sort((a,b) =>
      zoneExpiry(b)! - zoneExpiry(a)! || String((b.metadata[SPELL_ZONE_KEY] as {castId?:string}).castId ?? "").localeCompare(String((a.metadata[SPELL_ZONE_KEY] as {castId?:string}).castId ?? "")));
    const latestCast = casts[0]?.metadata[SPELL_ZONE_KEY] as {castId?:string} | undefined;
    const expired = items.filter(item => {
      const zone = item.metadata[SPELL_ZONE_KEY] as {castId?:string} | undefined;
      return (zoneExpiry(item) ?? Infinity) <= now || !!(zone && latestCast && zone.castId !== latestCast.castId);
    });
    if (expired.length) await OBR.scene.items.deleteItems(expired.map(item => item.id));
    if (disposed || request !== generation) return;
    const next = Math.min(...items.map(item => zoneExpiry(item) ?? Infinity).filter(time => time > now));
    if (Number.isFinite(next)) timer = setTimeout(() => void refresh().catch(report), Math.min(Math.max(0, next - Date.now()), 2_147_483_647));
  }
  const update = () => { void refresh().catch(report); };
  const stops = [OBR.scene.items.onChange(update), OBR.scene.onReadyChange(update)];
  update();
  return () => { disposed = true; ++generation; clearTimeout(timer); stops.forEach(stop => stop()); };
}
