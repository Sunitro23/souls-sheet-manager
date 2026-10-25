import OBR from '@owlbear-rodeo/sdk';
import { cardinalRotation } from '../core/movement';
import type { Resolution } from '../core/actions';

const PROGRESS = 'de.sunitro.cendres/movement-progress';

export async function animateMovement(resolution: Resolution, stopped: () => boolean) {
  const movement = resolution.movement!;
  let interaction: Awaited<ReturnType<typeof OBR.interaction.startItemInteraction>> | undefined;
  let interactionStarted = 0;
  try {
    for (let step = 1; step < movement.positions.length; step++) {
      if (stopped()) throw Error('Mouvement interrompu.');
      const [token] = await OBR.scene.items.getItems([movement.tokenId]);
      if (!token) throw Error('Le pion manque sur la carte. Restaurez-le pour terminer le mouvement.');
      const progress = token.metadata[PROGRESS] as { id: string; step: number } | undefined;
      if (progress?.id === resolution.id && progress.step >= step) continue;
      if (!interaction || Date.now() - interactionStarted > 20000) {
        interaction?.[1]();
        interaction = undefined;
        interaction = await OBR.interaction.startItemInteraction(token);
        interactionStarted = Date.now();
      }
      const from = movement.positions[step - 1], to = movement.positions[step];
      const height = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)) * 0.18;
      const rotation = cardinalRotation(from, to);
      // Stream visual frames without scene writes or per-frame change notifications.
      for (let frame = 1; frame <= 8; frame++) {
        const t = frame / 8;
        interaction[0](draft => {
          const item = Array.isArray(draft) ? draft[0] : draft;
          item.rotation = rotation;
          item.position = frame === 8 ? to : {
            x: from.x + (to.x - from.x) * t,
            y: from.y + (to.y - from.y) * t - Math.sin(Math.PI * t) * height,
          };
        });
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      // Persist and checkpoint only the landing, so recovery never repays an action.
      await OBR.scene.items.updateItems([movement.tokenId], items => {
        if (!items.length) throw Error('Le pion manque sur la carte.');
        for (const item of items) {
          const saved = item.metadata[PROGRESS] as typeof progress;
          if (saved?.id === resolution.id && saved.step >= step) continue;
          item.rotation = rotation;
          item.position = to;
          item.metadata[PROGRESS] = { id: resolution.id, step };
        }
      });
    }
  } finally { interaction?.[1](); }
}
