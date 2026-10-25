"use client";
import type { Workspace, AdminCharacter } from "./types";
import { useEffect, useState } from "react";
import { workspaceCall as api } from "../../lib/workspace-client";
import { reviewRows } from "../../lib/reviews";
import { defaultSettings } from "../../lib/campaign-settings";
import Skills from "./skills";
import Library from "./library";
import PlayerPreview from "./player-preview";
import Catalog from "./catalog";
import AppearanceEditor from "./appearance";
import Reviews from "./reviews";
const groups = [
  {
    name: "Général",
    pages: [
      ["overview", "Vue d’ensemble"],
      ["players", "Joueurs"],
      ["characters", "Personnages"],
      ["validations", "Validations"],
    ],
  },
  {
    name: "Contenu",
    pages: [
      ["weapons", "Armes et objets"],
      ["magic", "Magie et sorts"],
      ["skills", "Compétences"],
      ["creation", "Races et classes"],
    ],
  },
  {
    name: "Configuration",
    pages: [
      ["rules", "Règles"],
      ["appearance", "Apparence"],
      ["categories", "Catégories"],
      ["data", "Données"],
    ],
  },
];
const pages = groups.flatMap((g) => g.pages);
const blocks = [
  "Indicateurs",
  "Actions à effectuer",
  "Accès rapides",
  "Modifications récentes",
];
type Preferences = {
  page: string;
  favorites: string[];
  blocks: string[];
  hidden: string[];
  density: string;
  columns: string[];
};
export default function Administration({
  workspace,
  user,
  onReload,
  onOpenCharacter,
  onDirty,
  onBusy,
  initialPage,
}: {
  workspace: Workspace;
  user: { id: string; username: string };
  onReload: () => Promise<unknown>;
  onOpenCharacter: (character: AdminCharacter) => void;
  onDirty: (dirty: boolean) => void;
  onBusy?: (busy: boolean) => void;
  initialPage?: string;
}) {
  const [playerPreview, setPlayerPreview] = useState(false);
  const key = `cendres-admin:${user.id}:${workspace.campaign.id}`;
  const [prefs, setPrefs] = useState<Preferences>({
      page: initialPage || "overview",
      favorites: [],
      blocks,
      hidden: [],
      density: "comfortable",
      columns: ["Classe", "Race", "Niveau", "Joueur"],
    }),
    [loaded, setLoaded] = useState(false),
    [menu, setMenu] = useState(false),
    [search, setSearch] = useState(""),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [create, setCreate] = useState(false),
    [epoch, setEpoch] = useState(0);
  const [query, setQuery] = useState(""),
    [sort, setSort] = useState("asc"),
    [player, setPlayer] = useState(""),
    [race, setRace] = useState(""),
    [className, setClassName] = useState(""),
    [archives, setArchives] = useState<
      { id: string; name: string; revision: number }[] | null
    >(null),
    [settingsTab, setSettingsTab] = useState("Général"),
    [contentTab, setContentTab] = useState("catalog");
  const [name, setName] = useState(workspace.campaign.name),
    [img, setImg] = useState(workspace.campaign.img),
    [description, setDescription] = useState(workspace.settings.description),
    [points, setPoints] = useState(workspace.tree.pointsPerLevel);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(key) || "null");
        if (saved)
          setPrefs({
            page:
              initialPage ||
              (pages.some(([id]) => id === saved.page)
                ? saved.page
                : "overview"),
            favorites: Array.isArray(saved.favorites)
              ? saved.favorites.filter((id: string) =>
                  pages.some(([p]) => p === id),
                )
              : [],
            blocks:
              Array.isArray(saved.blocks) &&
              new Set(saved.blocks).size === 4 &&
              blocks.every((b) => saved.blocks.includes(b))
                ? saved.blocks
                : blocks,
            hidden: Array.isArray(saved.hidden)
              ? saved.hidden.filter((b: string) => blocks.includes(b))
              : [],
            density: saved.density === "compact" ? "compact" : "comfortable",
            columns: Array.isArray(saved.columns)
              ? saved.columns
              : ["Classe", "Race", "Niveau", "Joueur"],
          });
      } catch {}
      setLoaded(true);
    });
  }, [key, initialPage]);
  useEffect(() => {
    if (loaded)
      try {
        localStorage.setItem(key, JSON.stringify(prefs));
      } catch {}
  }, [key, prefs, loaded]);
  function mark(value: boolean) {
    setDirty(value);
    onDirty(value);
  }
  function go(page: string, creating = false) {
    if (dirty && !confirm("Quitter cette rubrique sans enregistrer ?")) return;
    mark(creating);
    setPrefs({ ...prefs, page });
    setMenu(false);
    setCreate(creating);
    setEpoch(epoch + 1);
    setQuery("");
    setArchives(null);
    setError("");
    setSearch("");
    setName(workspace.campaign.name);
    setImg(workspace.campaign.img);
    setDescription(workspace.settings.description);
    setPoints(workspace.tree.pointsPerLevel);
  }
  async function perform(data: Record<string, unknown>, after?: () => void) {
    if (busy) return;
    setBusy(true);
    onBusy?.(true);
    setError("");
    setNotice("");
    try {
      await api({ campaignId: workspace.campaign.id, ...data });
      await onReload();
      mark(false);
      setEpoch((v) => v + 1);
      setCreate(false);
      setNotice("Modifications enregistrées.");
      after?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  }
  const saveTree = (tree: Workspace["tree"]) =>
    perform({
      op: "saveCampaign",
      revision: workspace.campaign.revision,
      name: workspace.campaign.name,
      img: workspace.campaign.img,
      tree,
    });
  const saveSettings = (settings: Workspace["settings"]) => {
    if (
      prefs.page !== "appearance" &&
      !confirm(
        "Enregistrer cette configuration ? Les nouveaux choix de création seront appliqués aux joueurs. Les références existantes sont conservées.",
      )
    )
      return;
    perform({
      op: "saveSettings",
      revision: workspace.campaign.revision,
      settings,
    });
  };
  const page = prefs.page,
    title = pages.find(([id]) => id === page)?.[1],
    group = groups.find((g) => g.pages.some(([id]) => id === page))?.name;
  const pending = reviewRows(workspace.characters).filter(
    (r) => r.status === "pending",
  );
  const events = [
    ...(workspace.history ?? []),
    ...workspace.characters.flatMap((c) =>
      (c.reviewHistory ?? []).map((h) => ({
        ...h,
        action: `${h.name} : ${{ approved: "approuvé", rejected: "refusé", correction: "correction demandée" }[h.decision as string]}`,
      })),
    ),
  ].sort((a, b) => b.at - a.at);
  const results = search.trim()
    ? [
        ...workspace.tree.nodes.map((n) => ({
          id: n.id,
          label: n.name,
          section: "skills",
        })),
        ...workspace.settings.categories.map((c) => ({
          id: c.id,
          label: c.name,
          section: "categories",
        })),
        ...workspace.characters.map((c) => ({
          id: c.id,
          label: c.name,
          section: "characters",
        })),
        ...workspace.characters.flatMap((c) =>
          [
            ...(c.inventory ?? []),
            ...(c.spells ?? []),
            ...(c.personalSkills ?? []),
          ].map((i) => ({
            id: `${c.id}:${i.id}`,
            label: `${i.name} · ${c.name}`,
            section: "type" in i ? (i.type === "spell" ? "magic" : "weapons") : "validations",
          })),
        ),
      ]
        .filter((r) =>
          r.label.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
        )
        .slice(0, 40)
    : [];
  const owner = (id: string) =>
    workspace.members.find((m) => m.id === id)?.username ??
    (id === user.id ? user.username : "Ancien membre");
  const common = { workspace, busy, onDirty: mark, storageKey: key };
  function moveBlock(index: number, delta: number) {
    const order = [...prefs.blocks];
    [order[index], order[index + delta]] = [order[index + delta], order[index]];
    setPrefs({ ...prefs, blocks: order });
  }
  if (!loaded) return <p>Chargement de l’administration…</p>;
  if (playerPreview)
    return (
      <>
        <button className="c-button" onClick={() => setPlayerPreview(false)}>
          Retour à l’administration
        </button>
        <PlayerPreview workspace={workspace} />
      </>
    );
  return (
    <div
      className={`adm-shell ${prefs.density === "compact" ? "adm-compact" : ""}`}
    >
      <button
        className="c-button adm-menu-toggle"
        aria-expanded={menu}
        aria-controls="admin-navigation"
        onClick={() => setMenu(!menu)}
      >
        ☰ Administration
      </button>
      <aside
        id="admin-navigation"
        className={`adm-sidebar ${menu ? "is-open" : ""}`}
      >
        <p className="c-eyebrow">Administration de campagne</p>
        <strong>{workspace.campaign.name}</strong>
        <nav aria-label="Administration">
          {prefs.favorites.length > 0 && (
            <section>
              <h2>Favoris</h2>
              {prefs.favorites.map((id) => (
                <button key={id} onClick={() => go(id)}>
                  {pages.find(([p]) => p === id)?.[1]}
                </button>
              ))}
            </section>
          )}
          {groups.map((g) => (
            <section key={g.name}>
              <h2>{g.name}</h2>
              {g.pages.map(([id, label]) => (
                <div className="adm-nav-row" key={id}>
                  <button
                    aria-current={page === id ? "page" : undefined}
                    onClick={() => go(id)}
                  >
                    {label}
                    {id === "validations" && pending.length > 0 && (
                      <small>{pending.length}</small>
                    )}
                  </button>
                  <button
                    className="adm-star"
                    aria-label={`${prefs.favorites.includes(id) ? "Retirer" : "Ajouter"} ${label} des favoris`}
                    aria-pressed={prefs.favorites.includes(id)}
                    onClick={() =>
                      setPrefs({
                        ...prefs,
                        favorites: prefs.favorites.includes(id)
                          ? prefs.favorites.filter((p) => p !== id)
                          : [...prefs.favorites, id],
                      })
                    }
                  >
                    {prefs.favorites.includes(id) ? "★" : "☆"}
                  </button>
                </div>
              ))}
            </section>
          ))}
        </nav>
      </aside>
      <section className="adm-main" aria-busy={busy}>
        <div className="adm-topbar">
          <nav aria-label="Fil d’Ariane">
            <button onClick={() => go("overview")}>Administration</button> /{" "}
            {group} / {title}
          </nav>
          <select
            aria-label="Densité d’affichage"
            value={prefs.density}
            onChange={(e) => setPrefs({ ...prefs, density: e.target.value })}
          >
            <option value="comfortable">Confortable</option>
            <option value="compact">Compacte</option>
          </select>
        </div>
        <label className="c-field">
          Recherche globale
          <input
            type="search"
            placeholder="Compétences, catégories, personnages, objets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {search && (
          <div className="adm-search" aria-live="polite">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  go(r.section);
                  setContentTab("library");
                  setQuery(r.label.split(" · ")[0]);
                }}
              >
                {r.label}
                <small>{pages.find(([p]) => p === r.section)?.[1]}</small>
              </button>
            ))}
            {!results.length && <p>Aucun résultat.</p>}
          </div>
        )}
        <header className="adm-heading">
          <button
            className="c-button"
            onClick={() => {
              if (
                dirty &&
                !confirm(
                  "Abandonner les modifications pour prévisualiser la version enregistrée ?",
                )
              )
                return;
              mark(false);
              setPlayerPreview(true);
            }}
          >
            Voir comme un joueur
          </button>
          <h1>{title}</h1>
          {dirty && <span role="status">Modifications non enregistrées</span>}
        </header>
        {error && (
          <p role="alert" className="c-alert">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="c-notice">
            {notice}
          </p>
        )}
        {page === "overview" && (
          <>
            <header className="adm-campaign">
              {workspace.campaign.img && (
                <img src={workspace.campaign.img} alt="" />
              )}
              <div>
                <p className="c-eyebrow">Votre campagne</p>
                <h2>{workspace.campaign.name}</h2>
                <p>{workspace.settings.description}</p>
              </div>
            </header>
            <details className="adm-block-options">
              <summary>Personnaliser le tableau de bord</summary>
              {prefs.blocks.map((b, i) => (
                <div className="adm-toolbar" key={b}>
                  <label>
                    <input
                      type="checkbox"
                      checked={!prefs.hidden.includes(b)}
                      onChange={(e) =>
                        setPrefs({
                          ...prefs,
                          hidden: e.target.checked
                            ? prefs.hidden.filter((x) => x !== b)
                            : [...prefs.hidden, b],
                        })
                      }
                    />
                    {b}
                  </label>
                  <button
                    disabled={!i}
                    aria-label={`Monter ${b}`}
                    onClick={() => moveBlock(i, -1)}
                  >
                    ↑
                  </button>
                  <button
                    disabled={i === prefs.blocks.length - 1}
                    aria-label={`Descendre ${b}`}
                    onClick={() => moveBlock(i, 1)}
                  >
                    ↓
                  </button>
                </div>
              ))}
            </details>
            {prefs.blocks
              .filter((b) => !prefs.hidden.includes(b))
              .map((b) => (
                <section className="adm-block" key={b}>
                  <h2>{b}</h2>
                  {b === "Indicateurs" ? (
                    <div className="adm-stats">
                      {[
                        ["Joueurs", workspace.members.length, "players"],
                        [
                          "Personnages",
                          workspace.characters.length,
                          "characters",
                        ],
                        ["À valider", pending.length, "validations"],
                        [
                          "Compétences",
                          workspace.tree.nodes.filter((n) => !n.archived)
                            .length,
                          "skills",
                        ],
                      ].map(([label, n, id]) => (
                        <button
                          className="c-card c-pad"
                          key={id}
                          onClick={() => go(String(id))}
                        >
                          <span>{label}</span>
                          <strong>{n}</strong>
                        </button>
                      ))}
                    </div>
                  ) : b === "Actions à effectuer" ? (
                    <>
                      {pending.slice(0, 6).map((r) => (
                        <button
                          className="adm-task"
                          key={`${r.characterId}:${r.kind}:${r.itemId}`}
                          onClick={() => go("validations")}
                        >
                          <strong>{r.name}</strong>
                          <span>
                            {r.characterName} ·{" "}
                            {r.correction
                              ? "Correction demandée"
                              : "À examiner"}{" "}
                            →
                          </span>
                        </button>
                      ))}
                      {!pending.length && (
                        <p className="c-muted">Aucune demande en attente.</p>
                      )}
                    </>
                  ) : b === "Accès rapides" ? (
                    <div className="adm-toolbar">
                      <button
                        className="c-button"
                        onClick={() => go("skills", true)}
                      >
                        Créer une compétence
                      </button>
                      <button
                        className="c-button"
                        onClick={() => go("players")}
                      >
                        Ajouter un joueur
                      </button>
                      <button className="c-button" onClick={() => go("rules")}>
                        Modifier les règles
                      </button>
                      <button
                        className="c-button"
                        onClick={() => go("categories", true)}
                      >
                        Ajouter une catégorie
                      </button>
                      <button
                        className="c-button"
                        onClick={() => go("appearance")}
                      >
                        Personnaliser le thème
                      </button>
                    </div>
                  ) : (
                    <>
                      {events.slice(0, 8).map((e) => (
                        <p className="adm-event" key={e.id}>
                          <span>{e.action}</span>
                          <small>
                            {e.actor} · {new Date(e.at).toLocaleString("fr-FR")}
                          </small>
                        </p>
                      ))}
                      {!events.length && (
                        <p className="c-muted">
                          Les prochains changements de configuration et
                          décisions apparaîtront ici.
                        </p>
                      )}
                    </>
                  )}
                </section>
              ))}
          </>
        )}
        {page === "players" && (
          <>
            <form
              className="adm-toolbar"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                perform({ op: "addPlayer", username: f.get("username") });
              }}
            >
              <input
                name="username"
                required
                placeholder="Pseudo du joueur"
                aria-label="Pseudo du joueur"
              />
              <button disabled={busy} className="c-primary">
                Ajouter un joueur
              </button>
            </form>
            <div className="adm-filters">
              <input
                placeholder="Rechercher un joueur"
                aria-label="Rechercher un joueur"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                aria-label="Tri des joueurs"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="asc">Pseudo A → Z</option>
                <option value="desc">Pseudo Z → A</option>
                <option value="count">Nombre de personnages</option>
              </select>
            </div>
            <div className="adm-table">
              <table>
                <thead>
                  <tr>
                    <th>Pseudo</th>
                    <th>Personnages</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.members
                    .filter((m) =>
                      m.username.toLowerCase().includes(query.toLowerCase()),
                    )
                    .sort((a, b) =>
                      sort === "count"
                        ? workspace.characters.filter(
                            (c) => c.playerId === b.id,
                          ).length -
                          workspace.characters.filter(
                            (c) => c.playerId === a.id,
                          ).length
                        : a.username.localeCompare(b.username) *
                          (sort === "asc" ? 1 : -1),
                    )
                    .map((m) => {
                      const chars = workspace.characters.filter(
                        (c) => c.playerId === m.id,
                      );
                      return (
                        <tr key={m.id}>
                          <td>{m.username}</td>
                          <td>
                            {chars.length}
                            {chars.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => onOpenCharacter(c)}
                              >
                                {c.name}
                              </button>
                            ))}
                          </td>
                          <td>
                            <button
                              disabled={busy || m.id === user.id}
                              onClick={() => {
                                if (
                                  confirm(
                                    `Retirer ${m.username} ? Ses personnages seront conservés.`,
                                  )
                                )
                                  perform({
                                    op: "removePlayer",
                                    playerId: m.id,
                                  });
                              }}
                            >
                              Retirer
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {!workspace.members.length && (
                <p>Aucun joueur. Ajoutez un pseudo de compte existant.</p>
              )}
            </div>
          </>
        )}
        {page === "characters" && (
          <>
            <div className="adm-toolbar">
              <button
                className="c-button"
                onClick={async () => {
                  if (archives) {
                    setArchives(null);
                    return;
                  }
                  try {
                    const r = await api({
                      op: "trashCharacters",
                      campaignId: workspace.campaign.id,
                    });
                    setArchives(r.characters);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                {archives ? "Personnages actifs" : "Archives des personnages"}
              </button>
            </div>
            {archives ? (
              <div>
                {archives.map((c) => (
                  <div className="adm-task" key={c.id}>
                    {c.name}
                    <button
                      disabled={busy}
                      onClick={() =>
                        perform({ op: "restoreCharacter", id: c.id }, () =>
                          setArchives(
                            archives.filter((row) => row.id !== c.id),
                          ),
                        )
                      }
                    >
                      Restaurer
                    </button>
                  </div>
                ))}
                {!archives.length && <p>Aucun personnage archivé.</p>}
              </div>
            ) : (
              <>
                <div className="adm-filters">
                  <input
                    placeholder="Rechercher un personnage"
                    aria-label="Rechercher un personnage"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <select
                    aria-label="Joueur"
                    value={player}
                    onChange={(e) => setPlayer(e.target.value)}
                  >
                    <option value="">Tous les joueurs</option>
                    {[
                      ...new Set<string>(
                        workspace.characters.map((c) => c.playerId),
                      ),
                    ].map((id) => (
                      <option key={id} value={id}>
                        {owner(id)}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Classe"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                  >
                    <option value="">Toutes les classes</option>
                    {[
                      ...new Set<string>(
                        workspace.characters
                          .map((c) => c.className)
                          .filter((v): v is string => !!v),
                      ),
                    ].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Race"
                    value={race}
                    onChange={(e) => setRace(e.target.value)}
                  >
                    <option value="">Toutes les races</option>
                    {[
                      ...new Set<string>(
                        workspace.characters
                          .map((c) => c.race)
                          .filter((v): v is string => !!v),
                      ),
                    ].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <details>
                  <summary>Colonnes du tableau</summary>
                  <div className="adm-toolbar">
                    {["Classe", "Race", "Niveau", "Joueur"].map((col) => (
                      <label key={col}>
                        <input
                          type="checkbox"
                          checked={prefs.columns.includes(col)}
                          onChange={(e) =>
                            setPrefs({
                              ...prefs,
                              columns: e.target.checked
                                ? [...prefs.columns, col]
                                : prefs.columns.filter((c) => c !== col),
                            })
                          }
                        />
                        {col}
                      </label>
                    ))}
                  </div>
                </details>
                <p className="c-muted">
                  Les ajustements MJ (niveau, caractéristiques, ressources) sont
                  accessibles depuis la fiche.
                </p>
                <div className="adm-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Personnage</th>
                        {["Classe", "Race", "Niveau", "Joueur"]
                          .filter((c) => prefs.columns.includes(c))
                          .map((c) => (
                            <th key={c}>{c}</th>
                          ))}
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workspace.characters
                        .filter(
                          (c) =>
                            c.name
                              .toLowerCase()
                              .includes(query.toLowerCase()) &&
                            (!player || c.playerId === player) &&
                            (!race || c.race === race) &&
                            (!className || c.className === className),
                        )
                        .map((c) => (
                          <tr key={c.id}>
                            <td>
                              {c.portrait && (
                                <img
                                  className="adm-portrait"
                                  src={c.portrait}
                                  alt=""
                                />
                              )}
                              {c.name}
                            </td>
                            {prefs.columns.includes("Classe") && (
                              <td>{c.className || "—"}</td>
                            )}
                            {prefs.columns.includes("Race") && (
                              <td>{c.race || "—"}</td>
                            )}
                            {prefs.columns.includes("Niveau") && (
                              <td>{c.level}</td>
                            )}
                            {prefs.columns.includes("Joueur") && (
                              <td>{owner(c.playerId)}</td>
                            )}
                            <td>
                              <button onClick={() => onOpenCharacter(c)}>
                                Ouvrir la fiche
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
        {page === "skills" && (
          <Skills
            key={`${page}:${epoch}`}
            {...common}
            onSave={saveTree}
            initialCreate={create}
            initialQuery={query}
          />
        )}
        {page === "validations" && <Reviews {...common} perform={perform} />}
        {["weapons", "magic"].includes(page) && (
          <div className="adm-toolbar">
            <button
              className="c-button"
              aria-pressed={contentTab === "catalog"}
              onClick={() => {
                if (!dirty || confirm("Abandonner les modifications ?")) {
                  mark(false);
                  setContentTab("catalog");
                }
              }}
            >
              Catégories et écoles
            </button>
            <button
              className="c-button"
              aria-pressed={contentTab === "library"}
              onClick={() => {
                if (!dirty || confirm("Abandonner les modifications ?")) {
                  mark(false);
                  setContentTab("library");
                }
              }}
            >
              Bibliothèque de contenus
            </button>
            {page === "magic" && (
              <button className="c-button" onClick={() => go("skills")}>
                Voies et spécialisations
              </button>
            )}
          </div>
        )}
        {["weapons", "magic"].includes(page) && contentTab === "library" && (
          <Library
            key={`${page}:${epoch}`}
            {...common}
            magic={page === "magic"}
            perform={perform}
            initialQuery={query}
          />
        )}
        {(["creation", "categories"].includes(page) ||
          (["weapons", "magic"].includes(page) &&
            contentTab === "catalog")) && (
          <Catalog
            key={`${page}:${epoch}`}
            {...common}
            initialCreate={create}
            initialQuery={query}
            kinds={
              (
                {
                  weapons: ["weapon", "item"],
                  magic: ["magic"],
                  creation: ["race", "class"],
                  categories: [
                    "weapon",
                    "magic",
                    "item",
                    "skill",
                    "race",
                    "class",
                  ],
                } as Record<
                  string,
                  import("../../lib/campaign-settings").Category["kind"][]
                >
              )[page] ?? []
            }
            onSave={saveSettings}
          />
        )}
        {page === "appearance" && (
          <AppearanceEditor
            key={`${page}:${epoch}`}
            {...common}
            onSave={saveSettings}
          />
        )}
        {page === "rules" && (
          <>
            <div className="adm-toolbar">
              {[
                "Général",
                "Progression",
                "Armes",
                "Magie",
                "Création",
                "Apparence",
                "Données",
                "Avancé",
              ]
                .filter((t) =>
                  t.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
                )
                .map((t) => (
                  <button
                    className="c-button"
                    key={t}
                    aria-pressed={settingsTab === t}
                    onClick={() => {
                      const target = (
                        {
                          Armes: "weapons",
                          Magie: "magic",
                          Création: "creation",
                          Apparence: "appearance",
                          Données: "data",
                        } as Record<string, string>
                      )[t];
                      if (target) go(target);
                      else if (
                        !dirty ||
                        confirm("Abandonner les modifications ?")
                      ) {
                        mark(false);
                        setSettingsTab(t);
                      }
                    }}
                  >
                    {t}
                  </button>
                ))}
            </div>
            <input
              placeholder="Rechercher un domaine de paramètres"
              aria-label="Recherche dans les paramètres"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {settingsTab === "Général" && (
              <form
                className="c-editor-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  perform({
                    op: "saveGeneral",
                    revision: workspace.campaign.revision,
                    name,
                    img,
                    description,
                  });
                }}
              >
                <label className="c-field">
                  Nom
                  <input
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      mark(true);
                    }}
                  />
                </label>
                <label className="c-field">
                  Image de couverture (URL HTTPS)
                  <input
                    value={img}
                    onChange={(e) => {
                      setImg(e.target.value);
                      mark(true);
                    }}
                  />
                </label>
                <label className="c-field">
                  Description
                  <textarea
                    maxLength={3000}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      mark(true);
                    }}
                  />
                </label>
                <button className="c-primary" disabled={busy || !dirty}>
                  Enregistrer les informations générales
                </button>
              </form>
            )}
            {settingsTab === "Progression" && (
              <form
                className="c-editor-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (
                    confirm(
                      "Modifier les points gagnés par niveau pour tous les personnages existants ?",
                    )
                  )
                    saveTree({ ...workspace.tree, pointsPerLevel: points });
                }}
              >
                <label className="c-field">
                  Points par niveau
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={points}
                    onChange={(e) => {
                      setPoints(e.target.valueAsNumber);
                      mark(true);
                    }}
                  />
                </label>
                <p className="c-muted">
                  Valeur par défaut : 2. Les coûts des compétences déjà acquises
                  sont conservés.
                </p>
                <div className="adm-toolbar">
                  <button
                    type="button"
                    className="c-button"
                    onClick={() => {
                      setPoints(2);
                      mark(true);
                    }}
                  >
                    Restaurer la valeur par défaut
                  </button>
                  <button className="c-primary" disabled={busy || !dirty}>
                    Enregistrer la progression
                  </button>
                </div>
              </form>
            )}
            {settingsTab === "Avancé" && (
              <details>
                <summary>Paramètres sensibles et compatibilité</summary>
                <p>
                  Version des règles : {workspace.tree.version}. Les acquis
                  antérieurs sont conservés.
                </p>
                <button
                  className="c-button"
                  onClick={() => {
                    const confirmName = prompt(
                      `Archiver la campagne : saisissez « ${workspace.campaign.name} »`,
                    );
                    if (confirmName === workspace.campaign.name)
                      perform(
                        {
                          op: "deleteCampaign",
                          revision: workspace.campaign.revision,
                          confirmName,
                        },
                        () =>
                          location.assign(
                            new URL("/campagnes", location.origin).href,
                          ),
                      );
                  }}
                >
                  Archiver la campagne
                </button>
              </details>
            )}
          </>
        )}
        {page === "data" && (
          <>
            <h2>Sauvegarde et préréglages</h2>
            <div className="adm-toolbar">
              <button
                className="c-primary"
                onClick={() => {
                  const blob = new Blob(
                    [
                      JSON.stringify(
                        {
                          format: "cendres-campaign-v1",
                          campaign: workspace.campaign,
                          settings: workspace.settings,
                          tree: workspace.tree,
                          characters: workspace.characters,
                          history: workspace.history,
                        },
                        null,
                        2,
                      ),
                    ],
                    { type: "application/json" },
                  );
                  const url = URL.createObjectURL(blob),
                    a = document.createElement("a");
                  a.href = url;
                  a.download = `campagne-${workspace.campaign.id}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Exporter la campagne (JSON)
              </button>
              <button className="c-button" onClick={() => go("characters")}>
                Accéder aux archives
              </button>
            </div>
            <label className="c-field">
              Importer un préréglage d’apparence et de catégories
              <input
                type="file"
                accept="application/json,.json"
                disabled={busy}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    if (file.size > 2000000)
                      throw Error("Fichier trop volumineux.");
                    const data = JSON.parse(await file.text());
                    if (data.format !== "cendres-campaign-v1" || !data.settings)
                      throw Error("Format de préréglage inconnu.");
                    if (
                      confirm(
                        "Appliquer l’apparence et fusionner les catégories du fichier avec celles de cette campagne ?",
                      )
                    )
                      saveSettings({
                        ...workspace.settings,
                        appearance: data.settings.appearance,
                        categories: [
                          ...workspace.settings.categories,
                          ...data.settings.categories.filter(
                            (
                              c: import("../../lib/campaign-settings").Category,
                            ) =>
                              !workspace.settings.categories.some(
                                (old) => old.id === c.id,
                              ),
                          ),
                        ],
                      });
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              />
            </label>
            <h2>Historique des changements</h2>
            {events.map((e) => (
              <p className="adm-event" key={e.id}>
                <span>{e.action}</span>
                <small>
                  {e.actor} · {new Date(e.at).toLocaleString("fr-FR")}
                </small>
              </p>
            ))}
            <button
              className="c-button"
              onClick={() =>
                saveSettings({
                  ...defaultSettings(workspace.tree.races),
                  categories: workspace.settings.categories,
                })
              }
            >
              Restaurer l’apparence et la description par défaut
            </button>
          </>
        )}
      </section>
    </div>
  );
}
