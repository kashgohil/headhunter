CREATE TABLE `base_resumes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role_family` text NOT NULL,
	`positioning` text DEFAULT '' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`template` text DEFAULT 'classic' NOT NULL,
	`experience_ids` text DEFAULT '[]' NOT NULL,
	`achievement_ids` text DEFAULT '[]' NOT NULL,
	`skill_ids` text DEFAULT '[]' NOT NULL,
	`profile_item_ids` text DEFAULT '[]' NOT NULL,
	`section_order` text DEFAULT '["summary","experience","projects","skills","education"]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resume_bullet_edits` (
	`id` text PRIMARY KEY NOT NULL,
	`tailored_resume_id` text NOT NULL,
	`experience_id` text NOT NULL,
	`achievement_id` text NOT NULL,
	`original_text` text NOT NULL,
	`proposed_text` text NOT NULL,
	`reason` text NOT NULL,
	`requirement_addressed` text NOT NULL,
	`evidence_ids` text NOT NULL,
	`confidence` text NOT NULL,
	`risk` text NOT NULL,
	`decision` text DEFAULT 'pending' NOT NULL,
	`locked` integer DEFAULT false NOT NULL,
	`position` integer NOT NULL,
	`regeneration` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`tailored_resume_id`) REFERENCES `tailored_resumes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`experience_id`) REFERENCES `career_experiences`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`achievement_id`) REFERENCES `career_achievements`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `resume_section_locks` (
	`id` text PRIMARY KEY NOT NULL,
	`tailored_resume_id` text NOT NULL,
	`section` text NOT NULL,
	`locked` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`tailored_resume_id`) REFERENCES `tailored_resumes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resume_section_lock_unique` ON `resume_section_locks` (`tailored_resume_id`,`section`);--> statement-breakpoint
CREATE TABLE `tailored_resumes` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`base_resume_id` text NOT NULL,
	`version` integer NOT NULL,
	`template` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`summary_original` text DEFAULT '' NOT NULL,
	`summary_proposed` text NOT NULL,
	`summary_reason` text NOT NULL,
	`summary_requirement` text NOT NULL,
	`summary_evidence_ids` text DEFAULT '[]' NOT NULL,
	`summary_confidence` text NOT NULL,
	`summary_risk` text NOT NULL,
	`summary_decision` text DEFAULT 'pending' NOT NULL,
	`summary_locked` integer DEFAULT false NOT NULL,
	`section_order` text NOT NULL,
	`snapshot` text,
	`submitted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`base_resume_id`) REFERENCES `base_resumes`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tailored_resume_job_version_unique` ON `tailored_resumes` (`job_id`,`version`);