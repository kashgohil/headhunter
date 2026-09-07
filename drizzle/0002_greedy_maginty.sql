ALTER TABLE `search_strategy_versions` ADD `preferred_industries` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `search_strategy_versions` ADD `excluded_industries` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `search_strategy_versions` ADD `company_stages` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `search_strategy_versions` ADD `company_sizes` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `search_strategy_versions` ADD `relocation_preference` text DEFAULT 'Not specified' NOT NULL;--> statement-breakpoint
ALTER TABLE `search_strategy_versions` ADD `time_zone_constraints` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `search_strategy_versions` ADD `compensation_flexible` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `search_strategy_versions` ADD `search_pace` text DEFAULT 'balanced' NOT NULL;