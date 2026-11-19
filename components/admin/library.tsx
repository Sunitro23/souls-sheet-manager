"use client";
import { useRememberedValue } from "./preferences";
import type { AdminCommon, Perform } from "./types";
import { useEffect, useState } from "react";
import { entry, type Entry } from "../../lib/rules";
import { categoryFor } from "../../lib/campaign-settings";
import ItemForm from "../item-form";
import ItemDetails, { itemTypes } from "../item-details";
export default function Library({
  workspace,
  storageKey = "cendres-admin",
  magic,
  perform,
  onDirty,
  busy,
  initialQuery = "",
  target,
  onNavigate,
}: AdminCommon & { magic: boolean; perform: Perform; initialQuery?: string }) {
  const field = magic ? "spells" : "inventory";
  const prefix = `${storageKey}:library:${field}`;
  const direct = !!(target?.selected || target?.owner || target?.status);
  const [selection, setSelection] = useRememberedValue(
    `${prefix}:selection`,
    target?.selected ?? "",
    direct || !!target?.create,
  );
  const [characterId, setCharacterId] = useRememberedValue(
    `${prefix}:recipient`,
    target?.owner ?? workspace.characters[0]?.id ?? "",
    !!target?.owner,
  );
  const character =
    workspace.characters.find((c) => c.id === characterId) ??
    workspace.characters[0];
  const [draft, setDraft] = useState<Entry | null>(() =>
    target?.create && character
      ? entry("", magic ? "spell" : "weapon")
      : structuredClone(
          character?.[field].find((item) => item.id === selection) ?? null,
        ),
  );
  const [query, setQuery] = useRememberedValue(
    `${prefix}:query`,
    initialQuery,
    direct || !!initialQuery,
  );
  const [archiveState, setArchiveState] = useRememberedValue(
    `${prefix}:archives`,
    target?.status === "archived" || draft?.archived ? "yes" : "no",
    direct,
  );
  const archived = archiveState === "yes";
  const [preview, setPreview] = useState(false);
  const [kind, setKind] = useRememberedValue<string>(
    `${prefix}:kind`,
    "",
    direct,
  );
  const [owner, setOwner] = useRememberedValue(
    `${prefix}:owner`,
    target?.owner ?? "",
    direct,
  );
  const original = character?.[field].find((item) => item.id === draft?.id);
  const changed = !!draft && JSON.stringify(draft) !== JSON.stringify(original);
  useEffect(() => {
    onDirty(changed);
  }, [changed, onDirty]);
  useEffect(() => {
    setSelection(draft && original ? draft.id : "");
  }, [draft, original, setSelection]);
  const rows = workspace.characters
    .flatMap((c) => c[field].map((item: Entry) => ({ item, character: c })))
    .filter(
      (r) =>
        !!r.item.archived === archived &&
        (!owner || r.character.id === owner) &&
        r.item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
        (!kind ||
          (r.item.categoryId ?? categoryFor(workspace.settings, r.item)?.id) ===
            kind),
    );
  function save(item: Entry) {
    if (!character) return;
    const exists = character[field].some((i: Entry) => i.id === item.id);
    perform(
      {
        op: "saveCharacter",
        id: character.id,
        revision: character.revision,
        character: {
          ...character,
          [field]: exists
            ? character[field].map((i: Entry) => (i.id === item.id ? item : i))
            : [...character[field], item],
        },
      },
      () => setDraft(null),
    );
  }
  return (
    <>
      <p className="c-muted">
        Contenus de tous les personnages de la campagne. Chaque création est
        rattachée à un personnage.
      </p>
      <div className="adm-toolbar">
        <select
          aria-label="Personnage destinataire"
          value={character?.id ?? ""}
          disabled={!!original || busy}
          onChange={(e) => setCharacterId(e.target.value)}
        >
          {workspace.characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          className="c-primary"
          disabled={!character || busy}
          onClick={() => {
            if (
              changed &&
              !confirm(
                "Abandonner cette édition pour créer un nouveau contenu ?",
              )
            )
              return;
            setPreview(false);
            setDraft(entry("", magic ? "spell" : "weapon"));
          }}
        >
          {magic ? "Créer un sort" : "Créer un objet"}
        </button>
        <button
          className="c-button"
          aria-pressed={archived}
          onClick={() => setArchiveState(archived ? "no" : "yes")}
        >
          {archived ? "Contenus actifs" : "Archives"}
        </button>
      </div>
      {!workspace.characters.length && (
        <p>Créez d’abord un personnage depuis l’accueil de campagne.</p>
      )}
      {draft && character ? (
        <>
          <div className="adm-toolbar">
            <button
              className="c-button"
              onClick={() =>
                onNavigate?.({ page: "characters", selected: character.id })
              }
            >
              Ouvrir le personnage propriétaire
            </button>
            <button
              className="c-button"
              onClick={() =>
                onNavigate?.({
                  page: "categories",
                  kind: magic
                    ? "magic"
                    : draft.type === "weapon"
                      ? "weapon"
                      : "item",
                  selected: categoryFor(workspace.settings, draft)?.id,
                })
              }
            >
              Gérer {magic ? "l’école magique" : "la catégorie"}
            </button>
            <button className="c-button" onClick={() => setPreview(!preview)}>
              Prévisualiser côté joueur
            </button>
            <button
              className="c-button"
              onClick={() => {
                if (!changed || confirm("Abandonner cette édition ?")) {
                  setDraft(null);
                }
              }}
            >
              Annuler
            </button>
          </div>
          {preview ? (
            <ItemDetails
              item={draft}
              character={character}
              tree={workspace.tree}
            />
          ) : (
            <ItemForm
              item={draft}
              sectionNavigation
              character={character}
              busy={busy}
              existing={
                character?.[field].some((i) => i.id === draft.id) ?? false
              }
              onChange={(i) => {
                setDraft(i);
              }}
              onSave={() => save(draft)}
            />
          )}
          {character?.[field].some((i) => i.id === draft.id) && (
            <button
              className="c-button"
              disabled={busy}
              onClick={() => {
                if (
                  confirm(
                    `${draft.archived ? "Restaurer" : "Archiver"} ce contenu ?`,
                  )
                )
                  save({
                    ...draft,
                    archived: !draft.archived,
                    equipped: false,
                    memorized: false,
                  });
              }}
            >
              {draft.archived ? "Restaurer" : "Archiver"}
            </button>
          )}
        </>
      ) : (
        <>
          <div className="adm-filters">
            <select
              aria-label="Filtrer par personnage propriétaire"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            >
              <option value="">Tous les propriétaires</option>
              {workspace.characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              aria-label="Rechercher un contenu"
              placeholder="Rechercher un contenu"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label="Catégorie du contenu"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="">Toutes les catégories</option>
              {workspace.settings.categories
                .filter((c) =>
                  magic
                    ? c.kind === "magic"
                    : ["weapon", "item"].includes(c.kind),
                )
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="adm-table">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Type</th>
                  <th>Catégorie</th>
                  <th>Personnage</th>
                  <th>Statistiques</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ item, character: c }) => (
                  <tr key={`${c.id}:${item.id}`}>
                    <td>{item.name}</td>
                    <td>{itemTypes[item.type]}</td>
                    <td>
                      {categoryFor(workspace.settings, item)?.name ??
                        item.category ??
                        item.school}
                    </td>
                    <td>
                      <button
                        onClick={() =>
                          onNavigate?.({ page: "characters", selected: c.id })
                        }
                      >
                        {c.name}
                      </button>
                    </td>
                    <td>
                      {item.damage || "—"}
                      {magic
                        ? ` · Rang ${item.rank} · ${item.mana} FP · ${item.end} END`
                        : ""}
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setCharacterId(c.id);
                          setDraft(structuredClone(item));
                          setPreview(false);
                        }}
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => {
                          setCharacterId(c.id);
                          setDraft({
                            ...structuredClone(item),
                            id: crypto.randomUUID(),
                            name: item.name.slice(0, 90) + " (copie)",
                            equipped: false,
                            memorized: false,
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
            {!rows.length && <p>Aucun contenu correspondant.</p>}
          </div>
        </>
      )}
    </>
  );
}
