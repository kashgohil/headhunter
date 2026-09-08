import type Database from "better-sqlite3";
import { z } from "zod";
import type { WeeklySnapshot } from "./model";
const text = z
  .string()
  .trim()
  .max(12000, "Keep each section under 12,000 characters.");
export const reviewEditsSchema = z
  .object({
    reflection: text,
    interpretation: text,
    experimentOne: text,
    experimentTwo: text,
    nextWeekPlan: text,
    availableHours: z.coerce.number().finite().min(0).max(168),
    plannedHours: z.coerce.number().finite().min(0).max(168),
    status: z.enum(["draft", "reviewed"]),
  })
  .refine((value) => value.plannedHours <= value.availableHours, {
    message:
      "Planned hours exceed your available time. Reduce the plan or adjust your capacity.",
  })
  .refine(
    (value) =>
      value.status !== "reviewed" ||
      Boolean(value.reflection && value.nextWeekPlan),
    {
      message:
        "Add a reflection and a next-week plan before marking this review complete.",
    },
  );
export type ReviewEdits = z.infer<typeof reviewEditsSchema>;
export type SavedReview = ReviewEdits & {
  id: string;
  weekStart: string;
  snapshot: WeeklySnapshot;
  revision: number;
  createdAt: number;
  updatedAt: number;
};
function hydrate(row: Record<string, unknown>): SavedReview {
  return {
    id: String(row.id),
    weekStart: String(row.week_start),
    snapshot: JSON.parse(String(row.snapshot)),
    ...JSON.parse(String(row.edits)),
    revision: Number(row.revision),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}
export function getSavedReview(database: Database.Database, id: string) {
  const row = database
    .prepare("SELECT * FROM weekly_reviews WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  return row ? hydrate(row) : null;
}
export function createSavedReview(
  database: Database.Database,
  snapshot: WeeklySnapshot,
) {
  return database
    .transaction(() => {
      const existing = database
        .prepare("SELECT id FROM weekly_reviews WHERE week_start = ?")
        .get(snapshot.weekStart) as { id: string } | undefined;
      if (existing) return existing.id;
      const id = crypto.randomUUID(),
        now = Date.now();
      const edits: ReviewEdits = {
        reflection: "",
        interpretation: "",
        experimentOne: "",
        experimentTwo: "",
        nextWeekPlan: snapshot.suggestedPlan,
        availableHours: snapshot.weeklyHours ?? 3,
        plannedHours: snapshot.suggestedHours,
        status: "draft",
      };
      database
        .prepare(
          "INSERT INTO weekly_reviews (id,week_start,snapshot,edits,revision,created_at,updated_at) VALUES (?,?,?,?,1,?,?)",
        )
        .run(
          id,
          snapshot.weekStart,
          JSON.stringify(snapshot),
          JSON.stringify(edits),
          now,
          now,
        );
      database
        .prepare(
          "INSERT INTO audit_events (id,action,entity_type,entity_id,occurred_at) VALUES (?,?,?,?,?)",
        )
        .run(
          crypto.randomUUID(),
          "weekly_review.created",
          "weekly_review",
          id,
          now,
        );
      return id;
    })
    .immediate();
}
export function saveReviewEdits(
  database: Database.Database,
  id: string,
  revision: number,
  input: unknown,
) {
  const parsed = reviewEditsSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  if (!Number.isSafeInteger(revision) || revision < 1)
    throw new Error("Invalid review revision. Reload this review.");
  return database
    .transaction(() => {
      const now = Date.now();
      const previous = database
        .prepare(
          "SELECT json_extract(edits, '$.status') status FROM weekly_reviews WHERE id = ? AND revision = ?",
        )
        .get(id, revision) as { status: string } | undefined;
      const result = database
        .prepare(
          "UPDATE weekly_reviews SET edits = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?",
        )
        .run(JSON.stringify(parsed.data), now, id, revision);
      if (!result.changes)
        throw new Error(
          "This review changed in another tab or is no longer available. Copy your unsaved notes, then reload before saving again.",
        );
      database
        .prepare(
          "INSERT INTO audit_events (id,action,entity_type,entity_id,occurred_at) VALUES (?,?,?,?,?)",
        )
        .run(
          crypto.randomUUID(),
          parsed.data.status === "reviewed" && previous?.status !== "reviewed"
            ? "weekly_review.completed"
            : "weekly_review.updated",
          "weekly_review",
          id,
          now,
        );
      return revision + 1;
    })
    .immediate();
}
