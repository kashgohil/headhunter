"use server";


import { requireOwner } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";

import { saveSearchStrategy as persistSearchStrategy } from "@/lib/search-strategy/repository";
import { searchStrategySchema } from "@/lib/search-strategy/validation";

type SearchStrategyField =
  | "primaryTitle"
  | "adjacentTitles"
  | "seniorityLevels"
  | "preferredIndustries"
  | "excludedIndustries"
  | "companyStages"
  | "companySizes"
  | "workArrangements"
  | "locations"
  | "relocationPreference"
  | "timeZoneConstraints"
  | "workAuthorization"
  | "sponsorshipRequired"
  | "minimumCompensation"
  | "targetCompensation"
  | "currency"
  | "compensationFlexible"
  | "hardBlockers"
  | "softPreferences"
  | "weeklyHours"
  | "searchPace";

export type SearchStrategyState = {
  errors?: Partial<Record<SearchStrategyField, string[]>>;
  message?: string;
  savedVersion?: number;
};

export async function saveSearchStrategy(
  _previousState: SearchStrategyState,
  formData: FormData,
): Promise<SearchStrategyState> {
  await requireOwner();
  // Authentication belongs here before this app is exposed beyond local use.
  const parsed = searchStrategySchema.safeParse({
    primaryTitle: formData.get("primaryTitle"),
    adjacentTitles: formData.get("adjacentTitles"),
    seniorityLevels: formData.get("seniorityLevels"),
    preferredIndustries: formData.get("preferredIndustries"),
    excludedIndustries: formData.get("excludedIndustries"),
    companyStages: formData.get("companyStages"),
    companySizes: formData.get("companySizes"),
    workArrangements: formData.get("workArrangements"),
    locations: formData.get("locations"),
    relocationPreference: formData.get("relocationPreference"),
    timeZoneConstraints: formData.get("timeZoneConstraints"),
    workAuthorization: formData.get("workAuthorization"),
    sponsorshipRequired: formData.get("sponsorshipRequired"),
    minimumCompensation: formData.get("minimumCompensation"),
    targetCompensation: formData.get("targetCompensation"),
    currency: formData.get("currency"),
    compensationFlexible: formData.get("compensationFlexible"),
    hardBlockers: formData.get("hardBlockers"),
    softPreferences: formData.get("softPreferences"),
    weeklyHours: formData.get("weeklyHours"),
    searchPace: formData.get("searchPace"),
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
