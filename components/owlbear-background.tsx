"use client";
import { useEffect } from "react";
import { connectOwlbear } from "../lib/obr/connection";
export default function OwlbearBackground() {
  useEffect(() => {
    let live = true;
    const ids: string[] = [];
    const menuId = "de.sunitro.cendres/assign";
    const connection = connectOwlbear();
    void connection.then(async OBR => {
      if (!OBR || !live) return;
      const open = async (section: string) => {
        sessionStorage.setItem("souls-owlbear-section", section);
        await OBR.action.open();
        await OBR.broadcast.sendMessage("de.sunitro.cendres/section", section, { destination: "LOCAL" });
      };
      for (const [section, icon] of [["Fiche Perso", "character"], ["Inventaire", "backpack"], ["Grimoire", "magic"], ["Techniques", "sword"], ["Amélioration", "skills"], ["Notes", "notes"]]) {
        if (!live) return;
        const id = `de.sunitro.cendres/${icon}`;
        await OBR.tool.create({ id, icons: [{ icon: new URL(`/owlbear/${icon}.svg`, location.origin).href, label: section }],
          onClick: async () => { try { await open(section); } catch { await OBR.notification.show("Ouverture de Souls impossible.", "ERROR"); } return false; },
        });
        if (!live) { await OBR.tool.remove(id); return; }
        ids.push(id);
      }
      await OBR.contextMenu.create({ id: menuId, icons: [{ icon: new URL('/owlbear/character.svg', location.origin).href, label: "Ouvrir / associer un personnage Souls", filter: { min: 1, max: 1, every: [{ key: "type", value: "IMAGE" }, { key: "layer", value: "CHARACTER" }] } }],
        onClick: async context => {
          try { await OBR.player.select(context.items.map(item => item.id), true); await open("Fiche Perso"); }
          catch { await OBR.notification.show("Ouverture de Souls impossible.", "ERROR"); }
        },
      });
      if (!live) await OBR.contextMenu.remove(menuId);
    }).catch(async () => { const { default: OBR } = await import('@owlbear-rodeo/sdk'); if (OBR.isReady) await OBR.notification.show("Outils Souls indisponibles. Rechargez l’extension.", "ERROR"); });
    return () => { live = false; void connection.then(OBR => OBR && Promise.all([...ids.map(id => OBR.tool.remove(id)), OBR.contextMenu.remove(menuId)])).catch(() => {}); };
  }, []);
  return null;
}
