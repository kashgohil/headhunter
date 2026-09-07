import { pipelineStageDefinitions } from "@/lib/applications/types";
import type { getPipelineOverview } from "@/lib/applications/pipeline";

type Pipeline = Awaited<ReturnType<typeof getPipelineOverview>>;
export type Alert = {
  key: string;
  kind:
    | "deadline"
    | "interview"
    | "action"
    | "task"
    | "stalled"
    | "quality"
    | "opportunity"
    | "setup"
    | "contact";
  title: string;
  source: string;
  href: string;
  reason: string;
  dueAt: string | null;
  rank: number;
};
export type AlertPreference = {
  key: string;
  dismissed: boolean;
  snoozedUntil: Date | null;
};
const day = 86_400_000;

export function isAlertOverdue(
  alert: Pick<Alert, "kind" | "dueAt">,
  now: Date,
) {
  if (!alert.dueAt) return false;
  return alert.kind === "interview"
    ? new Date(alert.dueAt) < now
    : alert.dueAt.slice(0, 10) < now.toISOString().slice(0, 10);
}

export function partitionAlerts(
  alerts: Alert[],
  preferences: AlertPreference[],
  now: Date,
) {
  const byKey = new Map(
    preferences.map((preference) => [preference.key, preference]),
  );
  const visible: Alert[] = [];
  const hidden: Array<Alert & { hiddenReason: string }> = [];
  for (const alert of alerts) {
    const preference = byKey.get(alert.key);
    if (
      preference?.dismissed ||
      (preference?.snoozedUntil && preference.snoozedUntil > now)
    ) {
      hidden.push({
        ...alert,
        hiddenReason: preference.dismissed
          ? "Dismissed"
          : `Snoozed until ${preference.snoozedUntil!.toISOString()}`,
      });
    } else visible.push(alert);
  }
  return { visible, hidden };
}

export function buildOverview(pipeline: Pipeline, now: Date) {
  const alerts: Alert[] = [];
  const stageMap = new Map([
    ...pipelineStageDefinitions.map(
      (stage) => [stage.key, stage.category] as const,
    ),
    ...pipeline.stages.map((stage) => [stage.key, stage.category] as const),
  ]);
  const active = pipeline.applications.filter(
    (application) => !application.stageDefinition?.isTerminal,
  );
  for (const application of active) {
    const source = `${application.company} · ${application.title}`;
    const href = `/jobs/${application.jobId}#application-workspace-heading`;
    const value =
      (application.priority === "high"
        ? 10
        : application.priority === "low"
          ? -5
          : 0) + application.interest;
    const add = (
      kind: Alert["kind"],
      identity: string,
      title: string,
      reason: string,
      due: Date | null,
      base: number,
      target = href,
    ) => {
      const urgency = due
        ? isAlertOverdue({ kind, dueAt: due.toISOString() }, now)
          ? 1000
          : due.getTime() <= now.getTime() + day
            ? 800
            : due.getTime() <= now.getTime() + 7 * day
              ? 400
              : 0
        : 0;
      alerts.push({
        key: `${kind}:${application.jobId}:${identity}`,
        kind,
        title,
        source,
        href: target,
        reason,
        dueAt: due?.toISOString() ?? null,
        rank: base + urgency + value,
      });
    };
    const category = stageMap.get(application.stage);
    if (
      application.applicationDeadline &&
      !application.applicationDate &&
      ["inbox", "researching", "preparing", "ready_to_apply"].includes(
        category ?? "",
      )
    ) {
      add(
        "deadline",
        application.applicationDeadline.toISOString(),
        "Review application deadline",
        "Confirm the role is still open and finish your application.",
        application.applicationDeadline,
        50,
      );
    }
    for (const interview of application.interviews.filter(
      (item) => item.status === "scheduled",
    )) {
      add(
        "interview",
        `${interview.id}:${interview.scheduledAt.toISOString()}`,
        interview.label,
        interview.scheduledAt < now
          ? "This round is in the past; record its outcome in the application plan."
          : "Review the round details and prepare for the conversation.",
        interview.scheduledAt,
        60,
        `/interviews/${interview.id}`,
      );
    }
    if (application.nextAction) {
      add(
        "action",
        `${application.nextAction}:${application.nextActionDueAt?.toISOString() ?? "undated"}`,
        application.nextAction,
        application.waiting
          ? `Waiting: ${application.waitingReason ?? "response"}. Review this follow-up when due.`
          : "Your recorded next step for this application.",
        application.nextActionDueAt,
        30,
      );
    } else if (!application.waiting) {
      add(
        "quality",
        `next-action:${application.stage}`,
        "Set a next action",
        "This active application has no next action or deliberate waiting state.",
        null,
        15,
      );
    }
    for (const task of application.tasks.filter((item) => !item.completedAt)) {
      add(
        "task",
        `${task.id}:${task.dueAt?.toISOString() ?? "undated"}`,
        task.title,
        "Complete or update this task in the application plan.",
        task.dueAt,
        25,
      );
    }
    const lastActivity = Math.max(
      application.lastInteractionAt.getTime(),
      application.updatedAt?.getTime() ?? 0,
    );
    if (now.getTime() - lastActivity >= 14 * day) {
      add(
        "stalled",
        String(lastActivity),
        "Check in on a stalled application",
        `No recorded activity for ${Math.floor((now.getTime() - lastActivity) / day)} days${application.waiting ? `; waiting for ${application.waitingReason ?? "a response"}` : ""}. Decide whether to follow up, wait, or close it.`,
        null,
        35,
      );
    }
    if (
      application.extractionConfidence === "low" &&
      !application.metadataUpdatedAt
    ) {
      add(
        "quality",
        "metadata",
        "Review uncertain job details",
        "The job extraction has low confidence and has not been reviewed.",
        null,
        10,
      );
    }
    if (
      ["inbox", "researching"].includes(category ?? "") &&
      (application.priority === "high" || application.interest >= 4)
    ) {
      add(
        "opportunity",
        application.stage,
        "Evaluate a promising role",
        "Prioritized from your recorded interest and priority. Review fit and preparation effort before committing time.",
        null,
        20,
      );
    }
  }
  alerts.sort(
    (a, b) =>
      b.rank - a.rank ||
      (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999") ||
      a.key.localeCompare(b.key),
  );

  // Count unique applications that actually reached each milestone. Never infer skipped stages.
  const milestones = [
    "applied",
    "recruiter_screen",
    "interviewing",
    "offer",
    "accepted",
  ] as const;
  const funnel = milestones.map((category) => ({
    category,
    label: pipelineStageDefinitions.find((stage) => stage.key === category)!
      .label,
    applications: pipeline.applications
      .filter(
        (application) =>
          (category === "applied" &&
            application.applicationDate !== null &&
            application.applicationDate <= now) ||
          application.events.some(
            (event) =>
              event.kind === "stage" &&
              event.occurredAt <= now &&
              event.toStage &&
              stageMap.get(event.toStage) === category,
          ),
      )
      .map(({ jobId, title, company }) => ({ jobId, title, company })),
  }));
  const missingHistory = pipeline.applications.filter((application) => {
    const category = stageMap.get(application.stage);
    return (
      milestones.some((milestone) => milestone === category) &&
      !funnel
        .find((row) => row.category === category)
        ?.applications.some((row) => row.jobId === application.jobId)
    );
  });
  for (const application of missingHistory)
    alerts.push({
      key: `quality:${application.jobId}:history:${application.stage}`,
      kind: "quality",
      title: "Check missing stage history",
      source: `${application.company} · ${application.title}`,
      href: `/jobs/${application.jobId}#application-workspace-heading`,
      reason:
        "The current milestone has no matching recorded event. It is excluded from the historical funnel.",
      dueAt: null,
      rank: 0,
    });
  const since = new Date(now.getTime() - 7 * day);
  const recentChanges = pipeline.applications
    .flatMap((application) =>
      application.events
        .filter(
          (event) =>
            event.kind === "stage" &&
            event.occurredAt >= since &&
            event.occurredAt <= now,
        )
        .map((event) => ({
          ...event,
          jobId: application.jobId,
          company: application.company,
          role: application.title,
        })),
    )
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  return {
    alerts,
    activeCount: active.length,
    funnel,
    recentChanges,
    capturedThisWeek: pipeline.applications.filter(
      (application) =>
        application.capturedAt >= since && application.capturedAt <= now,
    ).length,
    total: pipeline.applications.length,
  };
}
