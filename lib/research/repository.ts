import "server-only";

import { and, asc, eq, isNotNull } from "drizzle-orm";
import { connection } from "next/server";

import { db } from "@/lib/db";
import { auditEvents, companyResearchEntries, jobs, opportunityResearchNotes } from "@/lib/db/schema";
import { normalizeCompanyName } from "@/lib/research/normalization";
import type { CompanyResearchInput, OpportunityResearchInput, ResearchSourceState } from "@/lib/research/validation";

export type CompanyResearchEntry = typeof companyResearchEntries.$inferSelect;

export type OpportunityResearch = {
  companyEntries: CompanyResearchEntry[];
  opportunityNote: typeof opportunityResearchNotes.$inferSelect | null;
};

export async function getOpportunityResearch(jobId: string): Promise<OpportunityResearch> {
  await connection();

  const [job] = await db.select({ company: jobs.company }).from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return { companyEntries: [], opportunityNote: null };

  const [companyEntries, [opportunityNote]] = await Promise.all([
    db.select().from(companyResearchEntries)
      .where(eq(companyResearchEntries.normalizedCompanyName, normalizeCompanyName(job.company)))
      .orderBy(asc(companyResearchEntries.topic), asc(companyResearchEntries.createdAt)),
    db.select().from(opportunityResearchNotes)
      .where(eq(opportunityResearchNotes.jobId, jobId))
      .limit(1),
  ]);

  return { companyEntries, opportunityNote: opportunityNote ?? null };
}

export async function createCompanyResearchEntry(jobId: string, input: CompanyResearchInput) {
  const [job] = await db.select({ company: jobs.company }).from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return null;

  const id = crypto.randomUUID();
  const occurredAt = new Date();
  db.transaction((tx) => {
    tx.insert(companyResearchEntries).values({
      id,
      companyName: job.company,
      normalizedCompanyName: normalizeCompanyName(job.company),
      topic: input.topic,
      content: input.content,
      provenance: input.provenance,
      sourceUrl: input.sourceUrl,
      sourceState: input.sourceUrl ? (input.sourceState ?? "current") : null,
      accessedAt: input.accessedAt ? new Date(`${input.accessedAt}T00:00:00.000Z`) : null,
      createdAt: occurredAt,
      updatedAt: occurredAt,
    }).run();
    tx.insert(auditEvents).values({
      id: crypto.randomUUID(), action: "company_research.created", entityType: "company_research", entityId: id, occurredAt,
    }).run();
  });

  return id;
}

export async function updateResearchSourceState(
  jobId: string,
  entryId: string,
  sourceState: ResearchSourceState,
) {
  const [job] = await db.select({ company: jobs.company }).from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return false;

  const occurredAt = new Date();
  return db.transaction((tx) => {
    const result = tx.update(companyResearchEntries).set({ sourceState, updatedAt: occurredAt }).where(and(
      eq(companyResearchEntries.id, entryId),
      eq(companyResearchEntries.normalizedCompanyName, normalizeCompanyName(job.company)),
      isNotNull(companyResearchEntries.sourceUrl),
    )).run();
    if (result.changes === 0) return false;

    tx.insert(auditEvents).values({
      id: crypto.randomUUID(), action: "company_research.source_state_changed", entityType: "company_research", entityId: entryId, occurredAt,
    }).run();
    return true;
  });
}

export async function saveOpportunityResearch(jobId: string, input: OpportunityResearchInput) {
  const [job] = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return false;

  const occurredAt = new Date();
  db.transaction((tx) => {
    tx.insert(opportunityResearchNotes).values({
      id: crypto.randomUUID(), jobId, content: input.content, createdAt: occurredAt, updatedAt: occurredAt,
    }).onConflictDoUpdate({
      target: opportunityResearchNotes.jobId,
      set: { content: input.content, updatedAt: occurredAt },
    }).run();
    tx.insert(auditEvents).values({
      id: crypto.randomUUID(), action: "opportunity_research.updated", entityType: "opportunity_research", entityId: jobId, occurredAt,
    }).run();
  });
  return true;
}
