CREATE TABLE `career_achievements` (
	`id` text PRIMARY KEY NOT NULL,
	`experience_id` text NOT NULL,
	`problem` text NOT NULL,
	`action` text NOT NULL,
	`result` text NOT NULL,
	`measurable_outcome` text,
	`tools` text DEFAULT '[]' NOT NULL,
	`role_families` text DEFAULT '[]' NOT NULL,
	`source_type` text DEFAULT 'user_entered' NOT NULL,
	`source_label` text,
	`verification_state` text DEFAULT 'needs_clarification' NOT NULL,
	`locked` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`experience_id`) REFERENCES `career_experiences`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `career_experiences` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`title` text NOT NULL,
	`location` text,
	`start_date` text NOT NULL,
	`end_date` text,
	`is_current` integer DEFAULT false NOT NULL,
	`summary` text,
	`technologies` text DEFAULT '[]' NOT NULL,
	`source_type` text DEFAULT 'user_entered' NOT NULL,
	`source_label` text,
	`verification_state` text DEFAULT 'needs_clarification' NOT NULL,
	`locked` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `career_skills` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`context` text,
	`recency` text NOT NULL,
	`proficiency` text NOT NULL,
	`supporting_achievement_id` text,
	`source_type` text DEFAULT 'user_entered' NOT NULL,
	`source_label` text,
	`verification_state` text DEFAULT 'needs_clarification' NOT NULL,
	`locked` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`supporting_achievement_id`) REFERENCES `career_achievements`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `career_skill_normalized_name_unique` ON `career_skills` (`normalized_name`);