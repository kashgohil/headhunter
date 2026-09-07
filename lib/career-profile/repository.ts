import "server-only";

import { and, asc, desc, eq, ne } from "drizzle-orm";
import { connection } from "next/server";

import { db } from "@/lib/db";
import {
  auditEvents,
  careerAchievements,
  careerAnswers,
  careerExperiences,
  careerProfileItems,
  careerSkills,
  careerStories,
  careerVoiceProfiles,
} from "@/lib/db/schema";
import type {
  AchievementInput,
  AnswerInput,
  EvidenceControlInput,
  ExperienceInput,
  ProfileItemInput,
  SkillInput,
  StoryInput,
  VoiceProfileInput,
} from "@/lib/career-profile/validation";
import { calculateCareerProfileReadiness } from "@/lib/career-profile/readiness";

export type CareerAchievement = typeof careerAchievements.$inferSelect;
export type CareerExperience = typeof careerExperiences.$inferSelect;
export type CareerProfileItem = typeof careerProfileItems.$inferSelect;
export type CareerSkill = typeof careerSkills.$inferSelect;
export type CareerStory = typeof careerStories.$inferSelect;
export type CareerAnswer = typeof careerAnswers.$inferSelect;
export type CareerVoiceProfile = typeof careerVoiceProfiles.$inferSelect;
export type CareerProfile = {
  experiences: CareerExperience[];
  achievements: CareerAchievement[];
  skills: CareerSkill[];
  profileItems: CareerProfileItem[];
  stories: CareerStory[];
  answers: CareerAnswer[];
  voiceProfiles: CareerVoiceProfile[];
  readiness: {
    hasExperience: boolean;
    hasAchievement: boolean;
    hasSkills: boolean;
    ready: boolean;
  };
};

const tables = {
  career_experience: careerExperiences,
  career_achievement: careerAchievements,
  career_skill: careerSkills,
  career_profile_item: careerProfileItems,
  career_story: careerStories,
  career_answer: careerAnswers,
  career_voice: careerVoiceProfiles,
};

const auditActions = {
  career_experience: { created: "career_experience.created", updated: "career_experience.updated" },
  career_achievement: { created: "career_achievement.created", updated: "career_achievement.updated" },
  career_skill: { created: "career_skill.created", updated: "career_skill.updated" },
  career_profile_item: { created: "career_profile_item.created", updated: "career_profile_item.updated" },
  career_story: { created: "career_story.created", updated: "career_story.updated" },
  career_answer: { created: "career_answer.created", updated: "career_answer.updated" },
  career_voice: { created: "career_voice.created", updated: "career_voice.updated" },
} as const;

export async function getCareerProfile(): Promise<CareerProfile> {
  await connection();

  const [experiences, achievements, skills, profileItems, stories, answers, voiceProfiles] = await Promise.all([
    db.select().from(careerExperiences).orderBy(desc(careerExperiences.startDate)),
    db.select().from(careerAchievements).orderBy(desc(careerAchievements.createdAt)),
    db.select().from(careerSkills).orderBy(asc(careerSkills.name)),
    db.select().from(careerProfileItems).orderBy(asc(careerProfileItems.kind), desc(careerProfileItems.createdAt)),
    db.select().from(careerStories).orderBy(desc(careerStories.createdAt)),
    db.select().from(careerAnswers).orderBy(desc(careerAnswers.createdAt)),
    db.select().from(careerVoiceProfiles).orderBy(desc(careerVoiceProfiles.updatedAt)),
  ]);

  return {
    experiences,
    achievements,
    skills,
    profileItems,
    stories,
    answers,
    voiceProfiles,
    readiness: calculateCareerProfileReadiness(experiences, achievements, skills),
  };
}

function writeAudit(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  action: typeof auditActions[keyof typeof auditActions]["created" | "updated"] | "career_evidence.state_changed",
  entityType: EvidenceControlInput["entityType"],
  entityId: string,
  occurredAt: Date,
) {
  tx.insert(auditEvents).values({
    id: crypto.randomUUID(),
    action,
    entityType,
    entityId,
    occurredAt,
  }).run();
}

export async function saveExperience(input: ExperienceInput, id?: string) {
  const now = new Date();
  const entityId = id ?? crypto.randomUUID();
  const values = { ...input, endDate: input.isCurrent ? null : input.endDate, updatedAt: now };

  return db.transaction((tx) => {
    if (id) {
      const current = tx.select().from(careerExperiences).where(eq(careerExperiences.id, id)).get();
      if (!current) throw new Error("Experience not found.");
      if (current.locked) throw new Error("Unlock this experience before editing it.");
      tx.update(careerExperiences).set(values).where(eq(careerExperiences.id, id)).run();
      writeAudit(tx, auditActions.career_experience.updated, "career_experience", id, now);
    } else {
      tx.insert(careerExperiences).values({
        id: entityId,
        ...values,
        sourceType: "user_entered",
        verificationState: "needs_clarification",
        locked: false,
        createdAt: now,
      }).run();
      writeAudit(tx, auditActions.career_experience.created, "career_experience", entityId, now);
    }
    return entityId;
  });
}

export async function saveAchievement(input: AchievementInput, id?: string) {
  const now = new Date();
  const entityId = id ?? crypto.randomUUID();

  return db.transaction((tx) => {
    const experience = tx.select({ id: careerExperiences.id }).from(careerExperiences).where(eq(careerExperiences.id, input.experienceId)).get();
    if (!experience) throw new Error("Choose an existing experience.");

    if (id) {
      const current = tx.select().from(careerAchievements).where(eq(careerAchievements.id, id)).get();
      if (!current) throw new Error("Achievement not found.");
      if (current.locked) throw new Error("Unlock this achievement before editing it.");
      tx.update(careerAchievements).set({ ...input, updatedAt: now }).where(eq(careerAchievements.id, id)).run();
      writeAudit(tx, auditActions.career_achievement.updated, "career_achievement", id, now);
    } else {
      tx.insert(careerAchievements).values({
        id: entityId,
        ...input,
        sourceType: "user_entered",
        verificationState: "needs_clarification",
        locked: false,
        createdAt: now,
        updatedAt: now,
      }).run();
      writeAudit(tx, auditActions.career_achievement.created, "career_achievement", entityId, now);
    }
    return entityId;
  });
}

export async function saveSkill(input: SkillInput, id?: string) {
  const now = new Date();
  const entityId = id ?? crypto.randomUUID();
  const normalizedName = input.name.toLowerCase();

  return db.transaction((tx) => {
    if (input.supportingAchievementId) {
      const achievement = tx.select({ id: careerAchievements.id }).from(careerAchievements).where(eq(careerAchievements.id, input.supportingAchievementId)).get();
      if (!achievement) throw new Error("Choose an existing supporting achievement.");
    }

    const duplicate = tx.select({ id: careerSkills.id }).from(careerSkills).where(
      id
        ? and(eq(careerSkills.normalizedName, normalizedName), ne(careerSkills.id, id))
        : eq(careerSkills.normalizedName, normalizedName),
    ).get();
    if (duplicate) throw new Error("That skill is already in your profile.");

    if (id) {
      const current = tx.select().from(careerSkills).where(eq(careerSkills.id, id)).get();
      if (!current) throw new Error("Skill not found.");
      if (current.locked) throw new Error("Unlock this skill before editing it.");
      tx.update(careerSkills).set({ ...input, normalizedName, updatedAt: now }).where(eq(careerSkills.id, id)).run();
      writeAudit(tx, auditActions.career_skill.updated, "career_skill", id, now);
    } else {
      tx.insert(careerSkills).values({
        id: entityId,
        ...input,
        normalizedName,
        sourceType: "user_entered",
        verificationState: "needs_clarification",
        locked: false,
        createdAt: now,
        updatedAt: now,
      }).run();
      writeAudit(tx, auditActions.career_skill.created, "career_skill", entityId, now);
    }
    return entityId;
  });
}

function requireAchievement(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  achievementId: string | null,
) {
  if (!achievementId) return;
  const achievement = tx.select({ id: careerAchievements.id }).from(careerAchievements).where(eq(careerAchievements.id, achievementId)).get();
  if (!achievement) throw new Error("Choose an existing supporting achievement.");
}

export async function saveProfileItem(input: ProfileItemInput, id?: string) {
  const now = new Date();
  const entityId = id ?? crypto.randomUUID();

  return db.transaction((tx) => {
    if (id) {
      const current = tx.select().from(careerProfileItems).where(eq(careerProfileItems.id, id)).get();
      if (!current) throw new Error("Profile record not found.");
      if (current.locked) throw new Error("Unlock this record before editing it.");
      tx.update(careerProfileItems).set({ ...input, updatedAt: now }).where(eq(careerProfileItems.id, id)).run();
      writeAudit(tx, auditActions.career_profile_item.updated, "career_profile_item", id, now);
    } else {
      tx.insert(careerProfileItems).values({
        id: entityId,
        ...input,
        sourceType: "user_entered",
        verificationState: "needs_clarification",
        locked: false,
        createdAt: now,
        updatedAt: now,
      }).run();
      writeAudit(tx, auditActions.career_profile_item.created, "career_profile_item", entityId, now);
    }
    return entityId;
  });
}

export async function saveStory(input: StoryInput, id?: string) {
  const now = new Date();
  const entityId = id ?? crypto.randomUUID();

  return db.transaction((tx) => {
    requireAchievement(tx, input.supportingAchievementId);
    if (id) {
      const current = tx.select().from(careerStories).where(eq(careerStories.id, id)).get();
      if (!current) throw new Error("Interview story not found.");
      if (current.locked) throw new Error("Unlock this story before editing it.");
      tx.update(careerStories).set({ ...input, updatedAt: now }).where(eq(careerStories.id, id)).run();
      writeAudit(tx, auditActions.career_story.updated, "career_story", id, now);
    } else {
      tx.insert(careerStories).values({
        id: entityId,
        ...input,
        sourceType: "user_entered",
        verificationState: "needs_clarification",
        locked: false,
        createdAt: now,
        updatedAt: now,
      }).run();
      writeAudit(tx, auditActions.career_story.created, "career_story", entityId, now);
    }
    return entityId;
  });
}

export async function saveAnswer(input: AnswerInput, id?: string) {
  const now = new Date();
  const entityId = id ?? crypto.randomUUID();

  return db.transaction((tx) => {
    requireAchievement(tx, input.supportingAchievementId);
    if (id) {
      const current = tx.select().from(careerAnswers).where(eq(careerAnswers.id, id)).get();
      if (!current) throw new Error("Reusable answer not found.");
      if (current.locked) throw new Error("Unlock this answer before editing it.");
      tx.update(careerAnswers).set({ ...input, updatedAt: now }).where(eq(careerAnswers.id, id)).run();
      writeAudit(tx, auditActions.career_answer.updated, "career_answer", id, now);
    } else {
      tx.insert(careerAnswers).values({
        id: entityId,
        ...input,
        sourceType: "user_entered",
        verificationState: "needs_clarification",
        locked: false,
        createdAt: now,
        updatedAt: now,
      }).run();
      writeAudit(tx, auditActions.career_answer.created, "career_answer", entityId, now);
    }
    return entityId;
  });
}

export async function saveVoiceProfile(input: VoiceProfileInput, id?: string) {
  const now = new Date();
  const entityId = id ?? crypto.randomUUID();

  return db.transaction((tx) => {
    if (id) {
      const current = tx.select().from(careerVoiceProfiles).where(eq(careerVoiceProfiles.id, id)).get();
      if (!current) throw new Error("Writing voice profile not found.");
      if (current.locked) throw new Error("Unlock this voice profile before editing it.");
      tx.update(careerVoiceProfiles).set({ ...input, updatedAt: now }).where(eq(careerVoiceProfiles.id, id)).run();
      writeAudit(tx, auditActions.career_voice.updated, "career_voice", id, now);
    } else {
      tx.insert(careerVoiceProfiles).values({
        id: entityId,
        ...input,
        sourceType: "user_entered",
        verificationState: "needs_clarification",
        locked: false,
        createdAt: now,
        updatedAt: now,
      }).run();
      writeAudit(tx, auditActions.career_voice.created, "career_voice", entityId, now);
    }
    return entityId;
  });
}

export async function updateEvidenceControl(input: EvidenceControlInput) {
  const table = tables[input.entityType];
  const now = new Date();

  return db.transaction((tx) => {
    const current = tx.select().from(table).where(eq(table.id, input.entityId)).get();
    if (!current) throw new Error("Evidence item not found.");
    if (current.locked && input.locked !== false) throw new Error("Unlock this item before changing its state.");

    const changes: { locked?: boolean; verificationState?: NonNullable<EvidenceControlInput["verificationState"]>; updatedAt: Date } = { updatedAt: now };
    if (input.locked !== undefined) changes.locked = input.locked;
    if (input.verificationState !== undefined) changes.verificationState = input.verificationState;

    tx.update(table).set(changes).where(eq(table.id, input.entityId)).run();
    writeAudit(tx, "career_evidence.state_changed", input.entityType, input.entityId, now);
  });
}
