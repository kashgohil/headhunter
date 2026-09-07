import "server-only";

import { asc, desc, eq } from "drizzle-orm";
import { connection } from "next/server";

import { db } from "@/lib/db";
import {
  applicationArtifacts,
  applicationEvents,
  applicationInterviews,
  applicationSubmissions,
  applicationTasks,
  jobs,
  opportunities,
  outreachDrafts,
  pipelineStages,
} from "@/lib/db/schema";
import { pipelineStageDefinitions } from "@/lib/applications/types";
import type { z } from "zod";
import type { customStageSchema, interviewSchema, pipelineMetadataSchema } from "@/lib/applications/validation";

type CustomStageInput = z.infer<typeof customStageSchema>;
type InterviewInput = z.infer<typeof interviewSchema>;
type MetadataInput = z.infer<typeof pipelineMetadataSchema>;

export async function ensurePipelineStages() {
  const createdAt = new Date(0);
  await db.insert(pipelineStages).values(pipelineStageDefinitions.map((stage, position) => ({
    id: `builtin-${stage.key}`,
    key: stage.key,
    label: stage.label,
    category: stage.category,
    position,
    isTerminal: stage.terminal,
    isBuiltIn: true,
    createdAt,
  }))).onConflictDoNothing();
}

export async function listPipelineStages() {
  await ensurePipelineStages();
  return db.select().from(pipelineStages).orderBy(asc(pipelineStages.position), asc(pipelineStages.label));
}

export async function getPipelineStage(key: string) {
  await ensurePipelineStages();
  return db.select().from(pipelineStages).where(eq(pipelineStages.key, key)).get();
}

export async function createCustomStage(input: CustomStageInput) {
  await ensurePipelineStages();
  const mappedStage = pipelineStageDefinitions.find((stage) => stage.key === input.category);
  if (!mappedStage) throw new Error("Choose a valid analytics category.");
  const suffix = crypto.randomUUID().slice(0, 8);
  const key = `custom-${input.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 45) || "stage"}-${suffix}`;
  const last = await db.select({ position: pipelineStages.position }).from(pipelineStages).orderBy(desc(pipelineStages.position)).get();
  await db.insert(pipelineStages).values({
    id: crypto.randomUUID(),
    key,
    label: input.label,
    category: input.category,
    position: (last?.position ?? pipelineStageDefinitions.length) + 1,
    isTerminal: mappedStage.terminal,
    isBuiltIn: false,
    createdAt: new Date(),
  });
  return key;
}

export async function updatePipelineMetadata(jobId: string, input: MetadataInput) {
  const result = await db.update(opportunities).set({ ...input, updatedAt: new Date() }).where(eq(opportunities.jobId, jobId));
  if (!result.changes) throw new Error("Application not found.");
}

export async function createInterview(jobId: string, input: InterviewInput) {
  const id = crypto.randomUUID();
  const now = new Date();
  const scheduledAt = new Date(input.scheduledAt);
  db.transaction((tx) => {
    tx.insert(applicationInterviews).values({ id, jobId, label: input.label, scheduledAt, notes: input.notes, createdAt: now, updatedAt: now }).run();
    tx.insert(applicationEvents).values({ id: crypto.randomUUID(), jobId, kind: "note", title: "Interview scheduled", detail: input.label, occurredAt: now }).run();
  });
  return id;
}

export async function getPipelineOverview() {
  await connection();
  const [stages, rows, tasks, submissions, artifacts, outreach, events, interviews] = await Promise.all([
    listPipelineStages(),
    db.select({
      jobId: jobs.id,
      title: jobs.title,
      company: jobs.company,
      location: jobs.location,
      sourceType: jobs.sourceType,
      sourceUrl: jobs.sourceUrl,
      capturedAt: jobs.capturedAt,
      applicationDeadline: jobs.applicationDeadline,
      extractionConfidence: jobs.extractionConfidence,
      metadataUpdatedAt: jobs.metadataUpdatedAt,
      stage: opportunities.stage,
      priority: opportunities.priority,
      interest: opportunities.interest,
      nextAction: opportunities.nextAction,
      nextActionDueAt: opportunities.nextActionDueAt,
      waiting: opportunities.waiting,
      waitingReason: opportunities.waitingReason,
      outcomeReason: opportunities.outcomeReason,
      updatedAt: opportunities.updatedAt,
    }).from(opportunities).innerJoin(jobs, eq(opportunities.jobId, jobs.id)),
    db.select().from(applicationTasks),
    db.select().from(applicationSubmissions).orderBy(desc(applicationSubmissions.submittedAt)),
    db.select().from(applicationArtifacts),
    db.select().from(outreachDrafts),
    db.select().from(applicationEvents).orderBy(desc(applicationEvents.occurredAt)),
    db.select().from(applicationInterviews).orderBy(asc(applicationInterviews.scheduledAt)),
  ]);

  const stageMap = new Map(stages.map((stage) => [stage.key, stage]));
  const grouped = <T extends { jobId: string }>(items: T[]) => {
    const result = new Map<string, T[]>();
    for (const item of items) result.set(item.jobId, [...(result.get(item.jobId) ?? []), item]);
    return result;
  };
  const tasksByJob = grouped(tasks);
  const submissionsByJob = grouped(submissions);
  const artifactsByJob = grouped(artifacts);
  const outreachByJob = grouped(outreach);
  const eventsByJob = grouped(events);
  const interviewsByJob = grouped(interviews);

  const applications = rows.map((row) => {
    const applicationTasks = tasksByJob.get(row.jobId) ?? [];
    const applicationSubmissions = submissionsByJob.get(row.jobId) ?? [];
    const applicationOutreach = outreachByJob.get(row.jobId) ?? [];
    const applicationEvents = eventsByJob.get(row.jobId) ?? [];
    const applicationInterviews = interviewsByJob.get(row.jobId) ?? [];
    const contactNames = new Set([
      ...applicationOutreach.map((item) => item.recipient).filter(Boolean),
      ...applicationSubmissions.map((item) => item.referral).filter(Boolean),
    ]);
    return {
      ...row,
      stageDefinition: stageMap.get(row.stage) ?? null,
      applicationDate: applicationSubmissions.at(0)?.submittedAt ?? null,
      lastInteractionAt: applicationEvents[0]?.occurredAt ?? row.updatedAt ?? row.capturedAt,
      openTaskCount: applicationTasks.filter((item) => !item.completedAt).length,
      taskCount: applicationTasks.length,
      materialCount: (artifactsByJob.get(row.jobId) ?? []).length,
      contactCount: contactNames.size,
      events: applicationEvents,
      tasks: applicationTasks,
      interviews: applicationInterviews,
    };
  }).sort((a, b) => {
    const stageDifference = (a.stageDefinition?.position ?? 999) - (b.stageDefinition?.position ?? 999);
    if (stageDifference) return stageDifference;
    return (a.nextActionDueAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.nextActionDueAt?.getTime() ?? Number.MAX_SAFE_INTEGER);
  });

  return { stages, applications };
}
