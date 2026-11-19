"use client";
import { useState } from "react";
import type { Workspace } from "./types";
import { derive } from "../../lib/rules";
import {
  activeFamilies,
  nodesForFamily,
  knownNodeIds,
  remaining,
} from "../../lib/progression";
import SkillTree from "../skill-tree";
import ItemDetails from "../item-details";
import { skillState } from "../../lib/skill-state";
export default function PlayerPreview({
  workspace,
  characterId,
  onCharacterChange,
}: {
  workspace: Workspace;
  characterId: string;
  onCharacterChange: (id: string) => void;
}) {
  const id = characterId,
    setId = onCharacterChange;
  const [tab, setTab] = useState("Fiche"),
    [family, setFamily] = useState<string>("Lames"),
    [selectedId, setSelectedId] = useState("");
  const character = workspace.characters.find((c) => c.id === id),
    stats = character ? derive(character) : null;
  const selected = character
    ? nodesForFamily(workspace.tree, family, character).find(
        (node) => node.id === selectedId,
      )
    : undefined;
  const known = character
    ? knownNodeIds(character, workspace.tree)
    : new Set<string>();
  const state =
    selected && character
      ? skillState(
          selected,
          character,
          known,
          remaining(character, workspace.tree),
        )
      : null;
  return (
    <section className="adm-main">
      <h1>Voir comme un joueur</h1>
      <p className="c-muted">
        Aperçu en lecture seule de la configuration enregistrée. Choisissez le
        personnage dont vous souhaitez vérifier les contenus accessibles.
      </p>
      <label className="c-field">
        Personnage
        <select value={id} onChange={(e) => setId(e.target.value)}>
          {workspace.characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {character && stats ? (
        <>
          <header className="adm-campaign">
            {character.portrait && <img src={character.portrait} alt="" />}
            <div>
              <h2>{character.name}</h2>
              <p>
                {character.race} · {character.className} · Niveau{" "}
                {character.level}
              </p>
            </div>
          </header>
          <nav className="adm-toolbar" aria-label="Prévisualisation joueur">
            {["Fiche", "Inventaire", "Grimoire", "Compétences"].map((t) => (
              <button
                className="c-button"
                key={t}
                aria-pressed={tab === t}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </nav>
          {tab === "Fiche" && (
            <dl className="c-fact-grid">
              {Object.entries(character.stats).map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {["Inventaire", "Grimoire"].includes(tab) &&
            (tab === "Inventaire" ? character.inventory : character.spells)
              .filter((i) => !i.archived)
              .map((item) => (
                <ItemDetails
                  key={item.id}
                  item={item}
                  character={character}
                  tree={workspace.tree}
                />
              ))}
          {tab === "Compétences" && (
            <>
              <select
                aria-label="Famille à prévisualiser"
                value={family}
                onChange={(e) => setFamily(e.target.value)}
              >
                {activeFamilies.map((f) => (
                  <option key={f} value={f}>
                    {workspace.settings.categories.find(
                      (c) => c.kind === "skill" && c.baseKey === f,
                    )?.name ?? f}
                  </option>
                ))}
              </select>
              <SkillTree
                nodes={nodesForFamily(workspace.tree, family, character)}
                label={family}
                known={knownNodeIds(character, workspace.tree)}
                available={remaining(character, workspace.tree)}
                character={character}
                onSelect={(node) => setSelectedId(node.id)}
              />
              {selected && state && (
                <article className="c-card c-pad">
                  <h2>{selected.name}</h2>
                  <p>
                    {state.label} · Niveau {selected.level} · {selected.cost}{" "}
                    points
                  </p>
                  <p>{selected.description}</p>
                  <h3>Prérequis</h3>
                  {selected.requires.length ? (
                    <ul>
                      {selected.requires.map((id) => (
                        <li key={id}>
                          {workspace.tree.nodes.find((node) => node.id === id)
                            ?.name ?? id}{" "}
                          · {known.has(id) ? "Acquise" : "À acquérir"}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Aucun prérequis.</p>
                  )}
                  {state.reasons.length > 0 && (
                    <ul>
                      {state.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  )}
                </article>
              )}
            </>
          )}
        </>
      ) : (
        <p>Aucun personnage à prévisualiser.</p>
      )}
    </section>
  );
}
