import { z } from "zod";

export const kinds = ["experience", "achievement", "skill", "education", "project"] as const;
export type ProposalKind = typeof kinds[number];
export type Fields = Record<string, string>;
export type ExtractedProposal = { sourceKey: string; kind: ProposalKind; sourceQuote: string; fields: Fields };
export type Proposal = ExtractedProposal & { id: string; importId: string; state: "pending" | "approved" | "rejected"; evidenceId: string | null; revision: number };
export const fieldLabels: Record<ProposalKind, Record<string, string>> = {
  experience: { title: "Role title", company: "Company", startDate: "Started (YYYY-MM)", endDate: "Ended (YYYY-MM)", isCurrent: "Current role", location: "Location", summary: "Role summary", technologies: "Technologies" },
  achievement: { experienceId: "Related experience", problem: "Problem or context", action: "Your action", result: "Result", measurableOutcome: "Measurable outcome", tools: "Tools" },
  skill: { name: "Skill", context: "How you used it", recency: "Last used", proficiency: "Proficiency" },
  education: { title: "Qualification", organization: "Institution", description: "Description", startDate: "Started (YYYY-MM)", endDate: "Ended (YYYY-MM)" },
  project: { title: "Project name", organization: "Organization", description: "Description", startDate: "Started (YYYY-MM)", endDate: "Ended (YYYY-MM)" },
};
export function emptyFields(kind: ProposalKind): Fields {
  return Object.fromEntries(Object.keys(fieldLabels[kind]).map(key => [key, ""]));
}
export function parseFields(kind: ProposalKind, input: unknown): Fields {
  const values = z.record(z.string(), z.string().max(2000)).parse(input);
  return Object.fromEntries(Object.keys(fieldLabels[kind]).map(key => [key, (values[key] || "").trim()]));
}
const month = z.union([z.literal(""), z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM or leave unknown dates blank.")]);
export function validateApproval(kind: ProposalKind, fields: Fields) {
  const text = (max: number) => z.string().trim().min(1, "Complete the required fields before approval.").max(max);
  if (kind === "experience") {
    z.object({ title: text(160), company: text(160), startDate: month.refine(Boolean, "Confirm the start month before approval."), endDate: month, isCurrent: z.enum(["true", "false"]) }).parse(fields);
    if (fields.isCurrent !== "true" && !fields.endDate) throw new Error("Confirm the end month or mark this as a current role.");
  } else if (kind === "achievement") {
    z.object({ experienceId: z.string().uuid("Choose an approved experience."), problem: text(1500), action: text(2000), result: text(1500) }).parse(fields);
  } else if (kind === "skill") {
    z.object({ name: text(100), recency: z.enum(["current", "recent", "past"], { error: "Choose when you last used this skill." }), proficiency: z.enum(["learning", "working", "advanced", "expert"], { error: "Choose your proficiency." }) }).parse(fields);
  } else {
    z.object({ title: text(200), description: text(2000), startDate: month, endDate: month }).parse(fields);
  }
  if (fields.startDate && fields.endDate && fields.endDate < fields.startDate) throw new Error("The end date cannot precede the start date.");
}
