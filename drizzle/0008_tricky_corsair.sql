CREATE TABLE `fit_analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`search_strategy_version_id` text,
	`version` integer NOT NULL,
	`score` integer NOT NULL,
	`recommendation` text NOT NULL,
	`dimensions` text NOT NULL,
	`gaps` text DEFAULT '[]' NOT NULL,
	`reasons_for` text DEFAULT '[]' NOT NULL,
	`reasons_against` text DEFAULT '[]' NOT NULL,
	`weights` text NOT NULL,
	`evidence_ids` text DEFAULT '[]' NOT NULL,
	`overridden_recommendation` text,
	`override_reason` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`search_strategy_version_id`) REFERENCES `search_strategy_versions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fit_analysis_job_version_unique` ON `fit_analyses` (`job_id`,`version`);