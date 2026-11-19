"use client";
import type { Workspace, AdminCharacter } from "./types";
import { useCallback, useEffect, useRef, useState } from "react";
import { workspaceCall as api } from "../../lib/workspace-client";
import { defaultSettings } from "../../lib/campaign-settings";
import Skills from "./skills";
import Library from "./library";
import PlayerPreview from "./player-preview";
import Catalog from "./catalog";
import AppearanceEditor from "./appearance";
import {
  LayoutDashboard,
  Hammer,
  Users,
  Settings,
  Database,
  Search,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Plus,
  Star,
} from "lucide-react";
import {
  groups,
  pages,
  isAdminPage,
  readDestination,
  destinationUrl,
  quickActions,
  searchAdministration,
  type Destination,
} from "./navigation";
const groupIcons = {
  dashboard: LayoutDashboard,
  content: Hammer,
  campaign: Users,
  configuration: Settings,
  administration: Database,
};
const blocks = ["Indicateurs", "Accès rapides", "Modifications récentes"];
type Preferences = {
  page: Destination["page"];
  collapsed: boolean;
  openGroups: string[];
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
  onHome,
}: {
  workspace: Workspace;
  user: { id: string; username: string };
  onReload: () => Promise<unknown>;
  onOpenCharacter: (character: AdminCharacter) => void;
  onDirty: (dirty: boolean) => void;
  onBusy?: (busy: boolean) => void;
  initialPage?: string;
  onHome: (fromHistory?: boolean) => void;
}) {
  const [playerPreview, setPlayerPreview] = useState(false);
  const [previewId, setPreviewId] = useState(workspace.characters[0]?.id ?? "");
  const [target, setTarget] = useState<Destination>({ page: "overview" });
  const [searchLimit, setSearchLimit] = useState(40);
  const searchInput = useRef<HTMLInputElement>(null);
  const previewScroll = useRef(0);
  const historyIndex = useRef(0),
    reversingHistory = useRef(false);
  const contexts = useRef<Record<string, { query: string; scroll: number }>>(
    {},
  );
  const key = `cendres-admin:${user.id}:${workspace.campaign.id}`;
  const [prefs, setPrefs] = useState<Preferences>({
      page: isAdminPage(initialPage) ? initialPage : "overview",
      collapsed: false,
      openGroups: groups.map((group) => group.id),
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
    >(null);
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
            page: isAdminPage(initialPage)
              ? initialPage
              : isAdminPage(saved.page)
                ? saved.page
                : "overview",
            collapsed: saved.collapsed === true,
            openGroups: Array.isArray(saved.openGroups)
              ? saved.openGroups.filter((id: string) =>
                  groups.some((group) => group.id === id),
                )
              : groups.map((group) => group.id),
            favorites: Array.isArray(saved.favorites)
              ? saved.favorites.filter((id: string) =>
                  pages.some(([p]) => p === id),
                )
              : [],
            blocks:
              Array.isArray(saved.blocks) &&
              new Set(saved.blocks).size === blocks.length &&
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
      let savedPage: Destination["page"] = "overview";
      try {
        const saved = JSON.parse(localStorage.getItem(key) || "null");
        if (isAdminPage(saved?.page)) savedPage = saved.page;
      } catch {}
      const destination = readDestination(location.search) ?? {
        page: isAdminPage(initialPage) ? initialPage : savedPage,
      };
      setTarget(destination);
      setPlayer(destination.player ?? "");
      if (
        Object.keys(destination).some(
          (key) => !["page", "create"].includes(key),
        )
      )
        setNotice(
          "Les filtres ont été adaptés pour afficher la destination demandée.",
        );
      setCreate(!!destination.create);
      setPrefs((current) => ({
        ...current,
        page: destination.page,
        openGroups: [
          ...new Set([
            ...current.openGroups,
            groups.find((group) =>
              group.pages.some(([id]) => id === destination.page),
            )!.id,
          ]),
        ],
      }));
      historyIndex.current = history.state?.cendresAdminIndex ?? 0;
      history.replaceState(
        { ...history.state, cendresAdminIndex: historyIndex.current },
        "",
        destinationUrl(location.href, destination, workspace.campaign.id),
      );
      setLoaded(true);
    });
  }, [key, initialPage, workspace.campaign.id]);
  useEffect(() => {
    if (loaded)
      try {
        localStorage.setItem(key, JSON.stringify(prefs));
      } catch {}
  }, [key, prefs, loaded]);
  const mark = useCallback(
    (value: boolean) => {
      setDirty(value);
      onDirty(value);
    },
    [onDirty],
  );
  function openPreview(id?: string) {
    previewScroll.current = window.scrollY;
    if (id) setPreviewId(id);
    setPlayerPreview(true);
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }
  function closePreview() {
    setPlayerPreview(false);
    requestAnimationFrame(() => window.scrollTo(0, previewScroll.current));
  }
  function go(
    destination: Destination | string,
    creating = false,
    fromHistory = false,
  ) {
    const next: Destination =
      typeof destination === "string"
        ? {
            page: isAdminPage(destination) ? destination : "overview",
            ...(creating ? { create: true } : {}),
          }
        : destination;
    if (
      busy ||
      (!fromHistory &&
        dirty &&
        !confirm("Quitter cette rubrique sans enregistrer ?"))
    )
      return false;
    contexts.current[prefs.page] = { query, scroll: window.scrollY };
    mark(false);
    setPrefs((current) => ({
      ...current,
      page: next.page,
      openGroups: [
        ...new Set([
          ...current.openGroups,
          groups.find((group) => group.pages.some(([id]) => id === next.page))!
            .id,
        ]),
      ],
    }));
    setTarget(next);
    setMenu(false);
    setCreate(!!next.create);
    setEpoch((value) => value + 1);
    setQuery(next.selected ? "" : (contexts.current[next.page]?.query ?? ""));
    setArchives(null);
    setError("");
    setSearch("");
    setNotice(
      Object.keys(next).some((key) => !["page", "create"].includes(key))
        ? "Les filtres ont été adaptés pour afficher la destination demandée."
        : "",
    );
    setName(workspace.campaign.name);
    setImg(workspace.campaign.img);
    setDescription(workspace.settings.description);
    setPoints(workspace.tree.pointsPerLevel);
    if (next.page === "characters" && (next.selected || next.player)) {
      setPlayer(next.player ?? "");
      setRace("");
      setClassName("");
    }
    if (!fromHistory) {
      historyIndex.current += 1;
      history.pushState(
        { ...history.state, cendresAdminIndex: historyIndex.current },
        "",
        destinationUrl(location.href, next, workspace.campaign.id),
      );
    }
    requestAnimationFrame(() =>
      window.scrollTo(
        0,
        Object.keys(next).length > 1
          ? 0
          : (contexts.current[next.page]?.scroll ?? 0),
      ),
    );
    return true;
  }
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPlayerPreview(false);
        requestAnimationFrame(() => searchInput.current?.focus());
      }
      if (event.key === "Escape") {
        setSearch("");
        setMenu(false);
        document.querySelector(".adm-create-menu[open]")?.removeAttribute("open");
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    const pop = (event: PopStateEvent) => {
      if (reversingHistory.current) {
        reversingHistory.current = false;
        return;
      }
      const nextIndex =
        event.state?.cendresAdminIndex ?? historyIndex.current - 1;
      if (
        busy ||
        (dirty && !confirm("Quitter cette rubrique sans enregistrer ?"))
      ) {
        reversingHistory.current = true;
        history.go(historyIndex.current - nextIndex || 1);
        return;
      }
      const campaign = new URLSearchParams(location.search).get("campaign");
      if (campaign && campaign !== workspace.campaign.id) {
        mark(false);
        location.reload();
        return;
      }
      historyIndex.current = nextIndex;
      setPlayerPreview(false);
      const next = readDestination(location.search);
      if (next) go(next, false, true);
      else {
        mark(false);
        onHome(true);
      }
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  });
  useEffect(() => {
    if (!loaded || target.page !== "characters" || target.status !== "archived")
      return;
    let live = true;
    api({ op: "trashCharacters", campaignId: workspace.campaign.id })
      .then((result) => {
        if (live) setArchives(result.characters);
      })
      .catch((error: Error) => {
        if (live) setError(error.message);
      });
    return () => {
      live = false;
    };
  }, [loaded, target, workspace.campaign.id]);
  async function perform(data: Record<string, unknown>, after?: () => void, preserveEditor = false) {
    if (busy) return false;
    setBusy(true);
    onBusy?.(true);
    setError("");
    setNotice("");
    try {
      await api({ campaignId: workspace.campaign.id, ...data });
      await onReload();
      if (!preserveEditor) {
        mark(false);
        setEpoch((v) => v + 1);
      }
      setCreate(false);
      setTarget((current) => ({ ...current, create: false }));
      const savedTarget = { ...target, create: false };
      history.replaceState(
        history.state,
        "",
        destinationUrl(location.href, savedTarget, workspace.campaign.id),
      );
      setNotice("Modifications enregistrées.");
      after?.();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  }
  const saveTree = (tree: Workspace["tree"], preserveEditor = false) =>
    perform({
      op: "saveCampaign",
      revision: workspace.campaign.revision,
      name: workspace.campaign.name,
      img: workspace.campaign.img,
      tree,
    }, undefined, preserveEditor);
  const saveSkills = (tree: Workspace["tree"]) => saveTree(tree, true);
  const saveSettings = (settings: Workspace["settings"]) => {
    return perform({
      op: "saveSettings",
      revision: workspace.campaign.revision,
      settings,
    }, undefined, ["creation", "categories"].includes(prefs.page));
  };
  const page = prefs.page,
    title = pages.find(([id]) => id === page)?.[1],
    group = groups.find((g) => g.pages.some(([id]) => id === page))?.name;
  const events = [...(workspace.history ?? [])].sort((a, b) => b.at - a.at);
  const results = searchAdministration(workspace, search);
  const owner = (id: string) =>
    workspace.members.find((m) => m.id === id)?.username ??
    (id === user.id ? user.username : "Ancien membre");
  const common = {
    workspace,
    active: !playerPreview,
    busy,
    onDirty: mark,
    storageKey: key,
    target,
    onNavigate: (next: Destination) => {
      go(next);
    },
  };
  function moveBlock(index: number, delta: number) {
    const order = [...prefs.blocks];
    [order[index], order[index + delta]] = [order[index + delta], order[index]];
    setPrefs({ ...prefs, blocks: order });
  }
  if (!loaded) return <p>Chargement de l’administration…</p>;
  return (
    <>
    <div
      hidden={playerPreview}
      className={`adm-shell ${prefs.collapsed ? "adm-collapsed" : ""} ${prefs.density === "compact" ? "adm-compact" : ""}`}
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
        <div className="adm-sidebar-brand">
          <p className="c-eyebrow">Atelier du maître du jeu</p>
          <strong>{workspace.campaign.name}</strong>
        </div>
        <div className="adm-sidebar-tools">
          <button
            title="Retour à l’accueil"
            aria-label="Retour à l’accueil"
            onClick={() => {
              if (
                !busy &&
                (!dirty || confirm("Quitter sans enregistrer ?"))
              ) {
                mark(false);
                onHome();
              }
            }}
          >
            <Home size={18} />
            <span>Accueil</span>
          </button>
          <button
            title="Recherche globale (Ctrl + K)"
            aria-label="Recherche globale (Ctrl + K)"
            onClick={() => searchInput.current?.focus()}
          >
            <Search size={18} />
            <span>
              Rechercher <kbd>Ctrl K</kbd>
            </span>
          </button>
          <button
            className="adm-collapse-toggle"
            title={prefs.collapsed ? "Déplier la barre" : "Réduire la barre"}
            aria-label={
              prefs.collapsed ? "Déplier la barre" : "Réduire la barre"
            }
            onClick={() =>
              setPrefs({ ...prefs, collapsed: !prefs.collapsed })
            }
          >
            {prefs.collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
            <span>Réduire</span>
          </button>
        </div>
        <nav aria-label="Administration">
          {prefs.favorites.length > 0 && (
            <section className="adm-favorites adm-nav-group">
              <button
                className="adm-group-toggle adm-favorites-toggle"
                title="Favoris"
                aria-label="Favoris"
              >
                <Star size={18} />
                <span>Favoris</span>
              </button>
              <div className="adm-group-pages">
                {prefs.favorites.map((id) => (
                  <button
                    key={id}
                    title={pages.find(([p]) => p === id)?.[1]}
                    aria-current={page === id ? "page" : undefined}
                    onClick={() => go(id)}
                  >
                    {pages.find(([p]) => p === id)?.[1]}
                  </button>
                ))}
              </div>
            </section>
          )}
          {groups.map((g) => {
            const Icon = groupIcons[g.id],
              open = prefs.openGroups.includes(g.id),
              active = g.pages.some(([id]) => id === page);
            return (
              <section
                key={g.id}
                data-group={g.id}
                className={`adm-nav-group ${active ? "is-active" : ""}`}
              >
                <button
                  className="adm-group-toggle"
                  title={g.name}
                  aria-label={g.name}
                  aria-expanded={open}
                  aria-controls={`admin-group-${g.id}`}
                  onClick={() =>
                    setPrefs({
                      ...prefs,
                      openGroups: open
                        ? prefs.openGroups.filter((id) => id !== g.id)
                        : [...prefs.openGroups, g.id],
                    })
                  }
                >
                  <Icon size={18} />
                  <span>{g.name}</span>
                  <ChevronDown size={14} />
                </button>
                <div
                  id={`admin-group-${g.id}`}
                  className="adm-group-pages"
                  hidden={!open}
                >
                  {g.pages.map(([id, label]) => (
                    <div className="adm-nav-row" key={id}>
                      <button
                        aria-current={page === id ? "page" : undefined}
                        onClick={() => go(id)}
                      >
                        {label}
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
                </div>
              </section>
            );
          })}
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
          Recherche globale · Ctrl + K
          <input
            ref={searchInput}
            type="search"
            placeholder="Compétences, catégories, personnages, objets…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchLimit(40);
            }}
          />
        </label>
        {search && (
          <div className="adm-search" aria-live="polite">
            {[
              ...new Set(
                results.slice(0, searchLimit).map((result) => result.type),
              ),
            ].map((type) => (
              <section key={type}>
                <h2>{type}</h2>
                {results
                  .slice(0, searchLimit)
                  .filter((result) => result.type === type)
                  .map((result) => (
                    <button key={result.id} onClick={() => go(result.target)}>
                      <span>
                        {result.label}
                        {result.archived && <strong> · Archivé</strong>}
                      </span>
                      <small>
                        {result.context} · {workspace.campaign.name}
                      </small>
                    </button>
                  ))}
              </section>
            ))}
            {results.length > searchLimit && (
              <button onClick={() => setSearchLimit((value) => value + 40)}>
                Afficher davantage ({results.length - searchLimit})
              </button>
            )}
            {!results.length && <p>Aucun résultat.</p>}
          </div>
        )}
        <header className="adm-heading">
          <button className="c-button" onClick={() => openPreview()}>
            Voir comme un joueur
          </button>
          <details className="adm-create-menu">
            <summary className="c-primary">
              <Plus size={16} /> Créer
            </summary>
            <div>
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={(event) => {
                    if (go(action.target))
                      event.currentTarget
                        .closest("details")
                        ?.removeAttribute("open");
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </details>
          <h1>{title}</h1>
          {dirty && <span role="status">Modifications non enregistrées</span>}
        </header>
        {busy && <p role="status">Enregistrement en cours…</p>}
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
                  ) : b === "Accès rapides" ? (
                    <div className="adm-toolbar">
                      {quickActions.map((action) => (
                        <button
                          className="c-button"
                          key={action.label}
                          onClick={() => go(action.target)}
                        >
                          {action.label}
                        </button>
                      ))}
                      <button
                        className="c-button"
                        onClick={() => go("characters")}
                      >
                        Ouvrir les personnages
                      </button>
                      <button
                        className="c-button"
                        onClick={() => go("rules")}
                      >
                        Modifier les règles
                      </button>
                    </div>
                  ) : (
                    <>
                      {events.slice(0, 8).map((e) => (
                        <p className="adm-event" key={e.id}>
                          <span>{e.action}</span>
                          <small>
                            {e.actor} ·{" "}
                            {new Date(e.at).toLocaleString("fr-FR")}
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
            {target.selected && (
              <button className="c-button" onClick={() => go("players")}>
                Afficher tous les joueurs
              </button>
            )}
            <form
              className="adm-toolbar"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                perform({ op: "addPlayer", username: f.get("username") });
              }}
            >
              <input
                key={epoch}
                autoFocus={create}
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
                    .filter(
                      (m) =>
                        m.username
                          .toLowerCase()
                          .includes(query.toLowerCase()) &&
                        (!target.selected || m.id === target.selected),
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
                              onClick={() =>
                                go({ page: "characters", player: m.id })
                              }
                            >
                              Voir les personnages
                            </button>
                            <button
                              disabled={
                                busy ||
                                m.id === user.id ||
                                m.id === workspace.campaign.gmId
                              }
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
            {target.selected && (
              <p className="c-notice">
                Personnage sélectionné.{" "}
                <button onClick={() => go("characters")}>
                  Afficher tous les personnages
                </button>
              </p>
            )}
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
                  Les ajustements MJ (niveau, caractéristiques, ressources)
                  sont accessibles depuis la fiche.
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
                            (!target.selected || c.id === target.selected) &&
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
                              <button onClick={() => openPreview(c.id)}>
                                Voir comme un joueur
                              </button>
                              <button
                                onClick={() =>
                                  go({ page: "weapons", owner: c.id })
                                }
                              >
                                Objets
                              </button>
                              <button
                                onClick={() =>
                                  go({ page: "magic", owner: c.id })
                                }
                              >
                                Sorts
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
            onSave={saveSkills}
            initialCreate={create}
            initialQuery={query}
          />
        )}
        {["weapons", "magic"].includes(page) && (
          <>
            <div className="adm-toolbar">
              <button
                className="c-button"
                onClick={() =>
                  go({
                    page: "categories",
                    kind: page === "magic" ? "magic" : "weapon",
                  })
                }
              >
                {page === "magic"
                  ? "Gérer les écoles de magie"
                  : "Gérer les catégories d’armes et d’objets"}
              </button>
              {page === "magic" && (
                <button
                  className="c-button"
                  onClick={() => go({ page: "skills", family: "Magie" })}
                >
                  Gérer les voies magiques
                </button>
              )}
            </div>
            <Library
              key={`${page}:${epoch}`}
              {...common}
              magic={page === "magic"}
              perform={perform}
            />
          </>
        )}
        {["creation", "categories"].includes(page) && (
          <Catalog
            key={`${page}:${epoch}`}
            {...common}
            initialCreate={create}
            kinds={
              page === "creation"
                ? ["race", "class"]
                : ["weapon", "item", "magic", "skill", "race", "class"]
            }
            onSave={saveSettings}
            onSaveTree={saveSkills}
          />
        )}
        {page === "appearance" && (
          <AppearanceEditor
            key={`${page}:${epoch}`}
            {...common}
            onSave={saveSettings}
          />
        )}
        {["general", "rules", "advanced"].includes(page) && (
          <>
            {page === "general" && (
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
            {page === "rules" && (
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
                  Version des règles : {workspace.tree.version}. Valeur par
                  défaut : 2. Les coûts des compétences déjà acquises sont
                  conservés.
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
            {page === "advanced" && (
              <section className="adm-danger-zone">
                <h2>Paramètres sensibles</h2>
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
              </section>
            )}
          </>
        )}
        {page === "data" && (
          <>
            <p className="c-notice">
              L’export contient les données enregistrées et exclut les
              personnages archivés ainsi que les modifications de formulaire
              non enregistrées. L’import fusionne les catégories et applique
              l’apparence ; il ne restaure pas une campagne complète.
            </p>
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
                    if (
                      data.format !== "cendres-campaign-v1" ||
                      !data.settings
                    )
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
          </>
        )}
        {page === "history" && (
          <>
            <p className="c-muted">
              Historique des changements disponibles, non exhaustif.
            </p>
            {!events.length && <p>Aucun changement enregistré.</p>}
            <h2>Historique des changements</h2>
            {events.map((e) => (
              <p className="adm-event" key={e.id}>
                <span>{e.action}</span>
                <small>
                  {e.actor} · {new Date(e.at).toLocaleString("fr-FR")}
                </small>
              </p>
            ))}
          </>
        )}
        {page === "advanced" && (
          <>
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
        {page === "archives" && (
          <div className="adm-archive-links">
            {(
              [
                ["characters", "Personnages"],
                ["weapons", "Objets"],
                ["magic", "Sorts"],
                ["skills", "Compétences"],
                ["categories", "Catégories"],
              ] as const
            ).map(([section, label]) => (
              <button
                className="c-button"
                key={section}
                onClick={() => go({ page: section, status: "archived" })}
              >
                {label}{" "}
                {section === "skills" || section === "categories"
                  ? "archivées"
                  : "archivés"}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
      <div hidden={!playerPreview}>
        <button className="c-button" onClick={closePreview}>
          Retour à l’administration
        </button>
        <PlayerPreview
          workspace={workspace}
          characterId={previewId}
          onCharacterChange={setPreviewId}
        />
      </div>
    </>
  );
}
