import { z } from "zod";

export const createJobSchema = z.object({
  title: z.string().trim().min(1, "Add the role title.").max(160),
  company: z.string().trim().min(1, "Add the company name.").max(160),
  location: z.string().trim().max(160).optional(),
  sourceUrl: z.string().trim().refine((value) => {
    if (value.length === 0 || !URL.canParse(value)) return value.length === 0;

    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  }, "Enter a complete http or https URL.").optional(),
  originalDescription: z.string().min(1, "Paste the original job description.").max(100_000, "The description is too long."),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
