"use server";

import { revalidatePath } from "next/cache";

import { createCompanyResearchEntry, saveOpportunityResearch, updateResearchSourceState } from "@/lib/research/repository";
import { companyResearchSchema, opportunityResearchSchema, researchSourceStateSchema } from "@/lib/research/validation";

type CompanyResearchField = keyof typeof companyResearchSchema.shape;

export type CompanyResearchState = {
  errors?: Partial<Record<CompanyResearchField, string[]>>;
  message?: string;
  saved?: boolean;
};

export type OpportunityResearchState = { message?: string; error?: boolean };

export async function createCompanyResearchAction(
  jobId: string,
  _previousState: CompanyResearchState,
  formData: FormData,
): Promise<CompanyResearchState> {
  // Authentication and ownership checks belong here before hosted use.
  const parsed = companyResearchSchema.safeParse({
    topic: formData.get("topic"),
    content: formData.get("content"),
    provenance: formData.get("provenance"),
    sourceUrl: formData.get("sourceUrl"),
    sourceState: formData.get("sourceState"),
    accessedAt: formData.get("accessedAt"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: "Check the research entry and try again." };
  }

  const entryId = await createCompanyResearchEntry(jobId, parsed.data);
  if (!entryId) return { message: "This job no longer exists." };

  revalidatePath(`/jobs/${jobId}`);
  return { message: "Added to the company library.", saved: true };
}

export async function saveOpportunityResearchAction(
  jobId: string,
  _previousState: OpportunityResearchState,
  formData: FormData,
): Promise<OpportunityResearchState> {
  // Authentication and ownership checks belong here before hosted use.
  const parsed = opportunityResearchSchema.safeParse({ content: formData.get("content") });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check the note and try again.", error: true };

  const saved = await saveOpportunityResearch(jobId, parsed.data);
  if (!saved) return { message: "This job no longer exists.", error: true };

  revalidatePath(`/jobs/${jobId}`);
  return { message: "Application research saved." };
}

export async function updateResearchSourceStateAction(jobId: string, entryId: string, formData: FormData) {
  // Authentication and ownership checks belong here before hosted use.
  const parsed = researchSourceStateSchema.safeParse({ sourceState: formData.get("sourceState") });
  if (!parsed.success) return;

  await updateResearchSourceState(jobId, entryId, parsed.data.sourceState);
  revalidatePath(`/jobs/${jobId}`);
}
