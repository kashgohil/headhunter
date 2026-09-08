import { calculateFunnel } from "./funnel";
import {
  normalized,
  segmentKeys,
  unknownSegment,
  type AnalyticsInput,
  type SegmentKey,
} from "./segments";
import type {
  jobs,
  applicationEvents,
  applicationSubmissions,
  pipelineStages,
  fitAnalyses,
} from "@/lib/db/schema";
import type { Annotation } from "./storage";
const day = 86400000;
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const date = (value: unknown) =>
  typeof value === "string" ||
  typeof value === "number" ||
  value instanceof Date
    ? new Date(value).getTime()
    : NaN;
export type AttributionInput = {
  applications: Array<typeof jobs.$inferSelect>;
  events: Array<typeof applicationEvents.$inferSelect>;
  submissions: Array<typeof applicationSubmissions.$inferSelect>;
  stages: Array<typeof pipelineStages.$inferSelect>;
  fits: Array<typeof fitAnalyses.$inferSelect>;
  annotations: Map<string, Annotation>;
};
export function attributeApplications(
  {
    applications,
    events,
    submissions: rawSubmissions,
    stages,
    fits: rawFits,
    annotations,
  }: AttributionInput,
  now: Date,
): AnalyticsInput {
  const submissions = [...rawSubmissions].sort(
    (a, b) =>
      a.submittedAt.getTime() - b.submittedAt.getTime() ||
      a.createdAt.getTime() - b.createdAt.getTime() ||
      a.id.localeCompare(b.id),
  );
  const fits = [...rawFits].sort(
    (a, b) =>
      b.createdAt.getTime() - a.createdAt.getTime() || b.version - a.version,
  );
  const cohort = calculateFunnel(
    { applications, events, submissions, stages },
    now,
    null,
  );
  const appliedIds = new Set(cohort.rows[0].applications.map((job) => job.id));
  const categories = new Map(
    stages.map((stage) => [stage.key, stage.category]),
  );
  return {
    events,
    submissions,
    stages,
    applications: applications.map((job) => {
      const submission = submissions.find(
        (item) => item.jobId === job.id && item.submittedAt <= now,
      );
      const times = [
        submission?.submittedAt.getTime() ?? Infinity,
        ...events
          .filter(
            (event) =>
              event.jobId === job.id &&
              event.kind === "stage" &&
              (event.toStage === "applied" ||
                categories.get(event.toStage ?? "") === "applied") &&
              event.occurredAt <= now,
          )
          .map((event) => event.occurredAt.getTime()),
      ];
      const appliedAt = appliedIds.has(job.id)
        ? new Date(Math.min(...times))
        : null;
      // A later resubmission must not rewrite the first application's characteristics.
      const original =
        submission && submission.submittedAt.getTime() === appliedAt?.getTime()
          ? submission
          : undefined;
      const fields = original ? original.snapshot.job : job;
      const segments = Object.fromEntries(
        segmentKeys.map((key) => [key, unknownSegment]),
      ) as Record<SegmentKey, string>;
      segments.seniority = normalized(fields.seniority);
      segments.location = normalized(fields.location);
      segments.source = normalized(
        original?.source || (original ? original.method : null),
      );
      segments.referral = original
        ? original.referral?.trim() || original.method === "referral"
          ? "referral recorded"
          : "no referral recorded"
        : unknownSegment;
      const resume = original?.snapshot.documents.find(
        (item) => item.kind === "resume",
      );
      segments.resumeStrategy = normalized(resume?.name);
      const minimum = fields.minimumCompensation,
        maximum = fields.maximumCompensation;
      if (
        (typeof minimum === "number" || typeof maximum === "number") &&
        typeof fields.compensationCurrency === "string"
      )
        segments.compensation = `${fields.compensationCurrency.toUpperCase()} ${minimum ?? "?"}–${maximum ?? "?"} (posted range)`;
      const postingAge = appliedAt
        ? (appliedAt.getTime() - date(fields.postedAt)) / day
        : NaN;
      if (postingAge >= 0)
        segments.postingAge =
          postingAge < 3
            ? "0–2 days"
            : postingAge < 8
              ? "3–7 days"
              : postingAge < 15
                ? "8–14 days"
                : "15+ days";
      if (appliedAt)
        segments.applicationTiming = [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ][appliedAt.getUTCDay()];
      const fit = appliedAt
        ? fits.find(
            (item) => item.jobId === job.id && item.createdAt <= appliedAt,
          )
        : undefined;
      if (fit)
        for (const key of [
          "qualifications",
          "experience",
          "seniorityFit",
          "location_comp",
          "preferences",
          "freshness",
          "referral_access",
          "prep_effort",
        ] as const) {
          const score = record(
            fit.dimensions[key === "seniorityFit" ? "seniority" : key],
          ).score;
          if (typeof score === "number" && Number.isFinite(score))
            segments[key] =
              score < 40 ? "0–39" : score < 70 ? "40–69" : "70–100";
        }
      const annotation = annotations.get(job.id);
      if (annotation) {
        for (const key of [
          "roleFamily",
          "industry",
          "companySize",
          "resumeStrategy",
        ] as const)
          if (annotation[key]) segments[key] = normalized(annotation[key]);
        if (annotation.preparationMinutes !== null)
          segments.preparationEffort =
            annotation.preparationMinutes < 30
              ? "under 30 minutes"
              : annotation.preparationMinutes < 120
                ? "30–119 minutes"
                : "120+ minutes";
      }
      for (const key of segmentKeys)
        if (segments[key] !== unknownSegment)
          segments[key] = normalized(segments[key]);
      return {
        id: job.id,
        title: job.title,
        company: job.company,
        appliedAt,
        segments,
        provenance: `${original ? "First submission snapshot" : "Current job metadata; original submission snapshot unavailable"}. Fit uses the latest analysis recorded by application time. Annotations are user-reported and may be retrospective.`,
      };
    }),
  };
}
