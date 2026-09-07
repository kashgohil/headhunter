import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  sourceUrl: text("source_url"),
  sourceType: text("source_type", { enum: ["pasted", "manual"] }).notNull().default("pasted"),
  originalDescription: text("original_description").notNull(),
  capturedAt: integer("captured_at", { mode: "timestamp_ms" }).notNull(),
});

export const opportunities = sqliteTable("opportunities", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().unique().references(() => jobs.id, { onDelete: "restrict" }),
  stage: text("stage", { enum: ["inbox"] }).notNull().default("inbox"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  action: text("action", { enum: ["job.captured", "search_strategy.saved"] }).notNull(),
  entityType: text("entity_type", { enum: ["job", "search_strategy"] }).notNull(),
  entityId: text("entity_id").notNull(),
  occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
});

export const searchStrategyVersions = sqliteTable("search_strategy_versions", {
  id: text("id").primaryKey(),
  version: integer("version").notNull().unique(),
  primaryTitle: text("primary_title").notNull(),
  adjacentTitles: text("adjacent_titles", { mode: "json" }).$type<string[]>().notNull(),
  seniorityLevels: text("seniority_levels", { mode: "json" }).$type<string[]>().notNull(),
  preferredIndustries: text("preferred_industries", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  excludedIndustries: text("excluded_industries", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  companyStages: text("company_stages", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  companySizes: text("company_sizes", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  workArrangements: text("work_arrangements", { mode: "json" }).$type<string[]>().notNull(),
  locations: text("locations", { mode: "json" }).$type<string[]>().notNull(),
  relocationPreference: text("relocation_preference").notNull().default("Not specified"),
  timeZoneConstraints: text("time_zone_constraints").notNull().default(""),
  workAuthorization: text("work_authorization").notNull(),
  sponsorshipRequired: integer("sponsorship_required", { mode: "boolean" }).notNull(),
  minimumCompensation: integer("minimum_compensation").notNull(),
  targetCompensation: integer("target_compensation").notNull(),
  currency: text("currency").notNull(),
  compensationFlexible: integer("compensation_flexible", { mode: "boolean" }).notNull().default(false),
  hardBlockers: text("hard_blockers", { mode: "json" }).$type<string[]>().notNull(),
  softPreferences: text("soft_preferences", { mode: "json" }).$type<string[]>().notNull(),
  weeklyHours: integer("weekly_hours").notNull(),
  searchPace: text("search_pace", { enum: ["quality", "balanced", "volume"] }).notNull().default("balanced"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
