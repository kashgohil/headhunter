CREATE TABLE `application_interviews` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`label` text NOT NULL,
	`scheduled_at` integer NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pipeline_stages` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`category` text NOT NULL,
	`position` integer NOT NULL,
	`is_terminal` integer DEFAULT false NOT NULL,
	`is_built_in` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pipeline_stages_key_unique` ON `pipeline_stages` (`key`);--> statement-breakpoint
ALTER TABLE `application_events` ADD `from_stage` text;--> statement-breakpoint
ALTER TABLE `application_events` ADD `to_stage` text;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `priority` text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `interest` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `waiting` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `waiting_reason` text;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `submission_waived_at` integer;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `submission_waiver_reason` text;--> statement-breakpoint
ALTER TABLE `opportunities` ADD `outcome_reason` text;--> statement-breakpoint
UPDATE `opportunities` SET `stage` = 'recruiter_screen' WHERE `stage` = 'screening';
--> statement-breakpoint
INSERT INTO `application_events` (`id`, `job_id`, `kind`, `title`, `to_stage`, `occurred_at`)
SELECT lower(hex(randomblob(16))), `job_id`, 'stage', 'Added to Inbox', `stage`, `created_at`
FROM `opportunities`
WHERE NOT EXISTS (
	SELECT 1 FROM `application_events`
	WHERE `application_events`.`job_id` = `opportunities`.`job_id`
	AND `application_events`.`kind` = 'stage'
);
