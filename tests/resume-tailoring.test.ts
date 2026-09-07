import { describe, expect, test } from "bun:test";

import { createBulletSuggestions, createSummary, rankAchievements, regenerateBullet } from "@/lib/resumes/tailoring";
import { createResumePdf } from "@/lib/resumes/pdf";

const job = {
  title: "Senior Product Manager",
  requiredQualifications: ["Lead platform strategy and cross-functional delivery"],
  preferredQualifications: ["Experience with analytics"],
  responsibilities: ["Improve product activation"],
  skills: ["Analytics"],
  technologies: [],
};

const achievements = [
  { id: "a", experienceId: "e", action: "Led platform strategy", result: "improved activation", measurableOutcome: "Activation increased 18%", tools: ["Analytics"], verificationState: "verified" as const },
  { id: "b", experienceId: "e", action: "Organized team rituals", result: "clearer meetings", measurableOutcome: null, tools: [], verificationState: "needs_clarification" as const },
];

describe("resume tailoring", () => {
  test("ranks job-relevant evidence first", () => expect(rankAchievements(achievements, job)[0]?.id).toBe("a"));

  test("keeps each suggestion linked to evidence and flags unverified risk", () => {
    const suggestions = createBulletSuggestions(achievements, job);
    expect(suggestions[0]?.evidenceIds).toEqual(["a", "e"]);
    expect(suggestions[0]?.risk).toBe("low");
    expect(suggestions[1]?.risk).toBe("high");
  });

  test("never uses prohibited achievements", () => {
    const suggestions = createBulletSuggestions([{ ...achievements[0], verificationState: "prohibited" }], job);
    expect(suggestions).toHaveLength(0);
  });

  test("regeneration changes framing without adding evidence", () => {
    expect(regenerateBullet(achievements[0], 1)).toContain("Activation increased 18%");
    expect(regenerateBullet(achievements[0], 1)).not.toEqual(regenerateBullet(achievements[0], 2));
  });

  test("summary includes only stored skills and exposes its evidence ids", () => {
    const summary = createSummary("Product", "Product leader", [{ id: "e", title: "PM", company: "Acme", verificationState: "verified" }], [{ id: "s", name: "Analytics", verificationState: "verified" }], job);
    expect(summary.text).toContain("Analytics");
    expect(summary.evidenceIds).toEqual(["e", "s"]);
    expect(summary.risk).toBe("low");
  });

  test("exports a selectable PDF document", () => {
    const bytes = createResumePdf({ name: "Kash", roleFamily: "Product", template: "classic", job: { id: "j", title: job.title, company: "Northstar" }, summary: "Product leader", experiences: [], skills: ["Analytics"], profileItems: [], sectionOrder: ["summary", "experience", "projects", "skills", "education"] });
    const pdf = new TextDecoder().decode(bytes);
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("Product leader");
    expect(pdf).toContain("/BaseFont /Helvetica");
  });
});
