import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { connection } from "next/server";

import { getCareerProfile } from "@/lib/career-profile/repository";
import { db } from "@/lib/db";
import { auditEvents, fitAnalyses } from "@/lib/db/schema";
import { analyzeFit } from "@/lib/fit-analysis/analyzer";
import type { FitAnalysisResult, FitDimension, FitGap, FitWeights, Recommendation } from "@/lib/fit-analysis/types";
import type { FitOverrideInput } from "@/lib/fit-analysis/validation";
import { getJob } from "@/lib/jobs/repository";
import { getCurrentSearchStrategy } from "@/lib/search-strategy/repository";

export type FitAnalysis = FitAnalysisResult & {
  id: string;
  jobId: string;
  searchStrategyVersionId: string | null;
  version: number;
  overriddenRecommendation: Recommendation | null;
  overrideReason: string | null;
  createdAt: Date;
};

function hydrate(row: typeof fitAnalyses.$inferSelect): FitAnalysis {
  return {
    ...row,
    dimensions: row.dimensions as Record<keyof FitWeights, FitDimension>,
    gaps: row.gaps as FitGap[],
    weights: row.weights as FitWeights,
    recommendation: row.recommendation as Recommendation,
    overriddenRecommendation: row.overriddenRecommendation as Recommendation | null,
  };
}

export async function getLatestFitAnalysis(jobId: string): Promise<FitAnalysis | null> {
  await connection();
  const [analysis] = await db.select().from(fitAnalyses)
    .where(eq(fitAnalyses.jobId, jobId))
    .orderBy(desc(fitAnalyses.version))
    .limit(1);
  return analysis ? hydrate(analysis) : null;
}

export async function listLatestFitAnalyses(): Promise<Map<string, FitAnalysis>> {
  await connection();
  const analyses = await db.select().from(fitAnalyses).orderBy(desc(fitAnalyses.version));
  const latest = new Map<string, FitAnalysis>();
  for (const analysis of analyses) if (!latest.has(analysis.jobId)) latest.set(analysis.jobId, hydrate(analysis));
  return latest;
}

export async function runFitAnalysis(jobId: string, weights?: FitWeights): Promise<FitAnalysis> {
  const [job, strategy, profile] = await Promise.all([
    getJob(jobId),
    getCurrentSearchStrategy(),
    getCareerProfile(),
  ]);
  if (!job) throw new Error("Job not found.");

  const result = analyzeFit({ job, strategy, profile, weights });
  const id = crypto.randomUUID();
  const createdAt = new Date();

  const version = db.transaction((tx) => {
    const latest = tx.select({ version: fitAnalyses.version }).from(fitAnalyses)
      .where(eq(fitAnalyses.jobId, jobId))
      .orderBy(desc(fitAnalyses.version))
      .limit(1)
      .get();
    const nextVersion = (latest?.version ?? 0) + 1;
    tx.insert(fitAnalyses).values({
      id,
      jobId,
      searchStrategyVersionId: strategy?.id ?? null,
      version: nextVersion,
      ...result,
      createdAt,
    }).run();
    tx.insert(auditEvents).values({
      id: crypto.randomUUID(),
      action: "fit_analysis.created",
      entityType: "fit_analysis",
      entityId: id,
      occurredAt: createdAt,
    }).run();
    return nextVersion;
  });

  return {
    id,
    jobId,
    searchStrategyVersionId: strategy?.id ?? null,
    version,
    ...result,
    overriddenRecommendation: null,
    overrideReason: null,
    createdAt,
  };
}

export async function overrideFitRecommendation(jobId: string, input: FitOverrideInput) {
  const now = new Date();
  return db.transaction((tx) => {
    const latest = tx.select().from(fitAnalyses)
      .where(eq(fitAnalyses.jobId, jobId))
      .orderBy(desc(fitAnalyses.version))
      .limit(1)
      .get();
    if (!latest) throw new Error("Run a fit analysis before overriding its recommendation.");

    const result = tx.update(fitAnalyses).set({
      overriddenRecommendation: input.recommendation,
      overrideReason: input.reason,
    }).where(and(eq(fitAnalyses.id, latest.id), eq(fitAnalyses.jobId, jobId))).run();
    if (result.changes === 0) throw new Error("Fit analysis not found.");
    tx.insert(auditEvents).values({
      id: crypto.randomUUID(),
      action: "fit_analysis.overridden",
      entityType: "fit_analysis",
      entityId: latest.id,
      occurredAt: now,
    }).run();
  });
}
