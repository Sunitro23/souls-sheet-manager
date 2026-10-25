import { owlbearErrorMessage } from './error';
import { planMovement } from '../core/movement';
import { validDodge } from '../core/actions';
import { animateMovement } from './movement-animation';
import { ZONE_DURATION, zoneExpiry, clearPreviousZones } from './zone-expiry';
import OBR from '@owlbear-rodeo/sdk';
import { currentCombat, combatCall, mutateCombat, boardSnapshot } from './actions';
import { cellFromCenter } from '../core/projection';
import { buildPattern, PREVIEW_KEY, Preview, showAttackPreview } from './preview';
import { SPELL_ZONE_KEY } from '../core/spells';

export const ATTACK_THREAT_CHANNEL = 'de.sunitro.cendres/attack-threat';
export const DODGE_CHANNEL = 'de.sunitro.cendres/dodge';
const TOOL = `${DODGE_CHANNEL}/tool`, MODE = `${TOOL}/mode`;
async function itemId(attackId: string, index: number) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${attackId}:${index}`)));
  const hex = [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20,32)}`;
}
export async function registerCombatReactions() {
  let disposed = false, polling = false, answering = false, choice: {participantId:string; attackId:string} | null = null;
  const preview = new Preview(`${TOOL}/preview`);
  async function drawChoices() {
    const selected = choice;
    if (!selected) return;
    await preview.show(async () => {
      const combat = await currentCombat();
      if (!combat) return [];
      const participant = combat.participants.find(p => p.id === selected.participantId);
      if (!participant?.tokenId) return [];
      const {board,dpi} = await boardSnapshot();
      const token = board.find(t => t.tokenId === participant.tokenId);
      if (!token) return [];
      const cells = [];
      for (const x of [-2,0,2]) for (const y of [-2,0,2]) {
        const target = {x:token.cell.x+x,y:token.cell.y+y};
        if (!validDodge(token.cell,target)) continue;
        try { planMovement(board,token.tokenId,target,2,2); cells.push(target); } catch { /* Blocked path. */ }
      }
      return selected === choice ? buildPattern({x:0,y:0},dpi,{name:'Esquive préparée · 0 END supplémentaire',pattern:cells.map(p=>[p.x,p.y])}) : [];
    });
  }
  let previousTool = '';
  let lastError = '';
  const report = (e: unknown) => { const message=owlbearErrorMessage(e); if(message!==lastError){lastError=message;void OBR.broadcast.sendMessage('de.sunitro.cendres/reaction-status', {error:message}, {destination:'LOCAL'}).catch(()=>{console.error(message);});} };
  async function cancel() {
    choice = null;
    await preview.clear();
    if (previousTool && await OBR.tool.getActiveTool() === TOOL) await OBR.tool.activateTool(previousTool);
  }
  const icon = new URL('/owlbear/character.svg', location.origin).href;
  await OBR.tool.createMode({ id: MODE, icons: [{icon,label:'Choisir la case d’esquive',filter:{activeTools:[TOOL]}}],
    cursors:[{cursor:'crosshair'}], preventDrag:{activeTools:[TOOL]},
    onToolClick: async (_context,event) => {
      if (!choice || answering) return true;
      answering = true;
      try {
        const combat = await currentCombat(), selected = choice;
        if (!combat) throw Error('Le combat est terminé.');
        const state = await combatCall(combat, 'get');
        if (!state || state.pending?.id !== selected.attackId) throw Error('Cette attaque est déjà résolue.');
        const destination = cellFromCenter(event.pointerPosition, await OBR.scene.grid.getDpi());
        await mutateCombat(state, 'answer', { participantId: selected.participantId, attackId: selected.attackId, destination });
        await cancel();
        await OBR.broadcast.sendMessage('de.sunitro.cendres/reaction-status', {message:'Esquive enregistrée. En attente des autres réponses.'}, {destination:'LOCAL'});
      } catch (e) { report(e); }
      finally { answering = false; }
      return true;
    },
    onKeyDown: (_context,event) => { if(event.key==='Escape') void cancel().catch(report); },
    onDeactivate: () => { void cancel().catch(report); },
  });
  await OBR.tool.create({id:TOOL,icons:[{icon,label:'Esquive préparée'}],defaultMode:MODE,onClick:()=>!!choice});
  let notified = '', hitNotified = '';
  const revealed = new Map<string, number>();
  async function refresh() {
    if (polling || disposed) return;
    polling = true;
    try {
      const combat = await currentCombat();
      if (!combat) { if(choice) await cancel(); await showAttackPreview(null); return; }
      const state = await combatCall(combat,'get');
      await showAttackPreview(state);
      if (!state) return;
      const [playerId,role] = await Promise.all([OBR.player.getId(),OBR.player.getRole()]);
      const canControl = (id: string) => role === 'GM' || state.combat.participants.find(p=>p.id===id)?.playerId===playerId;
      const owns = (id: string) => state.combat.participants.find(p => p.id === id)?.playerId === playerId;
      if (state.unpreparedHit && state.unpreparedHit.id !== hitNotified) {
        const names = state.unpreparedHit.defenders.filter(owns).map(id => state.combat.participants.find(p => p.id === id)!.name);
        if (names.length) await OBR.action.open();
        hitNotified = state.unpreparedHit.id;
      }
      if (choice && state.pending?.id !== choice.attackId) await cancel();
      if (state.pending && state.pending.id !== notified && state.pending.defenders.some(id=>owns(id)&&!state.pending!.answered.includes(id))) {
        const participantIds = state.pending.defenders.filter(id=>owns(id)&&!state.pending!.answered.includes(id));
        await OBR.broadcast.sendMessage(ATTACK_THREAT_CHANNEL, {attackId:state.pending.id,participantIds}, {destination:'LOCAL'});
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('souls-owlbear-section', 'Actions');
        await OBR.action.open();
        await OBR.broadcast.sendMessage('de.sunitro.cendres/section', 'Actions', {destination:'LOCAL'});
        notified = state.pending.id;
      }
      const resolution = state.resolution;
      if (!resolution || !canControl(resolution.actorId)) return;
      if (resolution.facing || resolution.movement || resolution.moves.length) {
        // One online controller animates; a GM can resume if the actor disconnects.
        const party = await OBR.party.getPlayers();
        const actor = state.combat.participants.find(p => p.id === resolution.actorId);
        const viewers = [...party, { id: playerId, role }];
        const controller = viewers.some(p => p.id === actor?.playerId) ? actor!.playerId : viewers.filter(p => p.role === 'GM').map(p => p.id).sort()[0];
        if (controller !== playerId) return;
      }
      if (resolution.facing) {
        const facing = resolution.facing;
        const items = await OBR.scene.items.getItems([facing.tokenId]);
        if (!items.length) throw Error('Le pion manque sur la carte. Restaurez-le pour terminer la rotation.');
        await OBR.scene.items.updateItems([facing.tokenId], items => {
          for (const item of items) item.rotation = facing.rotation;
        });
        await mutateCombat(state, 'ack', { attackId: resolution.id });
        lastError = '';
        return;
      }
      if (resolution.movement) {
        await animateMovement(resolution, () => disposed);
        await mutateCombat(state, 'ack', { attackId: resolution.id });
        lastError = '';
        return;
      }
      const ids = resolution.moves.map(move=>move.tokenId);
      if (ids.length) {
        const existing = await OBR.scene.items.getItems(ids);
        if (existing.length !== ids.length) throw Error('Un pion d’esquive manque sur la carte. Restaurez-le pour terminer la résolution.');
        for (const move of resolution.moves) {
          const positions = move.positions ?? [existing.find(item=>item.id===move.tokenId)!.position, move.position];
          await animateMovement({...resolution, id:`${resolution.id}/${move.tokenId}`, movement:{tokenId:move.tokenId,positions}}, () => disposed);
        }
      }
      const items = buildPattern({x:0,y:0}, resolution.dpi, {name:resolution.name,pattern:resolution.cells.map(p=>[p.x,p.y])});
      for (const [index,item] of items.entries()) {
        const id = await itemId(resolution.id,index);
        delete item.metadata[PREVIEW_KEY];
        item.metadata[SPELL_ZONE_KEY] = {castId:resolution.id,casterId:state.combat.participants.find(p=>p.id===resolution.actorId)!.playerId,spellId:'combat'};
        item.layer='DRAWING'; item.disableHit=false;
        items[index] = {...item,id};
      }
      const published = await OBR.scene.items.getItems(items.map(item=>item.id));
      const expiresAt = revealed.get(resolution.id) ?? published.map(zoneExpiry).find(time=>time!==undefined) ?? Date.now() + ZONE_DURATION;
      revealed.set(resolution.id, expiresAt);
      for(const item of items) (item.metadata[SPELL_ZONE_KEY] as {expiresAt:number}).expiresAt = expiresAt;
      const existing = new Set(published.map(item=>item.id));
      const missing = expiresAt > Date.now() ? items.filter(item=>!existing.has(item.id)) : [];
      if (missing.length) {
        await clearPreviousZones(resolution.id);
        await OBR.scene.items.addItems(missing);
      }
      await mutateCombat(state,'ack',{attackId:resolution.id});
      revealed.delete(resolution.id);
      lastError = '';
    } catch (e) { if(!disposed) report(e); }
    finally { polling = false; }
  }
  const stops = [OBR.broadcast.onMessage(DODGE_CHANNEL,event=>{void (async()=>{
    const data=event.data as {participantId?:string;attackId?:string};
    if(typeof data?.participantId!=='string'||typeof data.attackId!=='string')return;
    const combat=await currentCombat();
    if(!combat)throw Error('Le combat est terminé.');
    const state=await combatCall(combat,'get');
    const participant=state?.combat.participants.find(p=>p.id===data.participantId);
    const playerId=await OBR.player.getId();
    if(!state?.pending || state.pending.id!==data.attackId || !state.pending.defenders.includes(data.participantId) || state.pending.answered.includes(data.participantId) || !(state.dodges[data.participantId]>0) || !participant || participant.playerId!==playerId)throw Error('Cette esquive n’est pas disponible.');
    previousTool=await OBR.tool.getActiveTool();
    choice={participantId:data.participantId,attackId:data.attackId};
    await OBR.tool.activateTool(TOOL);
    await drawChoices();
    await OBR.broadcast.sendMessage('de.sunitro.cendres/reaction-status', {message:'Choisissez une case surlignée sur la carte · Échap pour revenir.'}, {destination:'LOCAL'});
  })().catch(report);}), OBR.broadcast.onMessage('de.sunitro.cendres/combat-refresh',()=>void refresh()), OBR.room.onMetadataChange(()=>void refresh()), OBR.scene.items.onChange(()=>{void drawChoices().catch(report);}), OBR.scene.grid.onChange(()=>{void cancel().catch(report);})];
  const timer=setInterval(()=>void refresh(),1500);
  void refresh();
  return async()=>{disposed=true;clearInterval(timer);stops.forEach(stop=>stop());await cancel();await OBR.tool.remove(TOOL);await OBR.tool.removeMode(MODE);};
}
