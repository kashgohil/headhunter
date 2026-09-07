CREATE TABLE `career_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`contexts` text DEFAULT '[]' NOT NULL,
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
CREATE TABLE `career_profile_items` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`organization` text,
	`description` text NOT NULL,
	`start_date` text,
	`end_date` text,
	`url` text,
	`credential_id` text,
	`technologies` text DEFAULT '[]' NOT NULL,
	`source_type` text DEFAULT 'user_entered' NOT NULL,
	`source_label` text,
	`verification_state` text DEFAULT 'needs_clarification' NOT NULL,
	`locked` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `career_stories` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`situation` text NOT NULL,
	`task` text NOT NULL,
	`action` text NOT NULL,
	`result` text NOT NULL,
	`reflection` text NOT NULL,
	`role_families` text DEFAULT '[]' NOT NULL,
	`prompts` text DEFAULT '[]' NOT NULL,
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
CREATE TABLE `career_voice_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`tone` text NOT NULL,
	`principles` text DEFAULT '[]' NOT NULL,
	`avoid` text DEFAULT '[]' NOT NULL,
	`sample` text,
	`source_type` text DEFAULT 'user_entered' NOT NULL,
	`source_label` text,
	`verification_state` text DEFAULT 'needs_clarification' NOT NULL,
	`locked` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
