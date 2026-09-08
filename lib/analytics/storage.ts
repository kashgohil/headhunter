import type Database from "better-sqlite3";
import { z } from "zod";
import type { ExperimentPlan, evaluateExperiment } from "./segments";
// Keep this boundary independently executable in Node/SQLite tests.
const dimensions = [
  "roleFamily",
  "seniority",
  "industry",
  "companySize",
  "source",
  "referral",
  "resumeStrategy",
  "location",
  "compensation",
  "postingAge",
  "preparationEffort",
  "applicationTiming",
  "qualifications",
  "experience",
  "seniorityFit",
  "location_comp",
  "preferences",
  "freshness",
  "referral_access",
  "prep_effort",
] as const;
const required = z
  .string()
  .trim()
  .min(1, "Complete all required experiment fields.")
  .max(2000);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid calendar date.")
  .refine(
    (value) =>
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value,
    "Use a valid calendar date.",
  );
export const experimentSchema = z
  .object({
    title: required.max(160),
    hypothesis: required,
    variable: z.enum(dimensions),
    baseline: required.max(160),
    treatment: required.max(160),
    targetDimension: z.enum(["all", ...dimensions]),
    targetValue: z.string().trim().max(160),
    controls: required,
    startDate: date,
    endDate: date,
    outcome: z.enum(["recruiter_screen", "interviewing", "offer", "accepted"]),
    observationDays: z.coerce.number().int().min(7).max(90),
  })
  .refine(
    (plan) => plan.startDate <= plan.endDate,
    "End date must be on or after the start date.",
  )
  .refine(
    (plan) =>
      plan.baseline.toLowerCase().replace(/\s+/g, " ") !==
      plan.treatment.toLowerCase().replace(/\s+/g, " "),
    "Baseline and changed values must differ.",
  )
  .refine(
    (plan) =>
      ![plan.baseline, plan.treatment].some(
        (value) => value.toLowerCase() === "not recorded",
      ),
    "Missing data cannot be an experiment group.",
  )
  .refine(
    (plan) => plan.targetDimension === "all" || Boolean(plan.targetValue),
    "Choose a target segment value.",
  )
  .refine(
    (plan) => plan.targetDimension !== plan.variable,
    "The target segment must be independent of the changed variable.",
  );
const annotationSchema = z.object({
  roleFamily: z.string().trim().max(160),
  industry: z.string().trim().max(160),
  companySize: z.string().trim().max(160),
  resumeStrategy: z.string().trim().max(160),
  preparationMinutes: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.coerce.number().finite().int().min(0).max(100000).nullable(),
  ),
});
export type Annotation = z.infer<typeof annotationSchema> & {
  jobId: string;
  revision: number;
};
export type ExperimentResult = ReturnType<typeof evaluateExperiment>;
export type SavedExperiment = {
  id: string;
  plan: ExperimentPlan;
  status: "planned" | "running" | "completed" | "cancelled";
  notes: string;
  result: ExperimentResult | null;
  revision: number;
  createdAt: number;
};
function audit(
  database: Database.Database,
  action: string,
  type: string,
  id: string,
) {
  database
    .prepare(
      "INSERT INTO audit_events (id,action,entity_type,entity_id,occurred_at) VALUES (?,?,?,?,?)",
    )
    .run(crypto.randomUUID(), action, type, id, Date.now());
}
export function listAnnotations(database: Database.Database): Annotation[] {
  return (
    database.prepare("SELECT * FROM analytics_annotations").all() as Array<{
      job_id: string;
      values_json: string;
      revision: number;
    }>
  ).map((row) => ({
    ...JSON.parse(row.values_json),
    jobId: row.job_id,
    revision: row.revision,
  }));
}
export function saveAnnotation(
  database: Database.Database,
  jobId: string,
  revision: number,
  input: unknown,
) {
  const parsed = annotationSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  return database
    .transaction(() => {
      const existing = database
        .prepare("SELECT revision FROM analytics_annotations WHERE job_id=?")
        .get(jobId) as { revision: number } | undefined;
      if (
        !Number.isSafeInteger(revision) ||
        revision !== (existing?.revision ?? 0)
      )
        throw new Error(
          "These annotations changed in another tab. Copy your edits and reload.",
        );
      database
        .prepare(
          "INSERT INTO analytics_annotations (job_id,values_json,revision,updated_at) VALUES (?,?,1,?) ON CONFLICT(job_id) DO UPDATE SET values_json=excluded.values_json,revision=analytics_annotations.revision+1,updated_at=excluded.updated_at",
        )
        .run(jobId, JSON.stringify(parsed.data), Date.now());
      audit(database, "analytics.annotated", "job", jobId);
      return revision + 1;
    })
    .immediate();
}
export function listExperiments(
  database: Database.Database,
): SavedExperiment[] {
  return (
    database
      .prepare(
        "SELECT * FROM analytics_experiments ORDER BY created_at DESC, id",
      )
      .all() as Array<Record<string, unknown>>
  ).map((row) => ({
    id: String(row.id),
    plan: JSON.parse(String(row.plan)),
    status: row.status as SavedExperiment["status"],
    notes: String(row.notes),
    result: row.result ? JSON.parse(String(row.result)) : null,
    revision: Number(row.revision),
    createdAt: Number(row.created_at),
  }));
}
export function createExperiment(database: Database.Database, input: unknown) {
  const parsed = experimentSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  return database
    .transaction(() => {
      const id = crypto.randomUUID();
      database
        .prepare(
          "INSERT INTO analytics_experiments (id,plan,status,notes,revision,created_at,updated_at) VALUES (?,?,'planned','',1,?,?)",
        )
        .run(id, JSON.stringify(parsed.data), Date.now(), Date.now());
      audit(database, "experiment.created", "experiment", id);
      return id;
    })
    .immediate();
}
export function updateExperiment(
  database: Database.Database,
  id: string,
  revision: number,
  status: SavedExperiment["status"],
  notes: string,
  result?: ExperimentResult,
) {
  if (
    !["planned", "running", "completed", "cancelled"].includes(status) ||
    typeof notes !== "string" ||
    notes.length > 12000
  )
    throw new Error("Invalid experiment update.");
  return database
    .transaction(() => {
      const existing = listExperiments(database).find((item) => item.id === id);
      if (
        !existing ||
        !Number.isSafeInteger(revision) ||
        existing.revision !== revision
      )
        throw new Error(
          "This experiment changed in another tab. Copy your notes and reload.",
        );
      if (status !== existing.status) {
        const allowed =
          existing.status === "planned"
            ? ["running", "cancelled"]
            : existing.status === "running"
              ? ["completed", "cancelled"]
              : [];
        if (!allowed.includes(status))
          throw new Error("This experiment cannot move to that state.");
        if (status === "running") {
          if (
            listExperiments(database).some((item) => item.status === "running")
          )
            throw new Error(
              "Finish or cancel the running experiment before starting another change.",
            );
          if (Date.parse(existing.plan.endDate) + 86400000 <= Date.now())
            throw new Error(
              "The application window has ended. Create a new plan with future dates.",
            );
        }
        if (
          status === "completed" &&
          (!result?.readyToComplete ||
            Date.now() <
              Date.parse(existing.plan.endDate) +
                86400000 +
                existing.plan.observationDays * 86400000)
        )
          throw new Error(
            "Wait until the application window and observation period have ended before completing this experiment.",
          );
      }
      database
        .prepare(
          "UPDATE analytics_experiments SET status=?,notes=?,result=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?",
        )
        .run(
          status,
          notes,
          existing.result
            ? JSON.stringify(existing.result)
            : status === "completed" && result
              ? JSON.stringify(result)
              : null,
          Date.now(),
          id,
          revision,
        );
      audit(
        database,
        `experiment.${status !== existing.status ? status : "updated"}`,
        "experiment",
        id,
      );
      return revision + 1;
    })
    .immediate();
}
