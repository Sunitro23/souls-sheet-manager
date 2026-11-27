"use client";
import {
  cloneElement,
  useEffect,
  useId,
  useState,
  type ReactElement,
} from "react";
import { useRememberedValue } from "./preferences";
import type { AdminCommon } from "./types";
import {
  activeFamilies,
  knownNodeIds,
  validateTree,
  type Tree,
  type Node,
  type Family,
} from "../../lib/progression";
import { statNames } from "../../lib/rules";
import { progressionBonusKeys } from "../../lib/bonuses";
import {
  copySkill,
  createSkill,
  prerequisiteOptions,
  saveSkill,
  skillTemplates,
  type SkillTemplate,
} from "../../lib/skill-editor";
import SkillTree from "../skill-tree";
import DetailSidePanel from "../detail-side-panel";
import { skillPath } from "./navigation";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactElement<{ id?: string }>;
}) {
  const id = useId();
  return (
    <div className="c-field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}
function Num({
  value,
  onChange,
  min = 0,
  max = 100000,
  label,
  disabled = false,
  id,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <input
      id={id}
      required
      type="number"
      min={min}
      max={max}
      value={value ?? 0}
      aria-label={label}
      disabled={disabled}
      onChange={(event) => {
        const value = event.target.valueAsNumber;
        if (Number.isInteger(value) && value >= min && value <= max)
          onChange(value);
      }}
    />
  );
}
export type SaveSkills = (tree: Tree) => Promise<boolean> | void;
export default function Skills({
  workspace,
  active = true,
  storageKey = "cendres-admin",
  onSave,
  onDirty,
  busy,
  initialCreate = false,
  initialQuery = "",
  target,
  onNavigate,
  embedded = false,
}: AdminCommon & {
  onSave: SaveSkills;
  initialCreate?: boolean;
  initialQuery?: string;
  embedded?: boolean;
}) {
  const direct = !!(
    target?.selected ||
    target?.family ||
    target?.path ||
    target?.status ||
    target?.race ||
    target?.className ||
    target?.owner
  );
  const [selection, setSelection] = useRememberedValue(
    `${storageKey}:skills:selection`,
    target?.selected ?? "",
    direct || initialCreate,
  );
  const initialNode = workspace.tree.nodes.find(
    (node) => node.id === selection,
  );
  const initialFamily =
    initialNode?.family ??
    (activeFamilies.includes(target?.family as Family)
      ? (target!.family as Family)
      : "Lames");
  const [branch, setBranch] = useRememberedValue<string>(
    `${storageKey}:skills:family`,
    target?.status === "archived" && !target.family ? "" : initialFamily,
    direct,
  );
  const [scopeRace, setScopeRace] = useRememberedValue(
    `${storageKey}:skills:race`,
    target?.race ?? initialNode?.race ?? "",
    direct,
  );
  const [scopeClass, setScopeClass] = useRememberedValue(
    `${storageKey}:skills:class`,
    target?.className ?? initialNode?.className ?? "",
    direct,
  );
  const [scopeCharacter, setScopeCharacter] = useRememberedValue(
    `${storageKey}:skills:character`,
    target?.owner ?? initialNode?.characterId ?? "",
    direct,
  );
  const [path, setPath] = useRememberedValue(
    `${storageKey}:skills:path`,
    target?.path ?? "",
    direct,
  );
  const scope = {
    family: (branch || "Lames") as Family,
    race: scopeRace,
    className: scopeClass,
    characterId: scopeCharacter,
    path,
  };
  const [pendingTree, setTreeDraft] = useState<Tree | null>(null);
  const treeDraft = pendingTree ?? workspace.tree;
  const [nodeDraft, setNodeDraft] = useState<Node | null>(() =>
    initialCreate
      ? createSkill(scope)
      : initialNode
        ? structuredClone(initialNode)
        : null,
  );
  const [query, setQuery] = useRememberedValue(
    `${storageKey}:skills:query`,
    initialQuery,
    direct || !!initialQuery,
  );
  const [status, setStatus] = useRememberedValue(
    `${storageKey}:skills:status`,
    initialNode?.archived ? "archived" : (target?.status ?? "active"),
    direct,
  );
  const [view, setView] = useRememberedValue<string>(
    `${storageKey}:skills:view`,
    "table",
    embedded,
  );
  const [level, setLevel] = useRememberedValue<string>(
    `${storageKey}:skills:level`,
    "",
    direct,
  );
  const [cost, setCost] = useRememberedValue<string>(
    `${storageKey}:skills:cost`,
    "",
    direct,
  );
  const [preview, setPreview] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>([]),
    [bulkCost, setBulkCost] = useState(1),
    [prerequisiteQuery, setPrerequisiteQuery] = useState("");
  const [quickEdit, setQuickEdit] = useState(false);
  const locked = busy || saving;
  const original = nodeDraft
    ? treeDraft.nodes.find((node) => node.id === nodeDraft.id)
    : undefined;
  const nodeChanged =
    !!nodeDraft && JSON.stringify(nodeDraft) !== JSON.stringify(original);
  const treeChanged =
    JSON.stringify(treeDraft) !== JSON.stringify(workspace.tree);
  useEffect(() => {
    onDirty(nodeChanged || treeChanged);
  }, [nodeChanged, treeChanged, onDirty]);
  useEffect(() => {
    setSelection(nodeDraft?.id ?? "");
  }, [nodeDraft, setSelection]);
  const nodes = treeDraft.nodes
    .filter(
      (node) =>
        (!branch || node.family === branch) &&
        (!scopeRace || node.race === scopeRace) &&
        (!scopeClass || node.className === scopeClass) &&
        (!scopeCharacter || node.characterId === scopeCharacter) &&
        node.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
        (!status ||
          (status === "archived"
            ? node.archived
            : status === "draft"
              ? node.draft && !node.archived
              : status === "published"
                ? !node.draft && !node.archived
                : !node.archived)) &&
        (!level || node.level === Number(level)) &&
        (!cost || node.cost === Number(cost)) &&
        (!path || skillPath(node) === path) &&
        (!preview || (!node.draft && !node.archived)),
    )
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const choices = (kind: "race" | "class") =>
    workspace.settings.categories.filter((category) => category.kind === kind);
  const scopeCategory = workspace.settings.categories.find(
      (category) =>
        category.kind === (scopeRace ? "race" : "class") &&
        category.baseKey === (scopeRace || scopeClass),
    );
  const scopeLabel =
    scopeCategory?.name ||
    workspace.characters.find((character) => character.id === scopeCharacter)
      ?.name ||
    scopeRace ||
    scopeClass;
  const ownerArchived =
    !!nodeDraft &&
    workspace.settings.categories.some(
      (category) =>
        category.archived &&
        ((category.kind === "race" &&
          nodeDraft.family === "Race" &&
          category.baseKey === nodeDraft.race) ||
          (category.kind === "class" &&
            nodeDraft.family === "Classe" &&
            category.baseKey === nodeDraft.className)),
    );
  const acquired = nodeDraft
    ? workspace.characters.filter((character) =>
        character.unlocks?.some((node) => node.id === nodeDraft.id),
      )
    : [];
  const innate = nodeDraft
    ? workspace.characters.filter(
        (character) =>
          !acquired.includes(character) &&
          knownNodeIds(character, workspace.tree).has(nodeDraft.id),
      )
    : [];
  function openNode(node: Node | null) {
    if (
      locked ||
      (nodeChanged &&
        !confirm("Abandonner les modifications de cette compétence ?"))
    )
      return;
    setNodeDraft(node ? structuredClone(node) : null);
    setPrerequisiteQuery("");
    setError("");
    setNotice("");
  }
  function updateNode(patch: Partial<Node>) {
    setNodeDraft((current) => (current ? { ...current, ...patch } : current));
  }
  function create(template: SkillTemplate = "unlock") {
    openNode(createSkill(scope, template));
  }
  function template(template: SkillTemplate) {
    if (!nodeDraft) return;
    const next = createSkill(
      {
        family: nodeDraft.family ?? scope.family,
        race: nodeDraft.race,
        className: nodeDraft.className,
        characterId: nodeDraft.characterId,
        path:
          nodeDraft.racialPath || nodeDraft.classPath || nodeDraft.magicPath,
      },
      template,
    );
    setNodeDraft({
      ...next,
      id: nodeDraft.id,
      name: nodeDraft.name,
      description: nodeDraft.description,
      requires: nodeDraft.requires,
    });
  }
  async function persist(next: Tree, edited?: Node) {
    if (locked) return false;
    try {
      validateTree(next);
      setError("");
      setNotice("");
      setSaving(true);
      const saved = await onSave(next);
      if (saved === false) {
        setError(
          "L’enregistrement a échoué. Vos modifications sont conservées.",
        );
        return false;
      }
      setTreeDraft(null);
      if (edited) setNodeDraft(structuredClone(edited));
      setSelected([]);
      setNotice("Modifications enregistrées.");
      return true;
    } catch (error) {
      setError((error as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  }
  function saveCurrent() {
    if (!nodeDraft) return;
    try {
      void persist(saveSkill(treeDraft, nodeDraft), nodeDraft);
    } catch (error) {
      setError((error as Error).message);
    }
  }
  function quickUpdate(node: Node, patch: Partial<Node>) {
    setTreeDraft({
      ...treeDraft,
      nodes: treeDraft.nodes.map((row) =>
        row.id === node.id ? { ...row, ...patch } : row,
      ),
    });
  }
  function bulk(action: "publish" | "archive" | "cost") {
    const ids = selected.filter((id) => nodes.some((node) => node.id === id));
    if (!ids.length) return;
    if (
      action === "archive" &&
      !confirm(
        `Archiver ${ids.length} compétences ? Les acquis des personnages sont conservés.`,
      )
    )
      return;
    void persist({
      ...treeDraft,
      nodes: treeDraft.nodes.map((node) =>
        ids.includes(node.id)
          ? {
              ...node,
              ...(action === "cost"
                ? { cost: bulkCost }
                : action === "publish"
                  ? { draft: false, archived: false }
                  : { archived: true }),
            }
          : node,
      ),
    });
  }
  function reorder(index: number, delta: number) {
    const ordered = [...nodes];
    [ordered[index], ordered[index + delta]] = [
      ordered[index + delta],
      ordered[index],
    ];
    const order = new Map(ordered.map((node, index) => [node.id, index]));
    void persist({
      ...treeDraft,
      nodes: treeDraft.nodes.map((node) =>
        order.has(node.id) ? { ...node, order: order.get(node.id) } : node,
      ),
    });
  }
  const prerequisites = nodeDraft
    ? prerequisiteOptions(treeDraft, nodeDraft)
    : [];
  return (
    <section
      className="adm-skills"
      aria-label={
        scopeLabel ? `Compétences de ${scopeLabel}` : "Édition des compétences"
      }
    >
      {embedded && (
        <header className="adm-skills-heading">
          <h2>Compétences de {scopeLabel}</h2>
          <p className="c-muted">
            Traits, bonus et capacités se modifient ici.
          </p>
        </header>
      )}
      <div className="adm-toolbar">
        <button
          type="button"
          className="c-primary"
          disabled={locked || scopeCategory?.archived}
          onClick={() => create()}
        >
          Créer une compétence
        </button>
        <details className="adm-skill-options"><summary>Affichage et retouches</summary><div className="adm-toolbar">
        <button
          type="button"
          className="c-button"
          onClick={() => setView(view === "cards" ? "table" : "cards")}
        >
          {view === "cards" ? "Vue en liste" : "Voir la progression"}
        </button>
        <button
          type="button"
          className="c-button"
          aria-pressed={quickEdit}
          disabled={locked || !!nodeDraft}
          onClick={() => setQuickEdit(!quickEdit)}
        >
          Retouches rapides
        </button>
        <button
          type="button"
          className="c-button"
          aria-pressed={preview}
          onClick={() => setPreview(!preview)}
        >
          Aperçu publié
        </button>
        </div></details>
        {treeChanged && !nodeDraft && (
          <button
            type="button"
            className="c-primary"
            disabled={locked}
            onClick={() => void persist(treeDraft)}
          >
            Enregistrer les retouches
          </button>
        )}
      </div>
      {scopeCategory?.archived && <p className="c-muted">Cette {scopeCategory.kind === "race" ? "race" : "classe"} est archivée. Restaurez-la pour ajouter ou publier des compétences.</p>}
      {notice && (
        <p role="status" className="c-notice">
          {notice}
        </p>
      )}
      {error && !nodeDraft && (
        <p role="alert" className="c-alert">
          {error}
        </p>
      )}
      {!!selected.filter((id) => nodes.some((node) => node.id === id))
        .length && (
        <div className="adm-toolbar adm-skill-bulk">
          <span>
            {
              selected.filter((id) => nodes.some((node) => node.id === id))
                .length
            }{" "}
            sélectionnées
          </span>
          <button
            type="button"
            disabled={locked || !!nodeDraft || scopeCategory?.archived}
            onClick={() => bulk("publish")}
          >
            Publier la sélection
          </button>
          <button
            type="button"
            disabled={locked || !!nodeDraft}
            onClick={() => bulk("archive")}
          >
            Archiver la sélection
          </button>
          <Num
            label="Coût de la sélection"
            value={bulkCost}
            max={100}
            disabled={locked || !!nodeDraft}
            onChange={setBulkCost}
          />
          <button
            type="button"
            disabled={locked || !!nodeDraft}
            onClick={() => bulk("cost")}
          >
            Appliquer ce coût
          </button>
        </div>
      )}
      <div className="adm-skill-layout" data-editing={!!nodeDraft}>
        <div className="adm-skill-list">
          <div className="adm-filters">
            <input
              aria-label="Rechercher une compétence"
              placeholder="Rechercher une compétence"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {!embedded && (
              <select
                aria-label="Famille"
                value={branch}
                onChange={(event) => {
                  setBranch(event.target.value);
                  setScopeRace("");
                  setScopeClass("");
                  setScopeCharacter("");
                  setPath("");
                }}
              >
                <option value="">Toutes les familles</option>
                {activeFamilies.map((family) => (
                  <option key={family}>{family}</option>
                ))}
              </select>
            )}
            <select
              aria-label="Publication"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="active">Actives</option>
              <option value="published">Publiées</option>
              <option value="draft">Brouillons</option>
              <option value="archived">Archives</option>
              <option value="">Tous les états</option>
            </select>
          </div>
          {!embedded && branch === "Race" && (
            <Field label="Race">
              <select
                value={scopeRace}
                onChange={(event) => setScopeRace(event.target.value)}
              >
                <option value="">Toutes les races</option>
                {choices("race").map((race) => (
                  <option key={race.id} value={race.baseKey}>
                    {race.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {!embedded && branch === "Classe" && (
            <Field label="Classe">
              <select
                value={scopeClass}
                onChange={(event) => setScopeClass(event.target.value)}
              >
                <option value="">Toutes les classes</option>
                {choices("class").map((category) => (
                  <option key={category.id} value={category.baseKey}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <details className="adm-skill-options">
            <summary>Filtres avancés</summary>
            <div className="adm-filters">
              <select
                aria-label="Voie"
                value={path}
                onChange={(event) => setPath(event.target.value)}
              >
                <option value="">Toutes les voies</option>
                {[
                  ...new Set(
                    treeDraft.nodes
                      .filter((node) => !branch || node.family === branch)
                      .map(skillPath),
                  ),
                ].map((path) => (
                  <option key={path}>{path}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                aria-label="Niveau exact"
                placeholder="Niveau exact"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
              />
              <input
                type="number"
                min={0}
                aria-label="Coût exact"
                placeholder="Coût exact"
                value={cost}
                onChange={(event) => setCost(event.target.value)}
              />
            </div>
          </details>
          {scopeLabel && !embedded && (
            <p className="c-muted">
              Compétences de {scopeLabel}{" "}
              <button
                type="button"
                onClick={() => {
                  setScopeRace("");
                  setScopeClass("");
                  setScopeCharacter("");
                }}
              >
                Effacer ce filtre
              </button>
            </p>
          )}
          {preview && (
            <p className="c-muted">
              Seules les compétences publiées sont affichées.
            </p>
          )}
          {view === "cards" && !quickEdit ? (
            <SkillTree
              nodes={nodes}
              label={branch}
              known={new Set()}
              available={1000}
              character={{ level: 1000 }}
              selectedId={nodeDraft?.id}
              detailsId="admin-skill-editor"
              onSelect={openNode}
            />
          ) : (
            <>
              {!!nodes.length && (
                <label className="adm-skill-select-all">
                  <input
                    type="checkbox"
                    aria-label="Sélectionner toutes les compétences affichées"
                    checked={nodes.every((node) => selected.includes(node.id))}
                    disabled={locked || !!nodeDraft}
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? nodes.map((node) => node.id)
                          : [],
                      )
                    }
                  />{" "}
                  Tout sélectionner
                </label>
              )}
              <ul className="adm-skill-rows">
                {nodes.map((node, index) => (
                  <li key={node.id} data-selected={nodeDraft?.id === node.id}>
                    <input
                      type="checkbox"
                      aria-label={`Sélectionner ${node.name}`}
                      checked={selected.includes(node.id)}
                      disabled={locked || !!nodeDraft}
                      onChange={(event) =>
                        setSelected(
                          event.target.checked
                            ? [...selected, node.id]
                            : selected.filter((id) => id !== node.id),
                        )
                      }
                    />
                    <div className="adm-skill-row-content">
                      {quickEdit && !nodeDraft ? (
                        <input
                          aria-label={`Nom de ${node.name}`}
                          required
                          maxLength={100}
                          value={node.name}
                          disabled={locked}
                          onChange={(event) =>
                            quickUpdate(node, { name: event.target.value })
                          }
                        />
                      ) : (
                        <button
                          type="button"
                          className="adm-skill-open"
                          aria-pressed={nodeDraft?.id === node.id}
                          aria-controls={
                            nodeDraft?.id === node.id
                              ? "admin-skill-editor"
                              : undefined
                          }
                          disabled={locked}
                          onClick={() => openNode(node)}
                        >
                          <strong>{node.name}</strong>
                          <span>
                            {node.archived
                              ? "Archivée"
                              : node.draft
                                ? "Brouillon"
                                : "Publiée"}{" "}
                            ·{" "}
                            {node.cost === 0
                              ? "Gratuit"
                              : `${node.cost} pt${node.cost === 1 ? "" : "s"}`}{" "}
                            · Niveau {node.level}
                          </span>
                        </button>
                      )}
                      {node.requires.length > 0 && (
                        <p className="adm-skill-chain">
                          Après{" "}
                          {node.requires
                            .map(
                              (id) =>
                                treeDraft.nodes.find((node) => node.id === id)
                                  ?.name ?? "Compétence retirée",
                            )
                            .join(" + ")}
                        </p>
                      )}
                      {quickEdit && !nodeDraft && (
                        <div className="adm-skill-quick">
                          <Field label="Coût">
                            <Num
                              label={`Coût de ${node.name}`}
                              value={node.cost}
                              max={100}
                              disabled={locked}
                              onChange={(cost) => quickUpdate(node, { cost })}
                            />
                          </Field>
                          <Field label="Niveau">
                            <Num
                              label={`Niveau de ${node.name}`}
                              value={node.level}
                              min={1}
                              max={1000}
                              disabled={locked}
                              onChange={(level) => quickUpdate(node, { level })}
                            />
                          </Field>
                        </div>
                      )}
                    </div>
                    {!nodeDraft && (
                      <div className="adm-skill-order">
                        <button
                          type="button"
                          aria-label={`Monter ${node.name}`}
                          disabled={locked || index === 0}
                          onClick={() => reorder(index, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Descendre ${node.name}`}
                          disabled={locked || index === nodes.length - 1}
                          onClick={() => reorder(index, 1)}
                        >
                          ↓
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {!nodes.length && (
                <p className="c-muted">
                  Aucune compétence. Créez un trait, un bonus ou une capacité.
                </p>
              )}
            </>
          )}
        </div>
        {nodeDraft && (
          <DetailSidePanel
            id="admin-skill-editor"
            title={nodeDraft.name || "Nouvelle compétence"}
            open={active}
            busy={locked}
            error={error}
            focusKey={nodeDraft.id}
            onClose={() => openNode(null)}
          >
            <form
              className="c-editor-form adm-skill-form"
              onSubmit={(event) => {
                event.preventDefault();
                saveCurrent();
              }}
            >
              <fieldset disabled={locked}>
                {!original && (
                  <div
                    className="adm-skill-templates"
                    aria-label="Modèle de compétence"
                  >
                    {skillTemplates.map((model) => (
                      <button
                        type="button"
                        key={model.id}
                        aria-pressed={
                          model.id ===
                          (nodeDraft.kind === "stat"
                            ? "stat"
                            : nodeDraft.cost === 0
                              ? "innate"
                              : "unlock")
                        }
                        onClick={() => template(model.id)}
                      >
                        <strong>{model.name}</strong>
                        <small>{model.description}</small>
                      </button>
                    ))}
                  </div>
                )}
                {(nodeDraft.race || nodeDraft.className) && (
                  <p className="c-muted">
                    {workspace.settings.categories.find(
                      (category) =>
                        category.kind ===
                          (nodeDraft.family === "Race" ? "race" : "class") &&
                        category.baseKey ===
                          (nodeDraft.race || nodeDraft.className),
                    )?.name ||
                      nodeDraft.race ||
                      nodeDraft.className}
                  </p>
                )}
                <Field label="Nom">
                  <input
                    required
                    maxLength={100}
                    value={nodeDraft.name}
                    onChange={(event) =>
                      updateNode({ name: event.target.value })
                    }
                  />
                </Field>
                <Field label="Description et effets">
                  <textarea
                    rows={5}
                    maxLength={3000}
                    value={nodeDraft.description}
                    onChange={(event) =>
                      updateNode({ description: event.target.value })
                    }
                  />
                </Field>
                {["stat", "bonus"].includes(nodeDraft.kind) && (
                  <div className="c-grid2">
                    <Field label="Caractéristique">
                      <select
                        value={nodeDraft.stat}
                        onChange={(event) =>
                          updateNode({ stat: event.target.value })
                        }
                      >
                        {(nodeDraft.kind === "bonus"
                          ? progressionBonusKeys
                          : statNames
                        ).map((stat) => (
                          <option key={stat}>{stat}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Bonus">
                      <Num
                        value={nodeDraft.amount}
                        min={1}
                        max={nodeDraft.kind === "stat" ? 10 : 100}
                        onChange={(amount) => updateNode({ amount })}
                      />
                    </Field>
                  </div>
                )}
                <div className="c-grid2">
                  <Field label="Coût en points">
                    <Num
                      value={nodeDraft.cost}
                      max={100}
                      onChange={(cost) => updateNode({ cost })}
                    />
                  </Field>
                  <Field label="Niveau minimum">
                    <Num
                      value={nodeDraft.level}
                      min={1}
                      max={1000}
                      onChange={(level) => updateNode({ level })}
                    />
                  </Field>
                </div>
                {!embedded && (
                  <>
                    <Field label="Famille">
                      <select
                        required
                        value={nodeDraft.family}
                        onChange={(event) => {
                          const family = event.target.value as Family;
                          updateNode({
                            family,
                            race: family === "Race" ? scopeRace : "",
                            className: family === "Classe" ? scopeClass : "",
                            characterId:
                              family === "Personnel" ? scopeCharacter : "",
                            racialPath: undefined,
                            classPath: undefined,
                            magicPath: undefined,
                            weapon: "",
                            requires: [],
                          });
                        }}
                      >
                        {activeFamilies.map((family) => (
                          <option key={family}>{family}</option>
                        ))}
                      </select>
                    </Field>
                    {nodeDraft.family === "Race" && (
                      <Field label="Race">
                        <select
                          required
                          value={nodeDraft.race}
                          onChange={(event) =>
                            updateNode({
                              race: event.target.value,
                              requires: [],
                            })
                          }
                        >
                          <option value="">Choisir une race</option>
                          {!choices("race").some(
                            (race) => race.baseKey === nodeDraft.race,
                          ) &&
                            nodeDraft.race && <option>{nodeDraft.race}</option>}
                          {choices("race").map((race) => (
                            <option key={race.id} value={race.baseKey}>
                              {race.name}
                              {race.archived ? " · Archivée" : ""}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}
                    {nodeDraft.family === "Classe" && (
                      <Field label="Classe">
                        <select
                          required
                          value={nodeDraft.className}
                          onChange={(event) =>
                            updateNode({
                              className: event.target.value,
                              requires: [],
                            })
                          }
                        >
                          <option value="">Choisir une classe</option>
                          {!choices("class").some(
                            (category) =>
                              category.baseKey === nodeDraft.className,
                          ) &&
                            nodeDraft.className && (
                              <option>{nodeDraft.className}</option>
                            )}
                          {choices("class").map((category) => (
                            <option key={category.id} value={category.baseKey}>
                              {category.name}
                              {category.archived ? " · Archivée" : ""}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}
                  </>
                )}
                {nodeDraft.family === "Personnel" && (
                  <Field label="Personnage">
                    <select
                      required
                      value={nodeDraft.characterId ?? ""}
                      onChange={(event) =>
                        updateNode({
                          characterId: event.target.value,
                          requires: [],
                        })
                      }
                    >
                      <option value="">Choisir un personnage</option>
                      {workspace.characters.map((character) => (
                        <option key={character.id} value={character.id}>
                          {character.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <Field label="Publication">
                  <select
                    value={
                      nodeDraft.archived
                        ? "archived"
                        : nodeDraft.draft
                          ? "draft"
                          : "published"
                    }
                    disabled={ownerArchived}
                    onChange={(event) =>
                      updateNode({
                        archived: event.target.value === "archived",
                        draft: event.target.value === "draft",
                        archivedByRace: undefined,
                      })
                    }
                  >
                    <option value="draft">Brouillon</option>
                    <option value="published">Publiée</option>
                    <option value="archived">Archivée</option>
                  </select>
                </Field>
                {ownerArchived && (
                  <p className="c-muted">
                    Restaurez d’abord la race ou la classe pour publier cette
                    compétence.
                  </p>
                )}
                <details
                  className="adm-skill-options"
                  open={nodeDraft.requires.length > 0}
                >
                  <summary>Prérequis ({nodeDraft.requires.length})</summary>
                  <input
                    aria-label="Rechercher un prérequis"
                    placeholder="Rechercher une compétence préalable"
                    value={prerequisiteQuery}
                    onChange={(event) =>
                      setPrerequisiteQuery(event.target.value)
                    }
                  />
                  <div className="c-prereq-list">
                    {prerequisites
                      .filter((node) =>
                        node.name
                          .toLocaleLowerCase()
                          .includes(prerequisiteQuery.toLocaleLowerCase()),
                      )
                      .map((node) => (
                        <label key={node.id}>
                          <input
                            type="checkbox"
                            checked={nodeDraft.requires.includes(node.id)}
                            disabled={
                              !nodeDraft.requires.includes(node.id) &&
                              !nodeDraft.draft &&
                              (node.draft || !!node.archived)
                            }
                            onChange={(event) =>
                              updateNode({
                                requires: event.target.checked
                                  ? [...nodeDraft.requires, node.id]
                                  : nodeDraft.requires.filter(
                                      (id) => id !== node.id,
                                    ),
                              })
                            }
                          />
                          {node.name}
                          {node.archived
                            ? " · Archivée"
                            : node.draft
                              ? " · Brouillon"
                              : ""}
                        </label>
                      ))}
                  </div>
                  {!prerequisites.length && (
                    <p className="c-muted">Aucun prérequis compatible.</p>
                  )}
                </details>
                <details className="adm-skill-options">
                  <summary>Réglages avancés</summary>
                  <Field label="Nature">
                    <select
                      value={nodeDraft.kind}
                      onChange={(event) => {
                        const kind = event.target.value as Node["kind"];
                        updateNode({
                          kind,
                          stat:
                            kind === "stat"
                              ? "FOR"
                              : kind === "bonus"
                                ? "FP"
                                : "",
                          amount: ["stat", "bonus"].includes(kind) ? 1 : 0,
                        });
                      }}
                    >
                      <option value="rp">Trait ou capacité narrative</option>
                      <option value="stat">Bonus de caractéristique</option>
                      <option value="bonus">Bonus de ressource / dégâts</option>
                      <option value="technique">Technique d’arme</option>
                      <option value="competence">Compétence d’arme</option>
                    </select>
                  </Field>
                  {["Race", "Classe", "Magie"].includes(
                    nodeDraft.family ?? "",
                  ) && (
                    <Field label="Voie (facultatif)">
                      <input
                        maxLength={100}
                        value={
                          nodeDraft.family === "Race"
                            ? (nodeDraft.racialPath ?? "")
                            : nodeDraft.family === "Classe"
                              ? (nodeDraft.classPath ?? "")
                              : (nodeDraft.magicPath ?? "")
                        }
                        onChange={(event) =>
                          updateNode({
                            [nodeDraft.family === "Race"
                              ? "racialPath"
                              : nodeDraft.family === "Classe"
                                ? "classPath"
                                : "magicPath"]: event.target.value || undefined,
                          })
                        }
                      />
                    </Field>
                  )}
                  <Field label="Ordre d’affichage">
                    <Num
                      value={nodeDraft.order ?? 0}
                      max={10000}
                      onChange={(order) => updateNode({ order })}
                    />
                  </Field>
                </details>
                {original && (
                  <div className="adm-skill-impact">
                    <strong>Effet sur les personnages</strong>
                    <p>
                      Acquise par {acquired.length} personnage
                      {acquired.length === 1 ? "" : "s"}. Les bonus acquis et
                      les points dépensés restent inchangés ; les nouvelles
                      valeurs s’appliquent aux prochains déblocages. Le texte
                      affiché est actualisé pour tous.
                    </p>
                    {innate.length > 0 && (
                      <p>
                        {innate.length} personnage
                        {innate.length === 1
                          ? " bénéficie"
                          : "s bénéficient"}{" "}
                        de ce trait automatiquement : ses conditions et son
                        texte seront actualisés.
                      </p>
                    )}
                  </div>
                )}
                <div className="c-form-actions adm-skill-save">
                  <button
                    className="c-primary"
                    disabled={locked || (!original && ownerArchived) || (!nodeChanged && !treeChanged)}
                  >
                    {locked ? "Enregistrement…" : "Enregistrer"}
                  </button>
                  <button
                    type="button"
                    className="c-button"
                    onClick={() => openNode(null)}
                  >
                    Fermer
                  </button>
                </div>
                {original && (
                  <div className="adm-toolbar">
                    <button
                      type="button"
                      className="c-button"
                      disabled={ownerArchived}
                      onClick={() => openNode(copySkill(nodeDraft))}
                    >
                      Dupliquer
                    </button>
                    <button
                      type="button"
                      className="c-button"
                      disabled={!!nodeDraft.archived || ownerArchived}
                      onClick={() => openNode(copySkill(nodeDraft, true))}
                    >
                      Ajouter une évolution
                    </button>
                    {!embedded &&
                      onNavigate &&
                      ["Race", "Classe"].includes(nodeDraft.family ?? "") && (
                        <button
                          type="button"
                          className="c-button"
                          onClick={() =>
                            onNavigate({
                              page: "creation",
                              kind:
                                nodeDraft.family === "Race" ? "race" : "class",
                              selected: workspace.settings.categories.find(
                                (category) =>
                                  category.kind ===
                                    (nodeDraft.family === "Race"
                                      ? "race"
                                      : "class") &&
                                  category.baseKey ===
                                    (nodeDraft.race || nodeDraft.className),
                              )?.id,
                            })
                          }
                        >
                          Ouvrir la fiche{" "}
                          {nodeDraft.family === "Race"
                            ? "de race"
                            : "de classe"}
                        </button>
                      )}
                  </div>
                )}
              </fieldset>
            </form>
          </DetailSidePanel>
        )}
      </div>
    </section>
  );
}
