import { createCombatSync, emptyCombatSnapshot } from '../core/combat-sync';
import { readCombat } from '../core/combat';
import { connectOwlbear } from '../connection';
import { combatCall } from './actions';

export const combatSync = createCombatSync(async () => {
  const OBR = await connectOwlbear();
  if (!OBR) return emptyCombatSnapshot;
  const [metadata, playerId, role] = await Promise.all([OBR.room.getMetadata(), OBR.player.getId(), OBR.player.getRole()]);
  const combat = readCombat(metadata);
  const state = combat?.phase === 'ready' ? await combatCall(combat, 'get') : null;
  return { combat: state?.combat ?? combat, state, playerId, role, ready: true, error: '' };
}, async refresh => {
  const OBR = await connectOwlbear();
  if (!OBR) return () => {};
  const stops = [OBR.room.onMetadataChange(refresh), OBR.player.onChange(refresh),
    OBR.broadcast.onMessage('de.sunitro.cendres/combat-refresh', refresh)];
  return () => stops.forEach(stop => stop());
});
