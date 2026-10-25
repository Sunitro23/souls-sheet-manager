import { owlbearErrorMessage } from './error';
import OBR, { buildText, buildPath, Command, isPath, type Item, type PathCommand } from '@owlbear-rodeo/sdk';
import { characterForOwlbear } from '../../workspace-client';
import { activeParticipant } from '../core/actions';
import { MOVEMENT_CHANNEL, planMovement, facingTargets } from '../core/movement';
import { cellFromCenter } from '../core/projection';
import type { Point } from '../core/types';
import { boardSnapshot, combatCall, currentCombat, performCombatAction } from './actions';
import { Preview, buildPattern } from './preview';
import { characterToken, tokenOrigin } from './token';
import { onMapInteraction, type MapInteraction } from './interaction';
import { CAST_CHANNEL } from '../core/spells';

const TOOL = `${MOVEMENT_CHANNEL}/tool`, MODE = `${TOOL}/mode`, CORRECT = `${TOOL}/correct`;
const LOCK = `${MOVEMENT_CHANNEL}/lock`;

export async function registerMovement() {
  const preview = new Preview(`${TOOL}/preview`);
  const rangePreview = new Preview(`${TOOL}/range`);
  const icon = new URL('/owlbear/character.svg', location.origin).href;
  let current: { characterId: string; tokenId: string; combatId: string; turn: number; correction: boolean; target: Point; dpi: number; snapshot?: Awaited<ReturnType<typeof boardSnapshot>>; movement?: Awaited<ReturnType<typeof characterForOwlbear>>['movement'] } | null = null;
  let previousTool = '', busy = false, disposed = false, generation = 0, toolCreated = false, refreshRevision = 0;
  let interaction: MapInteraction | null = null, hidden = false, turnKey = '', actorToken = '';
  const placingSpell = () => interaction === 'spell';
  let automaticSyncing = false, automaticAgain = false, lastRevision: number | undefined;
  let selection = (await OBR.player.getSelection() ?? []).join('/');
  const report = (e: unknown) => { const message = owlbearErrorMessage(e); void OBR.notification.show(message, 'ERROR').catch(() => { console.error(message); }); };
  const run = (task: () => Promise<unknown>) => { void task().catch(report); };
  async function cancel() {
    ++generation;
    current = null;
    ++refreshRevision;
    await Promise.all([preview.clear(), rangePreview.clear()]);
    if (previousTool && await OBR.tool.getActiveTool() === TOOL) await OBR.tool.activateTool(previousTool);
    if (toolCreated) { toolCreated = false; await OBR.tool.remove(TOOL); }
  }
  async function context() {
    const selected = current;
    if (!selected) throw Error('Sélectionnez Mouvement.');
    const combat = await currentCombat();
    if (!combat || combat.id !== selected.combatId) throw Error('Le combat est terminé.');
    const state = await combatCall(combat, 'get');
    const [role, playerId] = await Promise.all([OBR.player.getRole(), OBR.player.getId()]);
    if (selected.correction) {
      if (role !== 'GM') throw Error('Accès MJ requis.');
      if (state?.resolution?.movement?.tokenId === selected.tokenId) throw Error('Attendez la fin du mouvement.');
    } else {
      const actor = state && activeParticipant(state.combat);
      if (!actor || actor.tokenId !== selected.tokenId || actor.characterId !== selected.characterId ||
          state!.combat.turn !== selected.turn || state!.pending || state!.resolution || role !== 'GM' && actor.playerId !== playerId) throw Error('Ce personnage ne peut pas agir maintenant.');
      await characterToken(selected.characterId, selected.tokenId);
    }
    return selected;
  }
  async function refreshPreview() {
    const selected = current, request = ++refreshRevision;
    if (!selected || busy || interaction) return;
    const [snapshot, data] = await Promise.all([boardSnapshot(), selected.correction ? undefined : characterForOwlbear(selected.characterId)]);
    if (current !== selected || request !== refreshRevision) return;
    selected.snapshot = snapshot;
    selected.movement = data ? {...data.movement} : undefined;
    const { board, dpi } = snapshot;
    const range: Item[] = [];
    if (data) {
      const origin = board.find(t => t.tokenId === selected.tokenId)?.cell;
      if (!origin) { await cancel(); throw Error('Le pion manque sur la carte.'); }
      const { move, sprint, end } = data.movement;
      const groups: Point[][] = [[], []];
      for (let x = -sprint; x <= sprint; x++) for (let y = -sprint; y <= sprint; y++) {
        try {
          const target = {x:origin.x+x,y:origin.y+y};
          const {end:cost} = planMovement(board, selected.tokenId, target, move, sprint);
          if (cost) groups[cost-1].push(target);
        } catch { /* Occupied paths are not selectable. */ }
      }
      for (const cost of [1,2]) {
        const zone = buildPattern({x:0,y:0}, dpi, {name:`${cost === 1 ? 'Marche' : 'Course'} · ${cost} END`,pattern:groups[cost-1].map(p=>[p.x,p.y])});
        for (const item of zone) if (isPath(item)) Object.assign(item.style, {fillColor:end < cost ? '#888888' : cost === 1 ? '#61c9a8' : '#ef9a68',strokeColor:end < cost ? '#888888' : cost === 1 ? '#61c9a8' : '#ef9a68',fillOpacity:0.12,strokeOpacity:0.35});
        range.push(...zone);
      }
      for (const target of facingTargets(origin, sprint)) {
        const angle = target.rotation * Math.PI / 180;
        const vertices = [[0.5,0.12],[0.86,0.48],[0.64,0.48],[0.64,0.88],[0.36,0.88],[0.36,0.48],[0.14,0.48]];
        const commands: PathCommand[] = vertices.map(([x,y],index) => [index ? Command.LINE : Command.MOVE,
          (0.5+(x-0.5)*Math.cos(angle)-(y-0.5)*Math.sin(angle))*dpi,
          (0.5+(x-0.5)*Math.sin(angle)+(y-0.5)*Math.cos(angle))*dpi]);
        commands.push([Command.CLOSE]);
        range.push(buildPath().name('Se tourner · 1 END').commands(commands)
          .fillColor(end >= 1 ? '#ffffff' : '#888888').fillOpacity(1).strokeColor('#151515').strokeWidth(2)
          .position({x:target.x*dpi,y:target.y*dpi}).layer('POINTER').locked(true).disableHit(true).build());
      }
    }
    await rangePreview.show(async () => current === selected && request === refreshRevision ? range : []);
    if (current === selected && request === refreshRevision) await draw();
  }
  async function draw() {
    const selected = current;
    if (!selected?.snapshot || busy || interaction) return;
    await preview.show(async () => {
      const {board,dpi} = selected.snapshot!;
      let label = 'Correction MJ', cells: Point[] = [selected.target], valid = true;
      if (selected.movement) {
        const {move,sprint,end} = selected.movement;
        const origin = board.find(token => token.tokenId === selected.tokenId)?.cell;
        const facing = origin && facingTargets(origin, sprint).find(target => target.x === selected.target.x && target.y === selected.target.y);
        try {
          const plan = facing ? {path:[],end:1} : planMovement(board, selected.tokenId, selected.target, move, sprint);
          cells = plan.path;
          label = facing ? 'Se tourner · 1 END' : plan.end ? `${plan.end} END` : 'Choisissez une destination';
          if (end < plan.end) { valid=false;label+=' · END insuffisante'; }
        } catch (e) { valid=false;label=owlbearErrorMessage(e); }
      }
      // Fixed slots keep item identities stable as the route grows or shrinks.
      const slots = selected.movement?.sprint ?? 1;
      const pattern = Array.from({length:slots}, (_,i): [number,number] => {
        const cell = cells[i] ?? selected.target;
        return [cell.x,cell.y];
      });
      const items = buildPattern({x:0,y:0},dpi,{name:label,pattern});
      for (const [index,item] of items.entries()) {
        item.visible = index < cells.length;
        if (isPath(item)) Object.assign(item.style,{strokeColor:valid?'#ef9a68':'#ef4444',fillColor:valid?'#ef9a68':'#ef4444'});
      }
      items.push(buildText().textType('PLAIN').plainText(label).fontSize(Math.max(16,dpi/4)).fillColor(valid?'#ffffff':'#ef4444')
        .strokeColor('#151515').strokeWidth(2).position({x:(selected.target.x+1)*dpi,y:selected.target.y*dpi})
        .layer('POINTER').locked(true).disableHit(true).build());
      return current === selected ? items : [];
    });
  }
  async function start(characterId: string, tokenId: string, correction = false, automatic = false) {
    if (busy) return;
    await cancel();
    const request = ++generation;
    const combat = await currentCombat();
    if (!combat) throw Error('Aucun combat actif.');
    const origin = await tokenOrigin(tokenId);
    if (disposed || request !== generation) return;
    current = { characterId, tokenId, correction, combatId: combat.id, turn: combat.turn ?? 0, target: origin.origin, dpi: origin.dpi };
    try { await context(); } catch (e) { await cancel(); throw e; }
    if (disposed || request !== generation) return;
    previousTool = await OBR.tool.getActiveTool();
    await OBR.tool.create({id:TOOL,icons:[{icon,label:'Destination du mouvement'}],defaultMode:MODE,onClick:()=>!!current});
    toolCreated = true;
    if (disposed || request !== generation) { await cancel(); return; }
    await OBR.tool.activateTool(TOOL);
    try { await refreshPreview(); } catch (error) { await cancel(); throw error; }
    if (!automatic) await OBR.notification.show(correction ? 'Cliquez pour repositionner le pion · Échap pour annuler.' : 'Choisissez une destination · 1 END en marche, 2 END en course · Échap pour annuler.');
    if (!automatic) await OBR.action.close();
  }
  async function clearWeapon() {
    await new Preview().clear();
    await OBR.broadcast.sendMessage(MOVEMENT_CHANNEL, { weaponCancelled: true }, { destination: 'LOCAL' });
  }
  async function syncAutomatic() {
    if (disposed || busy) return;
    if (automaticSyncing) { automaticAgain = true; return; }
    automaticSyncing = true;
    try {
      do {
        automaticAgain = false;
        if (!await OBR.scene.isReady()) { await cancel(); return; }
        const combat = await currentCombat();
        const state = combat?.phase === 'ready' ? await combatCall(combat, 'get') : null;
        const actor = state && activeParticipant(state.combat);
        const nextTurn = state ? `${state.combat.id}/${state.combat.turn ?? 0}/${actor?.id}` : '';
        if (nextTurn !== turnKey) {
          const previous = interaction;
          turnKey = nextTurn; hidden = false; interaction = null; lastRevision = undefined;
          if (previous === 'weapon') await clearWeapon();
          if (previous === 'spell') await OBR.broadcast.sendMessage(CAST_CHANNEL, { cancel: true }, { destination: 'LOCAL' });
        }
        actorToken = actor?.tokenId ?? '';
        if (current?.correction) {
          try { await context(); } catch { await cancel(); }
          return;
        }
        const [role, playerId] = await Promise.all([OBR.player.getRole(), OBR.player.getId()]);
        const controlled = actor && (actor.playerId === playerId || role === 'GM' && !actor.playerId);
        if (!controlled || !actor?.characterId || !actor.tokenId || !state || state.pending || state.resolution) {
          if (state?.pending || state?.resolution) hidden = false;
          if (current) await cancel();
          continue;
        }
        if (hidden || interaction === 'spell') { if (current) await cancel(); continue; }
        if (current && (current.tokenId !== actor.tokenId || current.turn !== (state.combat.turn ?? 0))) await cancel();
        if (!current || lastRevision !== state.revision) {
          const data = await characterForOwlbear(actor.characterId);
          if (disposed || hidden || placingSpell()) continue;
          if (data.movement.end < 1 && interaction !== 'weapon') { if (current) await cancel(); continue; }
          if (!current) await start(actor.characterId, actor.tokenId, false, true);
          else await refreshPreview();
          lastRevision = state.revision;
        }
      } while (automaticAgain && !disposed);
    } finally { automaticSyncing = false; }
  }
  async function changeInteraction(source: MapInteraction, active: boolean) {
    if (!active && interaction !== source) return;
    interaction = active ? source : null;
    lastRevision = undefined;
    if (active) hidden = false;
    if (source === 'spell' && active) await cancel();
    else if (active) await Promise.all([preview.clear(), rangePreview.clear()]);
    await syncAutomatic();
  }
  await OBR.tool.createMode({ id: MODE, icons: [{ icon, label: 'Mouvement', filter: { activeTools: [TOOL] } }],
    cursors: [{ cursor: 'crosshair' }], preventDrag: { activeTools: [TOOL] },
    onToolMove: (_ctx, event) => {
      if (!current || busy || interaction) return;
      const target = cellFromCenter(event.pointerPosition, current.dpi);
      if (target.x === current.target.x && target.y === current.target.y) return;
      current.target = target; run(draw);
    },
    onToolClick: async (_ctx, event) => {
      if (!current || busy || interaction) return false;
      busy = true;
      try {
        const selected = await context();
        const origin = await tokenOrigin(selected.tokenId);
        if (disposed || current !== selected) return false;
        const target = cellFromCenter(event.pointerPosition, origin.dpi);
        if (target.x === origin.origin.x && target.y === origin.origin.y) return false;
        if (selected.correction) {
          await OBR.scene.items.updateItems([selected.tokenId], items => { for (const item of items) item.position = {
            x: item.position.x + (target.x - origin.origin.x) * origin.dpi, y: item.position.y + (target.y - origin.origin.y) * origin.dpi,
          }; });
        } else {
          const data = await characterForOwlbear(selected.characterId);
          const facing = facingTargets(origin.origin, data.movement.sprint).find(arrow => arrow.x === target.x && arrow.y === target.y);
          await performCombatAction(selected.characterId, selected.tokenId,
            facing ? {kind:'turn',rotation:facing.rotation} : {kind:'movement'}, {target,rotation:0});
        }
        await cancel();
      } catch (e) { report(e); } finally { busy = false; await syncAutomatic(); }
      return false;
    },
    onKeyDown: (_ctx, event) => { if (event.key === 'Escape' && !busy) run(async () => {
      if (interaction === 'weapon') { await clearWeapon(); await changeInteraction('weapon', false); }
      else { hidden = true; await cancel(); }
    }); },
    onDeactivate: () => { if (current && !busy) run(async () => {
      hidden = true;
      if (interaction === 'weapon') { interaction = null; await clearWeapon(); }
      await cancel();
    }); },
  });
  await OBR.contextMenu.create({ id: CORRECT, icons: [{ icon, label: 'Repositionner (MJ)', filter: { roles: ['GM'], min: 1, max: 1,
    every: [{ key: ['metadata', LOCK], value: undefined, operator: '!=' }] } }],
    onClick: ctx => run(async () => { interaction = null; hidden = true; await start('', ctx.items[0].id, true); }),
  });

  // Persist the previous lock flag so reloads and scene switches restore it correctly.
  let syncing = false, again = false;
  async function syncLocks() {
    if (disposed) return;
    if (syncing) { again = true; return; }
    syncing = true;
    try {
      do {
        again = false;
        if (!await OBR.scene.isReady()) return;
        const combat = await currentCombat();
        const active = combat?.phase === 'ready';
        const items = await OBR.scene.items.getItems(item => item.type === 'IMAGE' && item.layer === 'CHARACTER' || typeof item.metadata[LOCK] === 'boolean');
        const changes = items.filter(item => active && item.type === 'IMAGE' && item.layer === 'CHARACTER'
          ? typeof item.metadata[LOCK] !== 'boolean' || !item.locked : typeof item.metadata[LOCK] === 'boolean');
        if (changes.length) await OBR.scene.items.updateItems(changes.map(i => i.id), drafts => {
          for (const item of drafts) {
            if (active && item.type === 'IMAGE' && item.layer === 'CHARACTER') {
              if (typeof item.metadata[LOCK] !== 'boolean') item.metadata[LOCK] = item.locked;
              item.locked = true;
            } else { item.locked = item.metadata[LOCK] === true; delete item.metadata[LOCK]; }
          }
        });
      } while (again && !disposed);
    } finally { syncing = false; }
  }
  const stops = [
    onMapInteraction(changeInteraction),
    OBR.broadcast.onMessage(MOVEMENT_CHANNEL, event => {
      const data = event.data as { characterId?: string; tokenId?: string; interaction?: MapInteraction; active?: boolean };
      if ((data?.interaction === 'weapon' || data?.interaction === 'spell') && typeof data.active === 'boolean') {
        run(() => changeInteraction(data.interaction!, data.active!));
      } else if (typeof data?.characterId === 'string' && typeof data.tokenId === 'string') {
        run(async () => {
          if (interaction === 'spell') await OBR.broadcast.sendMessage(CAST_CHANNEL, {cancel:true}, {destination:'LOCAL'});
          if (interaction === 'weapon') await clearWeapon();
          interaction = null; hidden = false;
          await start(data.characterId!, data.tokenId!);
        });
      }
    }),
    OBR.player.onChange(player => {
      const next = (player.selection ?? []).join('/');
      if (next !== selection && player.selection?.includes(actorToken)) hidden = false;
      selection = next;
      run(syncAutomatic);
    }),
    OBR.scene.items.onChange(() => { run(syncLocks); run(refreshPreview); }),
    OBR.room.onMetadataChange(() => { run(syncLocks); run(syncAutomatic); }),
    OBR.broadcast.onMessage('de.sunitro.cendres/combat-refresh', () => run(syncAutomatic)),
    OBR.scene.grid.onChange(() => run(async () => { await cancel(); await syncAutomatic(); })),
    OBR.scene.onReadyChange(() => run(async () => { turnKey = ''; await cancel(); await syncLocks(); await syncAutomatic(); })),
  ];
  const timer = setInterval(() => run(syncAutomatic), 1500);
  await syncLocks();
  await syncAutomatic();
  return async () => {
    disposed = true; clearInterval(timer); stops.forEach(stop => stop()); await cancel();
    await Promise.allSettled([OBR.tool.removeMode(MODE), OBR.contextMenu.remove(CORRECT)]);
  };
}
