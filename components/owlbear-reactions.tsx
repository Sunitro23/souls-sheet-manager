"use client";
import { Check, Clock, Shield } from 'lucide-react';
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
  const hitNames=state.unpreparedHit?.defenders.map(id=>state.combat.participants.find(p=>p.id===id&&p.playerId===playerId)?.name).filter(Boolean)??[];
  if(!pending)return <>{!state.resolution&&state.lastAttack&&<p role="status">{state.lastAttack.name} — {state.lastAttack.hitParticipants.length ? `Touchés : ${state.lastAttack.hitParticipants.map(id=>state.combat.participants.find(p=>p.id===id)?.name??id).join(', ')}.` : 'Aucun participant touché.'}</p>}{error&&<p role="alert">{error}</p>}{state.resolution?<p role="status">Application des esquives et révélation de la zone…</p>:!state.lastAttack&&hitNames.length>0?<p role="status">{hitNames.join(', ')} : aucune esquive préparée, vous subissez l’attaque.</p>:null}</>;
  if(!pending.defenders.some(id=>state.combat.participants.find(p=>p.id===id)?.playerId===playerId)) return null;
  return <section aria-label="Réactions à l’attaque">
    {message&&<p role="status">{message}</p>}
    <p>Zone d’attaque : esquivez vers une case surlignée ou choisissez de ne pas esquiver.</p>
    {error&&<p role="alert">{error}</p>}
    {pending.defenders.filter(id=>state.combat.participants.find(p=>p.id===id)?.playerId===playerId).map(id=>{const p=state.combat.participants.find(p=>p.id===id)!;const answered=pending.answered.includes(id);return <div className="c-owlbear-inline" key={id}><strong>{p.name}</strong> {answered?<Check size={14} aria-label="Réponse enregistrée"/>:<Clock size={14} aria-label="En attente"/>}
      {!answered&&(p.playerId===playerId)&&<><button className="c-button" disabled={busy || !(state.dodges[id] > 0)} title={state.dodges[id] > 0 ? 'Utiliser une esquive préparée, sans coût supplémentaire' : 'Aucune esquive préparée'} onClick={async()=>{setBusy(true);setError('');try{const [{default:OBR},{DODGE_CHANNEL}]=await Promise.all([import('@owlbear-rodeo/sdk'),import('../lib/obr/owlbear/reactions')]);await OBR.broadcast.sendMessage(DODGE_CHANNEL,{participantId:id,attackId:pending.id},{destination:'LOCAL'});}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}><Shield size={14}/>Esquiver</button>
      <button className="c-button" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const {mutateCombat}=await import('../lib/obr/owlbear/actions');await mutateCombat(state,'answer',{participantId:id,attackId:pending.id,destination:null});}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}>Ne pas esquiver</button></>}
    </div>})}
  </section>;
}
