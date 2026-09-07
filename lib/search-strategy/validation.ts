import { z } from "zod";

function uniqueList(value: unknown, separator: RegExp) {
  if (typeof value !== "string") return value;

  return [...new Set(value.split(separator).map((item) => item.trim()).filter(Boolean))];
}

const commaSeparatedList = (minimum: number, message: string) =>
  z.preprocess(
    (value) => uniqueList(value, /[,\n]/),
    z.array(z.string().max(100)).min(minimum, message).max(12, "Keep this list to 12 items or fewer."),
  );

const lineSeparatedList = z.preprocess(
  (value) => uniqueList(value, /\n/),
  z.array(z.string().max(240)).max(12, "Keep this list to 12 items or fewer."),
);

const compensation = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.coerce
    .number({ error: "Enter a whole-number annual amount." })
    .int("Use a whole-number annual amount.")
    .min(0, "Compensation cannot be negative.")
    .max(10_000_000, "Enter an annual amount below 10,000,000."),
);

export const searchStrategySchema = z
  .object({
    primaryTitle: z.string().trim().min(2, "Add your primary target title.").max(100),
    adjacentTitles: commaSeparatedList(0, ""),
    seniorityLevels: commaSeparatedList(1, "Add at least one seniority level."),
    workArrangements: commaSeparatedList(1, "Add at least one work arrangement."),
    locations: commaSeparatedList(1, "Add at least one acceptable location."),
    workAuthorization: z.string().trim().min(2, "Describe where you are authorized to work.").max(240),
    sponsorshipRequired: z.preprocess((value) => value === "true" || value === "on", z.boolean()),
    minimumCompensation: compensation,
    targetCompensation: compensation,
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a three-letter currency code, such as USD."),
    hardBlockers: lineSeparatedList,
    softPreferences: lineSeparatedList,
    weeklyHours: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.coerce.number({ error: "Enter your weekly time budget." }).int().min(1, "Set aside at least one hour.").max(80, "Enter 80 hours or fewer."),
    ),
  })
  .refine((value) => value.targetCompensation >= value.minimumCompensation, {
    path: ["targetCompensation"],
    message: "Target compensation must be at least the minimum.",
  });

export type SearchStrategyInput = z.infer<typeof searchStrategySchema>;
