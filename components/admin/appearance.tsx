"use client";
import type { AdminCommon } from "./types";
import { useState, type CSSProperties } from "react";
import {
  palettes,
  magicStyles,
  weaponStyles,
  themeVariables,
  type Appearance,
} from "../../lib/campaign-settings";
export default function AppearanceEditor({
  workspace,
  onSave,
  onDirty,
  busy,
}: AdminCommon & {
  onSave: (
    settings: import("../../lib/campaign-settings").CampaignSettings,
  ) => void;
}) {
  const [appearance, setAppearance] = useState<Appearance>(
    workspace.settings.appearance,
  );
  function update(p: Partial<Appearance>) {
    setAppearance({ ...appearance, ...p });
    onDirty(true);
  }
  return (
    <>
      <div className="adm-toolbar">
        <button
          className="c-primary"
          disabled={busy}
          onClick={() => onSave({ ...workspace.settings, appearance })}
        >
          Enregistrer l’apparence
        </button>
        <button
          className="c-button"
          onClick={() =>
            update({
              ...palettes[0],
              magicStyle: "Runique",
              weaponStyle: "Classique",
            })
          }
        >
          Restaurer le thème par défaut
        </button>
      </div>
      <h2>Choisir une palette</h2>
      <div className="adm-palettes">
        {palettes.map((p) => (
          <button
            key={p.name}
            className="c-card c-pad"
            aria-pressed={appearance.name === p.name}
            onClick={() => update(p)}
          >
            <span style={{ background: p.surface, borderColor: p.accent }} />
            <strong>{p.name}</strong>
          </button>
        ))}
      </div>
      <div className="c-grid2">
        {(
          [
            ["accent", "Accent"],
            ["surface", "Surfaces"],
            ["background", "Fond"],
            ["line", "Séparateurs"],
          ] as const
        ).map(([key, label]) => (
          <label className="c-field" key={key}>
            {label}
            <input
              type="color"
              value={appearance[key]}
              onChange={(e) =>
                update({ [key]: e.target.value, name: "Personnalisée" })
              }
            />
            <small>Défaut : {palettes[0][key]}</small>
          </label>
        ))}
        <label className="c-field">
          Style de magie
          <select
            value={appearance.magicStyle}
            onChange={(e) => update({ magicStyle: e.target.value })}
          >
            {magicStyles.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <small>Défaut : Runique</small>
        </label>
        <label className="c-field">
          Style des armes
          <select
            value={appearance.weaponStyle}
            onChange={(e) => update({ weaponStyle: e.target.value })}
          >
            {weaponStyles.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <small>Défaut : Classique</small>
        </label>
      </div>
      <section
        className="adm-theme-preview"
        style={themeVariables(appearance) as CSSProperties}
        data-magic-style={appearance.magicStyle}
        data-weapon-style={appearance.weaponStyle}
      >
        <p className="c-eyebrow">Aperçu de la campagne</p>
        <h2>{workspace.campaign.name}</h2>
        <p>
          Les couleurs et les ornements sont partagés avec les joueurs après
          enregistrement.
        </p>
        <div className="c-grid2">
          <article className="c-magic-branch c-pad">
            <h3>✧ Souffle spectral</h3>
            <p>Une magie ancienne habite ces terres.</p>
          </article>
          <article className="c-equipment-card c-pad">
            <h3>⚔ Lame des cendres</h3>
            <p>Une arme forgée au cœur des braises.</p>
          </article>
        </div>
        <button className="c-primary">Exemple de bouton</button>
        <p className="c-muted">
          Le contraste est vérifié à l’enregistrement. Ces styles ne changent ni
          les dégâts ni les coûts.
        </p>
      </section>
    </>
  );
}
