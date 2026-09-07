CREATE TABLE `contact_interactions` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`job_id` text,
	`direction` text NOT NULL,
	`channel` text NOT NULL,
	`summary` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `contact_opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`job_id` text NOT NULL,
	`referral_status` text DEFAULT 'not_requested' NOT NULL,
	`follow_up_at` integer,
	`promised_action` text DEFAULT '' NOT NULL,
	`draft_kind` text DEFAULT 'outreach' NOT NULL,
	`draft` text DEFAULT '' NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contact_opportunity_unique` ON `contact_opportunities` (`contact_id`,`job_id`);--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`email` text,
	`profile_url` text,
	`relationship` text DEFAULT 'new' NOT NULL,
	`context` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
