import "server-only";

import { desc, eq } from "drizzle-orm";
import { connection } from "next/server";

import { db } from "@/lib/db";
import { auditEvents, jobs, opportunities } from "@/lib/db/schema";
import type { CreateJobInput } from "@/lib/jobs/validation";

export type JobSummary = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  capturedAt: Date;
};

export type JobDetail = JobSummary & {
  sourceUrl: string | null;
  originalDescription: string;
};

export async function createJob(input: CreateJobInput) {
  const jobId = crypto.randomUUID();
  const occurredAt = new Date();

  db.transaction((tx) => {
    tx.insert(jobs).values({
      id: jobId,
      title: input.title,
      company: input.company,
      location: input.location || null,
      sourceUrl: input.sourceUrl || null,
      sourceType: "pasted",
      originalDescription: input.originalDescription,
      capturedAt: occurredAt,
    }).run();

    tx.insert(opportunities).values({
      id: crypto.randomUUID(),
      jobId,
      stage: "inbox",
      createdAt: occurredAt,
    }).run();

    tx.insert(auditEvents).values({
      id: crypto.randomUUID(),
      action: "job.captured",
      entityType: "job",
      entityId: jobId,
      occurredAt,
    }).run();
  });

  return jobId;
}

export async function listJobs(): Promise<JobSummary[]> {
  await connection();

  return db.select({
    id: jobs.id,
    title: jobs.title,
    company: jobs.company,
    location: jobs.location,
    capturedAt: jobs.capturedAt,
  }).from(jobs).orderBy(desc(jobs.capturedAt));
}

export async function getJob(id: string): Promise<JobDetail | null> {
  await connection();

  const [job] = await db.select({
    id: jobs.id,
    title: jobs.title,
    company: jobs.company,
    location: jobs.location,
    sourceUrl: jobs.sourceUrl,
    originalDescription: jobs.originalDescription,
    capturedAt: jobs.capturedAt,
  }).from(jobs).where(eq(jobs.id, id)).limit(1);

  return job ?? null;
}
