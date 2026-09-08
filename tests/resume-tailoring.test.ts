import { describe, expect, test } from "bun:test";

import { createBulletSuggestions, createSummary, rankAchievements, regenerateBullet } from "@/lib/resumes/tailoring";
import { createResumePdf } from "@/lib/resumes/pdf";
import { candidateIdentitySchema } from "@/lib/resumes/validation";

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

  test("keeps employer-facing identity separate and validates contact links", () => {
    const identity = candidateIdentitySchema.parse({ candidateName: "José शर्मा", candidateEmail: "jose@example.com", candidatePhone: "+91 98765 43210", candidateLocation: "Pune, India", candidateWebsite: "https://example.com/portfolio" });
    expect(identity.candidateName).toBe("José शर्मा");
    expect(candidateIdentitySchema.safeParse({ ...identity, candidateWebsite: "javascript:alert(1)" }).success).toBe(false);
    expect(candidateIdentitySchema.safeParse({ ...identity, candidateEmail: "not-an-email" }).success).toBe(false);
  });

  test("exports an embedded-font PDF document", async () => {
    const bytes = await createResumePdf({ name: "Internal profile", candidate: { name: "Kash", email: "", phone: "", location: "", website: "" }, roleFamily: "Product", template: "classic", job: { id: "j", title: job.title, company: "Northstar" }, summary: "Product leader", experiences: [], skills: ["Analytics"], profileItems: [], sectionOrder: ["summary", "experience", "projects", "skills", "education"] });
    expect(new TextDecoder().decode(bytes.slice(0, 8))).toStartWith("%PDF-");
    expect(new TextDecoder().decode(bytes)).toContain("/FontFile");
  });
});
