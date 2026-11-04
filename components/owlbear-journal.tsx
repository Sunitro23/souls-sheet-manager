import { History } from 'lucide-react';
import type { CombatView } from '../lib/obr/core/actions';
import { OwlbearCost } from './owlbear-resource';

export default function OwlbearJournal({ state }: { state: CombatView | null }) {
  if (!state) return null;
  const entries = state.history ?? [];
  const name = (id: string) => state.combat.participants.find(p => p.id === id)?.name ?? 'Participant';
  return <details className="c-owlbear-journal"><summary><History size={15} />Journal du combat<span>{entries.length}</span></summary>
    {!entries.length ? <p>Les prochaines actions apparaîtront ici.</p> : <ol>{[...entries].reverse().map(entry => <li key={entry.id}>
      <div><span>Manche {Math.floor(entry.turn / Math.max(1, state.combat.participants.length)) + 1} · {name(entry.actorId)}</span><OwlbearCost end={entry.end} mana={entry.mana} /></div>
      <strong>{entry.name}</strong>
      {entry.resolved === false && <small>Résolution en cours</small>}
      {entry.hitParticipants && <small>{entry.hitParticipants.length ? `Touchés : ${entry.hitParticipants.map(name).join(', ')}` : 'Aucune cible touchée'}{entry.damage && entry.hitParticipants.length > 0 ? ` · Dégâts : ${entry.damage}` : ''}</small>}
    </li>)}</ol>}
  </details>;
}
