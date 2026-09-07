CREATE TABLE `interview_plans` (
	`interview_id` text PRIMARY KEY NOT NULL,
	`kind` text DEFAULT 'other' NOT NULL,
	`interviewers` text DEFAULT '' NOT NULL,
	`objectives` text DEFAULT '' NOT NULL,
	`commitments` text DEFAULT '' NOT NULL,
	`study_plan` text DEFAULT '' NOT NULL,
	`questions_for_interviewer` text DEFAULT '' NOT NULL,
	`actual_questions` text DEFAULT '' NOT NULL,
	`went_well` text DEFAULT '' NOT NULL,
	`answer_gaps` text DEFAULT '' NOT NULL,
	`thank_you_draft` text DEFAULT '' NOT NULL,
	`next_action` text DEFAULT '' NOT NULL,
	`debriefed_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`interview_id`) REFERENCES `application_interviews`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `interview_practice` (
	`id` text PRIMARY KEY NOT NULL,
	`interview_id` text NOT NULL,
	`prompt` text NOT NULL,
	`response` text NOT NULL,
	`clarity` integer NOT NULL,
	`relevance` integer NOT NULL,
	`evidence` integer NOT NULL,
	`feedback` text NOT NULL,
	`next_practice` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`interview_id`) REFERENCES `application_interviews`(`id`) ON UPDATE no action ON DELETE cascade
);
