CREATE TABLE `analytics_annotations` (
	`job_id` text PRIMARY KEY NOT NULL,
	`values_json` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `analytics_experiments` (
	`id` text PRIMARY KEY NOT NULL,
	`plan` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`result` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `analytics_one_running_experiment` ON `analytics_experiments` (`status`) WHERE status = 'running';
--> statement-breakpoint
CREATE TRIGGER analytics_experiment_plan_immutable BEFORE UPDATE OF plan ON analytics_experiments
WHEN NEW.plan IS NOT OLD.plan
BEGIN SELECT RAISE(ABORT, 'Experiment plans are immutable; create a new plan.'); END;
--> statement-breakpoint
CREATE TRIGGER analytics_experiment_result_immutable BEFORE UPDATE OF result ON analytics_experiments
WHEN OLD.result IS NOT NULL AND NEW.result IS NOT OLD.result
BEGIN SELECT RAISE(ABORT, 'Completed experiment results are immutable.'); END;
