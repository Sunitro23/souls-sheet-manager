// Shared by the background's map tools; the panel uses MOVEMENT_CHANNEL.
export type MapInteraction = 'weapon' | 'spell';
let listener: ((source: MapInteraction, active: boolean) => Promise<void>) | undefined;

export function onMapInteraction(next: NonNullable<typeof listener>) {
  listener = next;
  return () => { if (listener === next) listener = undefined; };
}

export async function setMapInteraction(source: MapInteraction, active: boolean) {
  await listener?.(source, active);
}
