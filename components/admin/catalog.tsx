"use client";
import { useRememberedValue } from "./preferences";
import type { AdminCommon } from "./types";
import { useEffect, useState } from "react";
import {
  makeCategory,
  magicStyles,
  type Category,
  type CampaignSettings,
} from "../../lib/campaign-settings";
import { families } from "../../lib/progression";
import { spellSchools } from "../../lib/bonuses";
import { weaponTypes } from "../../lib/rules";
import { weaponIconSource } from "../../lib/weapon-icons";
import { spellIconSource } from "../../lib/spell-icons";
import WeaponIconPicker from "../weapon-icon-picker";
import Skills, { type SaveSkills } from "./skills";
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
  active = true,
  storageKey = "cendres-admin",
  kinds,
  onSave,
  onSaveTree,
  onDirty,
  busy,
  initialCreate = false,
  initialQuery = "",
  target,
  onNavigate,
}: AdminCommon & {
  kinds: import("../../lib/campaign-settings").Category["kind"][];
  onSave: (
    settings: import("../../lib/campaign-settings").CampaignSettings,
  ) => Promise<boolean> | void;
  onSaveTree?: SaveSkills;
  initialCreate?: boolean;
  initialQuery?: string;
}) {
  const direct = !!(target?.selected || target?.kind || target?.status);
  const [selection, setSelection] = useRememberedValue(
    `${storageKey}:catalog:selection`,
    target?.selected ?? "",
    direct || initialCreate,
  );
  const initialCategory = workspace.settings.categories.find(
    (c) => c.id === selection && kinds.includes(c.kind),
  );
  const [kind, setKind] = useRememberedValue(
    `${storageKey}:catalog:${kinds.length === 2 ? "creation" : "categories"}:kind`,
    target?.status === "archived" && !target.kind
      ? ""
      : target?.kind && kinds.includes(target.kind as Category["kind"])
        ? target.kind
        : (initialCategory?.kind ?? kinds[0]),
    direct || !!initialCategory,
  );
  const activeKind =
    kind === "" || kinds.includes(kind as Category["kind"]) ? kind : kinds[0];
  const [settings, setSettings] = useState<CampaignSettings>(
      workspace.settings,
    ),
    [selected, setSelected] = useState<Category | null>(() =>
      initialCreate
        ? makeCategory(
            (activeKind || kinds[0]) as Category["kind"],
            "Nouvelle catégorie",
          )
        : structuredClone(initialCategory ?? null),
    ),
    [query, setQuery] = useRememberedValue(
      `${storageKey}:catalog:query`,
      initialQuery,
      direct || !!initialQuery,
    ),
    [archiveState, setArchiveState] = useRememberedValue(
      `${storageKey}:catalog:archives`,
      target?.status === "archived" || initialCategory?.archived ? "yes" : "no",
      direct,
    ),
    [importingIcon, setImportingIcon] = useState(false);
  const [skillDirty, setSkillDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const archives = archiveState === "yes";
  const original = settings.categories.find((c) => c.id === selected?.id);
  const changed =
    JSON.stringify(settings) !== JSON.stringify(workspace.settings) ||
    (!!selected && JSON.stringify(selected) !== JSON.stringify(original));
  useEffect(() => {
    onDirty(changed || skillDirty);
  }, [changed, skillDirty, onDirty]);
  useEffect(() => {
    setSelection(selected && original ? selected.id : "");
  }, [selected, original, setSelection]);
  const categories = settings.categories
    .filter(
      (c) =>
        kinds.includes(c.kind) &&
        (!activeKind || c.kind === activeKind) &&
        c.archived === archives &&
        c.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    )
    .sort((a, b) => a.order - b.order);
  function update(p: Partial<Category>) {
    setSelected((current) =>
      current?.id === selected?.id && current ? { ...current, ...p } : current,
    );
  }
  async function apply() {
    if (busy || saving || importingIcon || skillDirty) return;
    const next = settings.categories.some((c) => c.id === selected!.id)
      ? settings.categories.map((c) => (c.id === selected!.id ? selected! : c))
      : [...settings.categories, selected!];
    const updated = { ...settings, categories: next };
    setSaving(true);
    setSaveError("");
    try {
      if ((await onSave(updated)) !== false) setSettings(updated);
    } catch (error) {
      setSaveError((error as Error).message);
    } finally {
      setSaving(false);
    }
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
      {!selected && (
        <>
          <div className="adm-toolbar" aria-label="Types de catégories">
            {archives && (
              <button
                className="c-button"
                aria-pressed={!activeKind}
                disabled={!!selected}
                onClick={() => setKind("")}
              >
                Tous les types
              </button>
            )}
            {kinds.map((value) => (
              <button
                key={value}
                className="c-button"
                aria-pressed={activeKind === value}
                disabled={!!selected}
                onClick={() => setKind(value)}
              >
                {labels[value]}
              </button>
            ))}
          </div>
          <div className="adm-toolbar">
            <button
              className="c-primary"
              disabled={busy || importingIcon || !!selected}
              onClick={() => {
                setSelected(
                  makeCategory(
                    (activeKind || kinds[0]) as Category["kind"],
                    "",
                  ),
                );
              }}
            >
              Ajouter une catégorie
            </button>
            <button
              className="c-button"
              aria-pressed={archives}
              onClick={() => setArchiveState(archives ? "no" : "yes")}
            >
              {archives ? "Voir les catégories actives" : "Archives"}
            </button>
          </div>
          <p className="c-muted">
            Le nom visible est personnalisable. La référence mécanique reste
            stable ; archiver conserve les objets et les acquis existants.
          </p>
        </>
      )}
      {selected ? (
        <div className="adm-category-workspace">
          <header className="adm-skills-heading">
            <button
              type="button"
              className="c-button"
              disabled={busy || saving}
              onClick={() => {
                if (
                  (!changed && !skillDirty) ||
                  confirm("Quitter cette fiche sans enregistrer ?")
                ) {
                  setSelected(null);
                  setSkillDirty(false);
                }
              }}
            >
              ← Retour au catalogue
            </button>
            <h2>{selected.name || "Nouvelle catégorie"}</h2>
            {selected.description && (
              <p className="c-muted">{selected.description}</p>
            )}
          </header>
          {saveError && (
            <p role="alert" className="c-alert">
              {saveError}
            </p>
          )}
          <details
            className="adm-category-identity"
            open={
              !original ||
              !onSaveTree ||
              !["race", "class"].includes(selected.kind)
            }
          >
            <summary>Identité et disponibilité</summary>
            <form
              className="c-editor-form"
              onSubmit={(e) => {
                e.preventDefault();
                apply();
              }}
            >
              <fieldset disabled={busy || saving || skillDirty}>
                {(!onSaveTree || !["race", "class"].includes(selected.kind)) &&
                  ["race", "class", "magic", "skill", "weapon"].includes(
                    selected.kind,
                  ) && (
                    <button
                      type="button"
                      className="c-button"
                      onClick={() =>
                        onNavigate?.({
                          page: "skills",
                          family:
                            selected.kind === "race"
                              ? "Race"
                              : selected.kind === "class"
                                ? "Classe"
                                : selected.kind === "magic"
                                  ? "Magie"
                                  : selected.kind === "skill"
                                    ? selected.baseKey
                                    : (workspace.tree.weaponFamilies?.[
                                        selected.baseKey
                                      ] ??
                                      workspace.tree.nodes.find(
                                        (node) =>
                                          node.weapon === selected.baseKey,
                                      )?.family ??
                                      "Lames"),
                          ...(selected.kind === "race"
                            ? { race: selected.baseKey }
                            : selected.kind === "class"
                              ? { className: selected.baseKey }
                              : selected.kind === "magic" ||
                                  selected.kind === "weapon"
                                ? { path: selected.baseKey }
                                : {}),
                        })
                      }
                    >
                      Voir les compétences de cette{" "}
                      {selected.kind === "race"
                        ? "race"
                        : selected.kind === "class"
                          ? "classe"
                          : "catégorie"}
                    </button>
                  )}
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
                      disabled={
                        importingIcon ||
                        settings.categories.some((c) => c.id === selected.id)
                      }
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
                  {selected.kind === "weapon" || selected.kind === "magic" ? (
                    <WeaponIconPicker
                      key={`${selected.id}:${selected.kind}`}
                      kind={selected.kind}
                      value={
                        (selected.kind === "magic"
                          ? selected.spellIcon
                          : selected.weaponIcon) ?? ""
                      }
                      category={selected.baseKey}
                      disabled={busy}
                      onBusyChange={setImportingIcon}
                      onChange={(icon) =>
                        update(
                          selected.kind === "magic"
                            ? { spellIcon: icon }
                            : { weaponIcon: icon },
                        )
                      }
                    />
                  ) : (
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
                  )}
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
                      onChange={(e) =>
                        update({ order: e.target.valueAsNumber })
                      }
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
                          (c) =>
                            c.id !== selected.id && c.kind === selected.kind,
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
                {["race", "class"].includes(selected.kind) &&
                  !(selected.kind === "race" && original && onSaveTree) && (
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
                          onChange={(e) =>
                            update({ weaknesses: e.target.value })
                          }
                        />
                      </label>
                    </>
                  )}
                {selected.kind === "race" && original && onSaveTree && (
                  <p className="c-muted">
                    Les traits et faiblesses se modifient dans les compétences
                    de cette race, ci-dessous.
                  </p>
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
                        available: e.target.checked
                          ? false
                          : selected.available,
                      })
                    }
                  />{" "}
                  Archivée
                </label>
                <article className="c-card c-pad adm-category-preview">
                  {selected.kind === "weapon" || selected.kind === "magic" ? (
                    <img
                      src={
                        selected.kind === "magic"
                          ? spellIconSource(
                              selected.baseKey,
                              selected.spellIcon,
                            )
                          : weaponIconSource(
                              selected.baseKey,
                              selected.weaponIcon,
                            )
                      }
                      alt={
                        selected.kind === "magic"
                          ? "Aperçu de l’icône de magie"
                          : "Aperçu de l’icône d’arme"
                      }
                      width={64}
                      height={64}
                    />
                  ) : (
                    <span style={{ color: selected.color }}>
                      {selected.icon}
                    </span>
                  )}
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
                  <button
                    className="c-primary"
                    disabled={busy || importingIcon}
                  >
                    {saving || busy
                      ? "Enregistrement…"
                      : "Enregistrer l’identité"}
                  </button>
                  <button
                    type="button"
                    className="c-button"
                    disabled={busy || importingIcon}
                    onClick={() => {
                      if (confirm("Abandonner cette édition ?"))
                        setSelected(null);
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </fieldset>
            </form>
          </details>
          {skillDirty && (
            <p className="c-muted">
              Enregistrez ou fermez l’édition de la compétence pour modifier
              l’identité.
            </p>
          )}
          {onSaveTree &&
            ["race", "class"].includes(selected.kind) &&
            (original ? (
              <>
                {changed && (
                  <p className="c-notice">
                    Enregistrez l’identité pour poursuivre l’édition des
                    compétences.
                  </p>
                )}
                <Skills
                  key={`${selected.id}:${original.archived}`}
                  workspace={workspace}
                  active={active}
                  storageKey={`${storageKey}:category:${selected.id}`}
                  embedded
                  busy={busy || saving || changed}
                  onDirty={setSkillDirty}
                  onSave={onSaveTree}
                  target={{
                    page: "skills",
                    family: selected.kind === "race" ? "Race" : "Classe",
                    status: selected.archived ? "archived" : "active",
                    ...(selected.kind === "race"
                      ? { race: selected.baseKey }
                      : { className: selected.baseKey }),
                  }}
                />
              </>
            ) : (
              <p className="c-muted">
                Enregistrez cette {selected.kind === "race" ? "race" : "classe"}{" "}
                pour ajouter ses compétences ici.
              </p>
            ))}
        </div>
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
                      {c.kind === "weapon" || c.kind === "magic" ? (
                        <img
                          src={
                            c.kind === "magic"
                              ? spellIconSource(c.baseKey, c.spellIcon)
                              : weaponIconSource(c.baseKey, c.weaponIcon)
                          }
                          alt=""
                          width={38}
                          height={38}
                          className="adm-portrait"
                        />
                      ) : (
                        <span style={{ color: c.color }}>{c.icon}</span>
                      )}{" "}
                      {c.name}
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
