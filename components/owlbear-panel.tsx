"use client";
import { useState } from "react";
import { ExternalLink, Sparkles, Settings } from "lucide-react";
import { derive, type Character } from "../lib/rules";
import type { Tree } from "../lib/progression";
import { activeParticipant } from "../lib/obr/core/actions";
import { useOwlbearCombat } from "./use-owlbear-combat";
import OwlbearResource from "./owlbear-resource";
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settings = props.canAssign && settingsOpen;
  const runtime = useOwlbearCombat();
  const active = runtime.state && activeParticipant(runtime.state.combat);
  const showActions = !runtime.combat || !!active && active.characterId === character?.id && (props.canAssign || active.playerId === runtime.playerId);
  const derived = character ? derive(character) : null;
  const navigate = () => { setSettingsOpen(false); props.onSection("Actions"); };
  return <main id="main-content" className="c-owlbear-panel" aria-busy={busy}>
    <nav className="c-owlbear-nav c-owlbear-nav-single" aria-label="Navigation Owlbear">
      <button type="button" aria-current={!settings?'page':undefined} onClick={navigate}><Sparkles size={20}/>Actions</button>
      {props.canAssign&&<button type="button" aria-label="Paramètres GM" title="Paramètres GM" aria-current={settings?"page":undefined} onClick={()=>setSettingsOpen(!settings)}><Settings size={16}/></button>}
    </nav>
    <div className="c-owlbear-content">
      {!props.ready&&<p role="status">Connexion à Owlbear…</p>}
      {props.ready&&props.campaignId&&<section aria-label="Informations du combat" hidden={settings}><OwlbearCombat key={props.campaignId} campaignId={props.campaignId} characters={characters} canAssign={props.canAssign}/></section>}
      {!settings&&showActions&&<>
        {!character&&<p>Sélectionnez votre token sur la carte.</p>}
        {character&&derived&&<>
          <div className="c-owlbear-character-card">
            {(['hp','mana','end'] as const).map(key=><section className="c-owlbear-resource-row" key={key} aria-label={{hp:'PV',mana:'FP',end:'END'}[key]}><OwlbearResource kind={key}/><div className="c-owlbear-stepper"><button type="button" aria-label={`Retirer 1 ${{hp:'PV',mana:'FP',end:'END'}[key]}`} disabled={busy||character[key]<=0} onClick={()=>props.onEdit({[key]:Math.max(0,character[key]-1)})}>−</button><strong>{character[key]} / {derived[key]}</strong><button type="button" aria-label={`Ajouter 1 ${{hp:'PV',mana:'FP',end:'END'}[key]}`} disabled={busy||character[key]>=derived[key]} onClick={()=>props.onEdit({[key]:Math.min(derived[key],character[key]+1)})}>+</button></div></section>)}
          </div>
          {props.saveStatus==='saving'&&<p role="status">Enregistrement…</p>}
          {props.saveStatus==='error'&&<p role="alert">Échec de l’enregistrement. Vos modifications sont conservées. <button className="c-button" disabled={busy} onClick={props.onSave}>Réessayer</button></p>}
          {props.conflict&&<div role="alert"><p>La fiche a changé ailleurs. Copiez votre brouillon ou rechargez la fiche.</p><button className="c-button" onClick={props.onCopyDraft}>Copier le brouillon</button><button className="c-button" disabled={busy} onClick={props.onReload}>Recharger</button></div>}
        </>}
      </>}
      {props.ready&&<OwlbearTools dirty={props.dirty} characters={characters} canAssign={props.canAssign} character={character} section={settings?"Paramètres":"Actions"} tree={props.tree} onCharacter={props.onCharacter} onSection={navigate}/>}
      {settings&&<a href="/" target="_blank" rel="noopener noreferrer">Ouvrir sur le site <ExternalLink size={14}/></a>}
    </div>
  </main>;
}
