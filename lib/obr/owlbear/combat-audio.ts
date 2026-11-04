import { audioSettings, audioStorageKey, type CombatAudioSettings } from '../core/combat-feedback';

export const COMBAT_SOUNDS = {
  swing: '/owlbear/combat/swing.ogg', hit: '/owlbear/combat/hit.ogg',
  dodge: '/owlbear/combat/dodge.ogg', spell: '/owlbear/combat/magic.wav',
};
export type CombatSound = keyof typeof COMBAT_SOUNDS;

export function readCombatAudio(playerId: string): CombatAudioSettings {
  try { return audioSettings(JSON.parse(localStorage.getItem(audioStorageKey(playerId)) ?? 'null')); }
  catch { return audioSettings(null); }
}

export function saveCombatAudio(playerId: string, settings: CombatAudioSettings) {
  try { localStorage.setItem(audioStorageKey(playerId), JSON.stringify(audioSettings(settings))); }
  catch { /* Preferences still apply for this session when storage is unavailable. */ }
}

// Keep playback in the persistent background, including when the action panel closes.
export function createCombatAudio(playerId: string, blocked: (value: boolean) => void) {
  let settings = readCombatAudio(playerId);
  let disposed = false;
  const sounds = new Map<CombatSound, HTMLAudioElement>();
  if (typeof Audio !== 'undefined') for (const [kind, url] of Object.entries(COMBAT_SOUNDS)) {
    const sound = new Audio(url);
    sound.preload = 'auto';
    sounds.set(kind as CombatSound, sound);
  }
  const pause = () => sounds.forEach(sound => { sound.pause(); });
  return {
    getSettings: () => ({ ...settings }),
    set(value: unknown) {
      settings = audioSettings(value);
      for (const sound of sounds.values()) sound.volume = settings.muted ? 0 : settings.volume;
      if (settings.muted || !settings.volume) pause();
    },
    play(kind: CombatSound) {
      if (disposed || settings.muted || !settings.volume) return;
      const sound = sounds.get(kind);
      if (!sound) return;
      sound.currentTime = 0;
      sound.volume = settings.volume;
      void sound.play().then(() => { if (!disposed) blocked(false); }).catch(error => {
        if (!disposed && error?.name === 'NotAllowedError') blocked(true);
      });
    },
    stop() { disposed = true; pause(); sounds.clear(); },
  };
}
