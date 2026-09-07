CREATE TABLE `command_center_alerts` (
	`key` text PRIMARY KEY NOT NULL,
	`dismissed` integer DEFAULT false NOT NULL,
	`snoozed_until` integer,
	`updated_at` integer NOT NULL
);
