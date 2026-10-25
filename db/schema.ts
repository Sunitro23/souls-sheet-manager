import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const characters = sqliteTable("characters", {
  id: text("id").primaryKey(),
  deletedAt: integer("deleted_at"),
  tokenHash: text("token_hash").notNull(),
  campaignId: text("campaign_id"),
  playerId: text("player_id"),
  data: text("data").notNull(),
  revision: integer("revision").notNull().default(0),
});
export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  deletedAt: integer("deleted_at"),
  tokenHash: text("token_hash").notNull(),
  name: text("name").notNull(),
  gmId: text("gm_id"),
  img: text("img").notNull().default(""),
  tree: text("tree"),
  settings: text("settings"),
  history: text("history").notNull().default("[]"),
  revision: integer("revision").notNull().default(0),
});
export const accounts = sqliteTable('accounts', { id:text('id').primaryKey(), username:text('username').notNull().unique(), owlbearId:text('owlbear_id').unique(), passwordHash:text('password_hash').notNull(), salt:text('salt').notNull() });
export const sessions = sqliteTable('sessions', { id:text('id').primaryKey(), accountId:text('account_id').notNull(), expires:integer('expires').notNull() });
export const campaignMembers = sqliteTable('campaign_members', { id:text('id').primaryKey(), campaignId:text('campaign_id').notNull(), accountId:text('account_id').notNull() });
export const loginAttempts = sqliteTable('login_attempts', { id:text('id').primaryKey(), count:integer('count').notNull(), expires:integer('expires').notNull() });

export const combatSessions = sqliteTable('combat_sessions', {
  id: text('id').primaryKey(), campaignId: text('campaign_id').notNull(),
  data: text('data').notNull(), revision: integer('revision').notNull().default(0),
});
