"use server";

import { revalidatePath } from "next/cache";

import { saveSearchStrategy as persistSearchStrategy } from "@/lib/search-strategy/repository";
import { searchStrategySchema } from "@/lib/search-strategy/validation";

type SearchStrategyField =
  | "primaryTitle"
  | "adjacentTitles"
  | "seniorityLevels"
  | "workArrangements"
  | "locations"
  | "workAuthorization"
  | "sponsorshipRequired"
  | "minimumCompensation"
  | "targetCompensation"
  | "currency"
  | "hardBlockers"
  | "softPreferences"
  | "weeklyHours";

export type SearchStrategyState = {
  errors?: Partial<Record<SearchStrategyField, string[]>>;
  message?: string;
  savedVersion?: number;
};

export async function saveSearchStrategy(
  _previousState: SearchStrategyState,
  formData: FormData,
): Promise<SearchStrategyState> {
  // Authentication belongs here before this app is exposed beyond local use.
  const parsed = searchStrategySchema.safeParse({
    primaryTitle: formData.get("primaryTitle"),
    adjacentTitles: formData.get("adjacentTitles"),
    seniorityLevels: formData.get("seniorityLevels"),
    workArrangements: formData.get("workArrangements"),
    locations: formData.get("locations"),
    workAuthorization: formData.get("workAuthorization"),
    sponsorshipRequired: formData.get("sponsorshipRequired"),
    minimumCompensation: formData.get("minimumCompensation"),
    targetCompensation: formData.get("targetCompensation"),
    currency: formData.get("currency"),
    hardBlockers: formData.get("hardBlockers"),
    softPreferences: formData.get("softPreferences"),
    weeklyHours: formData.get("weeklyHours"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "Check the highlighted fields and try again.",
    };
  }

  const strategy = await persistSearchStrategy(parsed.data);
  revalidatePath("/settings/search-strategy");

  return {
    message: `Strategy version ${strategy.version} saved.`,
    savedVersion: strategy.version,
  };
}
