import { setMapInteraction } from './interaction';
import { ZONE_DURATION, clearPreviousZones } from './zone-expiry';
import { currentCombat, performCombatAction } from './actions';
import OBR from '@owlbear-rodeo/sdk';
import { characterForOwlbear } from '../../workspace-client';
import { CAST_CHANNEL, SPELL_ZONE_KEY, canDeleteSpellZone, spellPosition } from '../core/spells';
import { cellFromCenter } from '../core/projection';
import type { Point, Spell } from '../core/types';
import { characterToken, tokenOrigin } from './token';
import { Preview, PREVIEW_KEY, buildPattern } from './preview';

const TOOL = 'de.sunitro.cendres/place-spell';
const MODE = `${TOOL}/mode`;
const REMOVE = `${TOOL}/remove`;
const ROTATE = `${TOOL}/rotate`;
const CANCEL = `${TOOL}/cancel`;
type Placement = { characterId: string; tokenId: string; spell: Spell; target: Point; rotation: number; dpi: number };

export async function registerSpellPlacement() {
  const preview = new Preview(`${TOOL}/preview`);
  const icon = new URL('/owlbear/magic.svg', location.origin).href;
  let current: Placement | null = null, previousTool = '', revision = 0, committing = false, disposed = false, toolCreated = false;
  const report = (error: unknown) => { void OBR.notification.show((error as Error).message, 'ERROR'); };
  const run = (task: () => Promise<unknown>) => { void task().catch(report); };

  async function cancel(resume = true) {
    ++revision;
    current = null;
    await preview.clear();
    if (await OBR.tool.getActiveTool() === TOOL && previousTool && previousTool !== TOOL) await OBR.tool.activateTool(previousTool);
    if (toolCreated) { toolCreated = false; await OBR.tool.remove(TOOL); }
    if (resume) await setMapInteraction('spell', false);
  }

  async function draw() {
    const placement = current;
    if (!placement || committing) return;
    await preview.show(async () => {
      const caster = await tokenOrigin(placement.tokenId);
      if (current !== placement) return [];
      try {
        const origin = spellPosition(placement.spell, caster.origin, placement.target);
        return buildPattern(origin, caster.dpi, placement.spell, placement.rotation + (placement.spell.origin === 'self' ? caster.rotation : 0));
      } catch { return []; }
    });
  }

  async function rotate() {
    if (!current || committing) return;
    current.rotation = (current.rotation + 90) % 360;
    await draw();
  }

  async function commit(pointer: Point) {
    const placement = current, request = revision;
    if (!placement || committing) return;
    committing = true;
    try {
      const data = await characterForOwlbear(placement.characterId);
      const spell = data.spells.find(item => item.id === placement.spell.id);
      if (!spell) throw Error('Ce sort n’est plus disponible.');
      await characterToken(placement.characterId, placement.tokenId);
      const caster = await tokenOrigin(placement.tokenId);
      const origin = spellPosition(spell, caster.origin, cellFromCenter(pointer, caster.dpi));
      if (await currentCombat()) {
        if (disposed || current !== placement || request !== revision) return;
        const used = await performCombatAction(placement.characterId, placement.tokenId, {kind:'spell',spellId:spell.id},
          {target:cellFromCenter(pointer,caster.dpi),rotation:placement.rotation + (spell.origin === 'self' ? caster.rotation : 0)});
        if(used) await cancel();
        return;
      }
      const casterId = await OBR.player.getId(), castId = crypto.randomUUID();
      const items = buildPattern(origin, caster.dpi, spell, placement.rotation + (spell.origin === 'self' ? caster.rotation : 0));
      const expiresAt = Date.now() + ZONE_DURATION;
      for (const item of items) {
        delete item.metadata[PREVIEW_KEY];
        item.metadata[SPELL_ZONE_KEY] = { castId, casterId, spellId: spell.id, expiresAt };
        item.layer = 'DRAWING';
        item.disableHit = false;
        if (spell.origin === 'self') { item.attachedTo = placement.tokenId; item.disableAttachmentBehavior = ['SCALE', 'COPY', 'VISIBLE', 'DELETE', 'LOCKED']; }
      }
      if (disposed || current !== placement || request !== revision) return;
      await clearPreviousZones(castId);
      await OBR.scene.items.addItems(items);
      await cancel();
    } finally { committing = false; }
  }

  try {
    await OBR.tool.createMode({ id: MODE, icons: [{icon, label:'Placer le sort', filter:{activeTools:[TOOL]}}],
      cursors:[{cursor:'crosshair'}], preventDrag:{activeTools:[TOOL]},
      onToolMove: (_context,event) => run(async()=>{
        const placement=current;
        if(!placement || committing)return;
        const target=cellFromCenter(event.pointerPosition,placement.dpi);
        if(placement.spell.origin==='self'||target.x===placement.target.x&&target.y===placement.target.y)return;
        placement.target=target;
        await draw();
      }),
      onToolClick: async (_context,event) => { try { await commit(event.pointerPosition); } catch(error){report(error)} return true; },
      onKeyDown: (_context,event) => { if(event.key==='Escape')run(()=>cancel()); else if(event.key.toLowerCase()==='r')run(rotate); },
      onDeactivate: () => { if(current)run(()=>cancel()); },
    });
    await OBR.tool.createAction({id:ROTATE,icons:[{icon,label:'Tourner de 90° (R)',filter:{activeTools:[TOOL]}}],onClick:()=>run(rotate)});
    await OBR.tool.createAction({id:CANCEL,icons:[{icon,label:'Annuler (Échap)',filter:{activeTools:[TOOL]}}],onClick:()=>run(()=>cancel())});
    const playerId=await OBR.player.getId();
    await OBR.contextMenu.create({id:REMOVE,icons:[
      {icon,label:'Supprimer la zone du sort',filter:{roles:['GM'],every:[{key:['metadata',SPELL_ZONE_KEY],value:undefined,operator:'!='}]}},
      {icon,label:'Supprimer la zone du sort',filter:{roles:['PLAYER'],every:[{key:['metadata',SPELL_ZONE_KEY,'casterId'],value:playerId}]}},
    ],onClick:context=>run(async()=>{
      const role=await OBR.player.getRole(), viewer=await OBR.player.getId();
      const selected=await OBR.scene.items.getItems(context.items.map(item=>item.id));
      const castIds=new Set(selected.flatMap(item=>{
        const metadata=item.metadata[SPELL_ZONE_KEY];
        return canDeleteSpellZone(metadata,viewer,role)?[(metadata as {castId:string}).castId]:[];
      }));
      const items=await OBR.scene.items.getItems(item=>{
        const metadata=item.metadata[SPELL_ZONE_KEY];
        return canDeleteSpellZone(metadata,viewer,role)&&castIds.has((metadata as {castId:string}).castId);
      });
      if(items.length)await OBR.scene.items.deleteItems(items.map(item=>item.id));
    })});
  } catch(error) {
    await Promise.allSettled([OBR.tool.remove(TOOL),OBR.tool.removeMode(MODE),OBR.tool.removeAction(ROTATE),OBR.tool.removeAction(CANCEL),OBR.contextMenu.remove(REMOVE)]);
    throw error;
  }

  const stops=[
    OBR.broadcast.onMessage(CAST_CHANNEL,event=>run(async()=>{
      const message=event.data as Record<string,unknown>;
      if(message?.cancel===true){await cancel();return;}
      if(!message||typeof message.characterId!=='string'||typeof message.spellId!=='string'||typeof message.tokenId!=='string')return;
      if(committing)throw Error('Placement en cours.');
      await cancel(false);
      await setMapInteraction('spell', true);
      try {
        const {readCombat}=await import('../core/combat');
        const combat=readCombat(await OBR.room.getMetadata());
        if(combat) {
          const {combatCall}=await import('./actions');
          const {activeParticipant}=await import('../core/actions');
          const state=await combatCall(combat,'get');
          if(!state||state.pending||state.resolution||activeParticipant(state.combat)?.characterId!==message.characterId)throw Error('Ce personnage ne peut pas agir maintenant.');
        }
        const request=++revision;
        const data=await characterForOwlbear(message.characterId);
        const spell=data.spells.find(item=>item.id===message.spellId);
        if(!spell)throw Error('Ce sort n’est plus disponible.');
        const token=await characterToken(message.characterId,message.tokenId), caster=await tokenOrigin(token.id);
        const activeTool=await OBR.tool.getActiveTool();
        if(disposed||request!==revision)return;
        previousTool=activeTool;
        current={characterId:message.characterId,tokenId:token.id,spell,target:caster.origin,rotation:0,dpi:caster.dpi};
        await OBR.tool.create({id:TOOL,icons:[{icon,label:'Placement en cours'}],defaultMode:MODE,onClick:()=>!!current});
        toolCreated=true;
        if(disposed||request!==revision){await OBR.tool.remove(TOOL);return;}
        await OBR.tool.activateTool(TOOL);
        await draw();
        await OBR.notification.show('Cliquez pour placer le sort · R pour tourner · Échap pour annuler.');
        await OBR.action.close();
      } catch (error) { await cancel(); throw error; }
    })),
    OBR.scene.items.onChange(()=>run(draw)),
    OBR.scene.grid.onChange(()=>run(()=>cancel())),
    OBR.scene.onReadyChange(()=>run(()=>cancel())),
  ];
  return async()=>{
    disposed=true;
    stops.forEach(stop=>stop());
    await cancel();
    await Promise.allSettled([OBR.tool.remove(TOOL),OBR.tool.removeMode(MODE),OBR.tool.removeAction(ROTATE),OBR.tool.removeAction(CANCEL),OBR.contextMenu.remove(REMOVE)]);
  };
}
