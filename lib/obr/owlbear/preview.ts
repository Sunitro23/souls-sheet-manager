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
  constructor(private readonly key = PREVIEW_KEY) {}
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
    const leftovers = await OBR.scene.local.getItems(item => item.metadata[this.key] === true);
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
      if (revision !== this.revision) return;
      const items = await resolve();
      for (const item of items) { delete item.metadata[PREVIEW_KEY]; item.metadata[this.key] = true; }
      if (revision !== this.revision || !await OBR.scene.isReady()) return;
      if (!items.length) { await this.remove(); return; }
      const existing = await OBR.scene.local.getItems(item => item.metadata[this.key] === true);
      if (revision !== this.revision) return;
      if (existing.length === items.length) {
        const replacements = new Map(existing.map((item, index) => [item.id, items[index]]));
        await OBR.scene.local.updateItems(existing.map(item => item.id), drafts => {
          for (const draft of drafts) Object.assign(draft, replacements.get(draft.id), {id:draft.id});
        });
        this.ids = existing.map(item => item.id);
      } else {
        await OBR.scene.local.addItems(items);
        this.ids = items.map(item => item.id);
        if (existing.length) await OBR.scene.local.deleteItems(existing.map(item => item.id));
      }
    });
  }
}

// This local layer survives closing action controls while defenders choose.
export async function showAttackPreview(state: import('../core/actions').CombatView | null) {
  const preview = new Preview('de.sunitro.cendres/pending-attack');
  const attack = state?.attackPreview;
  if (attack) await preview.show(async()=>buildPattern({x:0,y:0},attack.dpi,{name:attack.name,pattern:attack.cells.map(p=>[p.x,p.y])}));
  else if (!state?.resolution) await preview.clear();
}
