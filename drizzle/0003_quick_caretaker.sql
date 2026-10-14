ALTER TABLE `accounts` ADD `owlbear_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_owlbear_id_unique` ON `accounts` (`owlbear_id`);