CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`occurred_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`company` text NOT NULL,
	`location` text,
	`source_url` text,
	`source_type` text DEFAULT 'pasted' NOT NULL,
	`original_description` text NOT NULL,
	`captured_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`stage` text DEFAULT 'inbox' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `opportunities_job_id_unique` ON `opportunities` (`job_id`);
--> statement-breakpoint
CREATE TRIGGER `jobs_original_description_immutable`
BEFORE UPDATE OF `original_description` ON `jobs`
BEGIN
  SELECT RAISE(ABORT, 'original job descriptions are immutable');
END;
