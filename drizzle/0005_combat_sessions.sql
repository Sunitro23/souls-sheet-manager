CREATE TABLE combat_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  campaign_id TEXT NOT NULL,
  data TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX combat_sessions_campaign ON combat_sessions(campaign_id);
