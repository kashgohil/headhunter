"use server";


import { requireOwner } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";

import { dimensionKeys, type FitWeights } from "@/lib/fit-analysis/types";
import { overrideFitRecommendation, runFitAnalysis } from "@/lib/fit-analysis/repository";
import { fitOverrideSchema, fitWeightsSchema } from "@/lib/fit-analysis/validation";

export type FitActionState = { message?: string; error?: boolean };

export async function analyzeFitAction(jobId: string, _state: FitActionState, formData: FormData): Promise<FitActionState> {
  await requireOwner();
  // Authentication and ownership checks belong here before hosted use.
  const hasWeights = dimensionKeys.some((key) => formData.has(key));
  let weights: FitWeights | undefined;
  if (hasWeights) {
    const parsed = fitWeightsSchema.safeParse(Object.fromEntries(dimensionKeys.map((key) => [key, formData.get(key)])));
    if (!parsed.success) return { error: true, message: parsed.error.issues[0]?.message ?? "Check the dimension weights." };
    weights = parsed.data;
  }

  try {
    await runFitAnalysis(jobId, weights);
  } catch (error) {
    return { error: true, message: error instanceof Error ? error.message : "Fit analysis could not be completed." };
  }
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  return { message: hasWeights ? "New analysis saved with your weights." : "Fit analysis complete." };
}

export async function overrideFitAction(jobId: string, _state: FitActionState, formData: FormData): Promise<FitActionState> {
  await requireOwner();
  // Authentication and ownership checks belong here before hosted use.
  const parsed = fitOverrideSchema.safeParse({ recommendation: formData.get("recommendation"), reason: formData.get("reason") });
  if (!parsed.success) return { error: true, message: parsed.error.issues[0]?.message ?? "Check the override." };
  try {
    await overrideFitRecommendation(jobId, parsed.data);
  } catch (error) {
    return { error: true, message: error instanceof Error ? error.message : "The override could not be saved." };
  }
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  return { message: "Recommendation override saved." };
}
