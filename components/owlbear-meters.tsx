"use client";
import type { Character } from '../lib/rules';
import OwlbearResource from './owlbear-resource';

export default function OwlbearMeters({ character, maximum, busy, onEdit }: {
  character: Character; maximum: { hp: number; mana: number; end: number }; busy: boolean;
  onEdit: (patch: Partial<Character>) => void;
}) {
  return <div className="c-owlbear-meters">{(['hp', 'mana', 'end'] as const).map(kind => {
    const label = { hp: 'PV', mana: 'FP', end: 'END' }[kind];
    const change = (delta: number) => {
      if (!busy && Number.isSafeInteger(delta)) onEdit({ [kind]: Math.min(maximum[kind], Math.max(0, character[kind] + delta)) });
    };
    return <details key={`${character.id}/${kind}`} className={`c-owlbear-meter ${kind}`} name="owlbear-resource" aria-label={label}>
      <summary title={`Modifier les ${label}`}><span><OwlbearResource kind={kind}>{label}</OwlbearResource><strong>{character[kind]}<small> / {maximum[kind]}</small></strong></span><progress aria-label={`${label} actuels`} value={character[kind]} max={Math.max(1, maximum[kind])} /></summary>
      <div className="c-owlbear-resource-popover"><strong>Modifier les {label}</strong><form onSubmit={event => {
        event.preventDefault();
        const form = event.currentTarget, value = String(new FormData(form).get('delta') ?? '').trim();
        if (!value || busy) return;
        change(Number(value));
        if (Number.isSafeInteger(Number(value))) { form.reset(); form.closest('details')?.removeAttribute('open'); }
      }}><label>Variation<input name="delta" aria-label={`Variation de ${label}`} type="number" step="1" required placeholder="−12 ou +8" disabled={busy} /></label><button className="c-primary" disabled={busy}>Appliquer</button></form>
        <div className="c-owlbear-stepper"><button type="button" aria-label={`Retirer 1 ${label}`} disabled={busy || character[kind] <= 0} onClick={() => change(-1)}>−1</button><button type="button" aria-label={`Ajouter 1 ${label}`} disabled={busy || character[kind] >= maximum[kind]} onClick={() => change(1)}>+1</button></div>
      </div>
    </details>;
  })}</div>;
}
