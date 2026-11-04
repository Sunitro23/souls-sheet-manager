"use client";
import { Check, Shield, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CombatView } from '../lib/obr/core/actions';
export default function OwlbearReactions({state,playerId}:{state:CombatView;playerId:string;gm:boolean}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [message,setMessage]=useState('');
  useEffect(()=>{
    let live=true; let stop:(()=>void)|undefined;
    void import('@owlbear-rodeo/sdk').then(({default:OBR})=>{
      if(live) stop=OBR.broadcast.onMessage('de.sunitro.cendres/reaction-status',event=>{
        const data=event.data as {message?:string;error?:string};
        setMessage(data.message??''); setError(data.error??'');
      });
    });
    return ()=>{live=false;stop?.();};
  },[]);
  const pending=state.pending;
  const hitNames=state.lastAttack?.hitParticipants.map(id=>state.combat.participants.find(p=>p.id===id&&p.playerId===playerId)?.name).filter(Boolean)??[];
  if(!pending)return <>{error&&<p role="alert">{error}</p>}{!state.resolution&&hitNames.length>0&&<section className="c-owlbear-encounter is-danger" aria-label="Vous êtes touché">
    <p className="c-owlbear-eyebrow">{state.lastAttack?.name}</p>
    <h2>Vous êtes touché</h2>
    <p>{hitNames.join(', ')} subit l’attaque.</p>
  </section>}</>;
  if(!pending.defenders.some(id=>state.combat.participants.find(p=>p.id===id)?.playerId===playerId)) return null;
  return <section className="c-owlbear-encounter is-danger" aria-label="Réactions à l’attaque">
    <span className="c-owlbear-encounter-icon"><ShieldAlert size={28} aria-hidden="true"/></span>
    <p className="c-owlbear-eyebrow">Une attaque vous menace</p>
    <h2>Vous êtes en danger</h2>
    <p>Voulez-vous tenter une esquive ?</p>
    {message&&pending.answered.length<pending.defenders.length&&<p className="c-owlbear-encounter-hint" role="status">{message}</p>}
    {error&&<p role="alert">{error}</p>}
    {pending.defenders.filter(id=>state.combat.participants.find(p=>p.id===id)?.playerId===playerId).map(id=>{const p=state.combat.participants.find(p=>p.id===id)!;const answered=pending.answered.includes(id);return <div className="c-owlbear-reaction-choice" key={id}>{pending.defenders.length>1&&<strong>{p.name}</strong>} {answered&&<p className="c-owlbear-encounter-hint" role="status"><Check size={16} aria-hidden="true"/> Votre choix est fait.</p>}
      {!answered&&(p.playerId===playerId)&&<div className="c-owlbear-encounter-actions"><button className="c-primary" disabled={busy || !(state.dodges[id] > 0)} title={state.dodges[id] > 0 ? 'Utiliser une esquive préparée, sans coût supplémentaire' : 'Aucune esquive préparée'} onClick={async()=>{setBusy(true);setError('');try{const [{default:OBR},{DODGE_CHANNEL}]=await Promise.all([import('@owlbear-rodeo/sdk'),import('../lib/obr/owlbear/reactions')]);await OBR.broadcast.sendMessage(DODGE_CHANNEL,{participantId:id,attackId:pending.id},{destination:'LOCAL'});}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}><Shield size={14}/>Esquiver</button>
      <button className="c-button" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const {mutateCombat}=await import('../lib/obr/owlbear/actions');await mutateCombat(state,'answer',{participantId:id,attackId:pending.id,destination:null});}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}>Encaisser</button></div>}
      {!answered&&<p className="c-owlbear-encounter-hint">{state.dodges[id]>0 ? "Esquive préparée · aucun coût supplémentaire" : "Aucune esquive préparée pour cette attaque."}</p>}
    </div>})}
  </section>;
}
