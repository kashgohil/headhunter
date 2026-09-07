import { z } from "zod";

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(maximum).nullable(),
  );

const optionalAmount = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.coerce.number({ error: "Enter a whole-number annual amount." }).int().min(0).max(10_000_000).nullable(),
);

const optionalDate = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().date("Use a valid date.").nullable(),
);

function uniqueLines(value: unknown) {
  if (typeof value !== "string") return value;

  return [...new Set(value.split(/\n/).map((item) => item.trim()).filter(Boolean))];
}

const lineList = z.preprocess(
  uniqueLines,
  z.array(z.string().max(500)).max(40, "Keep this list to 40 items or fewer."),
);

export const webUrl = z.string().trim().max(2_048, "The URL is too long.").refine((value) => {
    if (value.length === 0 || !URL.canParse(value)) return value.length === 0;

    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  }, "Enter a complete http or https URL.");

export const jobMetadataSchema = z.object({
  title: z.string().trim().min(1, "Add the role title.").max(160),
  company: z.string().trim().min(1, "Add the company name.").max(160),
  location: optionalText(160),
  employmentType: optionalText(100),
  workArrangement: z.enum(["remote", "hybrid", "on_site", "unknown"]),
  seniority: optionalText(100),
  minimumCompensation: optionalAmount,
  maximumCompensation: optionalAmount,
  compensationCurrency: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a three-letter currency code.").nullable(),
  ),
  postedAt: optionalDate,
  applicationDeadline: optionalDate,
  responsibilities: lineList,
  requiredQualifications: lineList,
  preferredQualifications: lineList,
  skills: lineList,
  technologies: lineList,
}).refine(
  (value) => value.maximumCompensation === null || value.minimumCompensation === null || value.maximumCompensation >= value.minimumCompensation,
  { path: ["maximumCompensation"], message: "Maximum compensation must be at least the minimum." },
);

export const createJobSchema = z.object({
  sourceType: z.enum(["pasted", "manual"]),
  title: z.string().trim().min(1, "Add the role title.").max(160),
  company: z.string().trim().min(1, "Add the company name.").max(160),
  location: optionalText(160),
  sourceUrl: webUrl,
  originalDescription: z.string().max(100_000, "The description is too long."),
}).superRefine((value, context) => {
  if (value.sourceType === "pasted" && value.originalDescription.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["originalDescription"],
      message: "Paste the original job description.",
    });
  }
});

export const urlImportSchema = z.object({ sourceUrl: webUrl.refine(Boolean, "Add a job URL.") });

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type JobMetadataInput = z.infer<typeof jobMetadataSchema>;
