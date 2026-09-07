import { z } from "zod";

import { dimensionKeys } from "@/lib/fit-analysis/types";

const weight = z.coerce.number({ error: "Enter a weight from 0 to 100." }).int().min(0).max(100);

export const fitWeightsSchema = z.object(Object.fromEntries(
  dimensionKeys.map((key) => [key, weight]),
) as Record<(typeof dimensionKeys)[number], typeof weight>).refine(
  (weights) => Object.values(weights).some((value) => value > 0),
  { message: "Give at least one dimension a positive weight." },
);

export const fitOverrideSchema = z.object({
  recommendation: z.enum(["apply_now", "research_first", "seek_referral_first", "stretch", "monitor", "skip"]),
  reason: z.string().trim().min(5, "Add a short reason for the override.").max(500),
});

export type FitWeightsInput = z.infer<typeof fitWeightsSchema>;
export type FitOverrideInput = z.infer<typeof fitOverrideSchema>;
