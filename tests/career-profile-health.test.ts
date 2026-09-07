import { describe, expect, test } from "bun:test";

import { calculateEvidenceHealth } from "@/lib/career-profile/health";

describe("career profile evidence health", () => {
  test("flags conflicting dates, stale skills, and unsupported metrics", () => {
    const warnings = calculateEvidenceHealth(
      [
        { id: "one", company: "Acme", title: "Designer", startDate: "2022-01", endDate: "2023-01", verificationState: "verified" },
        { id: "two", company: "acme", title: "designer", startDate: "2022-02", endDate: "2023-01", verificationState: "needs_clarification" },
      ],
      [{ id: "achievement", result: "Increased completion by 28%", measurableOutcome: null, sourceLabel: null, verificationState: "verified" }],
      [{ id: "skill", name: "Backbone.js", recency: "past", verificationState: "verified" }],
      [],
    );

    expect(warnings.map((warning) => warning.kind)).toEqual(["date_conflict", "stale", "unsupported_metric"]);
  });

  test("ignores archived duplicate records", () => {
    const warnings = calculateEvidenceHealth(
      [],
      [],
      [],
      [
        { id: "one", kind: "project", title: "Design system", organization: "Acme", verificationState: "verified" },
        { id: "two", kind: "project", title: "Design system", organization: "Acme", verificationState: "archived" },
      ],
    );

    expect(warnings).toEqual([]);
  });
});
