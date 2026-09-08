import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { connection } from "next/server";

import { getCareerProfile } from "@/lib/career-profile/repository";
import { db } from "@/lib/db";
import {
  auditEvents,
  baseResumes,
  careerAchievements,
  careerExperiences,
  careerProfileItems,
  careerSkills,
  jobs,
  resumeBulletEdits,
  resumeSectionLocks,
  tailoredResumes,
  type ResumeSnapshot,
} from "@/lib/db/schema";
import { createBulletSuggestions, createSummary, regenerateBullet } from "@/lib/resumes/tailoring";
import type { BaseResumeInput } from "@/lib/resumes/validation";
import type { ResumeDecision, ResumeTemplate } from "@/lib/resumes/types";

export type BaseResume = typeof baseResumes.$inferSelect;
export type TailoredResume = typeof tailoredResumes.$inferSelect;
export type ResumeBulletEdit = typeof resumeBulletEdits.$inferSelect;

export async function listResumeStudio() {
  await connection();
  const [profiles, drafts] = await Promise.all([
    db.select().from(baseResumes).orderBy(desc(baseResumes.updatedAt)),
    db.select({
      id: tailoredResumes.id,
      status: tailoredResumes.status,
      version: tailoredResumes.version,
      template: tailoredResumes.template,
      updatedAt: tailoredResumes.updatedAt,
      submittedAt: tailoredResumes.submittedAt,
      jobTitle: jobs.title,
      company: jobs.company,
      baseName: baseResumes.name,
    }).from(tailoredResumes)
      .innerJoin(jobs, eq(tailoredResumes.jobId, jobs.id))
      .innerJoin(baseResumes, eq(tailoredResumes.baseResumeId, baseResumes.id))
      .orderBy(desc(tailoredResumes.updatedAt)),
  ]);
  return { profiles, drafts };
}

export async function createBaseResume(input: BaseResumeInput) {
  const id = crypto.randomUUID();
  const now = new Date();

  db.transaction((tx) => {
    const existingExperiences = tx.select({ id: careerExperiences.id }).from(careerExperiences).where(inArray(careerExperiences.id, input.experienceIds)).all();
    if (existingExperiences.length !== input.experienceIds.length) throw new Error("One of the selected experiences no longer exists.");
    const existingAchievements = input.achievementIds.length ? tx.select({ id: careerAchievements.id, experienceId: careerAchievements.experienceId }).from(careerAchievements).where(inArray(careerAchievements.id, input.achievementIds)).all() : [];
    if (existingAchievements.length !== input.achievementIds.length) throw new Error("One of the selected achievements no longer exists.");
    if (existingAchievements.some((item) => !input.experienceIds.includes(item.experienceId))) throw new Error("Each selected achievement must belong to a selected experience.");
    const existingSkills = input.skillIds.length ? tx.select({ id: careerSkills.id }).from(careerSkills).where(inArray(careerSkills.id, input.skillIds)).all() : [];
    if (existingSkills.length !== input.skillIds.length) throw new Error("One of the selected skills no longer exists.");
    const existingProfileItems = input.profileItemIds.length ? tx.select({ id: careerProfileItems.id }).from(careerProfileItems).where(inArray(careerProfileItems.id, input.profileItemIds)).all() : [];
    if (existingProfileItems.length !== input.profileItemIds.length) throw new Error("One of the selected profile records no longer exists.");

    tx.insert(baseResumes).values({ id, ...input, sectionOrder: ["summary", "experience", "projects", "skills", "education"], createdAt: now, updatedAt: now }).run();
    tx.insert(auditEvents).values({ id: crypto.randomUUID(), action: "base_resume.created", entityType: "base_resume", entityId: id, occurredAt: now }).run();
  });
  return id;
}

export async function createTailoredResume(baseResumeId: string, jobId: string) {
  const [base] = await db.select().from(baseResumes).where(eq(baseResumes.id, baseResumeId)).limit(1);
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!base || !job) throw new Error("Choose an existing base resume and job.");

  const [experiences, achievements, skills] = await Promise.all([
    base.experienceIds.length ? db.select().from(careerExperiences).where(inArray(careerExperiences.id, base.experienceIds)) : [],
    base.achievementIds.length ? db.select().from(careerAchievements).where(inArray(careerAchievements.id, base.achievementIds)) : [],
    base.skillIds.length ? db.select().from(careerSkills).where(inArray(careerSkills.id, base.skillIds)) : [],
  ]);
  const jobInput = {
    title: job.title,
    requiredQualifications: job.requiredQualifications,
    preferredQualifications: job.preferredQualifications,
    responsibilities: job.responsibilities,
    skills: job.skills,
    technologies: job.technologies,
  };
  const suggestions = createBulletSuggestions(achievements, jobInput);
  const summary = createSummary(base.roleFamily, base.positioning, experiences, skills, jobInput);
  const versionRow = await db.select({ value: sql<number>`coalesce(max(${tailoredResumes.version}), 0)` }).from(tailoredResumes).where(eq(tailoredResumes.jobId, jobId));
  const version = Number(versionRow[0]?.value ?? 0) + 1;
  const id = crypto.randomUUID();
  const now = new Date();

  db.transaction((tx) => {
    tx.insert(tailoredResumes).values({
      id,
      jobId,
      baseResumeId,
      version,
      template: base.template,
      summaryOriginal: base.summary,
      summaryProposed: summary.text,
      summaryReason: "Position the verified profile around this role without introducing new claims.",
      summaryRequirement: job.requiredQualifications[0] || job.responsibilities[0] || job.title,
      summaryEvidenceIds: summary.evidenceIds,
      summaryConfidence: summary.confidence,
      summaryRisk: summary.risk,
      sectionOrder: base.sectionOrder,
      createdAt: now,
      updatedAt: now,
    }).run();
    if (suggestions.length) {
      tx.insert(resumeBulletEdits).values(suggestions.map((suggestion, position) => ({
        id: crypto.randomUUID(),
        tailoredResumeId: id,
        ...suggestion,
        position,
        updatedAt: now,
      }))).run();
    }
    tx.insert(resumeSectionLocks).values(["experience", "projects", "skills", "education"].map((section) => ({ id: crypto.randomUUID(), tailoredResumeId: id, section }))).run();
    tx.insert(auditEvents).values({ id: crypto.randomUUID(), action: "tailored_resume.created", entityType: "tailored_resume", entityId: id, occurredAt: now }).run();
  });
  return id;
}

async function assertDraft(id: string) {
  const [resume] = await db.select().from(tailoredResumes).where(eq(tailoredResumes.id, id)).limit(1);
  if (!resume) throw new Error("Resume draft not found.");
  if (resume.status === "submitted") throw new Error("Submitted resumes are immutable. Create a new version to make changes.");
  return resume;
}

export async function getTailoredResume(id: string) {
  await connection();
  const [resume] = await db.select().from(tailoredResumes).where(eq(tailoredResumes.id, id)).limit(1);
  if (!resume) return null;
  const [base, job, edits, locks, profile] = await Promise.all([
    db.select().from(baseResumes).where(eq(baseResumes.id, resume.baseResumeId)).get(),
    db.select().from(jobs).where(eq(jobs.id, resume.jobId)).get(),
    db.select().from(resumeBulletEdits).where(eq(resumeBulletEdits.tailoredResumeId, id)).orderBy(asc(resumeBulletEdits.position)),
    db.select().from(resumeSectionLocks).where(eq(resumeSectionLocks.tailoredResumeId, id)),
    getCareerProfile(),
  ]);
  if (!base || !job) return null;
  const evidence = new Map<string, { label: string; state: string }>();
  for (const item of profile.experiences) evidence.set(item.id, { label: `${item.title} · ${item.company}`, state: item.verificationState });
  for (const item of profile.achievements) evidence.set(item.id, { label: item.measurableOutcome || item.result, state: item.verificationState });
  for (const item of profile.skills) evidence.set(item.id, { label: item.name, state: item.verificationState });
  for (const item of profile.profileItems) evidence.set(item.id, { label: item.title, state: item.verificationState });
  return { resume, base, job, edits, locks, profile, evidence };
}

export async function reviewResumeEdit(resumeId: string, editId: string, decision: Exclude<ResumeDecision, "pending">) {
  await assertDraft(resumeId);
  const edit = await db.select().from(resumeBulletEdits).where(and(eq(resumeBulletEdits.id, editId), eq(resumeBulletEdits.tailoredResumeId, resumeId))).get();
  if (!edit) throw new Error("Resume edit not found.");
  if (edit.locked) throw new Error("Unlock this bullet before changing its review decision.");
  const now = new Date();
  db.transaction((tx) => {
    tx.update(resumeBulletEdits).set({ decision, updatedAt: now }).where(eq(resumeBulletEdits.id, editId)).run();
    tx.update(tailoredResumes).set({ updatedAt: now }).where(eq(tailoredResumes.id, resumeId)).run();
    tx.insert(auditEvents).values({ id: crypto.randomUUID(), action: "resume_edit.reviewed", entityType: "resume_edit", entityId: editId, occurredAt: now }).run();
  });
}

export async function reviewSummary(resumeId: string, decision: Exclude<ResumeDecision, "pending">) {
  const resume = await assertDraft(resumeId);
  if (resume.summaryLocked) throw new Error("Unlock the summary before changing its review decision.");
  db.transaction(tx => {
    tx.update(tailoredResumes).set({ summaryDecision: decision, updatedAt: new Date() }).where(eq(tailoredResumes.id, resumeId)).run();
    tx.insert(auditEvents).values({id:crypto.randomUUID(),action:"resume_summary.reviewed",entityType:"tailored_resume",entityId:resumeId,occurredAt:new Date()}).run();
  });
}

export async function updateResumeSummary(resumeId: string, proposedText: string) {
  const resume = await assertDraft(resumeId);
  if (resume.summaryLocked) throw new Error("Unlock the summary before editing it.");
  await db.update(tailoredResumes).set({ summaryProposed: proposedText, summaryDecision: "accepted", updatedAt: new Date() }).where(eq(tailoredResumes.id, resumeId));
}

export async function regenerateResumeSummary(resumeId: string) {
  const detail = await getTailoredResume(resumeId);
  if (!detail) throw new Error("Resume draft not found.");
  if (detail.resume.status === "submitted") throw new Error("Submitted resumes are immutable. Create a new version to make changes.");
  if (detail.resume.summaryLocked) throw new Error("Unlock the summary before regenerating it.");
  const generated = createSummary(detail.base.roleFamily, detail.base.positioning, detail.profile.experiences.filter((item) => detail.base.experienceIds.includes(item.id)), detail.profile.skills.filter((item) => detail.base.skillIds.includes(item.id)), {
    title: detail.job.title,
    requiredQualifications: detail.job.requiredQualifications,
    preferredQualifications: detail.job.preferredQualifications,
    responsibilities: detail.job.responsibilities,
    skills: detail.job.skills,
    technologies: detail.job.technologies,
  });
  db.transaction(tx => {
    tx.update(tailoredResumes).set({ summaryProposed: generated.text, summaryEvidenceIds: generated.evidenceIds, summaryConfidence: generated.confidence, summaryRisk: generated.risk, summaryDecision: "pending", updatedAt: new Date() }).where(eq(tailoredResumes.id, resumeId)).run();
    tx.insert(auditEvents).values({id:crypto.randomUUID(),action:"resume_summary.regenerated",entityType:"tailored_resume",entityId:resumeId,occurredAt:new Date()}).run();
  });
}

export async function updateResumeProposal(resumeId: string, editId: string, proposedText: string) {
  await assertDraft(resumeId);
  const edit = await db.select().from(resumeBulletEdits).where(and(eq(resumeBulletEdits.id, editId), eq(resumeBulletEdits.tailoredResumeId, resumeId))).get();
  if (!edit) throw new Error("Resume edit not found.");
  if (edit.locked) throw new Error("Unlock this bullet before editing it.");
  const now = new Date();
  await db.update(resumeBulletEdits).set({ proposedText, decision: "accepted", updatedAt: now }).where(eq(resumeBulletEdits.id, editId));
  await db.update(tailoredResumes).set({ updatedAt: now }).where(eq(tailoredResumes.id, resumeId));
}

export async function regenerateResumeEdit(resumeId: string, editId: string) {
  await assertDraft(resumeId);
  const edit = await db.select().from(resumeBulletEdits).where(and(eq(resumeBulletEdits.id, editId), eq(resumeBulletEdits.tailoredResumeId, resumeId))).get();
  if (!edit) throw new Error("Resume edit not found.");
  if (edit.locked) throw new Error("Unlock this bullet before regenerating it.");
  const achievement = await db.select().from(careerAchievements).where(eq(careerAchievements.id, edit.achievementId)).get();
  if (!achievement) throw new Error("The supporting achievement no longer exists.");
  const regeneration = edit.regeneration + 1;
  db.transaction(tx => {
    tx.update(resumeBulletEdits).set({ proposedText: regenerateBullet(achievement, regeneration), decision: "pending", regeneration, updatedAt: new Date() }).where(eq(resumeBulletEdits.id, editId)).run();
    tx.insert(auditEvents).values({id:crypto.randomUUID(),action:"resume_edit.regenerated",entityType:"resume_edit",entityId:editId,occurredAt:new Date()}).run();
  });
}

export async function setEditLock(resumeId: string, editId: string, locked: boolean) {
  await assertDraft(resumeId);
  const result = await db.update(resumeBulletEdits).set({ locked, updatedAt: new Date() }).where(and(eq(resumeBulletEdits.id, editId), eq(resumeBulletEdits.tailoredResumeId, resumeId)));
  if (result.changes === 0) throw new Error("Resume edit not found.");
}

export async function setSummaryLock(resumeId: string, locked: boolean) {
  await assertDraft(resumeId);
  await db.update(tailoredResumes).set({ summaryLocked: locked, updatedAt: new Date() }).where(eq(tailoredResumes.id, resumeId));
}

export async function reviewSection(resumeId: string, section: string, decision: Exclude<ResumeDecision, "pending">) {
  await assertDraft(resumeId);
  const lock = await db.select().from(resumeSectionLocks).where(and(eq(resumeSectionLocks.tailoredResumeId, resumeId), eq(resumeSectionLocks.section, section))).get();
  if (lock?.locked) throw new Error("Unlock this section before reviewing it.");
  if (section === "experience") db.transaction(tx => {
    const edits = tx.select({id:resumeBulletEdits.id}).from(resumeBulletEdits).where(and(eq(resumeBulletEdits.tailoredResumeId,resumeId),eq(resumeBulletEdits.locked,false))).all();
    for (const edit of edits) {
      tx.update(resumeBulletEdits).set({decision,updatedAt:new Date()}).where(eq(resumeBulletEdits.id,edit.id)).run();
      tx.insert(auditEvents).values({id:crypto.randomUUID(),action:"resume_edit.reviewed",entityType:"resume_edit",entityId:edit.id,occurredAt:new Date()}).run();
    }
  });
}

export async function setSectionLock(resumeId: string, section: string, locked: boolean) {
  await assertDraft(resumeId);
  await db.update(resumeSectionLocks).set({ locked }).where(and(eq(resumeSectionLocks.tailoredResumeId, resumeId), eq(resumeSectionLocks.section, section)));
}

export async function setResumeTemplate(resumeId: string, template: ResumeTemplate) {
  await assertDraft(resumeId);
  await db.update(tailoredResumes).set({ template, updatedAt: new Date() }).where(eq(tailoredResumes.id, resumeId));
}

export async function setResumeSectionOrder(resumeId: string, order: string[]) {
  await assertDraft(resumeId);
  const allowed = ["summary", "experience", "projects", "skills", "education"];
  if (order.length !== allowed.length || new Set(order).size !== allowed.length || order.some((item) => !allowed.includes(item))) throw new Error("Invalid resume section order.");
  await db.update(tailoredResumes).set({ sectionOrder: order, updatedAt: new Date() }).where(eq(tailoredResumes.id, resumeId));
}

export function buildSnapshot(detail: NonNullable<Awaited<ReturnType<typeof getTailoredResume>>>): ResumeSnapshot {
  if (detail.resume.snapshot) return detail.resume.snapshot;
  const experienceRank = new Map(detail.edits.map((edit, index) => [edit.experienceId, index]));
  const includedExperiences = detail.profile.experiences
    .filter((item) => detail.base.experienceIds.includes(item.id) && (experienceRank.has(item.id) || detail.edits.length === 0))
    .sort((a, b) => (experienceRank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (experienceRank.get(b.id) ?? Number.MAX_SAFE_INTEGER));
  const bulletMap = new Map<string, ResumeSnapshot["experiences"][number]["bullets"]>();
  for (const edit of detail.edits) {
    const bullets = bulletMap.get(edit.experienceId) ?? [];
    bullets.push({ id: edit.id, text: edit.decision === "accepted" ? edit.proposedText : edit.originalText, evidenceIds: edit.evidenceIds });
    bulletMap.set(edit.experienceId, bullets);
  }
  return {
    name: detail.base.name,
    roleFamily: detail.base.roleFamily,
    template: detail.resume.template,
    job: { id: detail.job.id, title: detail.job.title, company: detail.job.company },
    summary: detail.resume.summaryDecision === "accepted" ? detail.resume.summaryProposed : detail.resume.summaryOriginal,
    experiences: includedExperiences.map((item) => ({ id: item.id, company: item.company, title: item.title, location: item.location, startDate: item.startDate, endDate: item.endDate, bullets: bulletMap.get(item.id) ?? [] })),
    skills: detail.profile.skills.filter((item) => detail.base.skillIds.includes(item.id) && item.verificationState !== "prohibited" && item.verificationState !== "archived").map((item) => item.name),
    profileItems: detail.profile.profileItems.filter((item) => detail.base.profileItemIds.includes(item.id) && item.verificationState !== "prohibited" && item.verificationState !== "archived").map(({ id, kind, title, organization, description }) => ({ id, kind, title, organization, description })),
    sectionOrder: detail.resume.sectionOrder,
  };
}

export async function submitResume(resumeId: string) {
  const detail = await getTailoredResume(resumeId);
  if (!detail) throw new Error("Resume draft not found.");
  if (detail.resume.status === "submitted") return;
  if (detail.resume.summaryDecision === "pending" || detail.edits.some((edit) => edit.decision === "pending")) throw new Error("Review every pending suggestion before marking this resume submitted.");
  const snapshot = buildSnapshot(detail);
  const now = new Date();
  db.transaction((tx) => {
    tx.update(tailoredResumes).set({ status: "submitted", snapshot, submittedAt: now, updatedAt: now }).where(eq(tailoredResumes.id, resumeId)).run();
    tx.insert(auditEvents).values({ id: crypto.randomUUID(), action: "resume.submitted", entityType: "tailored_resume", entityId: resumeId, occurredAt: now }).run();
  });
}

export async function getResumeSnapshot(id: string) {
  const detail = await getTailoredResume(id);
  return detail ? buildSnapshot(detail) : null;
}
