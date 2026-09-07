CREATE TABLE `job_duplicate_signals` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`candidate_job_id` text NOT NULL,
	`reason` text NOT NULL,
	`similarity` real NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`candidate_job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_duplicate_pair_unique` ON `job_duplicate_signals` (`job_id`,`candidate_job_id`);--> statement-breakpoint
ALTER TABLE `jobs` ADD `source_fetched_at` integer;--> statement-breakpoint
ALTER TABLE `jobs` ADD `employment_type` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `work_arrangement` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `seniority` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `minimum_compensation` integer;--> statement-breakpoint
ALTER TABLE `jobs` ADD `maximum_compensation` integer;--> statement-breakpoint
ALTER TABLE `jobs` ADD `compensation_currency` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `posted_at` integer;--> statement-breakpoint
ALTER TABLE `jobs` ADD `application_deadline` integer;--> statement-breakpoint
ALTER TABLE `jobs` ADD `required_qualifications` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `preferred_qualifications` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `skills` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `technologies` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `extraction_confidence` text DEFAULT 'not_run' NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `metadata_updated_at` integer;