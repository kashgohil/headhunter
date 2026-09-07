import { describe, expect, test } from "bun:test";

import { calculateCareerProfileReadiness } from "@/lib/career-profile/readiness";

describe("career profile readiness", () => {
  test("unlocks with a partial, not fully verified, profile", () => {
    expect(calculateCareerProfileReadiness(
      [{ id: "experience-1", verificationState: "needs_clarification" }],
      [{ experienceId: "experience-1", verificationState: "needs_clarification" }],
      [{ verificationState: "needs_clarification" }],
    )).toEqual({
      hasExperience: true,
      hasAchievement: true,
      hasSkills: true,
      ready: true,
    });
  });

  test("does not count archived or prohibited evidence", () => {
    const readiness = calculateCareerProfileReadiness(
      [{ id: "experience-1", verificationState: "verified" }],
      [{ experienceId: "experience-1", verificationState: "prohibited" }],
      [{ verificationState: "archived" }],
    );

    expect(readiness.hasExperience).toBe(true);
    expect(readiness.hasAchievement).toBe(false);
    expect(readiness.hasSkills).toBe(false);
    expect(readiness.ready).toBe(false);
  });

  test("requires the achievement to belong to an active experience", () => {
    const readiness = calculateCareerProfileReadiness(
      [{ id: "experience-1", verificationState: "archived" }],
      [{ experienceId: "experience-1", verificationState: "verified" }],
      [{ verificationState: "verified" }],
    );

    expect(readiness.hasAchievement).toBe(false);
    expect(readiness.ready).toBe(false);
  });
});
