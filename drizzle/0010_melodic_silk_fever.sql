CREATE TABLE `company_research_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`company_name` text NOT NULL,
	`normalized_company_name` text NOT NULL,
	`topic` text NOT NULL,
	`content` text NOT NULL,
	`provenance` text NOT NULL,
	`source_url` text,
	`source_state` text,
	`accessed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `company_research_name_idx` ON `company_research_entries` (`normalized_company_name`);--> statement-breakpoint
CREATE TABLE `opportunity_research_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `opportunity_research_notes_job_id_unique` ON `opportunity_research_notes` (`job_id`);