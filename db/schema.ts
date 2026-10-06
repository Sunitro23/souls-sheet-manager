import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const characters = sqliteTable("characters", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull(),
  campaignId: text("campaign_id"),
  data: text("data").notNull(),
  revision: integer("revision").notNull().default(0),
});
export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull(),
  name: text("name").notNull(),
});
