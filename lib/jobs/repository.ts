import "server-only";

import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { connection } from "next/server";

import { db } from "@/lib/db";
import { auditEvents, jobDuplicateSignals, jobs, opportunities } from "@/lib/db/schema";
import { findDuplicateMatches } from "@/lib/jobs/duplicates";
import { jobExtractionProvider, type ExtractedJob } from "@/lib/jobs/extraction";
import type { CreateJobInput, JobMetadataInput } from "@/lib/jobs/validation";

export type JobSummary = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  workArrangement: "remote" | "hybrid" | "on_site" | "unknown";
  extractionConfidence: "not_run" | "low" | "medium" | "high";
  capturedAt: Date;
};

export type DuplicateJob = {
  id: string;
  title: string;
  company: string;
  reason: "exact_url" | "same_role" | "similar_description";
  similarity: number;
};

export type JobDetail = JobSummary & {
  sourceUrl: string | null;
  sourceType: "url" | "pasted" | "manual";
  sourceFetchedAt: Date | null;
  originalDescription: string;
  employmentType: string | null;
  seniority: string | null;
  minimumCompensation: number | null;
  maximumCompensation: number | null;
  compensationCurrency: string | null;
  postedAt: Date | null;
  applicationDeadline: Date | null;
  responsibilities: string[];
  requiredQualifications: string[];
  preferredQualifications: string[];
  skills: string[];
  technologies: string[];
  metadataUpdatedAt: Date | null;
  duplicateJobs: DuplicateJob[];
};

type PersistedJobInput = Omit<ExtractedJob, "extractionConfidence"> & {
  extractionConfidence: "not_run" | "low" | "medium" | "high";
  sourceUrl: string | null;
  sourceType: "url" | "pasted" | "manual";
  sourceFetchedAt: Date | null;
};

const emptyExtraction: Omit<ExtractedJob, "title" | "company" | "location" | "originalDescription"> = {
  employmentType: null,
  workArrangement: "unknown",
  seniority: null,
  minimumCompensation: null,
  maximumCompensation: null,
  compensationCurrency: null,
  postedAt: null,
  applicationDeadline: null,
  responsibilities: [],
  requiredQualifications: [],
  preferredQualifications: [],
  skills: [],
  technologies: [],
  extractionConfidence: "low",
};

async function persistJob(input: PersistedJobInput) {
  const jobId = crypto.randomUUID();
  const occurredAt = new Date();
  const candidates = await db.select({
    id: jobs.id,
    title: jobs.title,
    company: jobs.company,
    sourceUrl: jobs.sourceUrl,
    originalDescription: jobs.originalDescription,
  }).from(jobs);
  const duplicateMatches = findDuplicateMatches(input, candidates);

  db.transaction((tx) => {
    tx.insert(jobs).values({
      id: jobId,
      title: input.title,
      company: input.company,
      location: input.location,
      sourceUrl: input.sourceUrl,
      sourceType: input.sourceType,
      sourceFetchedAt: input.sourceFetchedAt,
      originalDescription: input.originalDescription,
      employmentType: input.employmentType,
      workArrangement: input.workArrangement,
      seniority: input.seniority,
      minimumCompensation: input.minimumCompensation,
      maximumCompensation: input.maximumCompensation,
      compensationCurrency: input.compensationCurrency,
      postedAt: input.postedAt,
      applicationDeadline: input.applicationDeadline,
      responsibilities: input.responsibilities,
      requiredQualifications: input.requiredQualifications,
      preferredQualifications: input.preferredQualifications,
      skills: input.skills,
      technologies: input.technologies,
      extractionConfidence: input.extractionConfidence,
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

    if (duplicateMatches.length > 0) {
      tx.insert(jobDuplicateSignals).values(duplicateMatches.map((match) => ({
        id: crypto.randomUUID(),
        jobId,
        candidateJobId: match.candidateJobId,
        reason: match.reason,
        similarity: match.similarity,
        createdAt: occurredAt,
      }))).run();
    }
  });

  return jobId;
}

export async function createJob(input: CreateJobInput) {
  const extraction = input.sourceType === "pasted"
    ? await jobExtractionProvider.extract({
        body: input.originalDescription,
        contentType: "text/plain",
        titleHint: input.title,
        companyHint: input.company,
        locationHint: input.location,
      })
    : {
        ...emptyExtraction,
        title: input.title,
        company: input.company,
        location: input.location,
        originalDescription: input.originalDescription,
        extractionConfidence: "not_run" as const,
      };

  return persistJob({
    ...extraction,
    title: input.title,
    company: input.company,
    location: input.location,
    sourceUrl: input.sourceUrl || null,
    sourceType: input.sourceType,
    sourceFetchedAt: null,
  });
}

export async function createImportedJob(
  extraction: ExtractedJob,
  sourceUrl: string,
  sourceFetchedAt: Date,
) {
  return persistJob({
    ...extraction,
    sourceUrl,
    sourceType: "url",
    sourceFetchedAt,
  });
}

export async function updateJobMetadata(id: string, input: JobMetadataInput) {
  const occurredAt = new Date();
  return db.transaction((tx) => {
    const result = tx.update(jobs).set({
      ...input,
      postedAt: input.postedAt ? new Date(`${input.postedAt}T00:00:00.000Z`) : null,
      applicationDeadline: input.applicationDeadline ? new Date(`${input.applicationDeadline}T00:00:00.000Z`) : null,
      metadataUpdatedAt: occurredAt,
    }).where(eq(jobs.id, id)).run();

    if (result.changes === 0) return false;

    tx.insert(auditEvents).values({
      id: crypto.randomUUID(),
      action: "job.metadata_updated",
      entityType: "job",
      entityId: id,
      occurredAt,
    }).run();
    return true;
  });
}

export async function listJobs(): Promise<JobSummary[]> {
  await connection();

  return db.select({
    id: jobs.id,
    title: jobs.title,
    company: jobs.company,
    location: jobs.location,
    workArrangement: jobs.workArrangement,
    extractionConfidence: jobs.extractionConfidence,
    capturedAt: jobs.capturedAt,
  }).from(jobs).orderBy(desc(jobs.capturedAt));
}

export async function getJob(id: string): Promise<JobDetail | null> {
  await connection();

  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) return null;

  const candidate = alias(jobs, "duplicate_candidate");
  const duplicateJobs = await db.select({
    id: candidate.id,
    title: candidate.title,
    company: candidate.company,
    reason: jobDuplicateSignals.reason,
    similarity: jobDuplicateSignals.similarity,
  }).from(jobDuplicateSignals)
    .innerJoin(candidate, eq(jobDuplicateSignals.candidateJobId, candidate.id))
    .where(eq(jobDuplicateSignals.jobId, id));

  return { ...job, duplicateJobs };
}
