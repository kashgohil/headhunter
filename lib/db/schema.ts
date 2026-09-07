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
  action: text("action", { enum: ["job.captured"] }).notNull(),
  entityType: text("entity_type", { enum: ["job"] }).notNull(),
  entityId: text("entity_id").notNull(),
  occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
});
