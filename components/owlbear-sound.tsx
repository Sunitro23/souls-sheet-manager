"use client";
import { useEffect, useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { Volume2, VolumeX } from 'lucide-react';
import { COMBAT_AUDIO_CHANNEL, DEFAULT_COMBAT_AUDIO, audioSettings, type CombatAudioSettings } from '../lib/obr/core/combat-feedback';
import { COMBAT_SOUNDS, saveCombatAudio } from '../lib/obr/owlbear/combat-audio';

export default function OwlbearSound({ playerId }: { playerId: string }) {
  const [settings, setSettings] = useState(DEFAULT_COMBAT_AUDIO);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    if (!playerId) return;
    const stop = OBR.broadcast.onMessage(COMBAT_AUDIO_CHANNEL, ({ data: value }) => {
      const data = value as { playerId?: string; blocked?: boolean; settings?: unknown } | null;
      if (data?.playerId !== playerId) return;
      if (typeof data.blocked === 'boolean') setBlocked(data.blocked);
      if (data.settings) setSettings(audioSettings(data.settings));
    });
    void OBR.broadcast.sendMessage(COMBAT_AUDIO_CHANNEL, { playerId, query: true }, { destination: 'LOCAL' }).catch(() => {});
    return stop;
  }, [playerId]);
  function change(next: CombatAudioSettings, unlock = false) {
    setSettings(next);
    saveCombatAudio(playerId, next);
    if (unlock && !next.muted && next.volume > 0) {
      // Request audio playback directly from the user gesture.
      const sample = new Audio(COMBAT_SOUNDS.swing);
      sample.volume = next.volume;
      void sample.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    }
    void OBR.broadcast.sendMessage(COMBAT_AUDIO_CHANNEL, { playerId, settings: next, unlock }, { destination: 'LOCAL' }).catch(() => {});
  }
  if (!playerId) return null;
  return <details className="c-owlbear-sound">
    <summary aria-label="Son du combat" title="Son du combat">{settings.muted || blocked ? <VolumeX size={17}/> : <Volume2 size={17}/>}</summary>
    <div>
      <button type="button" aria-pressed={!settings.muted && !blocked}
        onClick={() => change({ ...settings, muted: blocked ? false : !settings.muted }, true)}>
        {settings.muted || blocked ? 'Activer les sons' : 'Couper les sons'}
      </button>
      <label>Volume <input type="range" min="0" max="100" step="5" value={Math.round(settings.volume * 100)}
        onChange={event => change({ ...settings, volume: Number(event.target.value) / 100 })}/></label>
      <button type="button" onClick={() => change({ ...settings, muted: false }, true)}>Tester le son</button>
    </div>
  </details>;
}
