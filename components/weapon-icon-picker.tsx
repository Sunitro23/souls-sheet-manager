'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {isUploadedWeaponIcon, prepareWeaponIcon, weaponIcons, weaponIconSource} from '../lib/weapon-icons';
import {spellIcons, spellIconSource} from '../lib/spell-icons';

export default function WeaponIconPicker({value, category, kind = 'weapon', onChange, disabled, onBusyChange}: {
  value: string;
  category: string;
  kind?: 'weapon' | 'magic';
  onChange: (value: string) => void;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const id = useId(), request = useRef(0);
  const [loading, setLoading] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const uploaded = isUploadedWeaponIcon(value);
  const magic = kind === 'magic';
  useEffect(() => () => { request.current++; }, []);
  return <div className="c-field">
    <label htmlFor={`${id}-file`}>{magic ? 'Icône de magie' : 'Icône d’arme'} · importer depuis mon PC</label>
    <p id={`${id}-help`} className="c-muted">
      PNG ou WebP avec fond transparent conseillé ; JPG accepté, avec son fond.
      Format carré de 256 × 256 px recommandé, dessin centré et contrasté, sans petits détails.
      Jusqu’à 5 Mo. L’image est adaptée automatiquement à un carré, sans déformation ni recadrage ; sa transparence est conservée.
    </p>
    <input id={`${id}-file`} type="file" accept="image/png,image/webp,image/jpeg,.png,.webp,.jpg,.jpeg"
      aria-describedby={`${id}-help`} disabled={disabled || loading}
      onChange={async e => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const current = ++request.current;
        setLoading(true); onBusyChange(true); setError(''); setNotice('');
        try {
          const data = await prepareWeaponIcon(file);
          if (current !== request.current) return;
          onChange(data);
          setNotice('Icône importée. Appliquez la catégorie, puis enregistrez le catalogue pour la partager avec les joueurs.');
        } catch (err) {
          if (current === request.current) setError(err instanceof Error ? err.message : 'Impossible d’importer cette image.');
        } finally {
          if (current === request.current) { setLoading(false); onBusyChange(false); }
        }
      }}/>
    <div aria-live="polite">{loading ? 'Préparation de l’icône…' : notice}</div>
    {error && <p className="c-sheet-error" role="alert">{error}</p>}
    <img src={(magic ? spellIconSource : weaponIconSource)(category, value)} alt={magic ? 'Aperçu de l’icône de magie' : 'Aperçu de l’icône d’arme'} width={64} height={64}/>
    {uploaded && <button type="button" className="c-button" disabled={disabled || loading}
      onClick={() => { onChange(''); setError(''); setNotice('Icône importée retirée.'); }}>Retirer l’icône importée</button>}
    <label htmlFor={`${id}-preset`}>Ou choisir une icône intégrée</label>
    <select id={`${id}-preset`} value={uploaded ? 'uploaded' : value} disabled={disabled || loading}
      onChange={e => { if (e.target.value !== 'uploaded') { onChange(e.target.value); setNotice(''); setError(''); } }}>
      {uploaded && <option value="uploaded">Icône importée</option>}
      <option value="">{magic ? 'Automatique selon l’école de magie' : 'Automatique selon le type d’arme'}</option>
      {(magic ? spellIcons : weaponIcons).map(icon => <option key={icon.id} value={icon.id}>{icon.name}</option>)}
    </select>
  </div>;
}
