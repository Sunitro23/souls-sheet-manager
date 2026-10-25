import type { CampaignSettings } from "../../lib/campaign-settings";
import type { Character } from "../../lib/rules";
import type { Tree } from "../../lib/progression";
import type { ReviewDecision } from "../../lib/reviews";
export type AdminCharacter = Character & {
  race?: string;
  playerId: string;
  reviewHistory?: ReviewDecision[];
};
export type HistoryEntry = {
  id: string;
  at: number;
  actor: string;
  action: string;
};
export type Workspace = {
  campaign: {
    id: string;
    name: string;
    img: string;
    revision: number;
    isGM: boolean;
  };
  settings: CampaignSettings;
  tree: Tree;
  characters: AdminCharacter[];
  members: { id: string; username: string }[];
  history: HistoryEntry[];
};
export type AdminCommon = {
  storageKey?: string;
  workspace: Workspace;
  busy: boolean;
  onDirty: (value: boolean) => void;
};
export type Perform = (
  data: Record<string, unknown>,
  after?: () => void,
) => Promise<void>;
