CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`campaign_id` text,
	`data` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
