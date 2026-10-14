import OBR, { buildPath, Command, type Item, type PathCommand } from "@owlbear-rodeo/sdk";
import { projectPattern } from "../core/projection";
import type { Point, Technique } from "../core/types";

export const PREVIEW_KEY = "de.sunitro.cendres/preview";

export function buildPattern(origin: Point, dpi: number, technique: Technique, rotation = 0): Item[] {
  return projectPattern(origin, technique.pattern, rotation).map(cell => {
    // Coordonnées explicites du tracé : pas d’ambiguïté sur l’ancrage d’un rectangle.
    const commands: PathCommand[] = [
      [Command.MOVE, 0, 0], [Command.LINE, dpi, 0], [Command.LINE, dpi, dpi],
      [Command.LINE, 0, dpi], [Command.CLOSE],
    ];
    for (let i = 1; i < 8; i++) {
      const offset = i * dpi / 4;
      commands.push([Command.MOVE, Math.max(0, offset - dpi), Math.min(dpi, offset)],
        [Command.LINE, Math.min(dpi, offset), Math.max(0, offset - dpi)]);
    }
    return buildPath().commands(commands).position({ x: cell.x * dpi, y: cell.y * dpi })
      .name(`Cendres · ${technique.name}`).layer("POINTER").locked(true).disableHit(true)
      .fillColor("#ef9a68").fillOpacity(0.2).strokeColor("#ef9a68").strokeOpacity(0.6)
      .strokeWidth(Math.max(1, dpi / 70)).metadata({ [PREVIEW_KEY]: true }).build();
  });
}

export class Preview {
  private ids: string[] = [];
  private queue: Promise<void> = Promise.resolve();
  private revision = 0;

  private enqueue(task: () => Promise<void>) {
    const result = this.queue.then(task);
    this.queue = result.catch(() => {});
    return result;
  }

  private async remove() {
    if (!OBR.isReady) return;
    if (!await OBR.scene.isReady()) { this.ids = []; return; }
    // Retrouver aussi les résidus d’une fermeture brutale de la fenêtre précédente.
    const leftovers = await OBR.scene.local.getItems(item => item.metadata[PREVIEW_KEY] === true);
    const ids = [...new Set([...this.ids, ...leftovers.map(item => item.id)])];
    if (ids.length) await OBR.scene.local.deleteItems(ids);
    this.ids = [];
  }

  clear() {
    ++this.revision;
    return this.enqueue(() => this.remove());
  }

  show(resolve: () => Promise<Item[]>) {
    const revision = ++this.revision;
    return this.enqueue(async () => {
      await this.remove();
      if (revision !== this.revision) return;
      const items = await resolve();
      if (revision !== this.revision || !items.length || !await OBR.scene.isReady()) return;
      this.ids = items.map(item => item.id);
      await OBR.scene.local.addItems(items);
      if (revision !== this.revision) await this.remove();
    });
  }
}
