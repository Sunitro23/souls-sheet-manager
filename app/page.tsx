"use client";
import {
  readCampaignAccess,
  rememberCampaignAccess,
  type CampaignAccess,
} from "../lib/access";
import { useState, useEffect, useRef } from "react";
import {
  Trash2,
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
  LockKeyhole,
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
  type ZoneOrigin,
  weaponTypes,
  itemWeight,
  weaponCategory,
} from "../lib/rules";
import {
  categoryIds,
  catalogueFor,
  predefinedTechniques,
  referencedTechniques,
  rankLabels,
  effectText,
  patternBounds,
  type CatalogTechnique,
  techniqueProgress,
  techniqueKnown,
  techniqueCosts,
  techniqueKey,
  personalProgress,
  type PersonalSkill,
} from "../lib/combat";
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
const draftCharacter = (): Character => ({
  ...fresh(),
  name: "Nouveau personnage",
  level: 1,
  stats: { FOR: 10, DEX: 10, CON: 10, INT: 10, SAG: 10, CHA: 10 },
  inventory: [],
  spells: [],
  hp: 7,
  end: 3,
  mana: 6,
  notes: "",
});
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
function Pattern({
  points,
  origin = "self",
}: {
  points: number[][];
  origin?: ZoneOrigin;
}) {
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
  const bounds = patternBounds(rotated);
  return (
    <div className="pattern-wrap">
      <small>{origin === "self" ? "◆ Personnage" : "◆ Cible choisie"}</small>
      <div className="pattern-scroll">
        <div
          className="pattern"
          style={{ gridTemplateColumns: `repeat(${bounds.columns},15px)` }}
        >
          {Array.from({ length: bounds.columns * bounds.rows }, (_, i) => {
            const x = (i % bounds.columns) + bounds.minX,
              y = Math.floor(i / bounds.columns) + bounds.minY;
            return (
              <span
                key={i}
                className={[
                  x === 0 && y === 0 ? "origin" : "",
                  rotated.some((p) => p[0] === x && p[1] === y) ? "hit" : "",
                ].join(" ")}
              >
                {x === 0 && y === 0 ? "◆" : ""}
              </span>
            );
          })}
        </div>
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

function CatalogPreview({ item }: { item: Entry }) {
  const techniques = predefinedTechniques(item);
  if (!techniques.length)
    return (
      <p className="subtle">
        Aucune technique prédéfinie fournie pour {item.category}.
      </p>
    );
  return (
    <div className="catalog-preview">
      <p className="subtle">
        {techniques.length} techniques · Dégâts de l’arme :{" "}
        {item.damage || "à définir"}
      </p>
      {techniques.map((t) => (
        <details className="catalog-technique" key={t.catalogId}>
          <summary>
            <b>{t.name}</b>
            <span>{rankLabels[t.rank]}</span>
            <strong>{t.end} END</strong>
          </summary>
          <div className="technique">
            <div>
              <p>
                {t.rangeKind === "placement"
                  ? "Portée de placement"
                  : "Portée d’attaque"}{" "}
                : {t.rangeMin}–{t.range} cases
              </p>
              {effectText(t.effects) && <p>{effectText(t.effects)}</p>}
            </div>
            <Pattern points={t.pattern} origin={t.origin} />
          </div>
        </details>
      ))}
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
  origin: "self",
});
function PatternEditor({
  points,
  origin = "self",
  onChange,
}: {
  points: number[][];
  origin?: ZoneOrigin;
  onChange: (points: number[][]) => void;
}) {
  return (
    <div className="pattern-editor">
      <div>
        <b>Zone d’effet</b>
        <p>
          Cliquez sur les cases affectées.
          <br />◆ {origin === "self" ? "Personnage" : "Cible choisie"} ·
          Orientation Nord ↑
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
  special = false,
}: {
  special?: boolean;
  value: Technique;
  onChange: (v: Technique) => void;
  onRemove: () => void;
}) {
  return (
    <div className="technique-editor">
      <label>
        Origine de la zone
        <select
          value={value.origin ?? "self"}
          onChange={(e) =>
            onChange({ ...value, origin: e.target.value as ZoneOrigin })
          }
        >
          <option value="self">Personnage (mêlée)</option>
          <option value="target">Cible choisie (à distance)</option>
        </select>
      </label>
      <div className="form-grid">
        <label>
          Nom de la technique
          <input
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            required
          />
        </label>
        {special && (
          <label>
            Dégâts
            <input
              value={value.damage}
              placeholder="1d8"
              pattern="[0-9]+d[0-9]+([+-][0-9]+)?"
              onChange={(e) => onChange({ ...value, damage: e.target.value })}
            />
          </label>
        )}
      </div>
      <div className="form-grid three">
        {(["end", "mana", "range"] as const)
          .filter((key) => special || key !== "mana")
          .map((key) => (
            <label key={key}>
              {
                [
                  "Coût END",
                  "Coût Mana",
                  value.origin === "target" ? "Portée de placement" : "Portée",
                ][key === "end" ? 0 : key === "mana" ? 1 : 2]
              }
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
        origin={value.origin}
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

export default function Page({
  initialTab = "Fiche",
}: { initialTab?: string } = {}) {
  const [c, setC] = useState<Character | null>(null),
    [tab, setTab] = useState(initialTab),
    [filter, setFilter] = useState("Tous"),
    [search, setSearch] = useState(""),
    [modal, setModal] = useState(""),
    [edit, setEdit] = useState<Entry | null>(null),
    [editSkill, setEditSkill] = useState<PersonalSkill | null>(null),
    [detail, setDetail] = useState<Entry | null>(null),
    [detailOwner, setDetailOwner] = useState<Character | null>(null),
    [toast, setToast] = useState(""),
    [saving, setSaving] = useState(false),
    [deletingCampaign, setDeletingCampaign] = useState(false),
    [ready, setReady] = useState(false),
    [booting, setBooting] = useState(true),
    [mobile, setMobile] = useState(false),
    [saved, setSaved] = useState<any[]>([]),
    [ownedSheets, setOwnedSheets] = useState<Character[]>([]),
    [characterSearch, setCharacterSearch] = useState(""),
    [campaign, setCampaign] = useState<any>(null),
    [gm, setGm] = useState(false),
    [accesses, setAccesses] = useState<CampaignAccess[]>([]),
    [memberships, setMemberships] = useState<{ id: string; name: string }[]>(
      [],
    ),
    [newName, setNewName] = useState(""),
    [campaignCode, setCampaignCode] = useState(""),
    [newStats, setNewStats] = useState<Record<string, number>>({
      FOR: 10,
      DEX: 10,
      CON: 10,
      INT: 10,
      SAG: 10,
      CHA: 10,
    }),
    [newLevel, setNewLevel] = useState(1),
    [newMagic, setNewMagic] = useState("INT"),
    [reviewFilter, setReviewFilter] = useState("pending");
  const token = useRef(""),
    gmToken = useRef(""),
    campaignToken = useRef(""),
    accessRef = useRef<CampaignAccess[]>([]),
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
      {
        id: character.id,
        token: key,
        name: character.name,
        campaignId: character.campaignId,
      },
    ];
    localStorage.setItem("cendres-characters", JSON.stringify(list));
    localStorage.setItem("cendres-active", character.id);
    setSaved(list);
    setOwnedSheets((previous) => [
      ...previous.filter((x) => x.id !== character.id),
      character,
    ]);
  };
  const apply = (character: Character) => {
    current.current = character;
    setC(character);
  };
  function storeAdmin(access: CampaignAccess) {
    accessRef.current = rememberCampaignAccess(localStorage, access);
    setAccesses(accessRef.current);
  }
  function rememberMembership(info: { id: string; name: string }) {
    const list = JSON.parse(
      localStorage.getItem("cendres-memberships") || "[]",
    );
    const next = [...list.filter((x: any) => x.id !== info.id), info];
    localStorage.setItem("cendres-memberships", JSON.stringify(next));
    setMemberships(next);
  }
  async function navigateWorkspace(
    event: import("react").MouseEvent<HTMLAnchorElement>,
  ) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    const href = event.currentTarget.href;
    await queue.current;
    location.assign(href);
  }
  async function selectCampaign(
    id: string,
    destination = "Personnages",
    replace = false,
  ) {
    await queue.current;
    const cap = accessRef.current.find((x) => x.id === id);
    if (cap) {
      const data = await api({ op: "campaign", id, token: cap.token });
      campaignToken.current = cap.token;
      setCampaign({ ...data, id, isAdmin: true });
    } else {
      const data = await api({ op: "campaignInfo", id });
      campaignToken.current = "";
      setCampaign({ ...data, isAdmin: false, characters: [] });
      rememberMembership(data);
    }
    if (current.current?.campaignId !== id) {
      apply(draftCharacter());
      token.current = "";
      gmToken.current = "";
      setGm(false);
      setReady(false);
    }
    localStorage.setItem("cendres-active-campaign", id);
    setModal("");
    setTab(destination);
    setMobile(false);
    const path =
      destination === "Réglages"
        ? "/campagne"
        : destination === "Validations"
          ? "/validations"
          : "/personnages";
    if (replace) history.replaceState(null, "", path);
    else history.pushState(null, "", path);
  }
  async function acceptCharacter(r: any, key: string) {
    const cap = accessRef.current.find((x) => x.id === r.character.campaignId);
    if (cap && !r.permissions?.canValidate)
      r = await api({
        op: "load",
        id: r.character.id,
        token: key,
        gmToken: cap.token,
      });
    gmToken.current = cap?.token || "";
    token.current = key;
    setGm(!!r.permissions?.canValidate);
    apply(r.character);
    setReady(true);
    if (key) remember(r.character, key);
    if (r.campaign) rememberMembership(r.campaign);
  }
  function newCharacter() {
    if (!campaign?.id) {
      setTab("Campagnes");
      return;
    }
    setNewName("");
    setModal("new");
  }
  useEffect(() => {
    let live = true;
    async function init() {
      setBooting(true);
      try {
        accessRef.current = readCampaignAccess(localStorage);
        setAccesses(accessRef.current);
        setMemberships(
          JSON.parse(localStorage.getItem("cendres-memberships") || "[]"),
        );
        const list = JSON.parse(
          localStorage.getItem("cendres-characters") || "[]",
        );
        setSaved(list);
        apply(draftCharacter());
        const params = new URLSearchParams(location.hash.slice(1));
        if (params.get("gm") && params.get("campaign")) {
          const id = params.get("campaign")!,
            key = params.get("gm")!;
          const data = await api({ op: "campaign", id, token: key });
          storeAdmin({ id, token: key, name: data.name });
        }
        // Refresh memberships, including characters preserved after campaign deletion.
        for (const item of list) {
          try {
            const r = await api({ op: "load", id: item.id, token: item.token });
            remember(r.character, item.token);
            if (r.campaign) rememberMembership(r.campaign);
            else if (item.campaignId) {
              const remaining = JSON.parse(
                localStorage.getItem("cendres-memberships") || "[]",
              ).filter((x: any) => x.id !== item.campaignId);
              localStorage.setItem(
                "cendres-memberships",
                JSON.stringify(remaining),
              );
              setMemberships(remaining);
              accessRef.current = accessRef.current.filter(
                (x) => x.id !== item.campaignId,
              );
              setAccesses(accessRef.current);
              localStorage.setItem(
                "cendres-campaigns",
                JSON.stringify(accessRef.current),
              );
              const legacy = JSON.parse(
                localStorage.getItem("cendres-gm") || "null",
              );
              if (legacy?.id === item.campaignId)
                localStorage.removeItem("cendres-gm");
            }
          } catch {}
        }
        if (params.get("character") && params.get("key")) {
          const r = await api({
            op: "load",
            id: params.get("character"),
            token: params.get("key"),
          });
          if (!live) return;
          await acceptCharacter(r, params.get("key")!);
          if (r.campaign)
            await selectCampaign(r.campaign.id, "Personnages", true);
          setTab("Fiche");
          history.replaceState(null, "", "/");
        } else {
          const active =
            params.get("campaign") ||
            localStorage.getItem("cendres-active-campaign");
          const destination = initialTab === "DM" ? "Validations" : initialTab;
          if (
            active &&
            ["Personnages", "Validations", "Réglages"].includes(destination)
          ) {
            await selectCampaign(active, destination, true);
            history.replaceState(
              null,
              "",
              destination === "Validations"
                ? "/validations"
                : destination === "Réglages"
                  ? "/campagne"
                  : "/personnages",
            );
          } else {
            setTab(
              ["Personnages", "Validations", "Réglages"].includes(destination)
                ? destination
                : "Campagnes",
            );
            setModal("");
          }
        }
      } catch (e) {
        notify((e as Error).message);
        if (live) {
          apply(draftCharacter());
          setTab("Campagnes");
        }
      } finally {
        if (live) setBooting(false);
      }
    }
    init();
    const onBack = () => {
      setModal("");
      setMobile(false);
      setTab(
        location.pathname === "/personnages"
          ? "Personnages"
          : location.pathname === "/validations"
            ? "Validations"
            : location.pathname === "/campagne"
              ? "Réglages"
              : location.pathname === "/campagnes" || !current.current?.id
                ? "Campagnes"
                : "Fiche",
      );
    };
    window.addEventListener("popstate", onBack);
    window.addEventListener("hashchange", init);
    return () => {
      window.removeEventListener("popstate", onBack);
      window.removeEventListener("hashchange", init);
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
        if (token.current) remember(r.character, token.current);
      } catch (e) {
        apply(before);
        notify((e as Error).message);
      } finally {
        setSaving(false);
      }
    });
  }
  function learn(t: CatalogTechnique) {
    if (!current.current?.id) return;
    queue.current = queue.current.then(async () => {
      setSaving(true);
      try {
        const r = await api({
          op: "learnTechnique",
          id: current.current!.id,
          token: token.current,
          gmToken: gmToken.current,
          revision: current.current!.revision,
          weaponTypeId: t.weaponTypeId,
          techniqueId: t.catalogId,
        });
        apply(r.character);
        notify(`${t.name} apprise pour toutes les armes de ce type.`);
      } catch (e) {
        notify((e as Error).message);
      } finally {
        setSaving(false);
      }
    });
  }
  function learnSkill(id: string) {
    if (!current.current?.id) return;
    queue.current = queue.current.then(async () => {
      setSaving(true);
      try {
        const r = await api({
          op: "learnSkill",
          id: current.current!.id,
          token: token.current,
          gmToken: gmToken.current,
          revision: current.current!.revision,
          skillId: id,
        });
        apply(r.character);
        notify("Compétence personnelle acquise.");
      } catch (e) {
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
        gmToken: accessRef.current.find(
          (x) => x.id === (access?.campaignId || campaign?.id),
        )?.token,
      });
      if (r.campaign && r.campaign.id !== campaign?.id)
        await selectCampaign(r.campaign.id);
      await acceptCharacter(r, access?.token || "");
      setTab("Fiche");
      history.pushState(null, "", "/");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function create() {
    try {
      const r = await api({
        op: "create",
        campaignId: campaign?.id,
        gmToken: accessRef.current.find((x) => x.id === campaign?.id)?.token,
        name: newName,
        stats: newStats,
        level: newLevel,
        magic: newMagic,
      });
      await acceptCharacter(r, r.token);
      setModal("");
      setNewName("");
      setTab("Fiche");
      history.replaceState(null, "", "/");
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
      storeAdmin({ id: r.id, token: r.token, name: r.name });
      rememberMembership({ id: r.id, name: r.name });
      await selectCampaign(r.id);
      setNewName("");
      notify(
        "Campagne créée. Vous pouvez jouer et administrer depuis ce même espace.",
      );
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function deleteCampaign() {
    if (!campaign?.isAdmin || deletingCampaign) return;
    setDeletingCampaign(true);
    try {
      await queue.current;
      const id = campaign.id;
      await api({ op: "campaignDelete", id, token: campaignToken.current });
      accessRef.current = accessRef.current.filter((x) => x.id !== id);
      setAccesses(accessRef.current);
      localStorage.setItem(
        "cendres-campaigns",
        JSON.stringify(accessRef.current),
      );
      const legacy = JSON.parse(localStorage.getItem("cendres-gm") || "null");
      if (legacy?.id === id) localStorage.removeItem("cendres-gm");
      localStorage.removeItem("cendres-active-campaign");
      const remaining = memberships.filter((x) => x.id !== id);
      setMemberships(remaining);
      localStorage.setItem("cendres-memberships", JSON.stringify(remaining));
      const characters = saved.map((x) =>
        x.campaignId === id ? { ...x, campaignId: null } : x,
      );
      setSaved(characters);
      localStorage.setItem("cendres-characters", JSON.stringify(characters));
      if (current.current?.campaignId === id) {
        apply(draftCharacter());
        token.current = "";
        gmToken.current = "";
        setReady(false);
        setGm(false);
      }
      campaignToken.current = "";
      setCampaign(null);
      setTab("Campagnes");
      history.replaceState(null, "", "/campagnes");
      setModal("");
      setTab("Campagnes");
      history.replaceState(null, "", "/campagnes");
      notify("Campagne supprimée. Les personnages sont conservés.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setDeletingCampaign(false);
    }
  }
  async function join() {
    try {
      await selectCampaign(campaignCode.trim());
      notify("Campagne sélectionnée. Créez votre personnage.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function attachLegacy(access: any) {
    try {
      await queue.current;
      const r = await api({
        op: "join",
        id: access.id,
        token: access.token,
        campaignId: campaign.id,
        gmToken: accessRef.current.find((x) => x.id === campaign.id)?.token,
      });
      await acceptCharacter(r, access.token);
      if (campaign.isAdmin) await refreshCampaign();
      setTab("Fiche");
      notify("Personnage rattaché à la campagne.");
    } catch (e) {
      notify((e as Error).message);
    }
  }

  async function refreshCampaign() {
    const r = await api({
      op: "campaign",
      id: campaign.id,
      token: campaignToken.current,
    });
    setCampaign({ ...r, id: campaign.id, isAdmin: true });
  }
  async function reviewCharacter(
    character: Character,
    status: "approved" | "rejected",
  ) {
    try {
      await api({
        op: "reviewCharacter",
        id: character.id,
        gmToken: campaignToken.current,
        revision: character.revision,
        status,
      });
      await refreshCampaign();
    } catch (e) {
      notify((e as Error).message);
      await refreshCampaign().catch(() => {});
    }
  }
  async function reviewItem(
    character: Character,
    item: Entry | PersonalSkill,
    status: "approved" | "rejected",
  ) {
    try {
      const loaded = await api({
        op: "load",
        id: character.id,
        gmToken: campaignToken.current,
      });
      if (loaded.character.revision !== character.revision) {
        await refreshCampaign();
        throw Error(
          "La fiche a changé. Vérifiez le contenu actualisé avant de valider.",
        );
      }
      const target = [
        ...loaded.character.inventory,
        ...loaded.character.spells,
        ...(loaded.character.personalSkills ?? []),
      ].find((i: Entry) => i.id === item.id);
      target.status = status;
      if (status === "rejected" && "equipped" in target) {
        target.equipped = false;
        target.memorized = false;
      }
      await api({
        op: "save",
        id: character.id,
        gmToken: campaignToken.current,
        character: loaded.character,
      });
      await refreshCampaign();
    } catch (e) {
      notify((e as Error).message);
    }
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
      description:
        edit.type === "spell"
          ? String(f.get("description") ?? "")
          : edit.description,
      type: String(f.get("type")),
      weight: Number(f.get("weight")),
      armor: Number(f.get("armor")),
      shield: Number(f.get("shield") || 1),
      damage: String(f.get("damage") ?? ""),
      category: String(f.get("category") ?? ""),
      rank: Number(f.get("rank")),
      end: Number(f.get("end")),
      mana: Number(f.get("mana")),
      range: Number(f.get("range") ?? 1),
      target: String(f.get("target") ?? "Une cible"),
      origin: (f.get("origin") ?? edit.origin ?? "self") as ZoneOrigin,
      friendlyFire: f.get("friendlyFire") === "on",
      techniques,
      special,
      pattern,
      status: gm ? "approved" : edit.status,
    };
    if (item.type !== "weapon" && item.type !== "shield") {
      item.techniques = [];
      item.special = null;
    }
    if (item.type !== "spell") {
      item.rank = 0;
      item.memorized = false;
      item.origin = "self";
      item.end = 0;
      item.mana = 0;
      item.range = 1;
      item.pattern = [];
      item.friendlyFire = false;
      item.target = "";
    }
    item.weight = itemWeight(item);
    change((n) => {
      // A changed type replaces the same object rather than keeping irrelevant mechanics.
      const list = item.type === "spell" ? n.spells : n.inventory;
      const at = list.findIndex((i) => i.id === item.id);
      if (at < 0) list.push(item);
      else list[at] = item;
    });
    setModal("");
  }
  if (!c || booting)
    return (
      <div className="loading">
        <Flame />
        <span>Chargement…</span>
      </div>
    );
  const detailCharacter =
    detailOwner && detailOwner.id !== c.id ? detailOwner : c;
  const detailTraining = techniqueProgress(detailCharacter);
  const training = techniqueProgress(c),
    personal = personalProgress(c);
  const d = derive(c),
    pending = campaign?.isAdmin
      ? campaign.characters.reduce(
          (count: number, ch: Character) =>
            count +
            (ch.reviewStatus === "pending" ? 1 : 0) +
            [
              ...ch.inventory,
              ...ch.spells,
              ...(ch.personalSkills ?? []),
            ].filter((i) => i.status === "pending").length,
          0,
        )
      : 0;
  const campaignChoices = Array.from(
    new Map([...memberships, ...accesses].map((x) => [x.id, x])).values(),
  );
  const characterMap = new Map<string, Character>();
  for (const ch of [
    ...(campaign?.isAdmin ? campaign.characters : []),
    ...ownedSheets,
    ...(c.id ? [c] : []),
  ]) {
    if (
      ch.campaignId === campaign?.id &&
      (!characterMap.has(ch.id) ||
        characterMap.get(ch.id)!.revision <= ch.revision)
    )
      characterMap.set(ch.id, ch);
  }
  const visibleCharacters = [...characterMap.values()];
  const nav = [
    { name: "Fiche", icon: LayoutDashboard },
    { name: "Inventaire", icon: Backpack },
    { name: "Grimoire", icon: Sparkles },
    { name: "Techniques", icon: Sword },
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
              <th>DÉGÂTS</th>
              <th>ÉQUIPÉ</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const Icon = icons[i.type] || Feather;
              return (
                <tr
                  key={i.id}
                  className={i.status !== "approved" ? "item-unvalidated" : ""}
                  title={
                    i.status === "pending"
                      ? "En attente de validation"
                      : i.status === "rejected"
                        ? "Refusé"
                        : undefined
                  }
                >
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
                    {itemWeight(i)}
                    <Weight size={11} />
                  </td>
                  <td>{i.type === "weapon" ? i.damage || "—" : "—"}</td>
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
      {!c.spells.length && <p className="empty">Aucun sort.</p>}
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
        <nav className="workspace-navigation" aria-label="Gestion">
          <a
            href="/campagnes"
            onClick={navigateWorkspace}
            className={["Campagnes", "Réglages"].includes(tab) ? "active" : ""}
          >
            <Users size={20} />
            Campagnes
          </a>
          <a
            href="/personnages"
            onClick={navigateWorkspace}
            className={tab === "Personnages" ? "active" : ""}
          >
            <Shield size={20} />
            Personnages
          </a>
          {(campaign?.isAdmin || accesses.length > 0) && (
            <a
              href="/validations"
              onClick={navigateWorkspace}
              className={tab === "Validations" ? "active" : ""}
            >
              <CheckCheck size={20} />
              Validations
              {pending > 0 && <span className="nav-count">{pending}</span>}
            </a>
          )}
        </nav>
        <div className="sidebar-divider" />
        {ready && c.id && (
          <>
            <div className="workspace-label">FICHE ACTIVE</div>

            <button
              className="character-select"
              onClick={() => {
                setTab("Personnages");
                setMobile(false);
                history.pushState(null, "", "/personnages");
              }}
            >
              <span className="mini-portrait">
                <Shield size={20} />
              </span>
              <span>
                <b>{c.id ? c.name : "Choisir un personnage"}</b>
                <small>
                  {c.id
                    ? `Niveau ${c.level} · Personnage`
                    : campaign?.name || "Sélectionnez une campagne"}
                </small>
              </span>
              <ChevronDown size={14} />
            </button>
            <nav>
              {nav.map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  disabled={!ready || !c.campaignId}
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
          </>
        )}
        <div className="sidebar-divider" />

        <nav>
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
            <span>{campaign?.name || "Mon espace"}</span>
            <ChevronRight size={14} />
            <b>{tab}</b>
          </div>
          <div className="save-state">
            {["Campagnes", "Personnages", "Validations", "Réglages"].includes(
              tab,
            )
              ? (campaign ? campaign.isAdmin : accesses.length > 0)
                ? "Admin et joueur"
                : "Joueur"
              : saving
                ? "Sauvegarde…"
                : ready
                  ? "Sauvegardé"
                  : "Choisir un personnage"}
          </div>
        </header>
        <main>
          <nav
            className="mobile-workspace-navigation"
            aria-label="Gestion mobile"
          >
            <a
              href="/campagnes"
              onClick={navigateWorkspace}
              aria-current={
                ["Campagnes", "Réglages"].includes(tab) ? "page" : undefined
              }
            >
              <Users size={18} />
              Campagnes
            </a>
            <a
              href="/personnages"
              onClick={navigateWorkspace}
              aria-current={tab === "Personnages" ? "page" : undefined}
            >
              <Shield size={18} />
              Personnages
            </a>
            {(campaign?.isAdmin || accesses.length > 0) && (
              <a
                href="/validations"
                onClick={navigateWorkspace}
                aria-current={tab === "Validations" ? "page" : undefined}
              >
                <CheckCheck size={18} />
                Validations
              </a>
            )}
          </nav>
          <div className="page-heading">
            <div>
              {campaign &&
                ![
                  "Campagnes",
                  "Personnages",
                  "Validations",
                  "Réglages",
                ].includes(tab) && (
                  <div className="eyebrow">{campaign.name}</div>
                )}
              <h1>
                {tab === "Fiche"
                  ? "Fiche de personnage"
                  : tab === "DM"
                    ? "Espace DM"
                    : tab}
              </h1>
            </div>
            {c.id &&
              ![
                "Campagnes",
                "Personnages",
                "Validations",
                "Réglages",
                "DM",
              ].includes(tab) && (
                <div className="heading-actions">
                  <button
                    className="button"
                    onClick={copyLink}
                    disabled={!token.current || !ready}
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
              )}
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

                      <span className="character-state">
                        <span className="dot" />
                        {c.death === 3 ? "Mort" : "En vie"}
                        <span className="identity-separator">·</span>
                        {c.campaignId
                          ? c.reviewStatus === "approved"
                            ? "Validé par le DM"
                            : c.reviewStatus === "rejected"
                              ? "Refusé par le DM"
                              : "À valider par le DM"
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
                          {
                            <button
                              className="icon-button"
                              aria-label={"Ajuster " + label}
                              onClick={() => setModal("end")}
                            >
                              <Settings2 size={12} />
                            </button>
                          }
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
                      </section>
                    ))}
                  </div>
                  <div className="survival-bar">
                    <div>
                      <Skull size={16} />
                      <b>Dégâts mortels</b>
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
                        {sectionTitle(Sword, "Équipement actif")}
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
                                    : type === "weapon"
                                      ? "Équiper une arme"
                                      : type === "armor"
                                        ? "Équiper une armure"
                                        : "Équiper un bouclier"}
                                </small>
                                {item && (
                                  <span className="slot-weight">
                                    <Weight size={10} />
                                    {itemWeight(item)}
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
          {tab === "Techniques" && (
            <div className="training-sections">
              <section className="panel training-panel">
                {sectionTitle(
                  Sword,
                  "Techniques d’armes",
                  <span className="accent">
                    {training.available} points disponibles
                  </span>,
                )}
                <div className="training-intro">
                  <p>
                    Débutant : gratuit · Initié : 2 points · Expert : 3 points
                  </p>
                  <p>
                    1 point par niveau après le niveau 1. Une famille complète
                    demande 7 points, disponibles au niveau 8. La technique
                    experte demande les deux techniques initiées.
                  </p>
                </div>
                <div className="skill-forest">
                  {Object.keys(categoryIds)
                    .filter(
                      (category, index, all) =>
                        all.findIndex(
                          (x) => categoryIds[x] === categoryIds[category],
                        ) === index,
                    )
                    .map((category) => {
                      const techniques = predefinedTechniques({
                        category,
                        damage: "",
                      });
                      const expertReady = techniques
                        .filter((t) => t.rank === "initie")
                        .every((t) => techniqueKnown(c, t));
                      return (
                        <details className="skill-tree" key={category}>
                          <summary>
                            <Sword size={20} />
                            <strong>{category}</strong>
                            <span>
                              {
                                techniques.filter((t) => techniqueKnown(c, t))
                                  .length
                              }
                              /{techniques.length} acquises
                            </span>
                          </summary>
                          <div className="tree-branches">
                            {(["debutant", "initie", "expert"] as const).map(
                              (rank) => (
                                <section className="tree-rank" key={rank}>
                                  <h3>{rankLabels[rank]}</h3>
                                  {techniques
                                    .filter((t) => t.rank === rank)
                                    .map((t) => {
                                      const known = techniqueKnown(c, t),
                                        locked =
                                          rank === "expert" && !expertReady;
                                      return (
                                        <article
                                          className={
                                            "skill-node " +
                                            (known
                                              ? "known"
                                              : locked
                                                ? "locked"
                                                : "available")
                                          }
                                          key={t.catalogId}
                                        >
                                          <b>{t.name}</b>
                                          <small>
                                            {t.end} END · Portée {t.rangeMin}–
                                            {t.range}
                                          </small>
                                          <p>{effectText(t.effects)}</p>
                                          <button
                                            className="button"
                                            disabled={
                                              !ready ||
                                              known ||
                                              locked ||
                                              saving ||
                                              training.available <
                                                techniqueCosts[rank]
                                            }
                                            onClick={() => learn(t)}
                                          >
                                            {known
                                              ? "Acquise"
                                              : locked
                                                ? "Requiert les deux techniques initiées"
                                                : `Investir ${techniqueCosts[rank]} points`}
                                          </button>
                                        </article>
                                      );
                                    })}
                                </section>
                              ),
                            )}
                          </div>
                        </details>
                      );
                    })}
                </div>
              </section>
              <section className="panel">
                {sectionTitle(
                  Sparkles,
                  "Compétences personnelles",
                  <button
                    className="text-button accent"
                    disabled={(c.personalSkills?.length ?? 0) >= 7}
                    onClick={() => {
                      setEditSkill({
                        id: crypto.randomUUID(),
                        name: "",
                        description: "",
                        status: "pending",
                      });
                      setModal("skill");
                    }}
                  >
                    <Plus size={13} />
                    Créer une compétence
                  </button>,
                )}
                <div className="training-intro">
                  <p>
                    {personal.available} points disponibles · {personal.spent}/7
                    compétences acquises
                  </p>
                  <p>
                    Réserve indépendante : 1 point par niveau après le niveau 1,
                    jusqu’à 7 au niveau 8. Coût : 1 point par compétence, après
                    validation du DM.
                  </p>
                </div>
                {(c.personalSkills ?? []).map((skill) => (
                  <div className="personal-skill" key={skill.id}>
                    <div>
                      <h3>{skill.name}</h3>
                      <p>{skill.description}</p>
                      <span className={"status " + skill.status}>
                        {skill.status === "approved"
                          ? "Validée"
                          : skill.status === "rejected"
                            ? "Refusée"
                            : "En attente DM"}
                      </span>
                    </div>
                    {c.personalTraining?.includes(skill.id) ? (
                      <span className="subtle">
                        {skill.status === "approved"
                          ? "Acquise"
                          : "Acquise · inactive"}
                      </span>
                    ) : (
                      <button
                        className="button"
                        disabled={
                          skill.status !== "approved" ||
                          personal.available < 1 ||
                          saving
                        }
                        onClick={() => learnSkill(skill.id)}
                      >
                        Apprendre · 1 pt
                      </button>
                    )}
                    <button
                      className="icon-button"
                      aria-label={"Modifier " + skill.name}
                      onClick={() => {
                        setEditSkill(skill);
                        setModal("skill");
                      }}
                    >
                      <Settings2 size={14} />
                    </button>
                  </div>
                ))}
                {!c.personalSkills?.length && (
                  <p className="empty">
                    Créez votre première compétence et soumettez-la au DM.
                  </p>
                )}
              </section>
            </div>
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
          {tab === "Campagnes" && (
            <div className="management-page">
              <div className="management-toolbar">
                <p>Choisissez votre campagne pour retrouver ses personnages.</p>
                <div>
                  <button
                    className="button"
                    onClick={() => {
                      setCampaignCode("");
                      setModal("join");
                    }}
                  >
                    Rejoindre avec un code
                  </button>
                  <button
                    className="button primary"
                    onClick={() => {
                      setNewName("");
                      setModal("campaign");
                    }}
                  >
                    <Plus size={18} />
                    Créer une campagne
                  </button>
                </div>
              </div>
              <div className="management-grid">
                {campaignChoices.map((x) => (
                  <article className="panel management-card" key={x.id}>
                    <Users size={28} />
                    <h2>{x.name}</h2>
                    <p>
                      {accesses.some((a) => a.id === x.id)
                        ? "Administrateur et joueur"
                        : "Joueur"}
                      {campaign?.id === x.id ? " · Campagne active" : ""}
                    </p>
                    <div className="card-actions">
                      <button
                        className="button primary"
                        onClick={() =>
                          selectCampaign(x.id).catch((e) => notify(e.message))
                        }
                      >
                        Voir les personnages
                      </button>
                      {accesses.some((a) => a.id === x.id) && (
                        <button
                          className="button"
                          aria-label={"Gérer " + x.name}
                          onClick={() =>
                            selectCampaign(x.id, "Réglages").catch((e) =>
                              notify(e.message),
                            )
                          }
                        >
                          <Settings2 size={18} />
                          Réglages
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              {!campaignChoices.length && (
                <div className="panel management-empty">
                  <Users size={36} />
                  <h2>Aucune campagne</h2>
                  <p>
                    Créez votre campagne ou rejoignez celle de votre GM avec son
                    code.
                  </p>
                </div>
              )}
            </div>
          )}
          {tab === "Personnages" && (
            <div className="management-page">
              <div className="management-toolbar">
                <div>
                  <h2>{campaign?.name || "Sélectionnez une campagne"}</h2>
                  <p>
                    {campaign?.isAdmin
                      ? "Tous les personnages de cette campagne."
                      : "Vos personnages dans cette campagne."}
                  </p>
                </div>
                <div>
                  <a
                    className="button"
                    href="/campagnes"
                    onClick={navigateWorkspace}
                  >
                    Changer de campagne
                  </a>
                  {campaign && (
                    <button className="button primary" onClick={newCharacter}>
                      <Plus size={18} />
                      Créer un personnage
                    </button>
                  )}
                </div>
              </div>
              {campaign && (
                <>
                  <label className="management-search">
                    <Search size={18} />
                    <input
                      aria-label="Rechercher un personnage"
                      placeholder="Rechercher un personnage…"
                      value={characterSearch}
                      onChange={(e) => setCharacterSearch(e.target.value)}
                    />
                  </label>
                  <div className="management-grid">
                    {visibleCharacters
                      .filter((ch) =>
                        ch.name
                          .toLocaleLowerCase()
                          .includes(characterSearch.toLocaleLowerCase()),
                      )
                      .map((ch) => (
                        <article className="panel character-card" key={ch.id}>
                          <div className="character-card-portrait">
                            {ch.portrait ? (
                              <img src={ch.portrait} alt={ch.name} />
                            ) : (
                              <Shield size={44} />
                            )}
                          </div>
                          <div>
                            <h2>{ch.name}</h2>
                            <p>
                              Niveau {ch.level} ·{" "}
                              {ch.reviewStatus === "approved"
                                ? "Validé"
                                : ch.reviewStatus === "rejected"
                                  ? "Refusé"
                                  : "À valider"}
                            </p>
                            <button
                              className="button primary"
                              aria-label={"Ouvrir la fiche de " + ch.name}
                              onClick={() => choose(ch.id)}
                            >
                              Ouvrir la fiche
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </article>
                      ))}
                  </div>
                  {!visibleCharacters.length && (
                    <div className="panel management-empty">
                      <Shield size={36} />
                      <h2>Aucun personnage</h2>
                      <p>Créez votre premier personnage dans cette campagne.</p>
                    </div>
                  )}
                  {visibleCharacters.length > 0 &&
                    !visibleCharacters.some((ch) =>
                      ch.name
                        .toLocaleLowerCase()
                        .includes(characterSearch.toLocaleLowerCase()),
                    ) && (
                      <p>Aucun personnage ne correspond à cette recherche.</p>
                    )}
                </>
              )}
              {campaign && saved.some((x) => !x.campaignId) && (
                <section className="panel management-card">
                  <h2>Personnages à rattacher</h2>
                  <p>Ces personnages ont été conservés sans campagne.</p>
                  {saved
                    .filter((x) => !x.campaignId)
                    .map((x) => (
                      <button
                        className="character-list-item"
                        key={x.id}
                        onClick={() => attachLegacy(x)}
                      >
                        Rattacher {x.name} à {campaign.name}
                        <ChevronRight size={16} />
                      </button>
                    ))}
                </section>
              )}
            </div>
          )}
          {tab === "Réglages" && (
            <div className="management-page">
              <div className="management-toolbar">
                <h2>{campaign?.name || "Choisir une campagne"}</h2>
                <a
                  className="button"
                  href="/campagnes"
                  onClick={navigateWorkspace}
                >
                  Retour aux campagnes
                </a>
              </div>
              {campaign?.isAdmin ? (
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
                            "/dm#campaign=" +
                            campaign.id +
                            "&gm=" +
                            campaignToken.current,
                        );
                        notify("Lien secret GM copié.");
                      }}
                    >
                      <LinkIcon size={13} />
                      Sauvegarder mon accès admin
                    </button>
                  </section>
                  <section className="panel management-card">
                    <h2>Supprimer la campagne</h2>
                    <p>
                      Les personnages seront conservés et pourront être
                      rattachés ailleurs.
                    </p>
                    <button
                      className="button danger"
                      onClick={() => setModal("deleteCampaign")}
                    >
                      <Trash2 size={16} />
                      Supprimer la campagne
                    </button>
                  </section>
                </>
              ) : (
                <p>
                  Les réglages sont réservés à l’administrateur de la campagne.
                </p>
              )}
            </div>
          )}
          {tab === "Validations" && (
            <div className="campaign-view">
              <div className="management-toolbar">
                <div>
                  <h2>{campaign?.name || "Choisir une campagne"}</h2>
                  <p>
                    Vérifiez les personnages, objets, sorts et compétences
                    proposés par les joueurs.
                  </p>
                </div>
                {campaign?.isAdmin && (
                  <button
                    className="button"
                    onClick={() =>
                      refreshCampaign().catch((e) => notify(e.message))
                    }
                  >
                    Actualiser
                  </button>
                )}
              </div>
              {campaign?.isAdmin ? (
                <>
                  <div className="panel dm-summary">
                    <div>
                      <b>
                        {
                          campaign.characters.filter(
                            (ch: Character) =>
                              (ch.reviewStatus ?? "pending") === "pending",
                          ).length
                        }
                      </b>{" "}
                      personnages à valider
                    </div>
                    <div>
                      <b>
                        {
                          campaign.characters
                            .flatMap((ch: Character) => [
                              ...ch.inventory,
                              ...ch.spells,
                              ...(ch.personalSkills ?? []),
                            ])
                            .filter(
                              (i: Entry | PersonalSkill) =>
                                i.status === "pending",
                            ).length
                        }
                      </b>{" "}
                      objets / sorts / compétences à valider
                    </div>
                    <div className="filters">
                      <button
                        className={reviewFilter === "pending" ? "selected" : ""}
                        onClick={() => setReviewFilter("pending")}
                      >
                        À valider
                      </button>
                      <button
                        className={reviewFilter === "all" ? "selected" : ""}
                        onClick={() => setReviewFilter("all")}
                      >
                        Tout le contenu
                      </button>
                    </div>
                  </div>
                  {campaign.characters
                    .filter(
                      (ch: Character) =>
                        reviewFilter === "all" ||
                        (ch.reviewStatus ?? "pending") === "pending" ||
                        [
                          ...ch.inventory,
                          ...ch.spells,
                          ...(ch.personalSkills ?? []),
                        ].some((i) => i.status === "pending"),
                    )
                    .map((character: Character) => (
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
                        <div className="character-review">
                          <div className="detail-chips">
                            {statNames.map((k) => (
                              <span key={k}>
                                {k} {character.stats[k]}
                              </span>
                            ))}
                            <span>
                              PV {character.hp}/{derive(character).hp}
                            </span>
                            <span>
                              END {character.end}/{derive(character).end}
                            </span>
                            <span>
                              Mana {character.mana}/{derive(character).mana}
                            </span>
                            <span
                              className={
                                "status " +
                                (character.reviewStatus ?? "pending")
                              }
                            >
                              {character.reviewStatus === "approved"
                                ? "Personnage validé"
                                : character.reviewStatus === "rejected"
                                  ? "Personnage refusé"
                                  : "Personnage à valider"}
                            </span>
                          </div>
                          <div className="review-actions">
                            <button
                              className="button"
                              onClick={() =>
                                reviewCharacter(character, "rejected")
                              }
                            >
                              Refuser le personnage
                            </button>
                            <button
                              className="button primary"
                              onClick={() =>
                                reviewCharacter(character, "approved")
                              }
                            >
                              <Check size={13} />
                              Valider le personnage
                            </button>
                          </div>
                        </div>
                        {[...character.inventory, ...character.spells]
                          .filter(
                            (i) =>
                              reviewFilter === "all" || i.status === "pending",
                          )
                          .map((i) => (
                            <div className="review-row" key={i.id}>
                              <div>
                                <b>{i.name}</b>
                                <small>
                                  {typeNames[i.type]} · Poids {itemWeight(i)}
                                  {i.damage ? " · " + i.damage : ""}
                                </small>
                              </div>
                              <span className={"status " + i.status}>
                                {i.status === "approved"
                                  ? "Validé"
                                  : i.status === "rejected"
                                    ? "Refusé"
                                    : "À valider"}
                              </span>
                              <button
                                className="text-button"
                                onClick={() => {
                                  setDetailOwner(character);
                                  setDetail(i);
                                }}
                              >
                                Détails
                              </button>
                              <button
                                className="button"
                                onClick={() =>
                                  reviewItem(character, i, "rejected")
                                }
                              >
                                Refuser
                              </button>
                              <button
                                className="button primary"
                                onClick={() =>
                                  reviewItem(character, i, "approved")
                                }
                              >
                                <Check size={13} />
                                Valider
                              </button>
                            </div>
                          ))}
                        {(character.personalSkills ?? [])
                          .filter(
                            (skill) =>
                              reviewFilter === "all" ||
                              skill.status === "pending",
                          )
                          .map((skill) => (
                            <div className="review-row" key={skill.id}>
                              <div>
                                <b>{skill.name}</b>
                                <small>Compétence personnelle · 1 point</small>
                                <p className="skill-description">
                                  {skill.description}
                                </p>
                              </div>
                              <span className={"status " + skill.status}>
                                {skill.status === "approved"
                                  ? "Validée"
                                  : skill.status === "rejected"
                                    ? "Refusée"
                                    : "À valider"}
                              </span>
                              <button
                                className="button"
                                onClick={() =>
                                  reviewItem(character, skill, "rejected")
                                }
                              >
                                Refuser
                              </button>
                              <button
                                className="button primary"
                                onClick={() =>
                                  reviewItem(character, skill, "approved")
                                }
                              >
                                Valider
                              </button>
                            </div>
                          ))}
                      </section>
                    ))}
                  {reviewFilter === "pending" &&
                    !campaign.characters.some(
                      (ch: Character) =>
                        ch.reviewStatus === "pending" ||
                        [
                          ...ch.inventory,
                          ...ch.spells,
                          ...(ch.personalSkills ?? []),
                        ].some((i) => i.status === "pending"),
                    ) && (
                      <div className="panel management-empty">
                        <CheckCheck size={36} />
                        <h2>Aucune validation en attente</h2>
                      </div>
                    )}
                </>
              ) : (
                <div className="panel management-empty">
                  <p>
                    Sélectionnez une campagne que vous administrez pour traiter
                    ses validations.
                  </p>
                  <a
                    className="button"
                    href="/campagnes"
                    onClick={navigateWorkspace}
                  >
                    Choisir une campagne
                  </a>
                </div>
              )}
            </div>
          )}
          <footer>
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
            {modal === "skill" && editSkill && (
              <>
                <h2>
                  {editSkill.name
                    ? "Modifier la compétence"
                    : "Nouvelle compétence personnelle"}
                </h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const skill = {
                      ...editSkill,
                      name: String(f.get("name")),
                      description: String(f.get("description")),
                      status: gm ? ("approved" as const) : editSkill.status,
                    };
                    change((n) => {
                      const list = (n.personalSkills ??= []);
                      const at = list.findIndex((s) => s.id === skill.id);
                      if (at < 0) list.push(skill);
                      else list[at] = skill;
                    });
                    setModal("");
                  }}
                >
                  <label>
                    Nom de la compétence
                    <input
                      name="name"
                      defaultValue={editSkill.name}
                      maxLength={100}
                      required
                    />
                  </label>
                  <label>
                    Effet de la compétence
                    <textarea
                      name="description"
                      defaultValue={editSkill.description}
                      maxLength={3000}
                      required
                    />
                  </label>
                  <p>
                    Coût : 1 point de compétence personnelle. La création et les
                    modifications sont soumises au DM.
                  </p>
                  <button className="button primary submit">
                    Enregistrer la compétence
                  </button>
                </form>
              </>
            )}
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
                <h2>Bonus et malus des ressources</h2>
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
                      for (const key of [
                        "hpBonus",
                        "hpMalus",
                        "manaBonus",
                        "manaMalus",
                      ] as const)
                        n[key] = Number(f.get(key));
                    });
                    setModal("");
                  }}
                >
                  <div className="form-grid">
                    {(
                      [
                        ["hpBonus", "Bonus PV"],
                        ["hpMalus", "Malus PV"],
                        ["manaBonus", "Bonus Mana"],
                        ["manaMalus", "Malus Mana"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key}>
                        {label}
                        <input
                          type="number"
                          name={key}
                          min="0"
                          max="100"
                          defaultValue={c[key] ?? 0}
                        />
                      </label>
                    ))}
                  </div>
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
                <h2>
                  {modal === "new"
                    ? "Créer un personnage"
                    : "Créer une campagne"}
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
                  {modal === "new" && (
                    <>
                      <p>
                        Campagne : <strong>{campaign?.name}</strong>
                      </p>
                      <div className="form-grid">
                        <label>
                          Niveau
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            value={newLevel}
                            onChange={(e) =>
                              setNewLevel(Number(e.target.value))
                            }
                            required
                          />
                        </label>
                        <label>
                          Caractéristique magique
                          <select
                            value={newMagic}
                            onChange={(e) => setNewMagic(e.target.value)}
                          >
                            {["INT", "SAG", "CHA"].map((k) => (
                              <option key={k}>{k}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="form-grid three">
                        {statNames.map((k) => (
                          <label key={k}>
                            {k}
                            <input
                              type="number"
                              min="2"
                              max="28"
                              value={newStats[k]}
                              onChange={(e) =>
                                setNewStats({
                                  ...newStats,
                                  [k]: Number(e.target.value),
                                })
                              }
                              required
                            />
                          </label>
                        ))}
                      </div>
                      <p>PV, END et Mana seront au maximum.</p>
                    </>
                  )}
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
                    Choisir cette campagne
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
            {modal === "deleteCampaign" && campaign?.isAdmin && (
              <>
                <h2>Supprimer cette campagne ?</h2>
                <p>
                  <strong>{campaign.name}</strong> sera définitivement
                  supprimée. Son code d’invitation et son accès administrateur
                  ne fonctionneront plus.
                </p>
                <p>
                  Les personnages et leur équipement seront conservés. Leurs
                  propriétaires pourront les rattacher à une autre campagne.
                </p>
                <button
                  className="button"
                  disabled={deletingCampaign}
                  onClick={() => setModal("")}
                >
                  Annuler
                </button>
                <button
                  className="button danger submit"
                  disabled={deletingCampaign}
                  onClick={deleteCampaign}
                >
                  {deletingCampaign
                    ? "Suppression…"
                    : "Confirmer la suppression"}
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
                          setEdit({
                            ...edit,
                            type: e.target.value,
                            category:
                              e.target.value === "weapon" ? "Épées" : "",
                            armor: e.target.value === "armor" ? 1 : 0,
                          })
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
                  {edit.type === "spell" && (
                    <label>
                      Description du sort
                      <textarea
                        name="description"
                        defaultValue={edit.description}
                      />
                    </label>
                  )}
                  <div className="form-grid">
                    {edit.type === "weapon" && (
                      <>
                        <label>
                          Type d’arme
                          <select
                            name="category"
                            value={weaponCategory(edit.category)}
                            onChange={(e) =>
                              setEdit({ ...edit, category: e.target.value })
                            }
                            required
                          >
                            {!weaponTypes.some(
                              (t) => t.name === weaponCategory(edit.category),
                            ) && <option value="">Choisir une famille</option>}
                            {weaponTypes.map((t) => (
                              <option value={t.name} key={t.name}>
                                {t.name} · poids {t.weight}
                              </option>
                            ))}
                          </select>
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
                      </>
                    )}
                    {edit.type === "armor" && (
                      <label>
                        Catégorie d’armure
                        <select
                          name="armor"
                          value={edit.armor || 1}
                          onChange={(e) =>
                            setEdit({ ...edit, armor: Number(e.target.value) })
                          }
                        >
                          {armors.slice(1).map((a, i) => (
                            <option value={i + 1} key={a.name}>
                              {a.name} · poids {a.weight}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {edit.type === "shield" && (
                      <label>
                        Type de bouclier
                        <select
                          name="shield"
                          value={edit.shield}
                          onChange={(e) =>
                            setEdit({ ...edit, shield: Number(e.target.value) })
                          }
                        >
                          {[
                            "Petit bouclier",
                            "Bouclier",
                            "Greatshield",
                            "Wall Shield",
                          ].map((name, i) => (
                            <option value={i + 1} key={name}>
                              {name} · poids {i + 1}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {["weapon", "armor", "shield", "talisman"].includes(
                      edit.type,
                    ) && (
                      <label>
                        Poids automatique
                        <output className="derived-field">
                          {itemWeight(
                            edit.type === "armor"
                              ? { ...edit, armor: edit.armor || 1 }
                              : edit,
                          )}
                        </output>
                      </label>
                    )}
                    {["consumable", "other"].includes(edit.type) && (
                      <label>
                        Poids
                        <input
                          name="weight"
                          type="number"
                          min="0"
                          max="100"
                          defaultValue={edit.weight}
                          required
                        />
                      </label>
                    )}
                    {edit.type === "spell" && (
                      <>
                        <label>
                          Rang du sort
                          <select name="rank" defaultValue={edit.rank}>
                            {ranks.map((name, i) => (
                              <option value={i} key={name}>
                                {name} · mémoire {i}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Dégâts
                          <input
                            name="damage"
                            defaultValue={edit.damage}
                            placeholder="2d6"
                            pattern="[0-9]+d[0-9]+([+-][0-9]+)?"
                          />
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
                      </>
                    )}
                  </div>
                  {edit.type === "armor" && (
                    <div className="detail-chips">
                      <span>PV ×{armors[edit.armor || 1].hp}</span>
                      <span>Déplacement −{armors[edit.armor || 1].move}</span>
                      <span>Esquive −{armors[edit.armor || 1].dodge}</span>
                      <span>
                        Stabilité : {armors[edit.armor || 1].stability}
                      </span>
                    </div>
                  )}
                  {edit.type === "spell" && (
                    <>
                      <div className="form-grid">
                        <label>
                          Origine de la zone
                          <select
                            name="origin"
                            value={edit.origin ?? "self"}
                            onChange={(e) =>
                              setEdit({
                                ...edit,
                                origin: e.target.value as ZoneOrigin,
                              })
                            }
                          >
                            <option value="self">Personnage (mêlée)</option>
                            <option value="target">
                              Cible choisie (à distance)
                            </option>
                          </select>
                        </label>
                        <label>
                          {edit.origin === "target"
                            ? "Portée de placement (cases)"
                            : "Portée (cases)"}
                          <input
                            name="range"
                            type="number"
                            min="0"
                            max="1000"
                            defaultValue={edit.range}
                          />
                        </label>
                        <label>
                          Ciblage
                          <input name="target" defaultValue={edit.target} />
                        </label>
                      </div>
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
                        origin={edit.origin}
                        onChange={(pattern) => setEdit({ ...edit, pattern })}
                      />
                    </>
                  )}
                  {["weapon", "shield"].includes(edit.type) && (
                    <details open>
                      <summary>Techniques et compétence spéciale</summary>
                      {edit.type === "weapon" && (
                        <CatalogPreview
                          item={{ ...edit, damage: edit.damage }}
                        />
                      )}
                      {edit.type === "shield" && (
                        <>
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
                                techniques: [
                                  ...edit.techniques,
                                  blankTechnique(),
                                ],
                              })
                            }
                          >
                            <Plus size={12} />
                            Ajouter une technique
                          </button>
                        </>
                      )}
                      {edit.special ? (
                        <TechniqueEditor
                          special
                          value={edit.special}
                          onChange={(special) => setEdit({ ...edit, special })}
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
                  )}
                  <p className="subtle">
                    {gm
                      ? "Les créations du GM sont automatiquement validées."
                      : "Toute modification mécanique nécessite la validation du GM."}{" "}
                  </p>
                  <button className="button primary submit">Enregistrer</button>
                </form>
              </>
            )}
          </section>
        </div>
      )}
      {detail && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setDetail(null);
            setDetailOwner(null);
          }}
        >
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
              onClick={() => {
                setDetail(null);
                setDetailOwner(null);
              }}
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
            {detail.type === "spell" && detail.description && (
              <p>{detail.description}</p>
            )}
            <div className="detail-chips">
              <span>Poids {itemWeight(detail)}</span>
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
                    {detail.origin === "target"
                      ? "Portée de placement"
                      : "Portée"}{" "}
                    {detail.range} ·{" "}
                    {detail.friendlyFire ? "Alliés affectés" : "Sans tir allié"}
                  </p>
                </div>
                <Pattern points={detail.pattern} origin={detail.origin} />
              </div>
            )}
            {detail.type === "weapon" && (
              <div className="training-balance">
                <span>
                  Points d’arme <b>{detailTraining.available}</b> disponibles
                </span>
                <small>
                  {detailTraining.spent} dépensés / {detailTraining.earned}{" "}
                  gagnés · 1 par niveau après le niveau 1
                </small>
              </div>
            )}
            {detail.type === "weapon" && (
              <p className="subtle">
                Dégâts identiques pour toutes les techniques :{" "}
                {detail.damage || "non définis"}.
              </p>
            )}
            {[
              ...referencedTechniques(detail),
              ...(detail.special ? [detail.special] : []),
            ].map((t, i) => {
              const catalog = "catalogId" in t ? (t as CatalogTechnique) : null;
              const special = t === detail.special;
              const known =
                !catalog || techniqueKnown(detailCharacter, catalog);
              const canLearn =
                catalog &&
                c.inventory.some((i) => i.id === detail.id) &&
                detailTraining.available >= techniqueCosts[catalog.rank] &&
                (catalog.rank !== "expert" ||
                  predefinedTechniques(detail)
                    .filter((t) => t.rank === "initie")
                    .every((t) => techniqueKnown(detailCharacter, t)));
              return (
                <div className="technique" key={catalog?.catalogId ?? i}>
                  <div>
                    <h3>{t.name}</h3>
                    {catalog && (
                      <span className="technique-rank">
                        {rankLabels[catalog.rank]} ·{" "}
                        {known
                          ? "Acquise"
                          : `${techniqueCosts[catalog.rank]} points`}
                      </span>
                    )}
                    {t.description && <p>{t.description}</p>}
                    <small>
                      {t.end} END
                      {special ? ` · ${t.mana} Mana · ${t.damage}` : ""}
                      <br />
                      {(
                        catalog
                          ? catalog.rangeKind === "placement"
                          : t.origin === "target"
                      )
                        ? "Portée de placement"
                        : "Portée d’attaque"}{" "}
                      {catalog ? `${catalog.rangeMin}–` : ""}
                      {t.range} cases
                    </small>
                    {catalog && effectText(catalog.effects) && (
                      <p>{effectText(catalog.effects)}</p>
                    )}
                    {catalog && !known && (
                      <button
                        className="button learn-button"
                        disabled={!canLearn || saving}
                        title={
                          catalog.rank === "expert"
                            ? "Les deux techniques initiées sont requises."
                            : "Apprentissage partagé entre les armes du même type."
                        }
                        onClick={() => learn(catalog)}
                      >
                        <LockKeyhole size={12} />
                        Débloquer · {techniqueCosts[catalog.rank]} pts
                      </button>
                    )}
                  </div>
                  <Pattern points={t.pattern} origin={t.origin} />
                </div>
              );
            })}
            <p className="subtle">
              Les patterns sont des références. Aucune attaque n’est résolue.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
