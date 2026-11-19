import type { CampaignSettings } from "../../lib/campaign-settings";
import type { Character } from "../../lib/rules";
import type { Tree } from "../../lib/progression";
import type { Destination } from "./navigation";
export type AdminCharacter = Character & {
  race?: string;
  playerId: string;
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
    gmId?: string | null;
  };
  settings: CampaignSettings;
  tree: Tree;
  characters: AdminCharacter[];
  members: { id: string; username: string }[];
  history: HistoryEntry[];
};
export type AdminCommon = {
  active?: boolean;
  target?: Destination;
  onNavigate?: (target: Destination) => void;
  storageKey?: string;
  workspace: Workspace;
  busy: boolean;
  onDirty: (value: boolean) => void;
};
export type Perform = (
  data: Record<string, unknown>,
  after?: () => void,
) => Promise<boolean>;
