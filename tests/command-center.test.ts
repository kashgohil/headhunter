import { describe, expect, test } from "bun:test";
import {
  buildOverview,
  isAlertOverdue,
  partitionAlerts,
} from "@/lib/command-center/overview";
import { pipelineStageDefinitions } from "@/lib/applications/types";

type Pipeline = Parameters<typeof buildOverview>[0];
type Application = Pipeline["applications"][number];
const now = new Date("2026-09-08T12:00:00Z");
const stages: Pipeline["stages"] = pipelineStageDefinitions.map(
  (stage, position) => ({
    ...stage,
    id: stage.key,
    isTerminal: stage.terminal,
    isBuiltIn: true,
    position,
    createdAt: now,
  }),
);
function application(overrides: Partial<Application> = {}): Application {
  return {
    jobId: "job-1",
    title: "Engineer",
    company: "Acme",
    location: null,
    sourceType: "manual",
    sourceUrl: null,
    capturedAt: now,
    applicationDeadline: null,
    extractionConfidence: "high",
    metadataUpdatedAt: null,
    stage: "inbox",
    priority: "normal",
    interest: 3,
    nextAction: null,
    nextActionDueAt: null,
    waiting: false,
    waitingReason: null,
    outcomeReason: null,
    updatedAt: now,
    stageDefinition: stages[0],
    applicationDate: null,
    lastInteractionAt: now,
    openTaskCount: 0,
    taskCount: 0,
    materialCount: 0,
    contactCount: 0,
    events: [],
    tasks: [],
    interviews: [],
    ...overrides,
  };
}
function overview(applications: Application[]) {
  return buildOverview({ stages, applications }, now);
}
function stageEvent(
  id: string,
  toStage: string,
  at = now,
): Application["events"][number] {
  return {
    id,
    jobId: "job-1",
    kind: "stage",
    title: "Stage changed",
    detail: null,
    fromStage: "inbox",
    toStage,
    occurredAt: at,
  };
}

describe("command center", () => {
  test("date-only deadlines remain due today, while interview times are precise", () => {
    expect(
      isAlertOverdue(
        { kind: "deadline", dueAt: "2026-09-08T00:00:00.000Z" },
        now,
      ),
    ).toBe(false);
    expect(
      isAlertOverdue({ kind: "task", dueAt: "2026-09-07T00:00:00.000Z" }, now),
    ).toBe(true);
    expect(
      isAlertOverdue(
        { kind: "interview", dueAt: "2026-09-08T11:00:00.000Z" },
        now,
      ),
    ).toBe(true);
  });
  test("empty history has zero counts and no fabricated trend", () => {
    const result = overview([]);
    expect(result.activeCount).toBe(0);
    expect(result.funnel.every((row) => row.applications.length === 0)).toBe(
      true,
    );
    expect(result.recentChanges).toEqual([]);
  });

  test("urgent actions outrank high-interest undated work", () => {
    const result = overview([
      application({
        jobId: "interesting",
        priority: "high",
        interest: 5,
        nextAction: "Review fit",
      }),
      application({
        jobId: "urgent",
        priority: "low",
        nextAction: "Follow up",
        nextActionDueAt: new Date("2026-09-07"),
      }),
    ]);
    expect(result.alerts[0].title).toBe("Follow up");
  });

  test("completed tasks, cancelled rounds and terminal applications do not create work", () => {
    const result = overview([
      application({
        waiting: true,
        tasks: [
          {
            id: "task",
            jobId: "job-1",
            title: "Done",
            dueAt: now,
            completedAt: now,
            createdAt: now,
          },
        ],
        interviews: [
          {
            id: "round",
            jobId: "job-1",
            label: "Cancelled",
            scheduledAt: now,
            status: "cancelled",
            notes: null,
            createdAt: now,
            updatedAt: now,
          },
        ],
      }),
      application({
        jobId: "closed",
        stage: "rejected",
        stageDefinition: stages.find((stage) => stage.key === "rejected")!,
        nextAction: "Old reminder",
        nextActionDueAt: now,
      }),
    ]);
    expect(result.alerts).toEqual([]);
    expect(result.activeCount).toBe(1);
  });

  test("waiting suppresses missing-action warnings, but stale waits still surface", () => {
    const result = overview([
      application({
        waiting: true,
        waitingReason: "Recruiter reply",
        updatedAt: new Date("2026-08-01"),
        lastInteractionAt: new Date("2026-08-01"),
      }),
    ]);
    expect(result.alerts.map((alert) => alert.kind)).toEqual(["stalled"]);
    expect(result.alerts[0].reason).toContain("Recruiter reply");
  });

  test("deadline disappears after submission; reviewed metadata clears extraction warning", () => {
    const result = overview([
      application({
        waiting: true,
        applicationDeadline: now,
        applicationDate: now,
        extractionConfidence: "low",
        metadataUpdatedAt: now,
      }),
    ]);
    expect(result.alerts).toEqual([]);
    expect(result.funnel[0].applications).toHaveLength(1);
  });

  test("repeated stage events count once and later outcomes retain historical milestones", () => {
    const result = overview([
      application({
        stage: "rejected",
        stageDefinition: stages.find((stage) => stage.key === "rejected")!,
        events: [
          stageEvent("1", "applied"),
          stageEvent("2", "interviewing"),
          stageEvent("3", "interviewing"),
          stageEvent("4", "rejected"),
        ],
      }),
    ]);
    expect(result.funnel.map((row) => row.applications.length)).toEqual([
      1, 0, 1, 0, 0,
    ]);
  });

  test("custom stages map to milestones and future events do not count", () => {
    const custom: Pipeline["stages"][number] = {
      ...stages[0],
      key: "custom-onsite",
      category: "interviewing",
      label: "Onsite",
    };
    const result = buildOverview(
      {
        stages: [...stages, custom],
        applications: [
          application({
            events: [
              stageEvent("1", custom.key),
              stageEvent("2", "offer", new Date("2026-09-10")),
            ],
          }),
        ],
      },
      now,
    );
    expect(result.funnel.map((row) => row.applications.length)).toEqual([
      0, 0, 1, 0, 0,
    ]);
    expect(result.recentChanges).toHaveLength(1);
  });

  test("current stage alone does not fabricate history", () => {
    const result = overview([
      application({
        stage: "offer",
        stageDefinition: stages.find((stage) => stage.key === "offer")!,
      }),
    ]);
    expect(result.funnel.every((row) => row.applications.length === 0)).toBe(
      true,
    );
    expect(
      result.alerts.some(
        (alert) => alert.title === "Check missing stage history",
      ),
    ).toBe(true);
  });

  test("dismissals persist, snoozes expire exactly at their boundary, restore reveals work", () => {
    const alerts = overview([application()]).alerts;
    const key = alerts[0].key;
    expect(
      partitionAlerts(
        alerts,
        [{ key, dismissed: true, snoozedUntil: null }],
        now,
      ).visible,
    ).toEqual([]);
    expect(
      partitionAlerts(
        alerts,
        [{ key, dismissed: false, snoozedUntil: new Date(now.getTime() + 1) }],
        now,
      ).hidden,
    ).toHaveLength(1);
    expect(
      partitionAlerts(
        alerts,
        [{ key, dismissed: false, snoozedUntil: now }],
        now,
      ).visible,
    ).toHaveLength(1);
    expect(partitionAlerts(alerts, [], now).visible).toHaveLength(1);
  });

  test("rescheduling creates a new alert unaffected by an older dismissal", () => {
    const old = overview([
      application({ nextAction: "Follow up", nextActionDueAt: now }),
    ]).alerts[0];
    const updated = overview([
      application({
        nextAction: "Follow up",
        nextActionDueAt: new Date("2026-09-09"),
      }),
    ]).alerts;
    expect(
      partitionAlerts(
        updated,
        [{ key: old.key, dismissed: true, snoozedUntil: null }],
        now,
      ).visible,
    ).toHaveLength(1);
  });
});
