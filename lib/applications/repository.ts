import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import { connection } from "next/server";

import { db } from "@/lib/db";
import {
  applicationAnswers,
  applicationArtifacts,
  applicationEvents,
  applicationInterviews,
  applicationSubmissions,
  applicationTasks,
  auditEvents,
  baseResumes,
  careerAnswers,
  jobs,
  opportunities,
  outreachDrafts,
  tailoredResumes,
  type ApplicationSubmissionSnapshot,
} from "@/lib/db/schema";
import { getResumeSnapshot } from "@/lib/resumes/repository";
import type {
  applicationAnswerSchema,
  stageTransitionSchema,
  artifactSchema,
  nextActionSchema,
  outreachSchema,
  submissionSchema,
  taskSchema,
} from "@/lib/applications/validation";
import type { z } from "zod";
import { checklistItems } from "@/lib/applications/types";
import { getPipelineStage, listPipelineStages } from "@/lib/applications/pipeline";
import { getStageTransitionError } from "@/lib/applications/transitions";

type StageTransitionInput = z.infer<typeof stageTransitionSchema>;
type NextActionInput = z.infer<typeof nextActionSchema>;
type TaskInput = z.infer<typeof taskSchema>;
type AnswerInput = z.infer<typeof applicationAnswerSchema>;
type ArtifactInput = z.infer<typeof artifactSchema>;
type OutreachInput = z.infer<typeof outreachSchema>;
type SubmissionInput = z.infer<typeof submissionSchema>;

function addEvent(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], jobId: string, kind: typeof applicationEvents.$inferInsert.kind, title: string, detail: string | null, occurredAt: Date, stages?: { from: string; to: string }) {
  tx.insert(applicationEvents).values({ id: crypto.randomUUID(), jobId, kind, title, detail, fromStage: stages?.from, toStage: stages?.to, occurredAt }).run();
}

export async function getApplicationWorkspace(jobId: string) {
  await connection();
  const [opportunity, tasks, answers, artifacts, outreach, submissions, events, libraryAnswers, resumes, interviews, stages] = await Promise.all([
    db.select().from(opportunities).where(eq(opportunities.jobId, jobId)).get(),
    db.select().from(applicationTasks).where(eq(applicationTasks.jobId, jobId)).orderBy(asc(applicationTasks.completedAt), asc(applicationTasks.dueAt), desc(applicationTasks.createdAt)),
    db.select().from(applicationAnswers).where(eq(applicationAnswers.jobId, jobId)).orderBy(desc(applicationAnswers.updatedAt)),
    db.select().from(applicationArtifacts).where(eq(applicationArtifacts.jobId, jobId)).orderBy(desc(applicationArtifacts.updatedAt)),
    db.select().from(outreachDrafts).where(eq(outreachDrafts.jobId, jobId)).orderBy(desc(outreachDrafts.updatedAt)),
    db.select().from(applicationSubmissions).where(eq(applicationSubmissions.jobId, jobId)).orderBy(desc(applicationSubmissions.submittedAt)),
    db.select().from(applicationEvents).where(eq(applicationEvents.jobId, jobId)).orderBy(desc(applicationEvents.occurredAt)),
    db.select().from(careerAnswers).where(eq(careerAnswers.verificationState, "verified")).orderBy(desc(careerAnswers.updatedAt)),
    db.select({ id: tailoredResumes.id, version: tailoredResumes.version, status: tailoredResumes.status, submittedAt: tailoredResumes.submittedAt, updatedAt: tailoredResumes.updatedAt, baseName: baseResumes.name })
      .from(tailoredResumes).innerJoin(baseResumes, eq(tailoredResumes.baseResumeId, baseResumes.id))
      .where(eq(tailoredResumes.jobId, jobId)).orderBy(desc(tailoredResumes.version)),
    db.select().from(applicationInterviews).where(eq(applicationInterviews.jobId, jobId)).orderBy(asc(applicationInterviews.scheduledAt)),
    listPipelineStages(),
  ]);
  return { opportunity, tasks, answers, artifacts, outreach, submissions, events, libraryAnswers, resumes, interviews, stages };
}

export async function updateStage(jobId: string, input: StageTransitionInput) {
  const [opportunity, destination, submission] = await Promise.all([
    db.select().from(opportunities).where(eq(opportunities.jobId, jobId)).get(),
    getPipelineStage(input.stage),
    db.select({ id: applicationSubmissions.id }).from(applicationSubmissions).where(eq(applicationSubmissions.jobId, jobId)).get(),
  ]);
  if (!opportunity) throw new Error("Application workspace not found.");
  if (!destination) throw new Error("Pipeline stage not found.");
  const transitionError = getStageTransitionError({
    destination,
    nextAction: opportunity.nextAction,
    waiting: opportunity.waiting,
    hasSubmission: Boolean(submission),
    submissionWaiverReason: input.submissionWaiverReason,
  });
  if (transitionError) throw new Error(transitionError);
  const now = new Date();
  db.transaction((tx) => {
    const result = tx.update(opportunities).set({
      stage: input.stage,
      outcomeReason: destination.isTerminal ? input.outcomeReason : null,
      nextAction: destination.isTerminal ? null : opportunity.nextAction,
      nextActionDueAt: destination.isTerminal ? null : opportunity.nextActionDueAt,
      waiting: destination.isTerminal ? false : opportunity.waiting,
      waitingReason: destination.isTerminal ? null : opportunity.waitingReason,
      submissionWaivedAt: destination.category === "applied" && !submission ? now : opportunity.submissionWaivedAt,
      submissionWaiverReason: destination.category === "applied" && !submission ? input.submissionWaiverReason : opportunity.submissionWaiverReason,
      updatedAt: now,
    }).where(eq(opportunities.jobId, jobId)).run();
    if (!result.changes) throw new Error("Application workspace not found.");
    const details = [
      destination.category === "applied" && !submission ? `Submission snapshot waived: ${input.submissionWaiverReason}` : null,
      destination.isTerminal && input.outcomeReason ? `Outcome: ${input.outcomeReason}` : null,
    ].filter(Boolean).join(" · ") || null;
    addEvent(tx, jobId, "stage", `Moved to ${destination.label}`, details, now, { from: opportunity.stage, to: input.stage });
  });
}

export async function saveNextAction(jobId: string, input: NextActionInput) {
  const now = new Date();
  const result = await db.update(opportunities).set({
    nextAction: input.waiting ? null : input.nextAction,
    nextActionDueAt: input.waiting || !input.nextActionDueAt ? null : new Date(`${input.nextActionDueAt}T12:00:00`),
    waiting: input.waiting,
    waitingReason: input.waiting ? input.waitingReason : null,
    updatedAt: now,
  }).where(eq(opportunities.jobId, jobId));
  if (!result.changes) throw new Error("Application workspace not found.");
}

export async function setChecklistItem(jobId: string, itemId: string, checked: boolean) {
  if (!checklistItems.some((item) => item.id === itemId)) throw new Error("Unknown checklist item.");
  const opportunity = await db.select({ checklist: opportunities.checklist }).from(opportunities).where(eq(opportunities.jobId, jobId)).get();
  if (!opportunity) throw new Error("Application workspace not found.");
  await db.update(opportunities).set({ checklist: { ...opportunity.checklist, [itemId]: checked }, updatedAt: new Date() }).where(eq(opportunities.jobId, jobId));
}

export async function createTask(jobId: string, input: TaskInput) {
  const id = crypto.randomUUID();
  const now = new Date();
  db.transaction((tx) => {
    tx.insert(applicationTasks).values({ id, jobId, title: input.title, dueAt: input.dueAt ? new Date(`${input.dueAt}T12:00:00`) : null, createdAt: now }).run();
    addEvent(tx, jobId, "task", "Task added", input.title, now);
  });
  return id;
}

export async function setTaskCompleted(jobId: string, taskId: string, completed: boolean) {
  const now = new Date();
  const task = await db.select().from(applicationTasks).where(and(eq(applicationTasks.id, taskId), eq(applicationTasks.jobId, jobId))).get();
  if (!task) throw new Error("Task not found.");
  db.transaction((tx) => {
    tx.update(applicationTasks).set({ completedAt: completed ? now : null }).where(eq(applicationTasks.id, taskId)).run();
    addEvent(tx, jobId, "task", completed ? "Task completed" : "Task reopened", task.title, now);
  });
}

export async function createApplicationAnswer(jobId: string, input: AnswerInput) {
  const canonical = input.canonicalAnswerId ? await db.select().from(careerAnswers).where(eq(careerAnswers.id, input.canonicalAnswerId)).get() : null;
  if (input.canonicalAnswerId && !canonical) throw new Error("Library answer not found.");
  if (canonical && canonical.verificationState !== "verified") throw new Error("Only verified library answers can be copied into an application.");
  const question = canonical?.question ?? input.question;
  const answer = input.answer || canonical?.answer || "";
  if (!question || !answer) throw new Error("Add both a question and answer.");
  const id = crypto.randomUUID();
  const now = new Date();
  db.transaction((tx) => {
    tx.insert(applicationAnswers).values({ id, jobId, canonicalAnswerId: canonical?.id ?? null, question, answer, sensitiveDataWarning: input.sensitiveDataWarning, createdAt: now, updatedAt: now }).run();
    addEvent(tx, jobId, "answer", "Screening answer added", question, now);
  });
  return id;
}

export async function updateApplicationAnswer(jobId: string, answerId: string, answer: string) {
  const now = new Date();
  const result = await db.update(applicationAnswers).set({ answer, updatedAt: now }).where(and(eq(applicationAnswers.id, answerId), eq(applicationAnswers.jobId, jobId)));
  if (!result.changes) throw new Error("Answer not found.");
}

export async function createArtifact(jobId: string, input: ArtifactInput) {
  const id = crypto.randomUUID();
  const now = new Date();
  db.transaction((tx) => {
    tx.insert(applicationArtifacts).values({ id, jobId, ...input, createdAt: now, updatedAt: now }).run();
    addEvent(tx, jobId, "document", "Document added", input.name, now);
  });
  return id;
}

export async function createOutreachDraft(jobId: string, input: OutreachInput) {
  const id = crypto.randomUUID();
  const now = new Date();
  db.transaction((tx) => {
    tx.insert(outreachDrafts).values({ id, jobId, ...input, createdAt: now, updatedAt: now }).run();
    addEvent(tx, jobId, "outreach", "Outreach draft added", input.recipient, now);
  });
  return id;
}

export async function addTimelineNote(jobId: string, note: string) {
  await db.insert(applicationEvents).values({ id: crypto.randomUUID(), jobId, kind: "note", title: "Note", detail: note, occurredAt: new Date() });
}

export async function submitApplication(jobId: string, input: SubmissionInput) {
  const [job, workspace] = await Promise.all([
    db.select().from(jobs).where(eq(jobs.id, jobId)).get(),
    getApplicationWorkspace(jobId),
  ]);
  if (!job || !workspace.opportunity) throw new Error("Application workspace not found.");
  if (!workspace.opportunity.nextAction && !workspace.opportunity.waiting) throw new Error("Set the follow-up action or mark this application as waiting before recording the submission.");
  const incomplete = checklistItems.filter((item) => !workspace.opportunity?.checklist[item.id]);
  if (incomplete.length) throw new Error(`Complete the pre-submission checklist first (${incomplete.length} remaining).`);
  if (!workspace.resumes.some((resume) => resume.status === "submitted")) throw new Error("Finalize a tailored resume before recording the application.");

  const submittedResume = workspace.resumes.find((resume) => resume.status === "submitted");
  const resumeSnapshots = await Promise.all((submittedResume ? [submittedResume] : []).map(async (resume) => ({
    kind: "resume",
    id: resume.id,
    version: resume.version,
    name: resume.baseName,
    status: resume.status,
    snapshot: await getResumeSnapshot(resume.id),
  })));
  const snapshot: ApplicationSubmissionSnapshot = {
    job: { ...job, capturedAt: job.capturedAt.toISOString(), sourceFetchedAt: job.sourceFetchedAt?.toISOString() ?? null, postedAt: job.postedAt?.toISOString() ?? null, applicationDeadline: job.applicationDeadline?.toISOString() ?? null },
    documents: [...resumeSnapshots, ...workspace.artifacts.filter((item) => item.status === "ready").map(({ id, kind, name, content, status, updatedAt }) => ({ id, kind, name, content, status, updatedAt: updatedAt.toISOString() }))],
    answers: workspace.answers.map(({ id, canonicalAnswerId, question, answer, sensitiveDataWarning, updatedAt }) => ({ id, canonicalAnswerId, question, answer, sensitiveDataWarning, updatedAt: updatedAt.toISOString() })),
  };
  const id = crypto.randomUUID();
  const now = new Date();
  const submittedAt = new Date(input.submittedAt);
  const previousStage = workspace.opportunity.stage;
  db.transaction((tx) => {
    tx.insert(applicationSubmissions).values({ id, jobId, ...input, submittedAt, snapshot, createdAt: now }).run();
    tx.update(opportunities).set({ stage: "applied", submissionWaivedAt: null, submissionWaiverReason: null, updatedAt: now }).where(eq(opportunities.jobId, jobId)).run();
    addEvent(tx, jobId, "submission", "Application submitted", input.confirmationId ? `Confirmation ${input.confirmationId}` : null, submittedAt);
    addEvent(tx, jobId, "stage", "Moved to Applied", "Submission snapshot recorded", submittedAt, { from: previousStage, to: "applied" });
    tx.insert(auditEvents).values({ id: crypto.randomUUID(), action: "application.submitted", entityType: "application_submission", entityId: id, occurredAt: now }).run();
  });
  return id;
}
