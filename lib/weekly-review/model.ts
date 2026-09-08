export const day = 86_400_000;
export function lastCompletedWeek(now = new Date()) {
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7) - 7);
  return monday.toISOString().slice(0, 10);
}
export function reviewWindow(weekStart: string, now = new Date()) {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(weekStart) ||
    !Number.isFinite(start.getTime()) ||
    start.toISOString().slice(0, 10) !== weekStart ||
    start.getUTCDay() !== 1
  )
    throw new Error("Choose the Monday of a completed week.");
  const end = new Date(start.getTime() + 7 * day);
  if (end > now)
    throw new Error("This week has not ended yet. Choose a completed week.");
  return { start, end };
}
export type ReviewSource = {
  id: string;
  label: string;
  href: string;
  detail?: string;
};
export type WeeklyInput = {
  jobs: Array<{ id: string; title: string; company: string; capturedAt: Date }>;
  events: Array<{
    id: string;
    jobId: string;
    kind: string;
    fromStage: string | null;
    toStage: string | null;
    occurredAt: Date;
  }>;
  submissions: Array<{ jobId: string; submittedAt: Date }>;
  interactions: Array<{
    id: string;
    contactId: string;
    name: string;
    direction: string;
    channel: string;
    summary: string;
    occurredAt: Date;
  }>;
  interviews: Array<{
    id: string;
    jobId: string;
    label: string;
    scheduledAt: Date;
    status: string;
  }>;
  tasks: Array<{
    id: string;
    jobId: string;
    title: string;
    dueAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
  }>;
  stages: Array<{
    key: string;
    category: string;
    position: number;
    isTerminal: boolean;
  }>;
  risks: Array<{
    key: string;
    kind: string;
    title: string;
    source: string;
    href: string;
    reason: string;
    dueAt: string | null;
    rank: number;
  }>;
  weeklyHours: number | null;
};
export type WeeklySnapshot = {
  version: 1;
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  weeklyHours: number | null;
  metrics: Array<{
    key: string;
    label: string;
    definition: string;
    items: ReviewSource[];
  }>;
  missedTasks: ReviewSource[];
  progressed: ReviewSource[];
  closed: ReviewSource[];
  risks: WeeklyInput["risks"];
  signals: string[];
  caveats: string[];
  suggestedPlan: string;
  suggestedHours: number;
  suggestedExperiment: string;
};
export function buildWeeklySnapshot(
  input: WeeklyInput,
  weekStart: string,
  now = new Date(),
): WeeklySnapshot {
  const { start, end } = reviewWindow(weekStart, now);
  const inside = (at: Date) => at >= start && at < end;
  const jobs = new Map(input.jobs.map((job) => [job.id, job]));
  const source = (id: string): ReviewSource => ({
    id,
    label: jobs.has(id)
      ? `${jobs.get(id)!.company} · ${jobs.get(id)!.title}`
      : "Unavailable opportunity",
    href: `/jobs/${encodeURIComponent(id)}`,
  });
  const sources = (ids: Iterable<string>) =>
    [...new Set(ids)].sort().map(source);
  const categoryOrder = [
    "inbox",
    "researching",
    "preparing",
    "ready_to_apply",
    "applied",
    "recruiter_screen",
    "interviewing",
    "offer",
    "accepted",
  ];
  const stageMap = new Map(input.stages.map((stage) => [stage.key, stage]));
  const events = input.events.filter(
    (event) => event.kind === "stage" && inside(event.occurredAt),
  );
  const applications = sources([
    ...input.submissions
      .filter((item) => inside(item.submittedAt))
      .map((item) => item.jobId),
    ...events
      .filter(
        (event) =>
          event.toStage && stageMap.get(event.toStage)?.category === "applied",
      )
      .map((event) => event.jobId),
  ]);
  const progressed = sources(
    events
      .filter((event) => {
        const from = event.fromStage ? stageMap.get(event.fromStage) : null;
        const to = event.toStage ? stageMap.get(event.toStage) : null;
        return (
          from &&
          to &&
          !from.isTerminal &&
          !to.isTerminal &&
          from.category !== to.category &&
          categoryOrder.indexOf(to.category) >
            categoryOrder.indexOf(from.category) &&
          categoryOrder.includes(from.category)
        );
      })
      .map((event) => event.jobId),
  );
  const closed = sources(
    events
      .filter(
        (event) =>
          event.toStage &&
          stageMap.get(event.toStage)?.isTerminal &&
          !stageMap.get(event.fromStage ?? "")?.isTerminal,
      )
      .map((event) => event.jobId),
  );
  const outcomes = sources(
    events
      .filter(
        (event) =>
          event.toStage &&
          ["offer", "accepted", "rejected", "withdrawn", "ghosted"].includes(
            stageMap.get(event.toStage)?.category ?? "",
          ),
      )
      .map((event) => event.jobId),
  );
  // Preserve the week's transitions alongside labels, even if the live stage changes later.
  for (const item of [...progressed, ...closed, ...outcomes]) {
    item.detail = [
      ...new Set(
        events
          .filter((event) => event.jobId === item.id)
          .map(
            (event) =>
              `${event.occurredAt.toISOString().slice(0, 10)}: ${stageMap.get(event.fromStage ?? "")?.category ?? "unknown"} → ${stageMap.get(event.toStage ?? "")?.category ?? "unknown"}`,
          ),
      ),
    ].join("; ");
  }
  const interactions = (direction: string) =>
    input.interactions
      .filter((item) => item.direction === direction && inside(item.occurredAt))
      .map((item) => ({
        id: item.id,
        label: item.name,
        href: `/contacts/${encodeURIComponent(item.contactId)}`,
        detail: `${item.channel} · ${item.summary}`,
      }));
  const rounds = input.interviews
    .filter((item) => inside(item.scheduledAt) && item.status !== "cancelled")
    .map((item) => ({
      id: item.id,
      label: `${item.label} · ${source(item.jobId).label}`,
      href: `/interviews/${encodeURIComponent(item.id)}`,
      detail:
        item.status === "completed"
          ? "Recorded completed"
          : "Scheduled; completion not recorded",
    }));
  const metrics = [
    {
      key: "captures",
      label: "New opportunities",
      definition: "Jobs captured during this week.",
      items: sources(
        input.jobs.filter((job) => inside(job.capturedAt)).map((job) => job.id),
      ),
    },
    {
      key: "applications",
      label: "Applications",
      definition:
        "Distinct jobs with a submission or Applied transition this week, including explicit waivers. Repeated records count once.",
      items: applications,
    },
    {
      key: "followups",
      label: "Outbound / follow-ups",
      definition:
        "Manually recorded outbound interactions. The current log does not distinguish first outreach from a follow-up.",
      items: interactions("outbound"),
    },
    {
      key: "responses",
      label: "Responses",
      definition:
        "Manually recorded inbound interactions, including contacts not linked to an application.",
      items: interactions("inbound"),
    },
    {
      key: "interviews",
      label: "Interview rounds",
      definition:
        "Non-cancelled rounds dated within this week. A scheduled round does not establish attendance.",
      items: rounds,
    },
    {
      key: "outcomes",
      label: "Outcomes",
      definition:
        "Distinct jobs with a recorded offer, acceptance, rejection, withdrawal, or ghosted transition this week.",
      items: outcomes,
    },
  ];
  const missedTasks = input.tasks
    .filter(
      (task) =>
        task.dueAt &&
        inside(task.dueAt) &&
        task.createdAt < end &&
        (!task.completedAt ||
          task.completedAt.getTime() >=
            new Date(task.dueAt.toISOString().slice(0, 10)).getTime() + day),
    )
    .map((task) => ({
      id: task.id,
      label: `${task.title} · ${source(task.jobId).label}`,
      href: `/jobs/${encodeURIComponent(task.jobId)}#application-workspace-heading`,
      detail: `Due ${task.dueAt!.toISOString().slice(0, 10)} UTC; ${task.completedAt ? "completed after that date" : "no completion recorded"}.`,
    }));
  const risks = input.risks.filter(
    (item) => !["setup", "opportunity"].includes(item.kind),
  );
  const urgent = risks.filter(
    (item) =>
      item.dueAt && item.dueAt.slice(0, 10) < now.toISOString().slice(0, 10),
  );
  const signals = [
    applications.length
      ? `${applications.length} applications were recorded this week. This measures activity, not application quality.`
      : "No applications were recorded this week. Check missing records before interpreting this as inactivity.",
    progressed.length
      ? `${progressed.length} opportunities advanced between active stage categories. This is encouraging movement, but does not establish why it happened.`
      : "No forward stage movement was recorded. A short observation window cannot establish that your approach is ineffective.",
    urgent.length
      ? `${urgent.length} current reminders are past their calendar date. Clearing or deliberately rescheduling them may be more useful than adding new work.`
      : "Review the current risks before choosing next week's workload.",
  ];
  const capacity = input.weeklyHours ?? 3;
  const selected = risks.slice(0, Math.min(3, Math.floor(capacity)));
  const suggestedHours = selected.length || Math.min(capacity, 1);
  const suggestedPlan = selected.length
    ? selected
        .map(
          (item, index) =>
            `${index + 1}. ${item.title} — ${item.source}. Reserve up to 1 hour to assess and act; revise this estimate after reviewing the task.`,
        )
        .join("\n")
    : capacity > 0
      ? `Reserve up to ${suggestedHours} hour(s) to review one promising role, check the evidence you need, and choose a concrete next action.`
      : "No time allocated. Deliberately defer work or increase your available hours before adding commitments.";
  return {
    version: 1,
    weekStart,
    weekEnd: end.toISOString().slice(0, 10),
    generatedAt: now.toISOString(),
    weeklyHours: input.weeklyHours,
    metrics,
    missedTasks,
    progressed,
    closed,
    risks,
    signals,
    caveats: [
      "Counts describe recorded activity in this week, not an application cohort. Do not divide responses or interviews by this week's applications to infer conversion.",
      applications.length < 10
        ? "Fewer than 10 applications were recorded. This small activity sample cannot support a strategy or resume-performance claim."
        : "Counts alone cannot identify what caused an outcome. Role mix, source, timing, and prior applications may differ.",
      "Current risks, verification gaps, names, and interview status were captured when this review was created. They are not a reconstruction of the pipeline at week end. Later edits do not rewrite this snapshot.",
    ],
    suggestedPlan,
    suggestedHours,
    suggestedExperiment: applications.length
      ? "Hypothesis: a role-specific evidence check improves application readiness. For the next two weeks, change only the pre-submission evidence check; keep target roles and sourcing approach stable. Record how many drafts need unsupported claims removed and time spent per draft. Treat the result as exploratory."
      : "Hypothesis: two focused sourcing sessions help identify suitable roles. Over the next two weeks, change only the sourcing schedule; keep role criteria fixed. Record suitable roles found and minutes spent. Treat the result as exploratory.",
  };
}
