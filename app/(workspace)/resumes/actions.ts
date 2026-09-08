"use server";


import { requireOwner } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createBaseResume,
  createTailoredResume,
  regenerateResumeEdit,
  reviewResumeEdit,
  reviewSection,
  reviewSummary,
  setEditLock,
  setResumeTemplate,
  setResumeSectionOrder,
  setSectionLock,
  setSummaryLock,
  submitResume,
  regenerateResumeSummary,
  updateResumeSummary,
  updateResumeProposal,
  updateResumeIdentity,
} from "@/lib/resumes/repository";
import { baseResumeSchema, candidateIdentitySchema, createDraftSchema, editProposalSchema, reviewEditSchema } from "@/lib/resumes/validation";
import { resumeTemplates } from "@/lib/resumes/types";

export type ResumeActionState = { success?: boolean; message?: string; errors?: Record<string, string[] | undefined> };

function values(formData: FormData, name: string) {
  return formData.getAll(name).map(String).filter(Boolean);
}

export async function createBaseResumeAction(_state: ResumeActionState, formData: FormData): Promise<ResumeActionState> {
  await requireOwner();
  const parsed = baseResumeSchema.safeParse({
    name: formData.get("name"),
    roleFamily: formData.get("roleFamily"),
    positioning: formData.get("positioning"),
    summary: formData.get("summary"),
    template: formData.get("template"),
    candidateName: formData.get("candidateName"),
    candidateEmail: formData.get("candidateEmail"),
    candidatePhone: formData.get("candidatePhone"),
    candidateLocation: formData.get("candidateLocation"),
    candidateWebsite: formData.get("candidateWebsite"),
    experienceIds: values(formData, "experienceIds"),
    achievementIds: values(formData, "achievementIds"),
    skillIds: values(formData, "skillIds"),
    profileItemIds: values(formData, "profileItemIds"),
  });
  if (!parsed.success) return { message: "Check the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  try {
    await createBaseResume(parsed.data);
    revalidatePath("/resumes");
    return { success: true, message: "Base resume saved." };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Could not save this resume." };
  }
}

export async function updateResumeIdentityAction(resumeId: string, _state: ResumeActionState, formData: FormData): Promise<ResumeActionState> {
  await requireOwner();
  const parsed = candidateIdentitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Check the candidate header.", errors: parsed.error.flatten().fieldErrors };
  try { await updateResumeIdentity(resumeId, parsed.data); }
  catch (error) { return { message: error instanceof Error ? error.message : "Could not save the candidate header." }; }
  revalidatePath(`/resumes/${resumeId}`);
  return { success: true, message: "Candidate header saved. Preview and PDF now use these details." };
}

export async function createTailoredResumeAction(formData: FormData) {
  await requireOwner();
  const parsed = createDraftSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/resumes?error=Choose+a+base+resume+and+job");
  const id = await createTailoredResume(parsed.data.baseResumeId, parsed.data.jobId);
  redirect(`/resumes/${id}`);
}

export async function reviewEditAction(resumeId: string, formData: FormData) {
  await requireOwner();
  const parsed = reviewEditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await reviewResumeEdit(resumeId, parsed.data.editId, parsed.data.decision);
  revalidatePath(`/resumes/${resumeId}`);
}

export async function reviewSummaryAction(resumeId: string, formData: FormData) {
  await requireOwner();
  const decision = formData.get("decision");
  if (decision !== "accepted" && decision !== "rejected") return;
  await reviewSummary(resumeId, decision);
  revalidatePath(`/resumes/${resumeId}`);
}

export async function updateProposalAction(resumeId: string, formData: FormData) {
  await requireOwner();
  const parsed = editProposalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await updateResumeProposal(resumeId, parsed.data.editId, parsed.data.proposedText);
  revalidatePath(`/resumes/${resumeId}`);
}

export async function regenerateEditAction(resumeId: string, _state: ResumeActionState, formData: FormData): Promise<ResumeActionState> {
  await requireOwner();
  const editId = String(formData.get("editId") ?? "");
  try { await regenerateResumeEdit(resumeId, editId); } catch (error) { return {message: error instanceof Error ? error.message : "Regeneration failed. Retry this bullet; other sections are unchanged."}; }
  revalidatePath(`/resumes/${resumeId}`);
  return {success:true,message:"Regenerated. Review the new proposal."};
}

export async function setEditLockAction(resumeId: string, formData: FormData) {
  await requireOwner();
  await setEditLock(resumeId, String(formData.get("editId") ?? ""), formData.get("locked") === "true");
  revalidatePath(`/resumes/${resumeId}`);
}

export async function setSummaryLockAction(resumeId: string, formData: FormData) {
  await requireOwner();
  await setSummaryLock(resumeId, formData.get("locked") === "true");
  revalidatePath(`/resumes/${resumeId}`);
}

export async function updateSummaryAction(resumeId: string, formData: FormData) {
  await requireOwner();
  const proposedText = String(formData.get("proposedText") ?? "").trim();
  if (proposedText.length < 10 || proposedText.length > 900) return;
  await updateResumeSummary(resumeId, proposedText);
  revalidatePath(`/resumes/${resumeId}`);
}

export async function regenerateSummaryAction(resumeId: string): Promise<ResumeActionState> {
  await requireOwner();
  try { await regenerateResumeSummary(resumeId); } catch (error) { return {message: error instanceof Error ? error.message : "Regeneration failed. Retry the summary; other sections are unchanged."}; }
  revalidatePath(`/resumes/${resumeId}`);
  return {success:true,message:"Regenerated. Review the new proposal."};
}

export async function reviewSectionAction(resumeId: string, formData: FormData) {
  await requireOwner();
  const decision = formData.get("decision");
  if (decision !== "accepted" && decision !== "rejected") return;
  await reviewSection(resumeId, String(formData.get("section") ?? ""), decision);
  revalidatePath(`/resumes/${resumeId}`);
}

export async function setSectionLockAction(resumeId: string, formData: FormData) {
  await requireOwner();
  await setSectionLock(resumeId, String(formData.get("section") ?? ""), formData.get("locked") === "true");
  revalidatePath(`/resumes/${resumeId}`);
}

export async function setTemplateAction(resumeId: string, formData: FormData) {
  await requireOwner();
  const template = formData.get("template");
  if (!resumeTemplates.includes(template as (typeof resumeTemplates)[number])) return;
  await setResumeTemplate(resumeId, template as (typeof resumeTemplates)[number]);
  revalidatePath(`/resumes/${resumeId}`);
}

export async function setSectionOrderAction(resumeId: string, formData: FormData) {
  await requireOwner();
  const preset = formData.get("preset");
  const order = preset === "skills-first"
    ? ["summary", "skills", "experience", "projects", "education"]
    : ["summary", "experience", "projects", "skills", "education"];
  await setResumeSectionOrder(resumeId, order);
  revalidatePath(`/resumes/${resumeId}`);
}

export async function submitResumeAction(resumeId: string) {
  await requireOwner();
  await submitResume(resumeId);
  revalidatePath("/resumes");
  revalidatePath(`/resumes/${resumeId}`);
}
