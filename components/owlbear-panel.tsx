"use client";
import { useState } from "react";
import { ExternalLink, Settings, UserRound, ArrowLeft } from "lucide-react";
import { derive, type Character } from "../lib/rules";
import type { Tree } from "../lib/progression";
import { combatAttention } from "../lib/obr/core/attention";
import { useOwlbearCombat } from "./use-owlbear-combat";
import OwlbearSound from "./owlbear-sound";
import OwlbearMeters from "./owlbear-meters";
import OwlbearJournal from "./owlbear-journal";
import OwlbearCombat from "./owlbear-combat";
import OwlbearTools from "./owlbear-tools";

type Props = {
  ready: boolean; campaignId: string; campaigns: {id:string;name:string}[];
  characters: Character[]; character: Character | null; canAssign: boolean;
  section: string; tree?: Tree; busy: boolean; dirty: boolean; saveStatus: string; conflict: boolean;
  onCampaign: (id: string) => void; onCharacter: (id: string) => Promise<void>;
  onSection: (section: string) => void; onEdit: (patch: Partial<Character>) => void;
  onSave: () => void; onCopyDraft: () => void; onReload: () => void;
};
export default function OwlbearPanel(props: Props) {
  const { character, characters, busy } = props;
  const runtime = useOwlbearCombat();
  const attention = combatAttention(runtime.state, runtime.playerId, runtime.role === 'GM');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settings = props.canAssign && settingsOpen;
  const derived = character ? derive(character) : null;
  const navigate = (section = "Actions") => { setSettingsOpen(props.canAssign && section === "Paramètres"); props.onSection("Actions"); };
  return <main id="main-content" className="c-owlbear-panel c-owlbear-tactical" aria-busy={busy}>
    <header className="c-owlbear-header">
      <span className="c-owlbear-portrait">{character?.portrait
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={character.portrait} alt=""/> : <UserRound size={27} aria-hidden="true"/>}</span>
      <div className="c-owlbear-identity"><span>{props.canAssign ? "Personnage sélectionné" : "Votre personnage"}</span><h1>{character?.name || "Choisissez un token"}</h1></div>
      {attention && <span className={`c-owlbear-attention ${attention.text === 'Réagir' ? 'is-reaction' : ''}`} role="status">{attention.text}</span>}
      <nav aria-label="Navigation Owlbear"><OwlbearSound playerId={runtime.playerId}/>{props.canAssign && <button type="button" className="c-owlbear-settings-button" aria-label="Paramètres GM" title="Paramètres GM" aria-pressed={settings} onClick={() => setSettingsOpen(!settings)}><Settings size={17}/></button>}</nav>
    </header>
    {!settings && character && derived && <OwlbearMeters character={character} maximum={derived} busy={busy} onEdit={props.onEdit}/>}
    <div className="c-owlbear-content">
      {settings && <button type="button" className="c-owlbear-back" onClick={() => navigate()}><ArrowLeft size={15}/>Revenir aux actions</button>}
      {props.ready && props.campaignId && <OwlbearCombat settings={settings} key={props.campaignId} campaignId={props.campaignId} characters={characters} canAssign={props.canAssign}/>}
      {props.saveStatus === 'error' && <p role="alert">Échec de l’enregistrement. Vos modifications sont conservées. <button className="c-button" disabled={busy} onClick={props.onSave}>Réessayer</button></p>}
      {props.conflict && <div role="alert"><p>La fiche a changé ailleurs. Copiez votre brouillon ou rechargez la fiche.</p><button className="c-button" onClick={props.onCopyDraft}>Copier le brouillon</button><button className="c-button" disabled={busy} onClick={props.onReload}>Recharger</button></div>}
      {props.ready && <OwlbearTools dirty={props.dirty} characters={characters} canAssign={props.canAssign} character={character} section={settings ? "Paramètres" : "Actions"} tree={props.tree} onCharacter={props.onCharacter} onSection={navigate}/>}
      {!settings && <OwlbearJournal state={runtime.state}/>}
      {settings && <a href="/" target="_blank" rel="noopener noreferrer">Ouvrir sur le site <ExternalLink size={14}/></a>}
    </div>
  </main>;
}
