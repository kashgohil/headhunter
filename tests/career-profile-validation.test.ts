import { describe, expect, test } from "bun:test";

import {
  achievementSchema,
  evidenceControlSchema,
  experienceSchema,
  skillSchema,
  profileItemSchema,
  storySchema,
  answerSchema,
  voiceProfileSchema,
} from "@/lib/career-profile/validation";

describe("career profile validation", () => {
  test("normalizes experience lists and current-role dates", () => {
    const experience = experienceSchema.parse({
      company: " Acme ",
      title: " Product Designer ",
      location: " ",
      startDate: "2024-02",
      endDate: "",
      isCurrent: "true",
      summary: " Led the core workflow. ",
      responsibilities: "Led discovery\nOwned delivery\nLed discovery",
      technologies: "Figma, React, Figma",
      sourceLabel: "Resume 2026",
    });

    expect(experience.company).toBe("Acme");
    expect(experience.location).toBeNull();
    expect(experience.technologies).toEqual(["Figma", "React"]);
    expect(experience.responsibilities).toEqual(["Led discovery", "Owned delivery"]);
    expect(experience.isCurrent).toBe(true);
  });

  test("requires an end date for a past role", () => {
    const result = experienceSchema.safeParse({
      company: "Acme",
      title: "Product Designer",
      location: "",
      startDate: "2024-02",
      endDate: "",
      isCurrent: null,
      summary: "",
      responsibilities: "",
      technologies: "",
      sourceLabel: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.endDate).toBeDefined();
  });

  test("rejects an end date before the start date", () => {
    const result = experienceSchema.safeParse({
      company: "Acme",
      title: "Product Designer",
      location: "",
      startDate: "2025-01",
      endDate: "2024-12",
      isCurrent: null,
      summary: "",
      responsibilities: "",
      technologies: "",
      sourceLabel: "",
    });

    expect(result.success).toBe(false);
  });

  test("keeps achievement evidence structured", () => {
    const achievement = achievementSchema.parse({
      experienceId: "d3e0c950-3e21-47af-94bf-8a537950555d",
      problem: "Customers could not complete the onboarding flow.",
      action: "I redesigned and tested the critical account steps.",
      result: "Completion improved after the new flow shipped.",
      measurableOutcome: "Completion increased by 28%",
      tools: "Research, Figma, Research",
      roleFamilies: "Product design",
      sourceLabel: "Q2 review",
    });

    expect(achievement.tools).toEqual(["Research", "Figma"]);
    expect(achievement.measurableOutcome).toBe("Completion increased by 28%");
  });

  test("accepts a skill without supporting evidence yet", () => {
    const skill = skillSchema.parse({
      name: "Product strategy",
      context: "Used to shape roadmap decisions.",
      recency: "current",
      proficiency: "advanced",
      supportingAchievementId: "",
      sourceLabel: "Personal recollection",
    });

    expect(skill.supportingAchievementId).toBeNull();
  });

  test("requires a real evidence-control change", () => {
    expect(evidenceControlSchema.safeParse({
      entityType: "career_skill",
      entityId: "d3e0c950-3e21-47af-94bf-8a537950555d",
    }).success).toBe(false);
  });

  test("requires a URL for professional-link records", () => {
    const result = profileItemSchema.safeParse({
      kind: "link",
      title: "Portfolio",
      organization: "",
      description: "A representative collection of product work.",
      startDate: "",
      endDate: "",
      url: "",
      credentialId: "",
      technologies: "",
      sourceLabel: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.url).toBeDefined();
  });

  test("preserves every part of an interview story", () => {
    const story = storySchema.parse({
      title: "Resolving launch risk",
      situation: "A critical release had stalled across two teams.",
      task: "I was responsible for getting the workflow ready.",
      action: "I aligned the owners and tested a reduced scope.",
      result: "The release shipped with the critical journey intact.",
      reflection: "I learned to surface ownership gaps sooner.",
      roleFamilies: "Product design",
      prompts: "Leadership, ambiguity",
      supportingAchievementId: "",
      sourceLabel: "Project notes",
    });

    expect(story.prompts).toEqual(["Leadership", "ambiguity"]);
    expect(story.reflection).toContain("ownership");
  });

  test("accepts grounded answers and writing voice guidance", () => {
    const answer = answerSchema.parse({
      question: "Why this role?",
      answer: "This role matches the product problems I want to keep solving.",
      contexts: "Application, recruiter screen",
      supportingAchievementId: "",
      sourceLabel: "Previous application",
    });
    const voice = voiceProfileSchema.parse({
      name: "Direct and thoughtful",
      tone: "Clear, specific, warm, and free of unnecessary formality.",
      principles: "Lead with the point\nUse concrete examples",
      avoid: "Unsupported superlatives",
      sample: "I enjoy turning ambiguous product constraints into clear decisions.",
      sourceLabel: "Writing samples",
    });

    expect(answer.contexts).toEqual(["Application", "recruiter screen"]);
    expect(voice.principles).toHaveLength(2);
  });
});
