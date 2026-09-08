CREATE TABLE `owner_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `owner_session_expiry_idx` ON `owner_sessions` (`expires_at`);