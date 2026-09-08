import { describe, expect, test } from "bun:test";
import {
  buildWeeklySnapshot,
  lastCompletedWeek,
  reviewWindow,
  type WeeklyInput,
} from "@/lib/weekly-review/model";
import { reviewEditsSchema } from "@/lib/weekly-review/storage";
const now = new Date("2026-09-08T12:00:00Z"),
  week = "2026-08-31";
const at = (text: string) => new Date(text);
function input(): WeeklyInput {
  return {
    jobs: [
      {
        id: "a",
        title: "Engineer",
        company: "Acme",
        capturedAt: at("2026-08-31T00:00:00Z"),
      },
      {
        id: "b",
        title: "Designer",
        company: "Beta",
        capturedAt: at("2026-09-07T00:00:00Z"),
      },
    ],
    events: [],
    submissions: [],
    interactions: [],
    interviews: [],
    tasks: [],
    risks: [],
    weeklyHours: 3,
    stages: [
      { key: "inbox", category: "inbox", position: 0, isTerminal: false },
      { key: "applied", category: "applied", position: 4, isTerminal: false },
      {
        key: "custom-interview",
        category: "interviewing",
        position: 99,
        isTerminal: false,
      },
      { key: "offer", category: "offer", position: 7, isTerminal: false },
      { key: "rejected", category: "rejected", position: 10, isTerminal: true },
    ],
  };
}
const edit = {
  reflection: "Learned something",
  interpretation: "Uncertain",
  experimentOne: "",
  experimentTwo: "",
  nextWeekPlan: "Prepare one application",
  availableHours: 3,
  plannedHours: 2,
  status: "reviewed",
};
describe("weekly reviews", () => {
  test("uses completed UTC Monday weeks, including year boundaries", () => {
    expect(lastCompletedWeek(now)).toBe(week);
    expect(lastCompletedWeek(at("2026-09-07T00:00:00Z"))).toBe(week);
    expect(lastCompletedWeek(at("2026-01-01T00:00:00Z"))).toBe("2025-12-22");
    expect(() => reviewWindow("2026-09-07", now)).toThrow("not ended");
    expect(() => reviewWindow("2026-09-01", now)).toThrow("Monday");
    expect(() => reviewWindow("2026-02-30", now)).toThrow();
  });
  test("includes the beginning and excludes the ending boundary; deduplicates applications", () => {
    const data = input();
    data.submissions = [
      { jobId: "a", submittedAt: at("2026-09-01T00:00:00Z") },
      { jobId: "a", submittedAt: at("2026-09-02T00:00:00Z") },
      { jobId: "b", submittedAt: at("2026-09-07T00:00:00Z") },
    ];
    data.events = [
      {
        id: "e",
        jobId: "a",
        kind: "stage",
        fromStage: "inbox",
        toStage: "applied",
        occurredAt: at("2026-09-02T00:00:00Z"),
      },
    ];
    const result = buildWeeklySnapshot(data, week, now);
    expect(
      result.metrics.find((m) => m.key === "captures")!.items.map((i) => i.id),
    ).toEqual(["a"]);
    expect(
      result.metrics.find((m) => m.key === "applications")!.items.length,
    ).toBe(1);
  });
  test("compares standard categories rather than custom stage position, separates closure and outcomes", () => {
    const data = input();
    data.events = [
      ["custom-interview", "offer"],
      ["custom-interview", "offer"],
      ["offer", "rejected"],
    ].map(([fromStage, toStage], i) => ({
      id: String(i),
      jobId: "a",
      kind: "stage",
      fromStage,
      toStage,
      occurredAt: at("2026-09-04T00:00:00Z"),
    }));
    const result = buildWeeklySnapshot(data, week, now);
    expect(result.progressed.length).toBe(1);
    expect(result.progressed[0].detail).toContain("interviewing → offer");
    expect(result.closed.length).toBe(1);
    expect(result.metrics.find((m) => m.key === "outcomes")!.items.length).toBe(
      1,
    );
  });
  test("does not infer attendance, contact responses, or skipped stages", () => {
    const data = input();
    data.interviews = [
      {
        id: "i",
        jobId: "a",
        label: "Round",
        scheduledAt: at("2026-09-02T00:00:00Z"),
        status: "scheduled",
      },
      {
        id: "cancelled",
        jobId: "a",
        label: "Cancelled",
        scheduledAt: at("2026-09-02T00:00:00Z"),
        status: "cancelled",
      },
    ];
    data.interactions = [
      {
        id: "out",
        contactId: "c",
        name: "Recruiter",
        direction: "outbound",
        channel: "email",
        summary: "Follow-up",
        occurredAt: at("2026-09-02T00:00:00Z"),
      },
    ];
    const result = buildWeeklySnapshot(data, week, now);
    expect(
      result.metrics.find((m) => m.key === "interviews")!.items.length,
    ).toBe(1);
    expect(
      result.metrics.find((m) => m.key === "interviews")!.items[0].detail,
    ).toContain("not recorded");
    expect(
      result.metrics.find((m) => m.key === "responses")!.items.length,
    ).toBe(0);
    expect(
      result.metrics.find((m) => m.key === "applications")!.items.length,
    ).toBe(0);
  });
  test("counts missed date-only task deadlines with completion boundary and current risks separately", () => {
    const data = input();
    data.tasks = [
      {
        id: "late",
        jobId: "a",
        title: "Late",
        dueAt: at("2026-09-02T00:00:00Z"),
        createdAt: at("2026-09-01T00:00:00Z"),
        completedAt: at("2026-09-03T00:00:00Z"),
      },
      {
        id: "on-time",
        jobId: "a",
        title: "On time",
        dueAt: at("2026-09-02T00:00:00Z"),
        createdAt: at("2026-09-01T00:00:00Z"),
        completedAt: at("2026-09-02T23:59:59Z"),
      },
    ];
    data.risks = [
      {
        key: "risk",
        kind: "stalled",
        title: "Stalled",
        source: "Acme",
        href: "/jobs/a",
        reason: "No activity",
        dueAt: null,
        rank: 10,
      },
    ];
    const result = buildWeeklySnapshot(data, week, now);
    expect(result.missedTasks.map((t) => t.id)).toEqual(["late"]);
    expect(result.risks.length).toBe(1);
    expect(result.caveats.join(" ")).toContain("not a reconstruction");
  });
  test("fits provisional plans to available capacity and makes no causal claims for empty data", () => {
    const data = input();
    data.weeklyHours = 0.5;
    const result = buildWeeklySnapshot(data, week, now);
    expect(result.suggestedHours).toBe(0.5);
    expect(result.suggestedPlan).toContain("0.5");
    expect(result.caveats.join(" ")).toContain("small activity sample");
    data.weeklyHours = 0;
    expect(buildWeeklySnapshot(data, week, now).suggestedHours).toBe(0);
  });
  test("requires a reflection and plan to complete and validates capacity at the data boundary", () => {
    expect(reviewEditsSchema.safeParse(edit).success).toBe(true);
    for (const patch of [
      { reflection: "" },
      { nextWeekPlan: "" },
      { plannedHours: 4 },
      { availableHours: -1 },
      { status: "unknown" },
    ])
      expect(reviewEditsSchema.safeParse({ ...edit, ...patch }).success).toBe(
        false,
      );
    expect(
      reviewEditsSchema.safeParse({
        ...edit,
        status: "draft",
        reflection: "",
        nextWeekPlan: "",
      }).success,
    ).toBe(true);
  });
});
