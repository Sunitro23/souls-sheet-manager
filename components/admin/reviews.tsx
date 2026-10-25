"use client";
import type { AdminCommon, Perform } from "./types";
import { useEffect,useState } from "react";
import {workspaceCall} from "../../lib/workspace-client";
import type {ReviewDecision} from "../../lib/reviews";
import { reviewRows } from "../../lib/reviews";
import ItemDetails from "../item-details";
const types: Record<string, string> = {
  character: "Personnage",
  inventory: "Équipement",
  spells: "Sort",
  personalSkills: "Compétence",
};
const statuses: Record<string, string> = {
  pending: "À examiner",
  approved: "Approuvé",
  rejected: "Refusé",
  correction: "Correction demandée",
};
export default function Reviews({
  workspace,
  perform,
  busy,
}: AdminCommon & { perform: Perform }) {
  const [kind, setKind] = useState(""),
    [status, setStatus] = useState("pending"),
    [selected, setSelected] = useState(""),
    [comment, setComment] = useState(""),
    [history, setHistory] = useState(false);
  const [allHistory,setAllHistory]=useState<(ReviewDecision & {characterName:string})[]|null>(null),[loadError,setLoadError]=useState('');
  useEffect(()=>{let live=true;workspaceCall({op:'reviews',campaignId:workspace.campaign.id}).then(r=>{if(live)setAllHistory(r.history)}).catch(e=>{if(live)setLoadError(e.message)});return()=>{live=false}},[workspace]);
  const rows = reviewRows(workspace.characters),
    row = rows.find(
      (r) => `${r.characterId}:${r.kind}:${r.itemId}` === selected,
    );
  const owner = (id: string | undefined) =>
    workspace.members.find((m) => m.id === id)?.username ??
    "MJ / ancien membre";
  return (
    <>
      {loadError&&<p role="alert">{loadError}</p>}
      <div className="adm-toolbar">
        <select
          aria-label="Type de demande"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="">Tous les types</option>
          {Object.entries(types).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          aria-label="Statut de demande"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          {Object.entries(statuses).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          className="c-button"
          aria-pressed={history}
          onClick={() => setHistory(!history)}
        >
          Historique des décisions
        </button>
      </div>
      {history ? (
        <div className="adm-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Élément</th>
                <th>Personnage</th>
                <th>Décision / MJ</th>
                <th>Commentaire</th>
              </tr>
            </thead>
            <tbody>
              {(allHistory??workspace.characters.flatMap(c=>(c.reviewHistory??[]).map(h=>({...h,characterName:c.name}))))
              .filter(
                  (h) =>
                    (!kind || h.kind === kind) &&
                    (!status || status === "pending" || h.decision === status),
                )
                .sort((a, b) => b.at - a.at)
                .map((h) => (
                  <tr key={h.id}>
                    <td>{new Date(h.at).toLocaleString("fr-FR")}</td>
                    <td>{h.name}</td>
                    <td>{h.characterName}</td>
                    <td>
                      {statuses[h.decision]} · {h.actor}
                    </td>
                    <td>{h.comment || "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="adm-table">
          <table>
            <thead>
              <tr>
                <th>Élément</th>
                <th>Type</th>
                <th>Créateur / joueur</th>
                <th>Personnage</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter(
                  (r) =>
                    (!kind || r.kind === kind) &&
                    (!status ||
                      (status === "correction"
                        ? r.correction
                        : r.status === status)),
                )
                .map((r) => (
                  <tr key={`${r.characterId}:${r.kind}:${r.itemId}`}>
                    <td>{r.name}</td>
                    <td>{types[r.kind]}</td>
                    <td>{r.detail.createdBy || owner(r.playerId)}</td>
                    <td>{r.characterName}</td>
                    <td>{statuses[r.correction ? "correction" : r.status]}</td>
                    <td>
                      <button
                        onClick={() => {
                          setSelected(`${r.characterId}:${r.kind}:${r.itemId}`);
                          setComment("");
                        }}
                      >
                        Examiner
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!rows.some((r) => r.status === "pending") && (
            <p>Aucune demande en attente.</p>
          )}
        </div>
      )}
      {row && (
        <section className="c-card c-pad adm-review">
          <div className="adm-toolbar">
            <h2>Examen : {row.name}</h2>
            <button className="c-button" onClick={() => setSelected("")}>
              Fermer l’examen
            </button>
          </div>
          {["inventory", "spells"].includes(row.kind) ? (
            <>
              <ItemDetails
                item={row.detail as import("../../lib/rules").Entry}
                character={workspace.characters.find(
                  (c) => c.id === row.characterId,
                )!}
                tree={workspace.tree}
              />
              {(row.detail.techniques ?? []).map((t) => (
                <article className="c-pad" key={t.name}>
                  <h3>{t.name}</h3>
                  <p>{t.description}</p>
                  <p>
                    {t.end} END · {t.mana ?? 0} FP · Portée {t.range}
                  </p>
                </article>
              ))}
            </>
          ) : (
            <>
              <p>{row.detail.description || row.detail.notes}</p>
              <p>
                {row.detail.race} {row.detail.className}{" "}
                {row.detail.level && `· Niveau ${row.detail.level}`}
              </p>
              {row.detail.stats && (
                <dl className="c-fact-grid">
                  {Object.entries(row.detail.stats).map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </>
          )}
          {row.status === "pending" && (
            <>
              <label className="c-field">
                Commentaire du MJ (facultatif)
                <textarea
                  maxLength={3000}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </label>
              <div className="adm-toolbar">
                {(["approved", "rejected", "correction"] as const).map(
                  (decision) => (
                    <button
                      key={decision}
                      className={
                        decision === "approved" ? "c-primary" : "c-button"
                      }
                      disabled={busy}
                      onClick={() => {
                        if (
                          confirm(`${statuses[decision]} : « ${row.name} » ?`)
                        )
                          perform(
                            {
                              op: "decideReview",
                              id: row.characterId,
                              revision: row.revision,
                              kind: row.kind,
                              itemId: row.itemId,
                              decision,
                              comment,
                            },
                            () => setSelected(""),
                          );
                      }}
                    >
                      {
                        {
                          approved: "Approuver",
                          rejected: "Refuser",
                          correction: "Demander une correction",
                        }[decision]
                      }
                    </button>
                  ),
                )}
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
