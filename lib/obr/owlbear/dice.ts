import { createD20Capture } from "../core/dice.ts";
import type { CapturedD20, DicePlayer } from "../core/dice.ts";

type DiceSource = {
  player: {
    getId(): Promise<string>; getName(): Promise<string>; getMetadata(): Promise<Record<string, unknown>>;
    onChange(callback: (player: DicePlayer) => void): () => void;
  };
  party: { getPlayers(): Promise<DicePlayer[]>; onChange(callback: (players: DicePlayer[]) => void): () => void };
};

export async function observeDice(source: DiceSource, onRoll: (roll: CapturedD20) => void) {
  let capture: ReturnType<typeof createD20Capture> | undefined;
  const pending = new Map<string, DicePlayer>();
  const stops: (() => void)[] = [];
  const update = (player: DicePlayer) => {
    if (!capture) { pending.set(player.id, player); return; }
    const roll = capture(player);
    if (roll) onRoll(roll);
  };
  try {
    // The party API excludes the local player: listen to both sources.
    stops.push(source.player.onChange(update));
    stops.push(source.party.onChange(players => players.forEach(update)));
    const [players, id, name, metadata] = await Promise.all([
      source.party.getPlayers(), source.player.getId(), source.player.getName(), source.player.getMetadata(),
    ]);
    const baseline = new Map([...players, { id, name, metadata }].map(player => [player.id, player]));
    pending.forEach((player, key) => baseline.set(key, player));
    capture = createD20Capture([...baseline.values()]);
    pending.clear();
    return () => stops.forEach(stop => stop());
  } catch (error) {
    stops.forEach(stop => stop());
    throw error;
  }
}
