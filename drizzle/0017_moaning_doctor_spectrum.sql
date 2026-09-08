CREATE TABLE `weekly_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`week_start` text NOT NULL,
	`snapshot` text NOT NULL,
	`edits` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weekly_reviews_week_start_unique` ON `weekly_reviews` (`week_start`);
--> statement-breakpoint
CREATE TRIGGER `weekly_review_snapshot_immutable`
BEFORE UPDATE OF `snapshot`, `week_start` ON `weekly_reviews`
BEGIN
  SELECT RAISE(ABORT, 'Weekly review snapshots are immutable');
END;
