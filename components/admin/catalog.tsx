"use client";
import { useRememberedValue } from "./preferences";
import type { AdminCommon } from "./types";
import { useState } from "react";
import {
  makeCategory,
  magicStyles,
  type Category,
  type CampaignSettings,
} from "../../lib/campaign-settings";
import { families } from "../../lib/progression";
import { spellSchools } from "../../lib/bonuses";
import { weaponTypes } from "../../lib/rules";
const labels: Record<string, string> = {
  weapon: "Armes",
  magic: "Écoles de magie",
  item: "Objets",
  skill: "Familles de compétences",
  race: "Races",
  class: "Classes",
};
export default function Catalog({
  workspace,
  storageKey = "cendres-admin",
  kinds,
  onSave,
  onDirty,
  busy,
  initialCreate = false,
  initialQuery = "",
}: AdminCommon & {
  kinds: import("../../lib/campaign-settings").Category["kind"][];
  onSave: (
    settings: import("../../lib/campaign-settings").CampaignSettings,
  ) => void;
  initialCreate?: boolean;
  initialQuery?: string;
}) {
  const [settings, setSettings] = useState<CampaignSettings>(
      workspace.settings,
    ),
    [selected, setSelected] = useState<Category | null>(() =>
      initialCreate ? makeCategory(kinds[0], "Nouvelle catégorie") : null,
    ),
    [query, setQuery] = useRememberedValue(
      `${storageKey}:catalog:query`,
      initialQuery,
      !!initialQuery,
    ),
    [archives, setArchives] = useState(false);
  const categories = settings.categories
    .filter(
      (c) =>
        kinds.includes(c.kind) &&
        c.archived === archives &&
        c.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    )
    .sort((a, b) => a.order - b.order);
  function update(p: Partial<Category>) {
    setSelected({ ...selected!, ...p });
    onDirty(true);
  }
  function apply() {
    const next = settings.categories.some((c) => c.id === selected!.id)
      ? settings.categories.map((c) => (c.id === selected!.id ? selected! : c))
      : [...settings.categories, selected!];
    setSettings({ ...settings, categories: next });
    setSelected(null);
    onDirty(true);
  }
  function count(c: Category) {
    return (
      workspace.characters.reduce(
        (sum: number, p) =>
          sum +
          (["race", "class"].includes(c.kind)
            ? Number(p[c.kind === "race" ? "race" : "className"] === c.baseKey)
            : [...(p.inventory ?? []), ...(p.spells ?? [])].filter(
                (i) =>
                  i.categoryId === c.id ||
                  (!i.categoryId &&
                    (c.kind === "magic" ? i.school : i.category) === c.baseKey),
              ).length),
        0,
      ) +
      workspace.tree.nodes.filter(
        (n) =>
          (
            ({
              race: n.race,
              class: n.className,
              skill: n.family,
              weapon: n.weapon,
              magic: n.magicPath,
            }) as Record<string, string | undefined>
          )[c.kind] === c.baseKey,
      ).length
    );
  }
  const keys =
    selected?.kind === "weapon"
      ? weaponTypes.map((w) => w.name)
      : selected?.kind === "magic"
        ? [...spellSchools]
        : selected?.kind === "skill"
          ? [...families]
          : [];
  return (
    <>
      <div className="adm-toolbar">
        <button
          className="c-primary"
          onClick={() => {
            setSelected(makeCategory(kinds[0], ""));
            onDirty(true);
          }}
        >
          Ajouter une catégorie
        </button>
        <button
          className="c-primary"
          disabled={busy || !!selected}
          onClick={() => onSave(settings)}
        >
          Enregistrer ce catalogue
        </button>
        <button
          className="c-button"
          aria-pressed={archives}
          onClick={() => setArchives(!archives)}
        >
          {archives ? "Voir les catégories actives" : "Archives"}
        </button>
      </div>
      <p className="c-muted">
        Le nom visible est personnalisable. La référence mécanique reste stable
        ; archiver conserve les objets et les acquis existants.
      </p>
      {selected ? (
        <form
          className="c-editor-form"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <h2>{selected.name || "Nouvelle catégorie"}</h2>
          <div className="c-grid2">
            <label className="c-field">
              Nom
              <input
                required
                maxLength={100}
                value={selected.name}
                onChange={(e) =>
                  update({
                    name: e.target.value,
                    ...(!settings.categories.some(
                      (c) => c.id === selected.id,
                    ) && ["race", "class", "item"].includes(selected.kind)
                      ? { baseKey: e.target.value }
                      : {}),
                  })
                }
              />
            </label>
            <label className="c-field">
              Type
              <select
                disabled={settings.categories.some((c) => c.id === selected.id)}
                value={selected.kind}
                onChange={(e) =>
                  update({
                    kind: e.target.value as Category["kind"],
                    baseKey:
                      e.target.value === "weapon"
                        ? weaponTypes[0].name
                        : e.target.value === "magic"
                          ? spellSchools[0]
                          : e.target.value === "skill"
                            ? families[0]
                            : selected.name,
                  })
                }
              >
                {kinds.map((kind: string) => (
                  <option key={kind} value={kind}>
                    {labels[kind]}
                  </option>
                ))}
              </select>
            </label>
            <label className="c-field">
              Icône
              <select
                value={selected.icon}
                onChange={(e) => update({ icon: e.target.value })}
              >
                {["✦", "⚔", "☀", "☾", "♜", "❖", "✧", "❀"].map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </label>
            <label className="c-field">
              Couleur
              <input
                type="color"
                value={selected.color}
                onChange={(e) => update({ color: e.target.value })}
              />
            </label>
            <label className="c-field">
              Ordre
              <input
                type="number"
                min={0}
                max={10000}
                required
                value={selected.order}
                onChange={(e) => update({ order: e.target.valueAsNumber })}
              />
            </label>
            <label className="c-field">
              Catégorie parente
              <select
                value={selected.parentId}
                onChange={(e) => update({ parentId: e.target.value })}
              >
                <option value="">Aucune</option>
                {settings.categories
                  .filter(
                    (c) => c.id !== selected.id && c.kind === selected.kind,
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
            {keys.length > 0 && (
              <label className="c-field">
                Référence mécanique
                <select
                  required
                  disabled={settings.categories.some(
                    (c) => c.id === selected.id,
                  )}
                  value={selected.baseKey}
                  onChange={(e) => update({ baseKey: e.target.value })}
                >
                  <option value="">Choisir</option>
                  {keys.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
            )}
            {selected.kind === "weapon" && (
              <label className="c-field">
                Famille de compétences
                <select
                  value={selected.family}
                  onChange={(e) => update({ family: e.target.value })}
                >
                  <option value="">Correspondance par défaut</option>
                  {families.slice(0, 4).map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </label>
            )}
            {selected.kind === "magic" && (
              <label className="c-field">
                Style de l’école
                <select
                  value={selected.style}
                  onChange={(e) => update({ style: e.target.value })}
                >
                  <option value="">Style global</option>
                  {magicStyles.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <label className="c-field">
            Description
            <textarea
              maxLength={3000}
              value={selected.description}
              onChange={(e) => update({ description: e.target.value })}
            />
          </label>
          {["race", "class"].includes(selected.kind) && (
            <>
              <label className="c-field">
                Traits
                <textarea
                  maxLength={3000}
                  value={selected.traits}
                  onChange={(e) => update({ traits: e.target.value })}
                />
              </label>
              <label className="c-field">
                Faiblesses
                <textarea
                  maxLength={3000}
                  value={selected.weaknesses}
                  onChange={(e) => update({ weaknesses: e.target.value })}
                />
              </label>
            </>
          )}
          <label>
            <input
              type="checkbox"
              checked={selected.available}
              onChange={(e) => update({ available: e.target.checked })}
            />{" "}
            Disponible à la création
          </label>
          <label>
            <input
              type="checkbox"
              checked={selected.archived}
              onChange={(e) =>
                update({
                  archived: e.target.checked,
                  available: e.target.checked ? false : selected.available,
                })
              }
            />{" "}
            Archivée
          </label>
          <article className="c-card c-pad adm-category-preview">
            <span style={{ color: selected.color }}>{selected.icon}</span>
            <h3>{selected.name}</h3>
            <p>{selected.description}</p>
            <small>
              Aperçu de la catégorie ·{" "}
              {selected.available && !selected.archived
                ? "Disponible"
                : "Indisponible à la création"}
            </small>
          </article>
          <div className="adm-toolbar">
            <button className="c-primary">Appliquer</button>
            <button
              type="button"
              className="c-button"
              onClick={() => {
                if (confirm("Abandonner cette édition ?")) setSelected(null);
              }}
            >
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <>
          <input
            aria-label="Rechercher une catégorie"
            placeholder="Rechercher une catégorie"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="adm-table">
            <table>
              <thead>
                <tr>
                  <th>Catégorie</th>
                  <th>Type</th>
                  <th>Ordre</th>
                  <th>Associations</th>
                  <th>Disponibilité</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span style={{ color: c.color }}>{c.icon}</span> {c.name}
                    </td>
                    <td>{labels[c.kind]}</td>
                    <td>{c.order}</td>
                    <td>{count(c)}</td>
                    <td>{c.available ? "Disponible" : "Masquée"}</td>
                    <td>
                      <button onClick={() => setSelected({ ...c })}>
                        Configurer
                      </button>
                      <button
                        onClick={() => {
                          setSelected({
                            ...c,
                            id: crypto.randomUUID(),
                            name: c.name + " (copie)",
                            archived: false,
                          });
                          onDirty(true);
                        }}
                      >
                        Dupliquer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!categories.length && <p>Aucune catégorie.</p>}
          </div>
        </>
      )}
    </>
  );
}
