"use client";
import { useState, useEffect, useRef } from "react";
import {
  Flame,
  LayoutDashboard,
  Backpack,
  Sparkles,
  BookOpen,
  Users,
  Plus,
  ChevronDown,
  ChevronRight,
  Check,
  CheckCheck,
  Shield,
  Sword,
  Heart,
  Zap,
  Droplets,
  Footprints,
  Wind,
  Skull,
  Weight,
  RotateCcw,
  Search,
  X,
  Link as LinkIcon,
  ImagePlus,
  ScrollText,
  Settings2,
  ArrowUpRight,
  Feather,
  Hexagon,
  Upload,
  Copy,
  Ellipsis,
  CheckCircle2,
  Clock,
  Menu,
} from "lucide-react";
import {
  fresh,
  derive,
  mod,
  statNames,
  armors,
  ranks,
  entry,
  type Character,
  type Entry,
  type Technique,
} from "../lib/rules";
const icons: Record<string, any> = {
  weapon: Sword,
  armor: Shield,
  shield: Shield,
  talisman: Hexagon,
  consumable: Droplets,
  other: Feather,
  spell: Sparkles,
};
const typeNames: Record<string, string> = {
  weapon: "Arme",
  armor: "Armure",
  shield: "Bouclier",
  talisman: "Talisman",
  consumable: "Consommable",
  other: "Objet",
  spell: "Sort",
};
const sign = (n: number) => (n >= 0 ? "+" + n : String(n));
async function api(data: object) {
  const r = await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const b = (await r.json()) as any;
  if (!r.ok) throw Error(b.error || "Connexion impossible.");
  return b;
}
function Pattern({ points }: { points: number[][] }) {
  const [rotation, setRotation] = useState(0);
  const rotated = points.map(([x, y]) =>
    rotation === 1
      ? [-y, x]
      : rotation === 2
        ? [-x, -y]
        : rotation === 3
          ? [y, -x]
          : [x, y],
  );
  return (
    <div className="pattern-wrap">
      <div className="pattern">
        {Array.from({ length: 25 }, (_, i) => {
          const x = (i % 5) - 2,
            y = Math.floor(i / 5) - 2;
          return (
            <span
              key={i}
              className={
                x === 0 && y === 0
                  ? "origin"
                  : rotated.some((p) => p[0] === x && p[1] === y)
                    ? "hit"
                    : ""
              }
            >
              {x === 0 && y === 0 ? "◆" : ""}
            </span>
          );
        })}
      </div>
      <button
        className="text-button"
        onClick={() => setRotation((rotation + 1) % 4)}
      >
        <RotateCcw size={11} />
        {["Nord", "Est", "Sud", "Ouest"][rotation]}
      </button>
    </div>
  );
}

const blankTechnique = (): Technique => ({
  name: "Nouvelle technique",
  end: 1,
  mana: 0,
  damage: "",
  range: 1,
  pattern: [[0, -1]],
  friendlyFire: false,
  description: "",
});
function PatternEditor({
  points,
  onChange,
}: {
  points: number[][];
  onChange: (points: number[][]) => void;
}) {
  return (
    <div className="pattern-editor">
      <div>
        <b>Zone d’effet</b>
        <p>
          Cliquez sur les cases affectées.
          <br />◆ Personnage · Orientation Nord ↑
        </p>
      </div>
      <div className="pattern editable">
        {Array.from({ length: 25 }, (_, i) => {
          const x = (i % 5) - 2,
            y = Math.floor(i / 5) - 2,
            selected = points.some((p) => p[0] === x && p[1] === y);
          return (
            <button
              type="button"
              aria-label={"Case " + x + ", " + y}
              aria-pressed={selected}
              key={i}
              className={selected ? "hit" : x === 0 && y === 0 ? "origin" : ""}
              onClick={() =>
                onChange(
                  selected
                    ? points.filter((p) => p[0] !== x || p[1] !== y)
                    : [...points, [x, y]],
                )
              }
            >
              {x === 0 && y === 0 ? "◆" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
function TechniqueEditor({
  value,
  onChange,
  onRemove,
}: {
  value: Technique;
  onChange: (v: Technique) => void;
  onRemove: () => void;
}) {
  return (
    <div className="technique-editor">
      <div className="form-grid">
        <label>
          Nom de la technique
          <input
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            required
          />
        </label>
        <label>
          Dégâts
          <input
            value={value.damage}
            placeholder="1d8"
            pattern="[0-9]+d[0-9]+([+-][0-9]+)?"
            onChange={(e) => onChange({ ...value, damage: e.target.value })}
          />
        </label>
      </div>
      <div className="form-grid three">
        {(["end", "mana", "range"] as const).map((key, i) => (
          <label key={key}>
            {["Coût END", "Coût Mana", "Portée"][i]}
            <input
              type="number"
              min="0"
              max={key === "range" ? 1000 : 100}
              value={value[key]}
              onChange={(e) =>
                onChange({ ...value, [key]: Number(e.target.value) })
              }
            />
          </label>
        ))}
      </div>
      <label>
        Description
        <textarea
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </label>
      <label className="inline-label">
        <input
          type="checkbox"
          checked={value.friendlyFire}
          onChange={(e) =>
            onChange({ ...value, friendlyFire: e.target.checked })
          }
        />
        Touche aussi les alliés
      </label>
      <PatternEditor
        points={value.pattern}
        onChange={(pattern) => onChange({ ...value, pattern })}
      />
      <button className="text-button" type="button" onClick={onRemove}>
        <X size={12} />
        Retirer cette technique
      </button>
    </div>
  );
}

export default function Page() {
  const [c, setC] = useState<Character | null>(null),
    [tab, setTab] = useState("Fiche"),
    [filter, setFilter] = useState("Tous"),
    [search, setSearch] = useState(""),
    [modal, setModal] = useState(""),
    [edit, setEdit] = useState<Entry | null>(null),
    [detail, setDetail] = useState<Entry | null>(null),
    [toast, setToast] = useState(""),
    [saving, setSaving] = useState(false),
    [ready, setReady] = useState(false),
    [mobile, setMobile] = useState(false),
    [saved, setSaved] = useState<any[]>([]),
    [campaign, setCampaign] = useState<any>(null),
    [gm, setGm] = useState(false),
    [newName, setNewName] = useState(""),
    [campaignCode, setCampaignCode] = useState("");
  const token = useRef(""),
    gmToken = useRef(""),
    current = useRef<Character | null>(null),
    queue = useRef(Promise.resolve()),
    portrait = useRef<HTMLInputElement>(null);
  const notify = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(""), 5000);
  };
  const remember = (character: Character, key: string) => {
    const existing = JSON.parse(
      localStorage.getItem("cendres-characters") || "[]",
    );
    const list = [
      ...existing.filter((x: any) => x.id !== character.id),
      { id: character.id, token: key, name: character.name },
    ];
    localStorage.setItem("cendres-characters", JSON.stringify(list));
    localStorage.setItem("cendres-active", character.id);
    setSaved(list);
  };
  const apply = (character: Character) => {
    current.current = character;
    setC(character);
  };
  useEffect(() => {
    let live = true;
    async function init() {
      try {
        const params = new URLSearchParams(location.hash.slice(1));
        const list = JSON.parse(
          localStorage.getItem("cendres-characters") || "[]",
        );
        setSaved(list);
        if (params.get("gm")) {
          gmToken.current = params.get("gm")!;
          const data = await api({
            op: "campaign",
            id: params.get("campaign"),
            token: gmToken.current,
          });
          if (!live) return;
          setCampaign({ ...data, id: params.get("campaign") });
          setGm(true);
          setTab("Campagne");
          apply(data.characters[0] || fresh());
          setReady(true);
          return;
        }
        const active = list.find(
          (x: any) => x.id === localStorage.getItem("cendres-active"),
        );
        const id = params.get("character") || active?.id;
        const key = params.get("key") || active?.token;
        const r = id
          ? await api({ op: "load", id, token: key })
          : await api({ op: "create" });
        if (!live) return;
        token.current = r.token || key;
        apply(r.character);
        remember(r.character, token.current);
        setReady(true);
      } catch (e) {
        notify(String((e as Error).message));
        if (live) {
          apply(fresh());
          setReady(false);
        }
      }
    }
    init();
    return () => {
      live = false;
    };
  }, []);
  function change(fn: (c: Character) => void) {
    if (!ready || !current.current?.id) {
      notify("La connexion à votre fiche est nécessaire.");
      return;
    }
    queue.current = queue.current.then(async () => {
      const before = current.current!;
      const next = structuredClone(before);
      fn(next);
      const d = derive(next);
      next.hp = Math.min(next.hp, d.hp);
      next.end = Math.min(next.end, d.end);
      next.mana = Math.min(next.mana, d.mana);
      apply(next);
      setSaving(true);
      try {
        const r = await api({
          op: "save",
          id: next.id,
          token: token.current,
          gmToken: gmToken.current,
          character: next,
        });
        apply(r.character);
        if (!gm) remember(r.character, token.current);
      } catch (e) {
        apply(before);
        notify((e as Error).message);
      } finally {
        setSaving(false);
      }
    });
  }
  async function choose(id: string) {
    await queue.current;
    try {
      const access = saved.find((x) => x.id === id);
      const r = await api({
        op: "load",
        id,
        token: access?.token,
        gmToken: gmToken.current,
      });
      token.current = access?.token || "";
      apply(r.character);
      setReady(true);
      if (access) remember(r.character, access.token);
      setTab("Fiche");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function create() {
    try {
      const r = await api({ op: "create", name: newName || "Sans-nom" });
      token.current = r.token;
      gmToken.current = "";
      setGm(false);
      apply(r.character);
      remember(r.character, r.token);
      setReady(true);
      setModal("");
      setNewName("");
      setTab("Fiche");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function copyLink() {
    const url =
      location.origin + "/#character=" + c!.id + "&key=" + token.current;
    try {
      await navigator.clipboard.writeText(url);
      notify("Lien secret copié. Il permet de modifier votre personnage.");
    } catch {
      setCampaignCode(url);
      setModal("link");
    }
  }
  async function createCampaign() {
    try {
      const r = await api({ op: "campaignCreate", name: newName });
      gmToken.current = r.token;
      localStorage.setItem("cendres-gm", JSON.stringify(r));
      setCampaign({ ...r, characters: [] });
      setGm(true);
      setNewName("");
      setModal("");
      setTab("Campagne");
      notify("Campagne créée. Conservez votre lien GM.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function join() {
    try {
      const r = await api({
        op: "join",
        id: c!.id,
        token: token.current,
        campaignId: campaignCode.trim(),
      });
      apply(r.character);
      setModal("");
      notify("Personnage rattaché à la campagne.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function openCampaign() {
    const local = localStorage.getItem("cendres-gm");
    if (local && !gm) {
      try {
        const a = JSON.parse(local),
          r = await api({ op: "campaign", id: a.id, token: a.token });
        gmToken.current = a.token;
        setCampaign({ ...r, id: a.id });
        setGm(true);
      } catch (e) {
        notify((e as Error).message);
      }
    }
    setTab("Campagne");
  }
  function openEntry(type = "weapon") {
    setEdit(entry("", type));
    setModal("entry");
  }
  function saveEntry(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edit) return;
    const f = new FormData(e.currentTarget);
    const { techniques, special, pattern } = edit;
    const item: Entry = {
      ...edit,
      name: String(f.get("name")),
      description: String(f.get("description")),
      type: String(f.get("type")),
      weight: Number(f.get("weight")),
      armor: Number(f.get("armor")),
      shield: Number(f.get("shield") || 1),
      damage: String(f.get("damage")),
      category: String(f.get("category")),
      rank: Number(f.get("rank")),
      end: Number(f.get("end")),
      mana: Number(f.get("mana")),
      range: Number(f.get("range")),
      target: String(f.get("target")),
      friendlyFire: f.get("friendlyFire") === "on",
      techniques,
      special,
      pattern,
      status: gm ? "approved" : edit.status,
    };
    change((n) => {
      const list = item.type === "spell" ? n.spells : n.inventory;
      const at = list.findIndex((i) => i.id === item.id);
      if (at < 0) list.push(item);
      else list[at] = item;
    });
    setModal("");
  }
  if (!c)
    return (
      <div className="loading">
        <Flame />
        <span>Les braises s’éveillent…</span>
      </div>
    );
  const d = derive(c),
    pending = [...c.inventory, ...c.spells].filter(
      (i) => i.status === "pending",
    ).length;
  const nav = [
    { name: "Fiche", icon: LayoutDashboard },
    { name: "Inventaire", icon: Backpack },
    { name: "Grimoire", icon: Sparkles },
    { name: "Notes", icon: ScrollText },
  ];
  const items = c.inventory.filter(
    (i) =>
      (filter === "Tous" || i.type === filter) &&
      i.name.toLowerCase().includes(search.toLowerCase()),
  );
  const equipment = c.inventory.filter((i) => i.equipped);
  function toggleItem(item: Entry) {
    change((n) => {
      const i = n.inventory.find((x) => x.id === item.id)!;
      i.equipped = !i.equipped;
    });
  }
  const sectionTitle = (Icon: any, title: string, aside?: React.ReactNode) => (
    <div className="section-title">
      <h2>
        <Icon size={15} />
        {title}
      </h2>
      {aside}
    </div>
  );
  const inventory = (
    <section className="panel inventory">
      {sectionTitle(
        Backpack,
        "Inventaire",
        <button className="text-button accent" onClick={() => openEntry()}>
          <Plus size={14} /> Ajouter un objet
        </button>,
      )}
      <div className="inventory-tools">
        <div className="filters">
          {[
            ["Tous", "Tous"],
            ["weapon", "Armes"],
            ["armor", "Armures"],
            ["talisman", "Talismans"],
            ["consumable", "Objets"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={filter === key ? "selected" : ""}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={14} />
          <input
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>OBJET</th>
              <th>POIDS</th>
              <th>VALIDATION</th>
              <th>ÉQUIPÉ</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const Icon = icons[i.type] || Feather;
              return (
                <tr key={i.id}>
                  <td>
                    <button className="item-name" onClick={() => setDetail(i)}>
                      <span className={"item-icon " + i.type}>
                        <Icon size={19} />
                      </span>
                      <span>
                        <b>{i.name}</b>
                        <small>
                          {typeNames[i.type]}
                          {i.type === "armor"
                            ? " · " + armors[i.armor].name
                            : i.category
                              ? " · " + i.category
                              : ""}
                        </small>
                      </span>
                    </button>
                  </td>
                  <td className="weight-value">
                    {i.weight}
                    <Weight size={11} />
                  </td>
                  <td>
                    <span className={"status " + i.status}>
                      {i.status === "approved" ? (
                        <Check size={10} />
                      ) : (
                        <Clock size={10} />
                      )}{" "}
                      {i.status === "approved"
                        ? "Validé"
                        : i.status === "pending"
                          ? "En attente"
                          : "Refusé"}
                    </span>
                  </td>
                  <td>
                    <button
                      aria-label={
                        (i.equipped ? "Retirer " : "Équiper ") + i.name
                      }
                      className={"checkbox " + (i.equipped ? "checked" : "")}
                      onClick={() => toggleItem(i)}
                    >
                      {i.equipped && <Check size={12} />}
                    </button>
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={"Modifier " + i.name}
                      onClick={() => {
                        setEdit(i);
                        setModal("entry");
                      }}
                    >
                      <Ellipsis size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!items.length && (
          <p className="empty">Aucun objet dans cette catégorie.</p>
        )}
      </div>
      <div className="panel-footer">
        <span>
          {c.inventory.length} objets · {equipment.length} équipés
        </span>
        <span>
          <span className="dot" /> Seuls les objets équipés comptent dans le
          poids
        </span>
      </div>
    </section>
  );
  const spells = (
    <section className="panel">
      {sectionTitle(
        Sparkles,
        "Grimoire",
        <button
          className="text-button accent"
          onClick={() => openEntry("spell")}
        >
          <Plus size={14} /> Ajouter un sort
        </button>,
      )}
      <div className="spell-summary">
        <span>
          Caractéristique magique{" "}
          <select
            aria-label="Caractéristique magique"
            value={c.magic}
            onChange={(e) =>
              change((n) => {
                n.magic = e.target.value;
              })
            }
          >
            {["INT", "SAG", "CHA"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </span>
        <span>
          Mod. <b>{sign(d.magic)}</b>
        </span>
        <span>
          Mémoire{" "}
          <b>
            {d.used} / {d.memory}
          </b>
        </span>
      </div>
      {c.spells.map((s) => (
        <div className="spell-row" key={s.id}>
          <span className="item-icon spell">
            <Sparkles size={19} />
          </span>
          <button className="spell-title" onClick={() => setDetail(s)}>
            <b>{s.name}</b>
            <small>
              {ranks[s.rank]} · {s.mana} Mana · {s.end} END
            </small>
          </button>
          <label className="subtle">
            Connu{" "}
            <input
              type="checkbox"
              checked={s.known}
              onChange={(e) =>
                change((n) => {
                  const i = n.spells.find((x) => x.id === s.id)!;
                  i.known = e.target.checked;
                  if (!i.known) i.memorized = false;
                })
              }
            />
          </label>
          <button
            className={"memorize " + (s.memorized ? "active" : "")}
            onClick={() =>
              change((n) => {
                const i = n.spells.find((x) => x.id === s.id)!;
                i.memorized = !i.memorized;
              })
            }
          >
            {s.memorized ? <Check size={12} /> : <Plus size={12} />}{" "}
            {s.memorized ? "Mémorisé" : "Mémoriser"}
          </button>
          <button
            className="icon-button"
            aria-label="Modifier le sort"
            onClick={() => {
              setEdit(s);
              setModal("entry");
            }}
          >
            <Ellipsis size={15} />
          </button>
        </div>
      ))}
      {!c.spells.length && (
        <p className="empty">Votre grimoire attend ses premiers sorts.</p>
      )}
    </section>
  );
  return (
    <div className="app-shell">
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <a className="brand" href="/" aria-label="Cendres accueil">
          <Flame size={28} />
          <span>
            CENDRES<small>CHARACTER COMPANION</small>
          </span>
        </a>
        <div className="workspace-label">VOTRE ESPACE</div>
        <button
          className="character-select"
          onClick={() => setModal("characters")}
        >
          <span className="mini-portrait">
            <Shield size={20} />
          </span>
          <span>
            <b>{c.name}</b>
            <small>Niveau {c.level} · Personnage</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <nav>
          {nav.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={tab === name ? "active" : ""}
              onClick={() => {
                setTab(name);
                setMobile(false);
              }}
            >
              <Icon size={17} />
              {name}
              {name === "Inventaire" && (
                <span className="nav-count">{c.inventory.length}</span>
              )}
              {name === "Grimoire" && (
                <span className="nav-count">{c.spells.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="workspace-label">AUTOUR DE LA TABLE</div>
        <nav>
          <button
            className={tab === "Campagne" ? "active" : ""}
            onClick={openCampaign}
          >
            <Users size={17} />
            Campagne{pending > 0 && <span className="notification-dot" />}
          </button>
          <button
            className={tab === "Règles" ? "active" : ""}
            onClick={() => setTab("Règles")}
          >
            <BookOpen size={17} />
            Référence des règles
            <ArrowUpRight size={12} />
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="ember-box">
            <Flame size={19} />
            <b>La flamme persiste.</b>
            <p>
              Vos histoires méritent
              <br />
              de ne pas être oubliées.
            </p>
          </div>
          <button className="text-button" onClick={() => setModal("new")}>
            <Plus size={15} /> Nouveau personnage
          </button>
          <div className="version">
            CENDRES <span>v1.0 · Soulslike</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            onClick={() => setMobile(!mobile)}
            aria-label="Menu"
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Personnages <ChevronRight size={12} />
            <span>{c.name}</span>
            <ChevronRight size={12} />
            <b>{tab}</b>
          </div>
          <div className="save-state">
            <span className={"dot " + (!ready ? "offline" : "")} />
            {!ready
              ? "Connexion indisponible"
              : saving
                ? "Sauvegarde…"
                : "Sauvegardé"}
            <span className="topbar-divider" />
            <span className="mode-pill">{gm ? "MAÎTRE DU JEU" : "JOUEUR"}</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">LE REGISTRE DES ÂMES</div>
              <h1>{tab === "Fiche" ? "Fiche de personnage" : tab}</h1>
              <p>
                {tab === "Fiche"
                  ? "Chaque détail compte. Chaque braise aussi."
                  : tab === "Inventaire"
                    ? "Tout ce que vous emportez dans les ténèbres."
                    : tab === "Grimoire"
                      ? "Les savoirs qui survivent à l’oubli."
                      : tab === "Campagne"
                        ? "Rassemblez les personnages et validez leurs créations."
                        : tab === "Règles"
                          ? "Vos règles, toujours à portée de main."
                          : "Les traces laissées sur votre chemin."}
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="button"
                onClick={copyLink}
                disabled={gm || !ready}
              >
                <LinkIcon size={14} />
                Partager
              </button>
              <button
                className="button primary"
                onClick={() => setModal("identity")}
              >
                <Settings2 size={14} />
                Modifier le personnage
              </button>
            </div>
          </div>
          {(tab === "Fiche" || tab === "Inventaire" || tab === "Grimoire") && (
            <>
              <div className="sheet-grid">
                <div className="character-column">
                  <section className="panel identity-card">
                    <button
                      className="portrait"
                      onClick={() => portrait.current?.click()}
                      aria-label="Ajouter le portrait du personnage"
                    >
                      {c.portrait ? (
                        <img src={c.portrait} alt={"Portrait de " + c.name} />
                      ) : (
                        <>
                          <div className="portrait-frame">
                            <Shield size={58} strokeWidth={0.65} />
                            <span>VOTRE PORTRAIT</span>
                          </div>
                          <span className="portrait-caption">
                            <ImagePlus size={13} />
                            Ajouter une image
                          </span>
                        </>
                      )}
                      <span className="level-badge">
                        NIV. <b>{c.level}</b>
                      </span>
                    </button>
                    <input
                      type="file"
                      ref={portrait}
                      hidden
                      accept="image/png,image/jpeg,image/webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 750000) {
                          notify("Choisissez une image de moins de 750 Ko.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () =>
                          change((n) => {
                            n.portrait = String(reader.result);
                          });
                        reader.readAsDataURL(file);
                      }}
                    />
                    <div className="identity-text">
                      <h2>{c.name}</h2>
                      <p>{c.subtitle}</p>
                      <span className="character-state">
                        <span className="dot" />
                        {c.death === 3 ? "Mort" : "En vie"}
                        <span className="identity-separator">·</span>
                        {c.campaignId
                          ? "En campagne"
                          : "Personnage indépendant"}
                      </span>
                    </div>
                  </section>
                  <section className="panel attributes">
                    {sectionTitle(
                      Hexagon,
                      "Caractéristiques",
                      <button
                        className="icon-button"
                        aria-label="Modifier les caractéristiques"
                        onClick={() => setModal("identity")}
                      >
                        <Settings2 size={13} />
                      </button>,
                    )}
                    <div className="stat-grid">
                      {statNames.map((s) => (
                        <div className="stat" key={s}>
                          <span>{s}</span>
                          <strong>{c.stats[s]}</strong>
                          <b>{sign(mod(c.stats[s]))}</b>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="panel mobility">
                    {sectionTitle(Footprints, "Mobilité")}
                    <div className="mobility-grid">
                      {[
                        [Footprints, "Déplacement", d.move],
                        [Wind, "Sprint", d.sprint],
                        [Feather, "Esquive", d.dodge],
                      ].map(([Icon, label, value]: any) => (
                        <div key={label}>
                          <Icon size={17} />
                          <strong>
                            {value}
                            <small>cases</small>
                          </strong>
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="panel-footer">
                      Mobilité DEX <b>{d.mobility}</b>
                      <span>Armure prise en compte</span>
                    </div>
                  </section>
                  <div className="quote">
                    <span>“</span>Ce n’est pas la chute qui vous définit,
                    <br />
                    mais ce qu’il reste de vous après.
                    <small>— Parole de veilleur</small>
                  </div>
                </div>
                <div className="content-column">
                  <div className="resources">
                    {(
                      [
                        {
                          key: "hp",
                          label: "POINTS DE VIE",
                          icon: Heart,
                          color: "red",
                        },
                        {
                          key: "end",
                          label: "ENDURANCE",
                          icon: Zap,
                          color: "green",
                        },
                        {
                          key: "mana",
                          label: "MANA",
                          icon: Droplets,
                          color: "blue",
                        },
                      ] as const
                    ).map(({ key, label, icon: Icon, color }) => (
                      <section className={"panel resource " + color} key={key}>
                        <div className="resource-label">
                          <Icon size={15} />
                          {label}
                          <button
                            className="icon-button"
                            aria-label={"Restaurer " + label}
                            title={"Restaurer " + label}
                            onClick={() =>
                              change((n) => {
                                n[key] = derive(n)[key];
                              })
                            }
                          >
                            <RotateCcw size={12} />
                          </button>
                        </div>
                        <div className="resource-value">
                          <button
                            aria-label={"Diminuer " + label}
                            onClick={() =>
                              change((n) => {
                                n[key] = Math.max(0, n[key] - 1);
                              })
                            }
                          >
                            −
                          </button>
                          <div>
                            <input
                              aria-label={label}
                              type="number"
                              min="0"
                              max={d[key]}
                              value={c[key]}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                change((n) => {
                                  n[key] = Math.max(
                                    0,
                                    Math.min(derive(n)[key], v),
                                  );
                                });
                              }}
                            />
                            <span>/ {d[key]}</span>
                          </div>
                          <button
                            aria-label={"Augmenter " + label}
                            onClick={() =>
                              change((n) => {
                                n[key] = Math.min(derive(n)[key], n[key] + 1);
                              })
                            }
                          >
                            +
                          </button>
                        </div>
                        <div className="resource-track">
                          <span
                            style={{
                              width:
                                (d[key] ? (c[key] / d[key]) * 100 : 0) + "%",
                            }}
                          />
                        </div>
                        <div className="resource-foot">
                          {key === "hp" ? (
                            "La volonté de continuer"
                          ) : key === "end" ? (
                            <button onClick={() => setModal("end")}>
                              Bonus / malus temporaires <Settings2 size={10} />
                            </button>
                          ) : (
                            "Caractéristique magique : " +
                            c.magic +
                            " " +
                            sign(d.magic)
                          )}
                        </div>
                      </section>
                    ))}
                  </div>
                  <div className="survival-bar">
                    <div>
                      <Skull size={16} />
                      <b>Dégâts mortels</b>
                      <span>Chaque marque laisse une trace.</span>
                    </div>
                    <div className="death-counter">
                      {[0, 1, 2, 3].map((v) => (
                        <button
                          aria-label={v + " dégâts mortels"}
                          key={v}
                          className={c.death === v ? "active" : ""}
                          onClick={() =>
                            change((n) => {
                              n.death = v;
                            })
                          }
                        >
                          {v === 3 ? <Skull size={13} /> : v}
                        </button>
                      ))}
                      <span className={c.death === 3 ? "dead" : ""}>
                        {c.death === 3
                          ? "Mort"
                          : c.death === 0
                            ? "Aucune blessure mortelle"
                            : c.death + " / 3"}
                      </span>
                    </div>
                  </div>
                  {tab === "Fiche" && (
                    <>
                      <section className="panel equipped">
                        {sectionTitle(
                          Sword,
                          "Équipement actif",
                          <span className="section-caption">
                            Prêt pour le voyage
                          </span>,
                        )}
                        <div className="equipment-grid">
                          {["weapon", "armor", "shield"].map((type) => {
                            const item = equipment.find((i) => i.type === type),
                              Icon = icons[type];
                            return (
                              <button
                                key={type}
                                className={
                                  "equipment-slot " + (!item ? "vacant" : "")
                                }
                                onClick={() =>
                                  item ? setDetail(item) : setTab("Inventaire")
                                }
                              >
                                <span className="equipment-type">
                                  {type === "weapon"
                                    ? "MAIN PRINCIPALE"
                                    : type === "armor"
                                      ? "ARMURE"
                                      : "MAIN SECONDAIRE"}
                                </span>
                                <Icon size={26} strokeWidth={1.2} />
                                <b>{item?.name || "Emplacement libre"}</b>
                                <small>
                                  {item
                                    ? type === "weapon"
                                      ? item.damage + " · " + item.category
                                      : type === "armor"
                                        ? armors[item.armor].name +
                                          " · PV ×" +
                                          armors[item.armor].hp
                                        : item.weight + " poids"
                                    : "Équiper un bouclier"}
                                </small>
                                {item && (
                                  <span className="slot-weight">
                                    <Weight size={10} />
                                    {item.weight}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {equipment
                          .filter(
                            (i) =>
                              !["weapon", "armor", "shield"].includes(i.type),
                          )
                          .map((i) => (
                            <button
                              className="extra-equipment"
                              key={i.id}
                              onClick={() => setDetail(i)}
                            >
                              <Hexagon size={12} />
                              {i.name}
                            </button>
                          ))}
                        <div className="load-row">
                          <div>
                            <Weight size={14} />
                            <b>Charge équipée</b>
                            <strong>
                              {d.weight} <span>/ {d.capacity}</span>
                            </strong>
                          </div>
                          <div className="load-track">
                            <span
                              style={{
                                width:
                                  Math.min(100, (d.weight / d.capacity) * 100) +
                                  "%",
                              }}
                            />
                          </div>
                          <span className={d.overload ? "overload" : "subtle"}>
                            {d.overload
                              ? "Surcharge +" + d.overload
                              : "Charge normale"}
                          </span>
                        </div>
                      </section>
                      {inventory}
                      <div className="bottom-grid">
                        <section className="panel magic-mini">
                          {sectionTitle(
                            Sparkles,
                            "Magie",
                            <button
                              className="text-button"
                              onClick={() => setTab("Grimoire")}
                            >
                              Grimoire <ArrowUpRight size={12} />
                            </button>,
                          )}
                          <div className="magic-numbers">
                            <div>
                              <span>CARACTÉRISTIQUE</span>
                              <b>
                                {c.magic}
                                <small>{sign(d.magic)}</small>
                              </b>
                            </div>
                            <div>
                              <span>MÉMOIRE</span>
                              <b>
                                {d.used}
                                <small>/ {d.memory}</small>
                              </b>
                            </div>
                            <div className="memory-dots">
                              {Array.from({ length: d.memory }, (_, i) => (
                                <i
                                  className={i < d.used ? "filled" : ""}
                                  key={i}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="mini-spells">
                            {c.spells
                              .filter((s) => s.memorized)
                              .map((s) => (
                                <button key={s.id} onClick={() => setDetail(s)}>
                                  {s.name}
                                </button>
                              ))}
                          </div>
                        </section>
                        <section className="panel notes-mini">
                          {sectionTitle(
                            ScrollText,
                            "Notes rapides",
                            <button
                              className="text-button"
                              onClick={() => setTab("Notes")}
                            >
                              Ouvrir <ArrowUpRight size={12} />
                            </button>,
                          )}
                          <p>{c.notes || "Aucune note pour le moment."}</p>
                          <span className="subtle">
                            <Feather size={12} /> Votre histoire continue ici.
                          </span>
                        </section>
                      </div>
                    </>
                  )}
                  {tab === "Inventaire" && inventory}
                  {tab === "Grimoire" && spells}
                </div>
              </div>
            </>
          )}
          {tab === "Notes" && (
            <section className="panel notes-full">
              {sectionTitle(ScrollText, "Journal du personnage")}
              <textarea
                aria-label="Notes du personnage"
                defaultValue={c.notes}
                key={c.id}
                placeholder="Souvenirs, serments, rencontres…"
                onBlur={(e) =>
                  change((n) => {
                    n.notes = e.target.value;
                  })
                }
              />
              <div className="panel-footer">
                Sauvegarde à la sortie du champ.
              </div>
            </section>
          )}
          {tab === "Règles" && (
            <div className="rules-grid">
              {[
                [
                  "Caractéristiques",
                  "Modificateur = floor((CARAC − 10) / 2). Valeurs autorisées : 2 à 28.",
                ],
                [
                  "Points de vie",
                  "Base = 4 + 3 × niveau + 2 × mod CON. Maximum = base × multiplicateur d’armure, arrondi au plus proche. Une augmentation du maximum ne soigne pas.",
                ],
                [
                  "Charge et endurance",
                  "Capacité = 2 + max(0, mod FOR). Seuls les objets équipés pèsent. Maximum autorisé : capacité + 2. END = max(0, 3 − surcharge − malus + bonus). Restauration manuelle.",
                ],
                [
                  "Mobilité",
                  "Mobilité DEX = min(4, max(1, floor((DEX + 4) / 6))). Déplacement et esquive : mobilité moins pénalité, minimum 1. Sprint = 2 × déplacement.",
                ],
                [
                  "Magie et mémoire",
                  "Mod magique : INT, SAG ou CHA. Mémoire = max(0, mod magique). Mana = max(4, 6 + mod magique). Coûts mémoire : inné 0, basique 1, intermédiaire 2, avancé 3, légendaire 4. Un seul sort inné mémorisé.",
                ],
                [
                  "Validation du GM",
                  "Un contenu en attente ou refusé ne peut être équipé ni mémorisé. Une modification mécanique remet le contenu en attente ; une modification descriptive conserve sa validation.",
                ],
                [
                  "Survie",
                  "Les dégâts mortels sont réglés manuellement de 0 à 3. À 3, le personnage est mort. Aucun lien automatique avec les PV.",
                ],
                [
                  "Boucliers",
                  "Petit bouclier : 1 poids. Bouclier : 2. Greatshield : 3. Wall shield : 4. Les règles de blocage ne sont pas calculées.",
                ],
              ].map(([title, text]) => (
                <section className="panel rule" key={title}>
                  <h2>{title}</h2>
                  <p>{text}</p>
                </section>
              ))}
              <section className="panel armor-rules">
                {sectionTitle(Shield, "Armures")}
                <table>
                  <thead>
                    <tr>
                      <th>CATÉGORIE</th>
                      <th>POIDS</th>
                      <th>DÉPL.</th>
                      <th>ESQUIVE</th>
                      <th>PV</th>
                      <th>STABILITÉ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {armors.map((a) => (
                      <tr key={a.name}>
                        <td>{a.name}</td>
                        <td>{a.weight}</td>
                        <td>−{a.move}</td>
                        <td>−{a.dodge}</td>
                        <td>×{a.hp}</td>
                        <td>{a.stability}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          )}
          {tab === "Campagne" && (
            <div className="campaign-view">
              <section className="panel campaign-head">
                <Users size={28} />
                <div>
                  <h2>{campaign?.name || "Le voyage se partage"}</h2>
                  <p>
                    {gm
                      ? "Accès maître du jeu · Validation et suivi des personnages"
                      : c.campaignId
                        ? "Ce personnage est rattaché à une campagne."
                        : "Créez une campagne ou rejoignez celle de votre GM."}
                  </p>
                </div>
                {!gm && (
                  <>
                    <button
                      className="button"
                      onClick={() => {
                        setCampaignCode("");
                        setModal("join");
                      }}
                    >
                      Rejoindre
                    </button>
                    <button
                      className="button primary"
                      onClick={() => {
                        setNewName("");
                        setModal("campaign");
                      }}
                    >
                      <Plus size={14} />
                      Créer une campagne
                    </button>
                  </>
                )}
                {gm && (
                  <button
                    className="button"
                    onClick={async () => {
                      const r = await api({
                        op: "campaign",
                        id: campaign.id,
                        token: gmToken.current,
                      });
                      setCampaign({ ...r, id: campaign.id });
                    }}
                  >
                    Actualiser
                  </button>
                )}
              </section>
              {gm && campaign && (
                <>
                  <section className="panel campaign-access">
                    <p>
                      Code d’invitation <code>{campaign.id}</code>
                    </p>
                    <button
                      className="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(campaign.id);
                        notify("Code d’invitation copié.");
                      }}
                    >
                      <Copy size={13} />
                      Copier le code
                    </button>
                    <button
                      className="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          location.origin +
                            "/#campaign=" +
                            campaign.id +
                            "&gm=" +
                            gmToken.current,
                        );
                        notify("Lien secret GM copié.");
                      }}
                    >
                      <LinkIcon size={13} />
                      Conserver le lien GM
                    </button>
                  </section>
                  {campaign.characters.length === 0 && (
                    <div className="empty campaign-empty">
                      <Users size={30} />
                      <h3>Le groupe se forme ici</h3>
                      <p>
                        Transmettez le code d’invitation aux joueurs.
                        <br />
                        Leurs fiches apparaîtront après avoir rejoint la
                        campagne.
                      </p>
                    </div>
                  )}
                  {campaign.characters.map((character: Character) => (
                    <section
                      className="panel campaign-character"
                      key={character.id}
                    >
                      <div className="section-title">
                        <h2>
                          <Shield size={17} />
                          {character.name}{" "}
                          <small>Niveau {character.level}</small>
                        </h2>
                        <button
                          className="button"
                          onClick={() => choose(character.id)}
                        >
                          Ouvrir la fiche <ArrowUpRight size={13} />
                        </button>
                      </div>
                      {[...character.inventory, ...character.spells]
                        .filter((i) => i.status === "pending")
                        .map((i) => (
                          <div className="review-row" key={i.id}>
                            <div>
                              <b>{i.name}</b>
                              <small>
                                {typeNames[i.type]} · Poids {i.weight} ·{" "}
                                {i.damage || "Sans dégâts"}
                              </small>
                            </div>
                            <button
                              className="text-button"
                              onClick={() => setDetail(i)}
                            >
                              Détails
                            </button>
                            <button
                              className="button"
                              onClick={async () => {
                                try {
                                  const loaded = await api({
                                    op: "load",
                                    id: character.id,
                                    gmToken: gmToken.current,
                                  });
                                  const updated = loaded.character;
                                  [
                                    ...updated.inventory,
                                    ...updated.spells,
                                  ].find((x: Entry) => x.id === i.id).status =
                                    "rejected";
                                  await api({
                                    op: "save",
                                    id: character.id,
                                    gmToken: gmToken.current,
                                    character: updated,
                                  });
                                  const r = await api({
                                    op: "campaign",
                                    id: campaign.id,
                                    token: gmToken.current,
                                  });
                                  setCampaign({ ...r, id: campaign.id });
                                } catch (e) {
                                  notify((e as Error).message);
                                }
                              }}
                            >
                              Refuser
                            </button>
                            <button
                              className="button primary"
                              onClick={async () => {
                                try {
                                  const loaded = await api({
                                    op: "load",
                                    id: character.id,
                                    gmToken: gmToken.current,
                                  });
                                  const updated = loaded.character;
                                  [
                                    ...updated.inventory,
                                    ...updated.spells,
                                  ].find((x: Entry) => x.id === i.id).status =
                                    "approved";
                                  await api({
                                    op: "save",
                                    id: character.id,
                                    gmToken: gmToken.current,
                                    character: updated,
                                  });
                                  const r = await api({
                                    op: "campaign",
                                    id: campaign.id,
                                    token: gmToken.current,
                                  });
                                  setCampaign({ ...r, id: campaign.id });
                                } catch (e) {
                                  notify((e as Error).message);
                                }
                              }}
                            >
                              <Check size={13} />
                              Valider
                            </button>
                          </div>
                        ))}
                    </section>
                  ))}
                </>
              )}
            </div>
          )}
          <footer>
            <span>
              <Flame size={12} /> Une fiche. Une histoire. Une flamme.
            </span>
            <span>Gestion de personnage · Aucun combat automatisé</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button
            className="icon-button"
            aria-label="Fermer"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal("")}>
          <section
            className={"modal " + (modal === "entry" ? "wide" : "")}
            role="dialog"
            aria-modal="true"
            aria-label="Édition"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              aria-label="Fermer"
              onClick={() => setModal("")}
            >
              <X size={18} />
            </button>
            {modal === "identity" && (
              <>
                <div className="eyebrow">IDENTITÉ & ATTRIBUTS</div>
                <h2>Façonnez votre personnage</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    change((n) => {
                      n.name = String(f.get("name"));
                      n.subtitle = String(f.get("subtitle"));
                      n.level = Number(f.get("level"));
                      for (const s of statNames) n.stats[s] = Number(f.get(s));
                    });
                    setModal("");
                  }}
                >
                  <label>
                    Nom
                    <input
                      name="name"
                      defaultValue={c.name}
                      required
                      maxLength={100}
                    />
                  </label>
                  <div className="form-grid">
                    <label>
                      Surnom
                      <input name="subtitle" defaultValue={c.subtitle} />
                    </label>
                    <label>
                      Niveau
                      <input
                        name="level"
                        type="number"
                        min="1"
                        max="1000"
                        defaultValue={c.level}
                        required
                      />
                    </label>
                  </div>
                  <div className="form-grid three">
                    {statNames.map((s) => (
                      <label key={s}>
                        {s}
                        <input
                          name={s}
                          type="number"
                          min="2"
                          max="28"
                          defaultValue={c.stats[s]}
                          required
                        />
                      </label>
                    ))}
                  </div>
                  <button className="button primary submit">
                    Enregistrer les modifications
                  </button>
                </form>
              </>
            )}
            {modal === "end" && (
              <>
                <h2>Endurance temporaire</h2>
                <p>
                  Les effets sont saisis manuellement, quelle que soit leur
                  origine.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    change((n) => {
                      n.bonus = Number(f.get("bonus"));
                      n.malus = Number(f.get("malus"));
                    });
                    setModal("");
                  }}
                >
                  <div className="form-grid">
                    <label>
                      Bonus END
                      <input
                        type="number"
                        name="bonus"
                        min="-100"
                        max="100"
                        defaultValue={c.bonus}
                      />
                    </label>
                    <label>
                      Malus END
                      <input
                        type="number"
                        name="malus"
                        min="-100"
                        max="100"
                        defaultValue={c.malus}
                      />
                    </label>
                  </div>
                  <button className="button primary submit">Appliquer</button>
                </form>
              </>
            )}
            {(modal === "new" || modal === "campaign") && (
              <>
                <div className="eyebrow">UN NOUVEAU CHAPITRE</div>
                <h2>
                  {modal === "new"
                    ? "Un nom dans les cendres"
                    : "Rassemblez votre campagne"}
                </h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    modal === "new" ? create() : createCampaign();
                  }}
                >
                  <label>
                    {modal === "new"
                      ? "Nom du personnage"
                      : "Nom de la campagne"}
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                      maxLength={100}
                      autoFocus
                    />
                  </label>
                  <p>
                    Sans compte. Conservez votre lien secret pour retrouver
                    votre accès.
                  </p>
                  <button className="button primary submit">
                    Créer {modal === "new" ? "le personnage" : "la campagne"}
                  </button>
                </form>
              </>
            )}
            {modal === "join" && (
              <>
                <h2>Rejoindre une campagne</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    join();
                  }}
                >
                  <label>
                    Code fourni par le GM
                    <input
                      value={campaignCode}
                      onChange={(e) => setCampaignCode(e.target.value)}
                      required
                    />
                  </label>
                  <button className="button primary submit">
                    Rattacher ce personnage
                  </button>
                </form>
              </>
            )}
            {modal === "link" && (
              <>
                <h2>Lien secret d’édition</h2>
                <input
                  readOnly
                  value={campaignCode}
                  onFocus={(e) => e.target.select()}
                />
                <p>
                  Toute personne disposant de ce lien peut modifier la fiche.
                </p>
              </>
            )}
            {modal === "characters" && (
              <>
                <h2>Vos personnages</h2>
                {saved.map((s) => (
                  <button
                    className="character-list-item"
                    key={s.id}
                    onClick={() => {
                      setGm(false);
                      gmToken.current = "";
                      choose(s.id);
                      setModal("");
                    }}
                  >
                    <Shield size={18} />
                    {s.name}
                    <ChevronRight size={14} />
                  </button>
                ))}
                <button
                  className="button primary submit"
                  onClick={() => {
                    setNewName("");
                    setModal("new");
                  }}
                >
                  <Plus size={14} />
                  Nouveau personnage
                </button>
              </>
            )}
            {modal === "entry" && edit && (
              <>
                <div className="eyebrow">
                  {edit.type === "spell" ? "GRIMOIRE" : "INVENTAIRE"}
                </div>
                <h2>
                  {edit.name
                    ? "Modifier " + edit.name
                    : "Ajouter " +
                      (edit.type === "spell" ? "un sort" : "un objet")}
                </h2>
                <form onSubmit={saveEntry}>
                  <div className="form-grid">
                    <label>
                      Nom
                      <input
                        name="name"
                        defaultValue={edit.name}
                        required
                        maxLength={100}
                      />
                    </label>
                    <label>
                      Type
                      <select
                        name="type"
                        value={edit.type}
                        onChange={(e) =>
                          setEdit({ ...edit, type: e.target.value })
                        }
                        disabled={edit.type === "spell"}
                      >
                        {Object.entries(typeNames)
                          .filter(([k]) =>
                            edit.type === "spell"
                              ? k === "spell"
                              : k !== "spell",
                          )
                          .map(([k, v]) => (
                            <option value={k} key={k}>
                              {v}
                            </option>
                          ))}
                      </select>
                      {edit.type === "spell" && (
                        <input type="hidden" name="type" value="spell" />
                      )}
                    </label>
                  </div>
                  <label>
                    Description
                    <textarea
                      name="description"
                      defaultValue={edit.description}
                    />
                  </label>
                  <div className="form-grid three">
                    <label>
                      Poids
                      <input
                        type="number"
                        name="weight"
                        defaultValue={edit.weight}
                        min="0"
                        max="100"
                        required
                      />
                    </label>
                    <label>
                      Dégâts
                      <input
                        name="damage"
                        defaultValue={edit.damage}
                        placeholder="1d8 / 2d6+2"
                        pattern="[0-9]+d[0-9]+([+-][0-9]+)?"
                      />
                    </label>
                    <label>
                      Catégorie
                      <input
                        name="category"
                        defaultValue={edit.category}
                        placeholder="Épée longue…"
                      />
                    </label>
                    <label>
                      Catégorie d’armure
                      <select name="armor" defaultValue={edit.armor}>
                        {armors.map((a, i) => (
                          <option value={i} key={a.name}>
                            {a.name} · poids {a.weight}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Bouclier
                      <select name="shield" defaultValue={edit.shield}>
                        {[
                          "Petit bouclier",
                          "Bouclier",
                          "Greatshield",
                          "Wall shield",
                        ].map((s, i) => (
                          <option value={i + 1} key={s}>
                            {s} · {i + 1}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Rang du sort
                      <select name="rank" defaultValue={edit.rank}>
                        {ranks.map((s, i) => (
                          <option value={i} key={s}>
                            {s} · mémoire {i}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Coût END
                      <input
                        name="end"
                        type="number"
                        min="0"
                        max="100"
                        defaultValue={edit.end}
                      />
                    </label>
                    <label>
                      Coût Mana
                      <input
                        name="mana"
                        type="number"
                        min="0"
                        max="100"
                        defaultValue={edit.mana}
                      />
                    </label>
                    <label>
                      Portée (cases)
                      <input
                        name="range"
                        type="number"
                        min="0"
                        max="1000"
                        defaultValue={edit.range}
                      />
                    </label>
                  </div>
                  <details>
                    <summary>Patterns, ciblage et techniques</summary>
                    <label>
                      Ciblage
                      <input name="target" defaultValue={edit.target} />
                    </label>
                    <label className="inline-label">
                      <input
                        type="checkbox"
                        name="friendlyFire"
                        defaultChecked={edit.friendlyFire}
                      />
                      Touche aussi les alliés
                    </label>
                    <PatternEditor
                      points={edit.pattern}
                      onChange={(points) =>
                        setEdit({ ...edit, pattern: points })
                      }
                    />
                    {edit.techniques.map((t, index) => (
                      <TechniqueEditor
                        key={index}
                        value={t}
                        onChange={(value) =>
                          setEdit({
                            ...edit,
                            techniques: edit.techniques.map((x, i) =>
                              i === index ? value : x,
                            ),
                          })
                        }
                        onRemove={() =>
                          setEdit({
                            ...edit,
                            techniques: edit.techniques.filter(
                              (_, i) => i !== index,
                            ),
                          })
                        }
                      />
                    ))}
                    <button
                      type="button"
                      className="button"
                      onClick={() =>
                        setEdit({
                          ...edit,
                          techniques: [...edit.techniques, blankTechnique()],
                        })
                      }
                    >
                      <Plus size={12} />
                      Ajouter une technique
                    </button>
                    {edit.special ? (
                      <TechniqueEditor
                        value={edit.special}
                        onChange={(value) =>
                          setEdit({ ...edit, special: value })
                        }
                        onRemove={() => setEdit({ ...edit, special: null })}
                      />
                    ) : (
                      <button
                        type="button"
                        className="button"
                        onClick={() =>
                          setEdit({ ...edit, special: blankTechnique() })
                        }
                      >
                        <Sparkles size={12} />
                        Compétence spéciale
                      </button>
                    )}
                  </details>
                  <p className="subtle">
                    {gm
                      ? "Les créations du GM sont automatiquement validées."
                      : "Toute modification mécanique nécessite la validation du GM."}{" "}
                    Poids des armures et boucliers calculé automatiquement.
                  </p>
                  <button className="button primary submit">Enregistrer</button>
                </form>
              </>
            )}
          </section>
        </div>
      )}
      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={detail.name}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              aria-label="Fermer"
              onClick={() => setDetail(null)}
            >
              <X size={18} />
            </button>
            <div className="eyebrow">
              {typeNames[detail.type]} ·{" "}
              {detail.status === "approved"
                ? "Validé"
                : detail.status === "pending"
                  ? "En attente"
                  : "Refusé"}
            </div>
            <h2>{detail.name}</h2>
            <p>{detail.description || "Aucune description."}</p>
            <div className="detail-chips">
              <span>Poids {detail.weight}</span>
              {detail.damage && <span>Dégâts {detail.damage}</span>}
              {detail.type === "spell" && (
                <>
                  <span>{ranks[detail.rank]}</span>
                  <span>{detail.mana} Mana</span>
                  <span>{detail.end} END</span>
                </>
              )}
              {detail.type === "armor" && (
                <>
                  <span>PV ×{armors[detail.armor].hp}</span>
                  <span>Stabilité : {armors[detail.armor].stability}</span>
                </>
              )}
            </div>
            {detail.type === "spell" && (
              <div className="technique">
                <div>
                  <h3>{detail.target}</h3>
                  <p>
                    Portée {detail.range} ·{" "}
                    {detail.friendlyFire ? "Alliés affectés" : "Sans tir allié"}
                  </p>
                </div>
                <Pattern points={detail.pattern} />
              </div>
            )}
            {[
              ...detail.techniques,
              ...(detail.special ? [detail.special] : []),
            ].map((t, i) => (
              <div className="technique" key={i}>
                <div>
                  <h3>{t.name}</h3>
                  <p>{t.description}</p>
                  <small>
                    {t.end} END · {t.mana} Mana · Portée {t.range}
                    <br />
                    {t.damage} ·{" "}
                    {t.friendlyFire ? "Alliés affectés" : "Sans tir allié"}
                  </small>
                </div>
                <Pattern points={t.pattern} />
              </div>
            ))}
            <p className="subtle">
              Les patterns sont des références. Aucune attaque n’est résolue.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
