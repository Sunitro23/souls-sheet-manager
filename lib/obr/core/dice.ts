type Metadata = Record<string, unknown>;
export type DicePlayer = { id: string; name: string; metadata: Metadata };
export type CapturedD20 = { playerId: string; playerName: string; dieId: string; value: number };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Dice's internal metadata format, verified against owlbear-rodeo/dice ccc32be.
function singleD20(metadata: Metadata) {
  const roll = metadata["rodeo.owlbear.dice/roll"];
  if (!record(roll) || !Array.isArray(roll.dice)) return null;
  let group = roll;
  for (let depth = 0; depth < 10; depth++) {
    if (group.hidden || (group.bonus !== undefined && group.bonus !== 0)) return null;
    if (group.combination !== undefined && group.combination !== "SUM" && group.combination !== "NONE") return null;
    if (!Array.isArray(group.dice) || group.dice.length !== 1) return null;
    const die: unknown = group.dice[0];
    if (!record(die)) return null;
    if (Array.isArray(die.dice)) { group = die; continue; }
    if (die.type !== "D20" || typeof die.id !== "string" || !die.id) return null;
    const values = metadata["rodeo.owlbear.dice/rollValues"];
    const value = record(values) ? values[die.id] : undefined;
    return { id: die.id, value: typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 20 ? value : null };
  }
  return null;
}

export function createD20Capture(initial: DicePlayer[]) {
  const seen = new Map<string, Set<string>>();
  function baseline(player: DicePlayer) {
    const ids = new Set<string>();
    const pending: unknown[] = [player.metadata["rodeo.owlbear.dice/roll"]];
    for (let count = 0; pending.length && count < 1000; count++) {
      const value = pending.pop();
      if (!record(value)) continue;
      if (typeof value.id === "string") ids.add(value.id);
      if (Array.isArray(value.dice)) pending.push(...value.dice.slice(0, 1000));
    }
    seen.set(player.id, ids);
  }
  initial.forEach(baseline);
  return (player: DicePlayer): CapturedD20 | null => {
    // A newly connected player's first snapshot can contain an old roll.
    if (!seen.has(player.id)) { baseline(player); return null; }
    const die = singleD20(player.metadata);
    if (!die || die.value === null || seen.get(player.id)!.has(die.id)) return null;
    seen.get(player.id)!.add(die.id);
    return { playerId: player.id, playerName: player.name, dieId: die.id, value: die.value };
  };
}
