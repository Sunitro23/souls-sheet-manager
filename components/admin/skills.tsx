"use client";
import { useRememberedValue } from "./preferences";
import type { AdminCommon } from "./types";
import { useState, type ReactNode } from "react";
import {
  activeFamilies,
  validateTree,
  type Tree,
  type Node,
  type Family,
} from "../../lib/progression";
import { statNames } from "../../lib/rules";
import { progressionBonusKeys } from "../../lib/bonuses";
import SkillTree from "../skill-tree";
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="c-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Num({
  value,
  onChange,
  min = 0,
  max = 100000,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      required
      type="number"
      min={min}
      max={max}
      value={value ?? 0}
      onChange={(e) => {
        if (Number.isInteger(e.target.valueAsNumber))
          onChange(e.target.valueAsNumber);
      }}
    />
  );
}
export default function Skills({
  workspace,
  storageKey = "cendres-admin",
  onSave,
  onDirty,
  busy,
  initialCreate = false,
  initialQuery = "",
}: AdminCommon & {
  onSave: (tree: Tree) => void;
  initialCreate?: boolean;
  initialQuery?: string;
}) {
  const [treeDraft, setTreeDraft] = useState<Tree>(workspace.tree),
    [nodeDraft, setNodeDraft] = useState<Node | null>(() =>
      initialCreate
        ? {
            id: crypto.randomUUID(),
            name: "",
            description: "",
            family: "Lames",
            kind: "rp",
            weapon: "",
            cost: 1,
            level: 1,
            requires: [],
            className: "",
            race: "",
            characterId: "",
            stat: "FOR",
            amount: 1,
            draft: true,
          }
        : null,
    );
  const [branch, setBranch] = useRememberedValue<Family>(
      `${storageKey}:skills:family`,
      "Lames",
    ),
    [query, setQuery] = useRememberedValue<string>(
      `${storageKey}:skills:query`,
      initialQuery,
      !!initialQuery,
    ),
    [status, setStatus] = useRememberedValue<string>(
      `${storageKey}:skills:status`,
      "",
    ),
    [view, setView] = useRememberedValue<string>(
      `${storageKey}:skills:view`,
      "cards",
    ),
    [preview, setPreview] = useState(false),
    [level, setLevel] = useRememberedValue<string>(
      `${storageKey}:skills:level`,
      "",
    ),
    [cost, setCost] = useRememberedValue<string>(
      `${storageKey}:skills:cost`,
      "",
    ),
    [path, setPath] = useRememberedValue<string>(
      `${storageKey}:skills:path`,
      "",
    ),
    [error, setError] = useState("");
  const scopeClass = "",
    scopeRace = "",
    scopeCharacter = "";
  const setDirty = (v: boolean) => onDirty(v);
  function create() {
    setNodeDraft({
      id: crypto.randomUUID(),
      name: "",
      description: "",
      family: branch,
      kind: "rp",
      weapon: "",
      cost: 1,
      level: 1,
      requires: [],
      className: "",
      race: "",
      characterId: "",
      stat: "FOR",
      amount: 1,
      draft: true,
    });
    onDirty(true);
  }
  const [selected, setSelected] = useState<string[]>([]);
  const route = (n: Node) =>
    n.magicPath || n.classPath || n.racialPath || n.weapon || "Commun";
  const nodes = treeDraft.nodes.filter(
    (n) =>
      n.family === branch &&
      n.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
      (!status ||
        (status === "archived"
          ? n.archived
          : status === "draft"
            ? n.draft && !n.archived
            : !n.draft && !n.archived)) &&
      (!level || n.level === Number(level)) &&
      (!cost || n.cost === Number(cost)) &&
      (!path || route(n) === path) &&
      (!preview || (!n.draft && !n.archived)),
  );
  function applyNode() {
    try {
      const next = {
        ...treeDraft,
        nodes: treeDraft.nodes.some((n) => n.id === nodeDraft!.id)
          ? treeDraft.nodes.map((n) =>
              n.id === nodeDraft!.id ? nodeDraft! : n,
            )
          : [...treeDraft.nodes, nodeDraft!],
      };
      validateTree(next);
      setTreeDraft(next);
      setNodeDraft(null);
      setDirty(true);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function update(n: Node) {
    setTreeDraft({
      ...treeDraft,
      nodes: treeDraft.nodes.map((row) => (row.id === n.id ? n : row)),
    });
    onDirty(true);
  }
  return (
    <>
      <div className="adm-toolbar">
        <button className="c-primary" onClick={create}>
          Créer une compétence
        </button>
        <button
          className="c-button"
          onClick={() => setView(view === "cards" ? "table" : "cards")}
        >
          {view === "cards" ? "Vue en tableau" : "Voies et cartes"}
        </button>
        <button
          className="c-button"
          aria-pressed={preview}
          onClick={() => setPreview(!preview)}
        >
          Prévisualiser côté joueur
        </button>
        <button
          className="c-primary"
          disabled={busy || !!nodeDraft}
          onClick={() => onSave(treeDraft)}
        >
          Enregistrer les compétences
        </button>
      </div>
      {!!selected.length && (
        <div className="adm-toolbar">
          <span>{selected.length} compétences sélectionnées</span>
          {["Publier", "Archiver"].map((action) => (
            <button
              className="c-button"
              key={action}
              onClick={() => {
                if (confirm(`${action} ${selected.length} compétences ?`)) {
                  setTreeDraft({
                    ...treeDraft,
                    nodes: treeDraft.nodes.map((n) =>
                      selected.includes(n.id)
                        ? {
                            ...n,
                            draft: action === "Archiver",
                            archived: action === "Archiver",
                          }
                        : n,
                    ),
                  });
                  setSelected([]);
                  onDirty(true);
                }
              }}
            >
              {action} la sélection
            </button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="c-alert">
          {error}
        </p>
      )}
      {nodeDraft ? (
        <form
          className="c-editor-form"
          onSubmit={(e) => {
            e.preventDefault();
            applyNode();
          }}
        >
          <section className="c-form-section">
            <h3>Identité et progression</h3>
            <Field label="Nom">
              <input
                required
                maxLength={100}
                value={nodeDraft.name}
                onChange={(e) =>
                  setNodeDraft({ ...nodeDraft, name: e.target.value })
                }
              />
            </Field>
            <div className="c-grid2">
              <Field label="Nature">
                <select
                  value={nodeDraft.kind}
                  onChange={(e) =>
                    setNodeDraft({
                      ...nodeDraft,
                      kind: e.target.value as Node["kind"],
                      weapon: "",
                      stat:
                        e.target.value === "bonus"
                          ? "FP"
                          : e.target.value === "stat"
                            ? "FOR"
                            : "",
                      amount: 1,
                    })
                  }
                >
                  <option value="technique">Technique d’arme</option>
                  <option value="competence">Compétence d’arme</option>
                  <option value="stat">Bonus de caractéristique</option>
                  <option value="bonus">Bonus de ressource / dégâts</option>
                  <option value="rp">Compétence RP</option>
                </select>
              </Field>
              <Field label="Famille">
                <select
                  value={nodeDraft.family}
                  onChange={(e) =>
                    setNodeDraft({
                      ...nodeDraft,
                      family: e.target.value as Family,
                      classPath:
                        e.target.value === "Classe"
                          ? nodeDraft.classPath
                          : undefined,
                      magicPath:
                        e.target.value === "Magie"
                          ? nodeDraft.magicPath
                          : undefined,
                      racialPath:
                        e.target.value === "Race"
                          ? nodeDraft.racialPath
                          : undefined,
                      weapon: "",
                      requires: [],
                      className: e.target.value === "Classe" ? scopeClass : "",
                      race: e.target.value === "Race" ? scopeRace : "",
                      characterId:
                        e.target.value === "Personnel" ? scopeCharacter : "",
                    })
                  }
                >
                  {activeFamilies.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </Field>
              <Field label="Coût en points">
                <Num
                  max={100}
                  value={nodeDraft.cost}
                  onChange={(n: number) =>
                    setNodeDraft({ ...nodeDraft, cost: n })
                  }
                />
              </Field>
              <Field label="Niveau minimum">
                <Num
                  min={1}
                  max={1000}
                  value={nodeDraft.level}
                  onChange={(n: number) =>
                    setNodeDraft({ ...nodeDraft, level: n })
                  }
                />
              </Field>
              {nodeDraft.family === "Classe" && (
                <Field label="Classe">
                  <input
                    required
                    value={nodeDraft.className}
                    onChange={(e) =>
                      setNodeDraft({
                        ...nodeDraft,
                        className: e.target.value,
                        requires: [],
                      })
                    }
                  />
                </Field>
              )}
              {nodeDraft.family === "Race" && (
                <Field label="Race">
                  <input
                    required
                    value={nodeDraft.race}
                    onChange={(e) =>
                      setNodeDraft({
                        ...nodeDraft,
                        race: e.target.value,
                        requires: [],
                      })
                    }
                  />
                </Field>
              )}
              {nodeDraft.family === "Classe" && (
                <Field label="Voie de classe (facultatif)">
                  <input
                    maxLength={100}
                    value={nodeDraft.classPath ?? ""}
                    onChange={(e) =>
                      setNodeDraft({
                        ...nodeDraft,
                        classPath: e.target.value || undefined,
                      })
                    }
                  />
                </Field>
              )}
              {nodeDraft.family === "Magie" && (
                <Field label="Spécialisation (facultatif)">
                  <input
                    maxLength={100}
                    value={nodeDraft.magicPath ?? ""}
                    onChange={(e) =>
                      setNodeDraft({
                        ...nodeDraft,
                        magicPath: e.target.value || undefined,
                      })
                    }
                  />
                </Field>
              )}
              {nodeDraft.family === "Race" && (
                <Field label="Voie (facultatif)">
                  <input
                    maxLength={100}
                    value={nodeDraft.racialPath ?? ""}
                    onChange={(e) =>
                      setNodeDraft({
                        ...nodeDraft,
                        racialPath: e.target.value || undefined,
                      })
                    }
                  />
                </Field>
              )}
              {nodeDraft.family === "Personnel" && (
                <Field label="Personnage">
                  <select
                    required
                    value={nodeDraft.characterId ?? ""}
                    onChange={(e) =>
                      setNodeDraft({
                        ...nodeDraft,
                        characterId: e.target.value,
                        requires: [],
                      })
                    }
                  >
                    <option value="">Choisir</option>
                    {workspace.characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {["stat", "bonus"].includes(nodeDraft.kind) && (
                <>
                  <Field label="Caractéristique">
                    <select
                      value={nodeDraft.stat}
                      onChange={(e) =>
                        setNodeDraft({ ...nodeDraft, stat: e.target.value })
                      }
                    >
                      {(nodeDraft.kind === "bonus"
                        ? progressionBonusKeys
                        : statNames
                      ).map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Bonus">
                    <Num
                      min={1}
                      max={10}
                      value={nodeDraft.amount}
                      onChange={(n: number) =>
                        setNodeDraft({ ...nodeDraft, amount: n })
                      }
                    />
                  </Field>
                </>
              )}
            </div>
          </section>
          <section className="c-form-section">
            <h3>Effets et publication</h3>
            <Field label="Ordre d’affichage">
              <Num
                max={10000}
                value={nodeDraft.order ?? 0}
                onChange={(n: number) =>
                  setNodeDraft({ ...nodeDraft, order: n })
                }
              />
            </Field>
            <Field label="Description, effets et coûts d’utilisation">
              <textarea
                rows={4}
                maxLength={3000}
                value={nodeDraft.description}
                onChange={(e) =>
                  setNodeDraft({ ...nodeDraft, description: e.target.value })
                }
              />
            </Field>
            <label className="c-publish-node">
              <input
                type="checkbox"
                checked={!nodeDraft.draft}
                onChange={(e) =>
                  setNodeDraft({ ...nodeDraft, draft: !e.target.checked })
                }
              />
              Déblocage disponible
            </label>
          </section>
          <section className="c-form-section">
            <h3>Prérequis ({nodeDraft.requires.length})</h3>
            <div className="c-field">
              <span>Déblocages nécessaires</span>
              <div className="c-prereq-list">
                {treeDraft!.nodes
                  .filter(
                    (n) =>
                      n.id !== nodeDraft.id &&
                      n.family === nodeDraft.family &&
                      n.className === nodeDraft.className &&
                      n.race === nodeDraft.race &&
                      (n.characterId ?? "") === (nodeDraft.characterId ?? ""),
                  )
                  .map((n) => (
                    <label key={n.id}>
                      <input
                        type="checkbox"
                        checked={nodeDraft.requires.includes(n.id)}
                        onChange={(e) =>
                          setNodeDraft({
                            ...nodeDraft,
                            requires: e.target.checked
                              ? [...nodeDraft.requires, n.id]
                              : nodeDraft.requires.filter((id) => id !== n.id),
                          })
                        }
                      />
                      {n.name}{" "}
                      <small>
                        ·{" "}
                        {n.magicPath ||
                          n.classPath ||
                          n.racialPath ||
                          n.weapon ||
                          n.family}
                      </small>
                    </label>
                  ))}
              </div>
            </div>
          </section>
          <p className="c-muted">
            Appliquez les changements, puis enregistrez la campagne pour les
            publier.
          </p>
          <div className="c-form-actions">
            <button className="c-primary">Appliquer</button>
            {treeDraft!.nodes.some((n) => n.id === nodeDraft.id) && (
              <button
                type="button"
                className="c-button"
                onClick={() => {
                  setNodeDraft({
                    ...nodeDraft,
                    archived: !nodeDraft.archived,
                    draft: nodeDraft.archived ? nodeDraft.draft : true,
                  });
                }}
              >
                {nodeDraft.archived ? "Restaurer" : "Archiver"}
              </button>
            )}
            <button
              type="button"
              className="c-button"
              onClick={() => {
                setNodeDraft({
                  ...nodeDraft,
                  id: crypto.randomUUID(),
                  name: nodeDraft.name.slice(0, 90) + " (copie)",
                  draft: true,
                  archived: false,
                });
                onDirty(true);
              }}
            >
              Dupliquer
            </button>
            <button
              type="button"
              className="c-button"
              onClick={() => {
                if (confirm("Abandonner cette édition ?")) setNodeDraft(null);
              }}
            >
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="adm-filters">
            <input
              aria-label="Rechercher une compétence"
              placeholder="Rechercher une compétence"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label="Famille"
              value={branch}
              onChange={(e) => {
                setBranch(e.target.value as Family);
                setPath("");
              }}
            >
              {activeFamilies.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
            <select
              aria-label="Voie"
              value={path}
              onChange={(e) => setPath(e.target.value)}
            >
              <option value="">Toutes les voies</option>
              {[
                ...new Set(
                  treeDraft.nodes.filter((n) => n.family === branch).map(route),
                ),
              ].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <select
              aria-label="Publication"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Tous les états</option>
              <option value="published">Publiées</option>
              <option value="draft">Brouillons</option>
              <option value="archived">Archives</option>
            </select>
            <input
              type="number"
              min={1}
              aria-label="Niveau"
              placeholder="Niveau"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            />
            <input
              type="number"
              min={0}
              aria-label="Coût"
              placeholder="Coût"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
          {preview && (
            <p className="c-notice">
              Aperçu des cartes publiées — les brouillons et archives sont
              masqués.
            </p>
          )}
          {view === "cards" ? (
            <SkillTree
              nodes={nodes}
              label={branch}
              known={new Set()}
              available={1000}
              character={{ level: 1000 }}
              onSelect={(n) => {
                setNodeDraft(structuredClone(n));
                onDirty(true);
              }}
            />
          ) : (
            <div className="adm-table">
              <table>
                <thead>
                  <tr>
                    <th>Sélection</th>
                    <th>Nom</th>
                    <th>Voie / portée</th>
                    <th>Niveau</th>
                    <th>Coût</th>
                    <th>Publication</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.map((n) => (
                    <tr key={n.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Sélectionner ${n.name}`}
                          checked={selected.includes(n.id)}
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? [...selected, n.id]
                                : selected.filter((id) => id !== n.id),
                            )
                          }
                        />
                      </td>
                      <td>{n.name}</td>
                      <td>
                        {route(n)} · {n.className || n.race || n.characterId}
                      </td>
                      <td>
                        <Num
                          min={1}
                          max={1000}
                          value={n.level}
                          onChange={(v: number) => update({ ...n, level: v })}
                        />
                      </td>
                      <td>
                        <Num
                          max={100}
                          value={n.cost}
                          onChange={(v: number) => update({ ...n, cost: v })}
                        />
                      </td>
                      <td>
                        {n.archived
                          ? "Archivée"
                          : n.draft
                            ? "Brouillon"
                            : "Publiée"}
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            setNodeDraft({ ...n });
                            onDirty(true);
                          }}
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => {
                            setNodeDraft({
                              ...n,
                              id: crypto.randomUUID(),
                              name: n.name.slice(0, 90) + " (copie)",
                              draft: true,
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
              {!nodes.length && <p>Aucune compétence correspondante.</p>}
            </div>
          )}
        </>
      )}
    </>
  );
}
