import OBR from '@owlbear-rodeo/sdk';
import { attackFeedback, COMBAT_FEEDBACK_CHANNEL, IMPACT_MS } from '../core/combat-feedback';
import type { CombatView } from '../core/actions';
import type { Point } from '../core/types';
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const direction = (from: Point, to: Point) => {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
};
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// A single controller streams token poses. Ending the interaction restores their
// real positions; these cosmetic motions never write to the shared scene.
export async function publishAttackFeedback(state: CombatView, stopped: () => boolean) {
  const event = attackFeedback(state, state.combat.id, Date.now() + 80);
  if (!event || stopped()) return;
  await OBR.broadcast.sendMessage(COMBAT_FEEDBACK_CHANNEL, event, { destination: 'ALL' });
  if (reducedMotion() || stopped()) return;
  const tokens = await OBR.scene.items.getItems([event.actorTokenId, ...event.hitTokenIds]);
  const visible = tokens.filter(item => item.visible);
  if (!visible.length || stopped()) return;
  const originals = new Map(visible.map(item => [item.id, item.position]));
  const actor = tokens.find(item => item.id === event.actorTokenId);
  const vector = direction(actor?.position ?? event.target, event.target);
  const [update, end] = await OBR.interaction.startItemInteraction(visible);
  try {
    while (!stopped()) {
      const age = Date.now() - event.at;
      if (age >= 340) break;
      if (age >= 0) update(draft => {
        for (const token of Array.isArray(draft) ? draft : [draft]) {
          const origin = originals.get(token.id)!;
          const t = (age - IMPACT_MS) / 220;
          const amount = token.id === event.actorTokenId
            ? Math.sin(Math.min(1, age / 240) * Math.PI) * event.dpi * 0.13
            : t < 0 ? 0 : Math.sin(t * Math.PI * 3) * (1 - t) * event.dpi * 0.065;
          token.position = { x: origin.x + vector.x * amount, y: origin.y + vector.y * amount };
        }
      });
      await wait(20);
    }
  } finally { end(); }
}
