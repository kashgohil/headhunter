import { describe, expect, test } from "bun:test";
import {
  attributeApplications,
  type AttributionInput,
} from "@/lib/analytics/attribution";
import {
  segmentKeys,
  summarizeSegments,
  evaluateExperiment,
  type AnalyticsInput,
  type ExperimentPlan,
  unknownSegment,
} from "@/lib/analytics/segments";
const now = new Date("2026-09-08T12:00:00Z");
const job = (id: string, source: string, applied = "2026-08-01T00:00:00Z") => ({
  id,
  title: id,
  company: "Example",
  appliedAt: new Date(applied),
  provenance: "test",
  segments: Object.fromEntries(
    segmentKeys.map((key) => [key, key === "source" ? source : unknownSegment]),
  ) as AnalyticsInput["applications"][number]["segments"],
});
const event = (jobId: string, toStage: string, at: string) => ({
  jobId,
  toStage,
  kind: "stage",
  occurredAt: new Date(at),
});
const plan: ExperimentPlan = {
  title: "Source test",
  hypothesis: "Source changes response",
  variable: "source",
  baseline: "board",
  treatment: "direct",
  targetDimension: "all",
  targetValue: "",
  controls: "Same roles",
  startDate: "2026-08-01",
  endDate: "2026-09-08",
  outcome: "interviewing",
  observationDays: 14,
};
describe("analytics comparisons", () => {
  test("groups missing values explicitly and partitions the cohort without inferring outcomes", () => {
    const applications = [
      job("a", "board"),
      job("b", "direct"),
      job("c", unknownSegment),
      job("old", "board", "2026-01-01"),
    ];
    const input = {
      applications,
      submissions: applications.map((job) => ({
        jobId: job.id,
        submittedAt: job.appliedAt,
      })),
      stages: [],
      events: [
        event("a", "interviewing", "2026-08-02"),
        event("a", "interviewing", "2026-08-03"),
        event("b", "offer", "2026-08-04"),
      ],
    };
    const groups = summarizeSegments(input, now, 90, "source", "interviewing");
    expect(groups.reduce((sum, g) => sum + g.sampleSize, 0)).toBe(3);
    expect(groups.find((g) => g.value === "board")?.count).toBe(1);
    expect(groups.find((g) => g.value === "direct")?.rate).toBe(0);
    expect(groups.find((g) => g.value === unknownSegment)?.sampleSize).toBe(1);
  });
  test("uses equal follow-up horizons, excludes pending, unknown and pre-application outcomes", () => {
    const applications = [
      job("a", "board"),
      job("b", "direct"),
      job("pending", "direct", "2026-09-08"),
      job("unknown", unknownSegment),
    ];
    const input = {
      applications,
      submissions: applications.map((job) => ({
        jobId: job.id,
        submittedAt: job.appliedAt,
      })),
      stages: [{ key: "onsite", category: "interviewing" }],
      events: [
        event("a", "onsite", "2026-08-15"),
        event("b", "interviewing", "2026-08-16"),
        event("b", "interviewing", "2026-07-31"),
      ],
    };
    const result = evaluateExperiment(input, plan, now);
    expect(
      result.arms.map((arm) => [arm.count, arm.sampleSize, arm.pending]),
    ).toEqual([
      [1, 1, 0],
      [0, 1, 1],
    ]);
    expect(result.difference).toBe(-1);
    expect(result.excluded).toBe(1);
    expect(result.readyToComplete).toBe(false);
    expect(result.interpretation).toContain("Insufficient evidence");
  });
  test("applies target segment, inclusive end date, normalized group values and zero denominators", () => {
    const applications = [
      job("a", "direct", "2026-08-02"),
      job("b", "board", "2026-08-03"),
    ];
    applications[0].segments.roleFamily = "engineering";
    const input = {
      applications,
      submissions: applications.map((job) => ({
        jobId: job.id,
        submittedAt: job.appliedAt,
      })),
      events: [],
      stages: [],
    };
    const result = evaluateExperiment(
      input,
      {
        ...plan,
        treatment: " DIRECT ",
        targetDimension: "roleFamily",
        targetValue: "Engineering",
        endDate: "2026-08-02",
      },
      now,
    );
    expect(result.arms.map((arm) => arm.sampleSize)).toEqual([0, 1]);
    expect(result.difference).toBeNull();
    expect(result.readyToComplete).toBe(true);
  });
});
describe("historical attribution", () => {
  test("uses first submission metadata, never a future fit or later resume snapshot", () => {
    const input = {
      applications: [
        {
          id: "a",
          title: "Current",
          company: "Example",
          location: "Changed",
          seniority: "Staff",
        },
      ],
      events: [],
      stages: [],
      annotations: new Map(),
      fits: [
        {
          jobId: "a",
          createdAt: new Date("2026-08-02"),
          version: 2,
          dimensions: { experience: { score: 99 } },
        },
        {
          jobId: "a",
          createdAt: new Date("2026-07-30"),
          version: 1,
          dimensions: { experience: { score: 50 } },
        },
      ],
      submissions: [
        {
          id: "later",
          jobId: "a",
          submittedAt: new Date("2026-08-05"),
          createdAt: new Date("2026-08-05"),
          source: "later",
          snapshot: { job: { location: "Later" }, documents: [], answers: [] },
        },
        {
          id: "first",
          jobId: "a",
          submittedAt: new Date("2026-08-01"),
          createdAt: new Date("2026-08-01"),
          method: "job_board",
          source: "Original",
          referral: null,
          snapshot: {
            job: {
              location: "Original city",
              seniority: "Senior",
              postedAt: "2026-07-31",
            },
            documents: [{ kind: "resume", name: "Backend" }],
            answers: [],
          },
        },
      ],
    } as unknown as AttributionInput;
    const result = attributeApplications(input, now).applications[0];
    expect(result.segments.location).toBe("original city");
    expect(result.segments.source).toBe("original");
    expect(result.segments.resumeStrategy).toBe("backend");
    expect(result.segments.experience).toBe("40–69");
    expect(result.segments.postingAge).toBe("0–2 days");
  });
  test("does not attribute later submissions to an earlier waived application; zero effort is recorded", () => {
    const input = {
      applications: [
        { id: "a", title: "Role", company: "Example", location: "Current" },
      ],
      events: [event("a", "applied", "2026-07-01")],
      stages: [],
      fits: [],
      annotations: new Map([
        [
          "a",
          {
            roleFamily: "Engineering",
            industry: "",
            companySize: "",
            resumeStrategy: "",
            preparationMinutes: 0,
          },
        ],
      ]),
      submissions: [
        {
          id: "later",
          jobId: "a",
          submittedAt: new Date("2026-08-01"),
          createdAt: new Date("2026-08-01"),
          source: "Later",
          snapshot: { job: { location: "Later" }, documents: [], answers: [] },
        },
      ],
    } as unknown as AttributionInput;
    const result = attributeApplications(input, now).applications[0];
    expect(result.segments.source).toBe(unknownSegment);
    expect(result.segments.location).toBe("current");
    expect(result.segments.preparationEffort).toBe("under 30 minutes");
    expect(result.provenance).toContain("unavailable");
  });
});
