import { z } from "zod";

const optionalDate = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().date("Use a valid access date.").nullable(),
);

const optionalWebUrl = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().max(2_048, "The source URL is too long.").url("Enter a complete source URL.").refine(
    (value) => ["http:", "https:"].includes(new URL(value).protocol),
    "Use an http or https source URL.",
  ).nullable(),
);

export const companyResearchSchema = z.object({
  topic: z.enum(["product", "team", "culture", "compensation", "interview_process", "contact", "open_question"]),
  content: z.string().trim().min(2, "Add a useful research note.").max(4_000, "Keep this entry under 4,000 characters."),
  provenance: z.enum(["sourced_fact", "user_note", "inference"]),
  sourceUrl: optionalWebUrl,
  sourceState: z.preprocess(
    (value) => typeof value === "string" && ["", "unlinked"].includes(value.trim()) ? null : value,
    z.enum(["current", "stale", "inaccessible"]).nullable(),
  ),
  accessedAt: optionalDate,
}).superRefine((value, context) => {
  if (value.provenance === "sourced_fact" && !value.sourceUrl) {
    context.addIssue({ code: "custom", path: ["sourceUrl"], message: "Link the source for a sourced fact." });
  }
  if (value.sourceState && !value.sourceUrl) {
    context.addIssue({ code: "custom", path: ["sourceUrl"], message: "Add the URL whose source state you are tracking." });
  }
  if (value.accessedAt && !value.sourceUrl) {
    context.addIssue({ code: "custom", path: ["sourceUrl"], message: "Add the URL accessed on this date." });
  }
});

export const opportunityResearchSchema = z.object({
  content: z.string().trim().max(12_000, "Keep application-specific notes under 12,000 characters."),
});

export const researchSourceStateSchema = z.object({
  sourceState: z.enum(["current", "stale", "inaccessible"]),
});

export type CompanyResearchInput = z.infer<typeof companyResearchSchema>;
export type OpportunityResearchInput = z.infer<typeof opportunityResearchSchema>;
export type ResearchSourceState = z.infer<typeof researchSourceStateSchema>["sourceState"];
