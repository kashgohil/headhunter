import { pipelineStageDefinitions } from "@/lib/applications/types";

export type FunnelInput = {
  applications: Array<{ id: string; title: string; company: string }>;
  events: Array<{
    jobId: string;
    kind: string;
    toStage: string | null;
    occurredAt: Date;
  }>;
  submissions: Array<{ jobId: string; submittedAt: Date }>;
  stages: Array<{ key: string; category: string }>;
};

export function calculateFunnel(
  input: FunnelInput,
  now: Date,
  days: 30 | 90 | null,
) {
  const categories = new Map<string, string>([
    ...pipelineStageDefinitions.map(
      (stage) => [stage.key, stage.category] as const,
    ),
    ...input.stages.map((stage) => [stage.key, stage.category] as const),
  ]);
  const applied = new Map<string, number>();
  const record = (id: string, date: Date) => {
    const at = date.getTime();
    if (at <= now.getTime())
      applied.set(id, Math.min(applied.get(id) ?? Infinity, at));
  };
  for (const submission of input.submissions)
    record(submission.jobId, submission.submittedAt);
  for (const event of input.events)
    if (
      event.kind === "stage" &&
      event.toStage &&
      categories.get(event.toStage) === "applied"
    )
      record(event.jobId, event.occurredAt);
  const since = days ? new Date(now.getTime() - days * 86_400_000) : null;
  const cohort = input.applications.filter(
    (application) =>
      applied.has(application.id) &&
      (!since || applied.get(application.id)! >= since.getTime()),
  );
  const milestones = [
    "applied",
    "recruiter_screen",
    "interviewing",
    "offer",
    "accepted",
  ] as const;
  const reached = new Map<string, Set<string>>();
  for (const event of input.events) {
    if (
      event.kind !== "stage" ||
      !event.toStage ||
      !applied.has(event.jobId) ||
      event.occurredAt.getTime() < applied.get(event.jobId)! ||
      event.occurredAt > now
    )
      continue;
    const category = categories.get(event.toStage);
    if (!category) continue;
    const set = reached.get(category) ?? new Set<string>();
    set.add(event.jobId);
    reached.set(category, set);
  }
  const rows = milestones.map((category) => {
    const applications =
      category === "applied"
        ? cohort
        : cohort.filter((application) =>
            reached.get(category)?.has(application.id),
          );
    return {
      category,
      label: pipelineStageDefinitions.find((stage) => stage.key === category)!
        .label,
      applications,
      count: applications.length,
      denominator: cohort.length,
      rate: cohort.length ? applications.length / cohort.length : null,
    };
  });
  return {
    rows,
    sampleSize: cohort.length,
    since,
    until: now,
    missingAppliedHistory: input.applications.filter(
      (application) =>
        !applied.has(application.id) &&
        input.events.some(
          (event) =>
            event.jobId === application.id &&
            event.kind === "stage" &&
            event.occurredAt <= now &&
            milestones
              .slice(1)
              .some(
                (category) => category === categories.get(event.toStage ?? ""),
              ),
        ),
    ).length,
  };
}
