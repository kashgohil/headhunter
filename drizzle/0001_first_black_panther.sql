CREATE TABLE `search_strategy_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`primary_title` text NOT NULL,
	`adjacent_titles` text NOT NULL,
	`seniority_levels` text NOT NULL,
	`work_arrangements` text NOT NULL,
	`locations` text NOT NULL,
	`work_authorization` text NOT NULL,
	`sponsorship_required` integer NOT NULL,
	`minimum_compensation` integer NOT NULL,
	`target_compensation` integer NOT NULL,
	`currency` text NOT NULL,
	`hard_blockers` text NOT NULL,
	`soft_preferences` text NOT NULL,
	`weekly_hours` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `search_strategy_versions_version_unique` ON `search_strategy_versions` (`version`);