"use client";
import { useEffect } from "react";
import { connectOwlbear } from "../lib/obr/connection";
export default function OwlbearBackground() {
  useEffect(() => {
    let live = true;
    const ids: string[] = [];
    let stopExpiry: (() => void) | undefined;
    let stopCombat: (() => Promise<void>) | undefined;
    let stopMovement: (() => Promise<void>) | undefined;
    let stopSpells: (() => Promise<void>) | undefined;
    const menuId = "de.sunitro.cendres/assign";
    const connection = connectOwlbear();
    void connection.then(async OBR => {
      if (!OBR || !live) return;
      const {registerZoneExpiry}=await import('../lib/obr/owlbear/zone-expiry');
      stopExpiry=registerZoneExpiry();
      const { registerSpellPlacement } = await import('../lib/obr/owlbear/spell-placement');
      stopSpells = await registerSpellPlacement();
      const {registerCombatReactions}=await import("../lib/obr/owlbear/reactions");
      stopCombat=await registerCombatReactions();
      const { registerMovement } = await import('../lib/obr/owlbear/movement');
      stopMovement = await registerMovement();
      if (!live) { await stopMovement(); await stopSpells(); await stopCombat(); stopExpiry(); return; }
      const open = async (section: string) => {
        sessionStorage.setItem("souls-owlbear-section", section);
        await OBR.action.open();
        await OBR.broadcast.sendMessage("de.sunitro.cendres/section", section, { destination: "LOCAL" });
      };
      let acting = false;
      for (const [label, kind, icon] of [['Se déplacer', 'movement', 'move'], ['Préparer une esquive', 'dodge', 'dodge']] as const) {
        if (!live) return;
        const id = `de.sunitro.cendres/${kind}-action`;
        await OBR.tool.create({ id, icons: [{ icon: new URL(`/owlbear/${icon}.svg`, location.origin).href, label }],
          onClick: async () => {
            if (acting) return false;
            acting = true;
            try {
              const [{currentCombat,combatCall,performCombatAction},{activeParticipant},{MOVEMENT_CHANNEL}] = await Promise.all([
                import('../lib/obr/owlbear/actions'), import('../lib/obr/core/actions'), import('../lib/obr/core/movement'),
              ]);
              const combat = await currentCombat();
              if (!combat) throw Error('Aucun combat actif.');
              const state = await combatCall(combat, 'get');
              const actor = state && activeParticipant(state.combat);
              if (!actor?.characterId || !actor.tokenId || state?.pending || state?.resolution) throw Error('Aucune action disponible pour le moment.');
              const [role,playerId] = await Promise.all([OBR.player.getRole(),OBR.player.getId()]);
              if (role !== 'GM' && actor.playerId !== playerId) throw Error('Ce n’est pas votre tour.');
              if (kind === 'movement') {
                await OBR.broadcast.sendMessage(MOVEMENT_CHANNEL, {characterId:actor.characterId,tokenId:actor.tokenId}, {destination:'LOCAL'});
              } else {
                if (await performCombatAction(actor.characterId, actor.tokenId, {kind:'dodge'})) await OBR.notification.show('Esquive préparée · 1 END.');
              }
            } catch (error) { await OBR.notification.show((error as Error).message, 'ERROR'); }
            finally { acting = false; }
            return false;
          },
        });
        if (!live) { await OBR.tool.remove(id); return; }
        ids.push(id);
      }
      await OBR.contextMenu.create({ id: menuId, icons: [{ icon: new URL('/owlbear/character.svg', location.origin).href, label: "Ouvrir le personnage Souls", filter: { min: 1, max: 1, every: [{ key: "type", value: "IMAGE" }, { key: "layer", value: "CHARACTER" }] } }],
        onClick: async context => {
          try { await OBR.player.select(context.items.map(item => item.id), true); await open("Personnage"); }
          catch { await OBR.notification.show("Ouverture de Souls impossible.", "ERROR"); }
        },
      });
      if (!live) await OBR.contextMenu.remove(menuId);
    }).catch(async () => { const { default: OBR } = await import('@owlbear-rodeo/sdk'); if (OBR.isReady) await OBR.notification.show("Outils Souls indisponibles. Rechargez l’extension.", "ERROR"); });
    return () => { live = false; void stopMovement?.().catch(() => {}); stopExpiry?.(); void stopCombat?.().catch(() => {}); void stopSpells?.().catch(() => {}); void connection.then(OBR => OBR && Promise.all([...ids.map(id => OBR.tool.remove(id)), OBR.contextMenu.remove(menuId)])).catch(() => {}); };
  }, []);
  return null;
}
