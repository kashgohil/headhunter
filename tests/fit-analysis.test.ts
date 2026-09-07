import { describe, expect, test } from "bun:test";

import { analyzeFit } from "@/lib/fit-analysis/analyzer";
import { defaultFitWeights } from "@/lib/fit-analysis/types";
import { fitOverrideSchema, fitWeightsSchema } from "@/lib/fit-analysis/validation";

const now = new Date("2026-09-07T00:00:00.000Z");

function job(overrides: Record<string, unknown> = {}) {
  return {
    id: "job-1", title: "Senior Product Designer", company: "Acme", location: "Bengaluru, India",
    workArrangement: "remote", extractionConfidence: "high", capturedAt: now, sourceUrl: null, sourceType: "pasted",
    sourceFetchedAt: null, originalDescription: "Remote senior product designer working on developer tools.", employmentType: "Full-time",
    seniority: "Senior", minimumCompensation: 160000, maximumCompensation: 190000, compensationCurrency: "USD",
    postedAt: new Date("2026-09-03T00:00:00.000Z"), applicationDeadline: null,
    responsibilities: ["Lead product design"], requiredQualifications: ["Product strategy", "Figma"],
    preferredQualifications: ["Developer tools"], skills: ["Product strategy"], technologies: ["Figma"],
    metadataUpdatedAt: null, duplicateJobs: [], ...overrides,
  } as never;
}

function strategy(overrides: Record<string, unknown> = {}) {
  return {
    id: "strategy-1", version: 1, primaryTitle: "Senior Product Designer", adjacentTitles: ["Staff Product Designer"],
    seniorityLevels: ["Senior"], preferredIndustries: ["Developer tools"], excludedIndustries: [], companyStages: [], companySizes: [],
    workArrangements: ["Remote", "Hybrid"], locations: ["India"], relocationPreference: "Not needed", timeZoneConstraints: "",
    workAuthorization: "India", sponsorshipRequired: false, minimumCompensation: 150000, targetCompensation: 180000,
    currency: "USD", compensationFlexible: false, hardBlockers: [], softPreferences: ["Developer tools"], weeklyHours: 6,
    searchPace: "balanced", createdAt: now, ...overrides,
  } as never;
}

function profile(withEvidence = true) {
  return {
    experiences: withEvidence ? [{ id: "exp-1", title: "Senior Product Designer", summary: "Led developer tools product strategy", responsibilities: ["Led product design"], technologies: ["Figma"], verificationState: "verified" }] : [],
    achievements: withEvidence ? [{ id: "achievement-1", problem: "Slow design workflow", action: "Created a Figma system", result: "Improved delivery", measurableOutcome: "30% faster", tools: ["Figma"], roleFamilies: ["Product design"], verificationState: "verified" }] : [],
    skills: withEvidence ? [{ id: "skill-1", name: "Product strategy", context: "Developer tools", verificationState: "verified" }] : [],
    profileItems: [], stories: [], answers: [], voiceProfiles: [], readiness: { hasExperience: withEvidence, hasAchievement: withEvidence, hasSkills: withEvidence, ready: withEvidence },
  } as never;
}

describe("explainable fit analysis", () => {
  test("scores dimensions separately and leaves referral access unknown", () => {
    const result = analyzeFit({ job: job(), strategy: strategy(), profile: profile(), now });
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.recommendation).toBe("apply_now");
    expect(result.dimensions.qualifications.score).toBeGreaterThanOrEqual(80);
    expect(result.dimensions.referral_access.score).toBeNull();
    expect(result.evidenceIds).toContain("exp-1");
  });

  test("turns explicit practical mismatches into hard blockers", () => {
    const result = analyzeFit({
      job: job({ workArrangement: "on_site", maximumCompensation: 120000 }),
      strategy: strategy({ workArrangements: ["Remote"] }),
      profile: profile(), now,
    });
    expect(result.recommendation).toBe("skip");
    expect(result.gaps.filter((gap) => gap.classification === "hard_blocker")).toHaveLength(2);
  });

  test("classifies unsupported required qualifications as missing evidence", () => {
    const result = analyzeFit({ job: job(), strategy: strategy(), profile: profile(false), now });
    expect(result.gaps.some((gap) => gap.classification === "missing_evidence")).toBe(true);
    expect(result.dimensions.experience.score).toBe(0);
  });

  test("reweights only known dimensions", () => {
    const result = analyzeFit({
      job: job({ postedAt: new Date("2026-01-01T00:00:00.000Z") }), strategy: strategy(), profile: profile(), now,
      weights: { ...defaultFitWeights, freshness: 100, referral_access: 100, qualifications: 0, experience: 0, seniority: 0, location_comp: 0, preferences: 0, prep_effort: 0 },
    });
    expect(result.score).toBe(18);
  });
});

describe("fit analysis validation", () => {
  test("requires at least one positive weight", () => {
    expect(fitWeightsSchema.safeParse(Object.fromEntries(Object.keys(defaultFitWeights).map((key) => [key, "0"]))).success).toBe(false);
  });

  test("requires a reason when overriding", () => {
    expect(fitOverrideSchema.safeParse({ recommendation: "apply_now", reason: "gut" }).success).toBe(false);
  });
});
