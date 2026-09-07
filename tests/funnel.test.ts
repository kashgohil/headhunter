import { describe, expect, test } from "bun:test";
import { calculateFunnel, type FunnelInput } from "@/lib/analytics/funnel";
const now = new Date("2026-09-08T12:00:00Z");
const at = (value: string) => new Date(value);
const job = (id: string) => ({ id, title: id, company: "Example" });
const event = (jobId: string, toStage: string, occurredAt = at("2026-09-01")) => ({ jobId, toStage, occurredAt, kind: "stage" });
describe("cohort funnel", () => {
  test("zero cohort has undefined rates instead of fabricated zero performance", () => {
    const result = calculateFunnel({ applications: [], events: [], submissions: [], stages: [] }, now, 30);
    expect(result.rows.every((row) => row.rate === null)).toBe(true);
  });
  test("counts unique applications, maps custom stages and does not infer skipped stages", () => {
    const input: FunnelInput = { applications: [job("a"), job("b")], stages: [{ key: "onsite", category: "interviewing" }], submissions: [{ jobId: "b", submittedAt: at("2026-09-01") }], events: [event("a", "applied"), event("a", "onsite"), event("a", "onsite"), event("b", "offer")] };
    const result = calculateFunnel(input, now, 30);
    expect(result.rows.map((row) => row.count)).toEqual([2, 0, 1, 1, 0]);
    expect(result.rows[2].rate).toBe(0.5);
  });
  test("uses earliest application date and excludes pre-application and future milestones", () => {
    const result = calculateFunnel({ applications: [job("old"), job("new")], stages: [], submissions: [{ jobId: "old", submittedAt: at("2026-01-01") }, { jobId: "old", submittedAt: at("2026-09-01") }], events: [event("new", "interviewing", at("2026-08-01")), event("new", "applied"), event("new", "offer", at("2026-10-01"))] }, now, 30);
    expect(result.sampleSize).toBe(1);
    expect(result.rows.map((row) => row.count)).toEqual([1, 0, 0, 0, 0]);
  });
});
