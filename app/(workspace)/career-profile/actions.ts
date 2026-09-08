"use server";


import { requireOwner } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";

import {
  saveAchievement,
  saveAnswer,
  saveExperience,
  saveProfileItem,
  saveSkill,
  saveStory,
  saveVoiceProfile,
  updateEvidenceControl,
} from "@/lib/career-profile/repository";
import {
  achievementSchema,
  answerSchema,
  evidenceControlSchema,
  experienceSchema,
  profileItemSchema,
  skillSchema,
  storySchema,
  voiceProfileSchema,
} from "@/lib/career-profile/validation";

export type CareerProfileActionState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  success?: boolean;
};

function failure(error: unknown): CareerProfileActionState {
  return {
    message: error instanceof Error ? error.message : "Something went wrong. Try again.",
  };
}

function experienceData(formData: FormData) {
  return {
    company: formData.get("company"),
    title: formData.get("title"),
    location: formData.get("location"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    isCurrent: formData.get("isCurrent"),
    summary: formData.get("summary"),
    responsibilities: formData.get("responsibilities"),
    technologies: formData.get("technologies"),
    sourceLabel: formData.get("sourceLabel"),
  };
}

function achievementData(formData: FormData) {
  return {
    experienceId: formData.get("experienceId"),
    problem: formData.get("problem"),
    action: formData.get("action"),
    result: formData.get("result"),
    measurableOutcome: formData.get("measurableOutcome"),
    tools: formData.get("tools"),
    roleFamilies: formData.get("roleFamilies"),
    sourceLabel: formData.get("sourceLabel"),
  };
}

function skillData(formData: FormData) {
  return {
    name: formData.get("name"),
    context: formData.get("context"),
    recency: formData.get("recency"),
    proficiency: formData.get("proficiency"),
    supportingAchievementId: formData.get("supportingAchievementId"),
    sourceLabel: formData.get("sourceLabel"),
  };
}

function profileItemData(formData: FormData) {
  return {
    kind: formData.get("kind"),
    title: formData.get("title"),
    organization: formData.get("organization"),
    description: formData.get("description"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    url: formData.get("url"),
    credentialId: formData.get("credentialId"),
    technologies: formData.get("technologies"),
    sourceLabel: formData.get("sourceLabel"),
  };
}

function storyData(formData: FormData) {
  return {
    title: formData.get("title"),
    situation: formData.get("situation"),
    task: formData.get("task"),
    action: formData.get("action"),
    result: formData.get("result"),
    reflection: formData.get("reflection"),
    roleFamilies: formData.get("roleFamilies"),
    prompts: formData.get("prompts"),
    supportingAchievementId: formData.get("supportingAchievementId"),
    sourceLabel: formData.get("sourceLabel"),
  };
}

function answerData(formData: FormData) {
  return {
    question: formData.get("question"),
    answer: formData.get("answer"),
    contexts: formData.get("contexts"),
    supportingAchievementId: formData.get("supportingAchievementId"),
    sourceLabel: formData.get("sourceLabel"),
  };
}

function voiceProfileData(formData: FormData) {
  return {
    name: formData.get("name"),
    tone: formData.get("tone"),
    principles: formData.get("principles"),
    avoid: formData.get("avoid"),
    sample: formData.get("sample"),
    sourceLabel: formData.get("sourceLabel"),
  };
}

export async function createExperience(
  _previousState: CareerProfileActionState,
  formData: FormData,
): Promise<CareerProfileActionState> {
  await requireOwner();
  const parsed = experienceSchema.safeParse(experienceData(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: "Check the highlighted fields." };

  try {
    await saveExperience(parsed.data);
    revalidatePath("/career-profile");
    return { message: "Experience added to your evidence bank.", success: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateExperience(
  id: string,
  _previousState: CareerProfileActionState,
  formData: FormData,
): Promise<CareerProfileActionState> {
  await requireOwner();
  const parsed = experienceSchema.safeParse(experienceData(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: "Check the highlighted fields." };

  try {
    await saveExperience(parsed.data, id);
    revalidatePath("/career-profile");
    return { message: "Experience updated.", success: true };
  } catch (error) {
    return failure(error);
  }
}

export async function createAchievement(
  _previousState: CareerProfileActionState,
  formData: FormData,
): Promise<CareerProfileActionState> {
  await requireOwner();
  const parsed = achievementSchema.safeParse(achievementData(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: "Check the highlighted fields." };

  try {
    await saveAchievement(parsed.data);
    revalidatePath("/career-profile");
    return { message: "Achievement added to your evidence bank.", success: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateAchievement(
  id: string,
  _previousState: CareerProfileActionState,
  formData: FormData,
): Promise<CareerProfileActionState> {
  await requireOwner();
  const parsed = achievementSchema.safeParse(achievementData(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: "Check the highlighted fields." };

  try {
    await saveAchievement(parsed.data, id);
    revalidatePath("/career-profile");
    return { message: "Achievement updated.", success: true };
  } catch (error) {
    return failure(error);
  }
}

export async function createSkill(
  _previousState: CareerProfileActionState,
  formData: FormData,
): Promise<CareerProfileActionState> {
  await requireOwner();
  const parsed = skillSchema.safeParse(skillData(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: "Check the highlighted fields." };

  try {
    await saveSkill(parsed.data);
    revalidatePath("/career-profile");
    return { message: "Skill added to your evidence bank.", success: true };
  } catch (error) {
    return failure(error);
  }
}

export async function updateSkill(
  id: string,
  _previousState: CareerProfileActionState,
  formData: FormData,
): Promise<CareerProfileActionState> {
  await requireOwner();
  const parsed = skillSchema.safeParse(skillData(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: "Check the highlighted fields." };

  try {
    await saveSkill(parsed.data, id);
    revalidatePath("/career-profile");
    return { message: "Skill updated.", success: true };
  } catch (error) {
    return failure(error);
  }
}

export async function createProfileItem(
  _previousState: CareerProfileActionState,
  formData: FormData,
): Promise<CareerProfileActionState> {
  await requireOwner();
  const parsed = profileItemSchema.safeParse(profileItemData(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: "Check the highlighted fields." };
  try {
    await saveProfileItem(parsed.data);
    revalidatePath("/career-profile/library");
    return { message: "Profile record added.", success: true };
  } catch (error) { return failure(error); }
}

export async function updateProfileItem(
  id: string,
  _previousState: CareerProfileActionState,
  formData: FormData,
): Promise<CareerProfileActionState> {
  await requireOwner();
  const parsed = profileItemSchema.safeParse(profileItemData(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: "Check the highlighted fields." };
  try {
    await saveProfileItem(parsed.data, id);
    revalidatePath("/career-profile/library");
    return { message: "Profile record updated.", success: true };
  } catch (error) { return failure(error); }
}

export async function createStory(
  _previousState: CareerProfileActionState,
  formData: FormData,
): Promise<CareerProfileActionState> {
  await requireOwner();
  const parsed = storySchema.safeParse(storyData(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: "Check the highlighted fields." };
  try {
    await saveStory(parsed.data);
    revalidatePath("/career-profile/stories");
    return { message: "Interview story added.", success: true };
  } catch (error) { return failure(error); }
}

export async function updateStory(
  id: string,
  _previousState: CareerProfileActionState,
  formData: FormData,
): Promise<CareerProfileActionState> {
  await requireOwner();
  const parsed = storySchema.safeParse(storyData(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: "Check the highlighted fields." };
  try {
    await saveStory(parsed.data, id);
    revalidatePath("/career-profile/stories");
    return { message: "Interview story updated.", success: true };
  } catch (error) { return failure(error); }
}

export async function createAnswer(
  _previousState: CareerProfileActionState,
  formData: FormData,
): Promise<CareerProfileActionState> {
  await requireOwner();
  const parsed = answerSchema.safeParse(answerData(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: "Check the highlighted fields." };
  try {
    await saveAnswer(parsed.data);
    revalidatePath("/career-profile/stories");
    return { message: "Reusable answer added.", success: true };
  } catch (error) { return failure(error); }
}

export async function updateAnswer(
  id: string,
  _previousState: CareerProfileActionState,
  formData: FormData,
): Promise<CareerProfileActionState> {
  await requireOwner();
  const parsed = answerSchema.safeParse(answerData(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: "Check the highlighted fields." };
  try {
    await saveAnswer(parsed.data, id);
    revalidatePath("/career-profile/stories");
    return { message: "Reusable answer updated.", success: true };
  } catch (error) { return failure(error); }
}

export async function createVoiceProfile(
  _previousState: CareerProfileActionState,
  formData: FormData,
): Promise<CareerProfileActionState> {
  await requireOwner();
  const parsed = voiceProfileSchema.safeParse(voiceProfileData(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: "Check the highlighted fields." };
  try {
    await saveVoiceProfile(parsed.data);
    revalidatePath("/career-profile/stories");
    return { message: "Writing voice saved.", success: true };
  } catch (error) { return failure(error); }
}

export async function updateVoiceProfile(
  id: string,
  _previousState: CareerProfileActionState,
  formData: FormData,
): Promise<CareerProfileActionState> {
  await requireOwner();
  const parsed = voiceProfileSchema.safeParse(voiceProfileData(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: "Check the highlighted fields." };
  try {
    await saveVoiceProfile(parsed.data, id);
    revalidatePath("/career-profile/stories");
    return { message: "Writing voice updated.", success: true };
  } catch (error) { return failure(error); }
}

export async function changeEvidenceControl(formData: FormData) {
  await requireOwner();
  const parsed = evidenceControlSchema.safeParse({
    entityType: formData.get("entityType"),
    entityId: formData.get("entityId"),
    verificationState: formData.get("verificationState") ?? undefined,
    locked: formData.has("locked") ? formData.get("locked") : undefined,
  });
  if (!parsed.success) return;

  await updateEvidenceControl(parsed.data);
  revalidatePath("/career-profile", "layout");
}
