import OBR from '@owlbear-rodeo/sdk';
import { SPELL_ZONE_KEY, canDeleteSpellZone } from '../core/spells';

export async function clearSpellZones(all = false) {
  const [playerId, role] = await Promise.all([OBR.player.getId(), OBR.player.getRole()]);
  if (all && role !== 'GM') throw Error('Seul le GM peut effacer toutes les zones.');
  if (!await OBR.scene.isReady()) return;
  const items = await OBR.scene.items.getItems(item => canDeleteSpellZone(item.metadata[SPELL_ZONE_KEY], playerId, all ? role : 'PLAYER'));
  if (items.length) await OBR.scene.items.deleteItems(items.map(item => item.id));
}
