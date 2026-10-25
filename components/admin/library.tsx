"use client";
import { useRememberedValue } from "./preferences";
import type { AdminCommon, Perform } from "./types";
import { useState } from "react";
import { entry, type Entry } from "../../lib/rules";
import { categoryFor } from "../../lib/campaign-settings";
import ItemForm from "../item-form";
import ItemDetails from "../item-details";
export default function Library({
  workspace,
  storageKey = "cendres-admin",
  magic,
  perform,
  onDirty,
  busy,
  initialQuery = "",
}: AdminCommon & { magic: boolean; perform: Perform; initialQuery?: string }) {
  const field = magic ? "spells" : "inventory";
  const [characterId, setCharacterId] = useState(
      workspace.characters[0]?.id ?? "",
    ),
    [draft, setDraft] = useState<Entry | null>(null),
    [query, setQuery] = useRememberedValue(
      `${storageKey}:library:query`,
      initialQuery,
      !!initialQuery,
    ),
    [archived, setArchived] = useState(false),
    [preview, setPreview] = useState(false),
    [kind, setKind] = useState("");
  const character = workspace.characters.find((c) => c.id === characterId);
  const rows = workspace.characters
    .flatMap((c) => c[field].map((item: Entry) => ({ item, character: c })))
    .filter(
      (r) =>
        !!r.item.archived === archived &&
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
          value={characterId}
          disabled={!!draft}
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
          disabled={!character || !!draft}
          onClick={() => {
            setDraft(entry("", magic ? "spell" : "weapon"));
            onDirty(true);
          }}
        >
          {magic ? "Créer un sort" : "Créer un objet"}
        </button>
        <button
          className="c-button"
          aria-pressed={archived}
          onClick={() => setArchived(!archived)}
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
            <button className="c-button" onClick={() => setPreview(!preview)}>
              Prévisualiser côté joueur
            </button>
            <button
              className="c-button"
              onClick={() => {
                if (confirm("Abandonner cette édition ?")) {
                  setDraft(null);
                  onDirty(false);
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
              isGM
              busy={busy}
              existing={false}
              onChange={(i) => {
                setDraft(i);
                onDirty(true);
              }}
              onSave={() => save(draft)}
              onDelete={() => {}}
            />
          )}
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
        </>
      ) : (
        <>
          <div className="adm-filters">
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
                  <th>Catégorie</th>
                  <th>Personnage</th>
                  <th>État</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ item, character: c }) => (
                  <tr key={`${c.id}:${item.id}`}>
                    <td>{item.name}</td>
                    <td>
                      {categoryFor(workspace.settings, item)?.name ??
                        item.category ??
                        item.school}
                    </td>
                    <td>{c.name}</td>
                    <td>
                      {item.status === "approved"
                        ? "Publié"
                        : item.status === "rejected"
                          ? "Refusé"
                          : "À valider"}
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setCharacterId(c.id);
                          setDraft(structuredClone(item));
                          onDirty(true);
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
                            status: "pending",
                            equipped: false,
                            memorized: false,
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
            {!rows.length && <p>Aucun contenu correspondant.</p>}
          </div>
        </>
      )}
    </>
  );
}
