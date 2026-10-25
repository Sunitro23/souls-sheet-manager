import type {Character} from './rules.ts';

export type EditableCharacter = Character & {playerId?: string};
type State = {
  character: EditableCharacter | null;
  dirty: boolean;
  pending: boolean;
  status: 'idle' | 'saving' | 'saved' | 'error';
  conflict: boolean;
};
type Dependencies = {
  call: (data: Record<string, unknown>) => Promise<{character: EditableCharacter}>;
  committed: (character: EditableCharacter) => void;
};

// Callers observe snapshots; all draft and persistence transitions stay here.
export function createCharacterEditor({call, committed}: Dependencies) {
  let state: State = {character: null, dirty: false, pending: false, status: 'idle', conflict: false};
  const listeners = new Set<() => void>();
  function publish(patch: Partial<State>) {
    state = {...state, ...patch};
    listeners.forEach(listener => listener());
  }
  function accept(character: EditableCharacter, status: State['status']) {
    publish({character: structuredClone(character), dirty: false, status, conflict: false});
    committed(character);
  }
  function requireCharacter() {
    if (!state.character) throw Error('Aucun personnage ouvert.');
    return state.character;
  }
  async function persist(op: 'saveCharacter' | 'unlock', next?: EditableCharacter, nodeId?: string) {
    if (state.pending) throw Error('Une opération est déjà en cours.');
    const current = requireCharacter();
    if (op === 'unlock' && state.dirty) throw Error('Enregistrez les modifications avant de débloquer une compétence.');
    const draft = structuredClone(next ?? current);
    if (draft.id !== current.id || draft.campaignId !== current.campaignId) throw Error('Personnage différent du brouillon ouvert.');
    publish({character: draft, dirty: op === 'saveCharacter' || state.dirty, pending: true, status: 'saving'});
    try {
      const result = await call({op, campaignId: draft.campaignId, id: draft.id, revision: draft.revision,
        ...(op === 'saveCharacter' ? {character: draft} : {nodeId})});
      accept({...result.character, playerId: result.character.playerId ?? current.playerId}, 'saved');
    } catch (error) {
      publish({status: 'error', conflict: state.conflict || (error as {status?: number})?.status === 409});
      throw error;
    } finally {
      publish({pending: false});
    }
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    open(character: EditableCharacter | null) {
      if (state.pending) return;
      publish({character: character ? structuredClone(character) : null, dirty: false, status: 'idle', conflict: false});
    },
    edit(patch: Partial<EditableCharacter>) {
      if (!state.pending) publish({character: {...requireCharacter(), ...patch}, dirty: true, status: 'idle'});
    },
    canLeave(confirmDiscard: () => boolean) {
      return !state.pending && (!state.dirty || confirmDiscard());
    },
    save: (next?: EditableCharacter) => persist('saveCharacter', next),
    unlock: (nodeId: string) => persist('unlock', undefined, nodeId),
    exportDraft: () => JSON.stringify(requireCharacter(), null, 2),
    async reload(load: (character: EditableCharacter) => Promise<EditableCharacter>, confirmDiscard: () => boolean) {
      if (state.pending || ((state.dirty || state.conflict) && !confirmDiscard())) return false;
      const current = requireCharacter();
      publish({pending: true});
      try {
        const remote = await load(current);
        if (!remote || remote.id !== current.id || remote.campaignId !== current.campaignId) throw Error('Personnage inaccessible.');
        accept(remote, 'idle');
        return true;
      } finally {
        publish({pending: false});
      }
    },
  };
}
