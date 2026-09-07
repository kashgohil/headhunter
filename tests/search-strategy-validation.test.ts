import { describe, expect, test } from "bun:test";

import { searchStrategySchema } from "@/lib/search-strategy/validation";

const validStrategy = {
  primaryTitle: "Senior Product Designer",
  adjacentTitles: "Staff Designer, Design Lead, Staff Designer",
  seniorityLevels: "Senior, Staff",
  preferredIndustries: "Developer tools, Fintech, Developer tools",
  excludedIndustries: "Gambling",
  companyStages: "Series B, Public",
  companySizes: "51–200, 201–500",
  workArrangements: "Remote, Hybrid",
  locations: "India, United Kingdom",
  relocationPreference: "Open to relocating for the right role",
  timeZoneConstraints: "At least four hours of overlap with IST",
  workAuthorization: "Authorized to work in India",
  sponsorshipRequired: "true",
  minimumCompensation: "150000",
  targetCompensation: "175000",
  currency: "usd",
  compensationFlexible: "true",
  hardBlockers: "No sponsorship offered\nOn-site five days a week",
  softPreferences: "Small product team\nDeveloper tools",
  weeklyHours: "6",
  searchPace: "balanced",
};

describe("search strategy validation", () => {
  test("normalizes lists, currency, and boolean input", () => {
    const strategy = searchStrategySchema.parse(validStrategy);

    expect(strategy.adjacentTitles).toEqual(["Staff Designer", "Design Lead"]);
    expect(strategy.preferredIndustries).toEqual(["Developer tools", "Fintech"]);
    expect(strategy.currency).toBe("USD");
    expect(strategy.sponsorshipRequired).toBe(true);
    expect(strategy.compensationFlexible).toBe(true);
    expect(strategy.weeklyHours).toBe(6);
    expect(strategy.searchPace).toBe("balanced");
  });

  test("keeps hard blockers separate from soft preferences", () => {
    const strategy = searchStrategySchema.parse(validStrategy);

    expect(strategy.hardBlockers).toEqual(["No sponsorship offered", "On-site five days a week"]);
    expect(strategy.softPreferences).toEqual(["Small product team", "Developer tools"]);
  });

  test("rejects a target below the minimum compensation", () => {
    const result = searchStrategySchema.safeParse({
      ...validStrategy,
      minimumCompensation: "180000",
      targetCompensation: "160000",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.targetCompensation).toEqual([
        "Target compensation must be at least the minimum.",
      ]);
    }
  });

  test("requires an explicit weekly time budget", () => {
    const result = searchStrategySchema.safeParse({ ...validStrategy, weeklyHours: "" });

    expect(result.success).toBe(false);
  });

  test("requires a relocation preference and valid search approach", () => {
    const result = searchStrategySchema.safeParse({
      ...validStrategy,
      relocationPreference: "",
      searchPace: "fast",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.relocationPreference).toBeDefined();
      expect(result.error.flatten().fieldErrors.searchPace).toBeDefined();
    }
  });
});
