CREATE TABLE `calendar_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`account_label` text DEFAULT 'Google Calendar' NOT NULL,
	`encrypted_credentials` text NOT NULL,
	`granted_scopes` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'connected' NOT NULL,
	`last_attempt_at` integer,
	`last_success_at` integer,
	`last_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `calendar_event_links` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`interview_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `external_calendar_events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`interview_id`) REFERENCES `application_interviews`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_event_links_event_id_unique` ON `calendar_event_links` (`event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_event_links_interview_id_unique` ON `calendar_event_links` (`interview_id`);--> statement-breakpoint
CREATE TABLE `calendar_oauth_states` (
	`state_hash` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `external_calendar_events` (
	`id` text PRIMARY KEY NOT NULL,
	`calendar_id` text NOT NULL,
	`provider_event_id` text NOT NULL,
	`title` text NOT NULL,
	`location` text,
	`status` text NOT NULL,
	`start_at` integer NOT NULL,
	`end_at` integer NOT NULL,
	`time_zone` text NOT NULL,
	`all_day` integer DEFAULT false NOT NULL,
	`recurring_event_id` text,
	`original_start_time` text,
	`provider_updated_at` integer NOT NULL,
	`removed` integer DEFAULT false NOT NULL,
	`last_seen_at` integer NOT NULL,
	FOREIGN KEY (`calendar_id`) REFERENCES `external_calendars`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `external_calendar_event_provider_unique` ON `external_calendar_events` (`calendar_id`,`provider_event_id`);--> statement-breakpoint
CREATE INDEX `external_calendar_event_start_idx` ON `external_calendar_events` (`start_at`);--> statement-breakpoint
CREATE TABLE `external_calendars` (
	`id` text PRIMARY KEY NOT NULL,
	`connection_id` text NOT NULL,
	`provider_calendar_id` text NOT NULL,
	`name` text NOT NULL,
	`time_zone` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`selected` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`connection_id`) REFERENCES `calendar_connections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `external_calendar_provider_unique` ON `external_calendars` (`connection_id`,`provider_calendar_id`);