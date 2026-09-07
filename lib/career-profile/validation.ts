import { z } from "zod";

function uniqueList(value: unknown) {
  if (typeof value !== "string") return value;

  return [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))];
}

const optionalText = (maximum: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().max(maximum).nullable(),
);

const shortList = z.preprocess(
  uniqueList,
  z.array(z.string().max(100)).max(20, "Keep this list to 20 items or fewer."),
);
const lineList = z.preprocess(
  (value) => typeof value === "string" ? [...new Set(value.split(/\n/).map((item) => item.trim()).filter(Boolean))] : value,
  z.array(z.string().max(500)).max(30, "Keep this list to 30 items or fewer."),
);

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use a valid month and year.");
const optionalMonth = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  month.nullable(),
);
const optionalUrl = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().url("Enter a complete URL.").max(2_048).nullable(),
);

export const experienceSchema = z.object({
  company: z.string().trim().min(1, "Add the company or organization.").max(160),
  title: z.string().trim().min(1, "Add your role title.").max(160),
  location: optionalText(160),
  startDate: month,
  endDate: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? null : value,
    month.nullable(),
  ),
  isCurrent: z.preprocess((value) => value === "true" || value === "on", z.boolean()),
  summary: optionalText(1_500),
  responsibilities: lineList,
  technologies: shortList,
  sourceLabel: optionalText(240),
}).superRefine((value, context) => {
  if (!value.isCurrent && !value.endDate) {
    context.addIssue({ code: "custom", path: ["endDate"], message: "Add an end date or mark this as your current role." });
  }
  if (value.endDate && value.endDate < value.startDate) {
    context.addIssue({ code: "custom", path: ["endDate"], message: "End date must be after the start date." });
  }
});

export const achievementSchema = z.object({
  experienceId: z.string().uuid("Choose the experience this supports."),
  problem: z.string().trim().min(10, "Describe the problem or context.").max(1_500),
  action: z.string().trim().min(10, "Describe what you personally did.").max(2_000),
  result: z.string().trim().min(10, "Describe the result.").max(1_500),
  measurableOutcome: optionalText(500),
  tools: shortList,
  roleFamilies: shortList,
  sourceLabel: optionalText(240),
});

export const skillSchema = z.object({
  name: z.string().trim().min(1, "Add the skill name.").max(100),
  context: optionalText(750),
  recency: z.enum(["current", "recent", "past"], { error: "Choose when you last used this skill." }),
  proficiency: z.enum(["learning", "working", "advanced", "expert"], { error: "Choose a proficiency level." }),
  supportingAchievementId: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? null : value,
    z.string().uuid().nullable(),
  ),
  sourceLabel: optionalText(240),
});

export const evidenceControlSchema = z.object({
  entityType: z.enum([
    "career_experience",
    "career_achievement",
    "career_skill",
    "career_profile_item",
    "career_story",
    "career_answer",
    "career_voice",
  ]),
  entityId: z.string().uuid(),
  verificationState: z.enum(["needs_clarification", "verified", "archived", "prohibited"]).optional(),
  locked: z.preprocess(
    (value) => value === undefined ? undefined : value === "true" || value === "on",
    z.boolean().optional(),
  ),
}).refine((value) => value.verificationState !== undefined || value.locked !== undefined, {
  message: "Choose a state or lock change.",
});

export const profileItemSchema = z.object({
  kind: z.enum(["project", "education", "certification", "award", "publication", "link"]),
  title: z.string().trim().min(1, "Add a title.").max(200),
  organization: optionalText(200),
  description: z.string().trim().min(10, "Add enough detail to make this record useful.").max(2_000),
  startDate: optionalMonth,
  endDate: optionalMonth,
  url: optionalUrl,
  credentialId: optionalText(200),
  technologies: shortList,
  sourceLabel: optionalText(240),
}).superRefine((value, context) => {
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    context.addIssue({ code: "custom", path: ["endDate"], message: "End date must be after the start date." });
  }
  if (value.kind === "link" && !value.url) {
    context.addIssue({ code: "custom", path: ["url"], message: "Add the destination URL." });
  }
});

export const storySchema = z.object({
  title: z.string().trim().min(3, "Give this story a memorable title.").max(160),
  situation: z.string().trim().min(10, "Describe the situation.").max(2_000),
  task: z.string().trim().min(10, "Describe your responsibility or goal.").max(1_500),
  action: z.string().trim().min(10, "Describe what you personally did.").max(2_500),
  result: z.string().trim().min(10, "Describe the result.").max(2_000),
  reflection: z.string().trim().min(5, "Add what you learned or would change.").max(1_500),
  roleFamilies: shortList,
  prompts: shortList,
  supportingAchievementId: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? null : value,
    z.string().uuid().nullable(),
  ),
  sourceLabel: optionalText(240),
});

export const answerSchema = z.object({
  question: z.string().trim().min(3, "Add the screening question.").max(500),
  answer: z.string().trim().min(10, "Write a reusable answer.").max(4_000),
  contexts: shortList,
  supportingAchievementId: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? null : value,
    z.string().uuid().nullable(),
  ),
  sourceLabel: optionalText(240),
});

export const voiceProfileSchema = z.object({
  name: z.string().trim().min(2, "Name this voice profile.").max(100),
  tone: z.string().trim().min(10, "Describe how your writing should sound.").max(1_000),
  principles: z.preprocess(
    uniqueList,
    z.array(z.string().max(240)).min(1, "Add at least one writing principle.").max(20),
  ),
  avoid: shortList,
  sample: optionalText(4_000),
  sourceLabel: optionalText(240),
});

export type AchievementInput = z.infer<typeof achievementSchema>;
export type AnswerInput = z.infer<typeof answerSchema>;
export type EvidenceControlInput = z.infer<typeof evidenceControlSchema>;
export type ExperienceInput = z.infer<typeof experienceSchema>;
export type ProfileItemInput = z.infer<typeof profileItemSchema>;
export type SkillInput = z.infer<typeof skillSchema>;
export type StoryInput = z.infer<typeof storySchema>;
export type VoiceProfileInput = z.infer<typeof voiceProfileSchema>;
