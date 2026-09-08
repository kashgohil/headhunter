CREATE TABLE `resume_import_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`import_id` text NOT NULL,
	`source_key` text NOT NULL,
	`kind` text NOT NULL,
	`source_quote` text NOT NULL,
	`fields` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`evidence_id` text,
	`revision` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`import_id`) REFERENCES `resume_imports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resume_import_proposal_source_unique` ON `resume_import_proposals` (`import_id`,`source_key`);--> statement-breakpoint
CREATE TABLE `resume_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`name` text NOT NULL,
	`format` text NOT NULL,
	`source_text` text NOT NULL,
	`warning` text DEFAULT '' NOT NULL,
	`extractor_version` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resume_imports_fingerprint_unique` ON `resume_imports` (`fingerprint`);--> statement-breakpoint
CREATE TRIGGER resume_import_source_immutable BEFORE UPDATE OF source_text,fingerprint ON resume_imports BEGIN SELECT RAISE(ABORT, 'Import source is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER resume_import_quote_immutable BEFORE UPDATE OF import_id,source_key,source_quote,kind ON resume_import_proposals BEGIN SELECT RAISE(ABORT, 'Proposal source is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER resume_import_decision_immutable BEFORE UPDATE ON resume_import_proposals WHEN OLD.state != 'pending' BEGIN SELECT RAISE(ABORT, 'Reviewed proposals are immutable'); END;
