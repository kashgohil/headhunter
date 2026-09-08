import { calculateFunnel, type FunnelInput } from "./funnel";

export const segmentLabels = {
  roleFamily: "Role family",
  seniority: "Seniority",
  industry: "Industry",
  companySize: "Company size",
  source: "Source",
  referral: "Referral",
  resumeStrategy: "Resume strategy",
  location: "Location",
  compensation: "Compensation",
  postingAge: "Posting age at application",
  preparationEffort: "Preparation effort",
  applicationTiming: "Application timing (UTC)",
  qualifications: "Fit · qualifications",
  experience: "Fit · experience",
  seniorityFit: "Fit · seniority",
  location_comp: "Fit · location and compensation",
  preferences: "Fit · preferences",
  freshness: "Fit · freshness",
  referral_access: "Fit · referral access",
  prep_effort: "Fit · estimated preparation",
} as const;
export type SegmentKey = keyof typeof segmentLabels;
export const segmentKeys = Object.keys(segmentLabels) as SegmentKey[];
export const unknownSegment = "Not recorded";
export type AnalyticsApplication = FunnelInput["applications"][number] & {
  appliedAt: Date | null;
  segments: Record<SegmentKey, string>;
  provenance: string;
};
export type AnalyticsInput = Omit<FunnelInput, "applications"> & {
  applications: AnalyticsApplication[];
};
export const outcomeLabels = {
  recruiter_screen: "Recruiter screen",
  interviewing: "Interviewing",
  offer: "Offer",
  accepted: "Accepted",
} as const;
export type Outcome = keyof typeof outcomeLabels;
export function segmentKey(value: unknown): SegmentKey {
  return typeof value === "string" && segmentKeys.includes(value as SegmentKey)
    ? (value as SegmentKey)
    : "source";
}
export function outcomeKey(value: unknown): Outcome {
  return typeof value === "string" && Object.hasOwn(outcomeLabels, value)
    ? (value as Outcome)
    : "interviewing";
}
export function normalized(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US")
    : unknownSegment;
}
export function summarizeSegments(
  input: AnalyticsInput,
  now: Date,
  days: 30 | 90 | null,
  key: SegmentKey,
  outcome: Outcome,
) {
  const funnel = calculateFunnel(input, now, days);
  const cohort = new Set(funnel.rows[0].applications.map((job) => job.id));
  const successes = new Set(
    funnel.rows
      .find((row) => row.category === outcome)!
      .applications.map((job) => job.id),
  );
  const groups = new Map<string, AnalyticsApplication[]>();
  for (const job of input.applications) {
    if (!cohort.has(job.id)) continue;
    const value = job.segments[key];
    const group = groups.get(value) ?? [];
    group.push(job);
    groups.set(value, group);
  }
  return [...groups]
    .map(([value, applications]) => {
      const count = applications.filter((job) => successes.has(job.id)).length;
      return {
        value,
        applications,
        count,
        sampleSize: applications.length,
        rate: count / applications.length,
        recent: applications.filter(
          (job) => now.getTime() - job.appliedAt!.getTime() < 14 * 86400000,
        ).length,
      };
    })
    .sort(
      (a, b) => b.sampleSize - a.sampleSize || a.value.localeCompare(b.value),
    );
}

export type ExperimentPlan = {
  title: string;
  hypothesis: string;
  variable: SegmentKey;
  baseline: string;
  treatment: string;
  targetDimension: "all" | SegmentKey;
  targetValue: string;
  controls: string;
  startDate: string;
  endDate: string;
  outcome: Outcome;
  observationDays: number;
};
export function evaluateExperiment(
  input: AnalyticsInput,
  plan: ExperimentPlan,
  now: Date,
) {
  const start = Date.parse(`${plan.startDate}T00:00:00Z`);
  const end = Date.parse(`${plan.endDate}T00:00:00Z`) + 86400000;
  const horizon = plan.observationDays * 86400000;
  const eligible = input.applications.filter(
    (job) =>
      job.appliedAt &&
      job.appliedAt.getTime() >= start &&
      job.appliedAt.getTime() < end &&
      job.appliedAt <= now &&
      (plan.targetDimension === "all" ||
        job.segments[plan.targetDimension] === normalized(plan.targetValue)),
  );
  const arms = (["baseline", "treatment"] as const).map((arm) => {
    const assigned = eligible.filter(
      (job) => job.segments[plan.variable] === normalized(plan[arm]),
    );
    const mature = assigned.filter(
      (job) => job.appliedAt!.getTime() + horizon <= now.getTime(),
    );
    const matureIds = new Map(
      mature.map((job) => [job.id, job.appliedAt!.getTime() + horizon]),
    );
    const funnel = calculateFunnel(
      {
        ...input,
        applications: mature,
        events: input.events.filter(
          (event) =>
            event.occurredAt.getTime() <=
            (matureIds.get(event.jobId) ?? -Infinity),
        ),
      },
      now,
      null,
    );
    const result = funnel.rows.find((row) => row.category === plan.outcome)!;
    return {
      arm,
      label: plan[arm],
      count: result.count,
      sampleSize: result.denominator,
      rate: result.rate,
      pending: assigned.length - mature.length,
      applications: mature,
      successes: result.applications.map((job) => job.id),
    };
  });
  const difference = arms.every((arm) => arm.rate !== null)
    ? arms[1].rate! - arms[0].rate!
    : null;
  return {
    generatedAt: now.toISOString(),
    arms,
    difference,
    excluded:
      eligible.length -
      arms.reduce((sum, arm) => sum + arm.sampleSize + arm.pending, 0),
    readyToComplete: now.getTime() >= end + horizon,
    interpretation: arms.some((arm) => arm.sampleSize < 20)
      ? "Insufficient evidence: at least one group has fewer than 20 mature applications. This is a descriptive comparison, not a reliable strategy recommendation."
      : "Observed correlation only. Group selection, employer mix, and other uncontrolled differences can explain the result; this is not evidence of causation or statistical significance.",
  };
}
