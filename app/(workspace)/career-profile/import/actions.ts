"use server";


import { requireOwner } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { sqlite } from "@/lib/db";
import { addProposal, deleteImport, getImport, retryExtraction, reviewProposal } from "@/lib/resume-import/storage";
import { fieldLabels, kinds, type ProposalKind } from "@/lib/resume-import/model";

export type ReviewState = { message?: string; revision?: number; error?: boolean };
function message(error: unknown) {
  if (error instanceof ZodError) return error.issues[0]?.message || "Check the proposal fields.";
  if (error instanceof Error && !error.message.includes("SQLITE") && !error.message.includes("constraint")) return error.message;
  return "The change could not be saved. Your input is still here; retry.";
}
function refresh(id: string) {
  revalidatePath(`/career-profile/import/${id}`); revalidatePath("/career-profile/import");
  revalidatePath("/career-profile"); revalidatePath("/career-profile/library");
  revalidatePath("/resumes"); revalidatePath("/");
}
export async function reviewFact(importId: string, proposalId: string, _state: ReviewState, form: FormData): Promise<ReviewState> {
  await requireOwner();
  try {
    const record = getImport(sqlite, importId);
    const proposal = record?.proposals.find(p => p.id === proposalId);
    if (!proposal) throw new Error("Proposal not found.");
    const action = form.get("decision");
    if (action !== "save" && action !== "approve" && action !== "reject") throw new Error("Choose a review action.");
    if (action === "approve" && form.get("confirmed") !== "on") throw new Error("Confirm that you checked this fact against the source before approving.");
    const fields = Object.fromEntries(Object.keys(fieldLabels[proposal.kind]).map(key => [key, String(form.get(key) || "")]));
    reviewProposal(sqlite, proposalId, Number(form.get("revision")), action, fields, form.get("acknowledgeMatch") === "on");
    const revision = getImport(sqlite, importId)?.proposals.find(p => p.id === proposalId)?.revision;
    refresh(importId);
    return { message: action === "save" ? "Draft saved." : action === "approve" ? "Fact approved and added to your evidence bank." : "Proposal rejected.", revision };
  } catch (error) { return { error: true, message: message(error) }; }
}
export async function addFact(importId: string, _state: ReviewState, form: FormData): Promise<ReviewState> {
  await requireOwner();
  try {
    const kind = String(form.get("kind")) as ProposalKind;
    if (!kinds.includes(kind)) throw new Error("Choose a fact type.");
    addProposal(sqlite, importId, kind, String(form.get("quote") || "")); refresh(importId);
    return { message: "Proposal added. Review and complete its fields below." };
  } catch (error) { return { error: true, message: message(error) }; }
}
export async function retryImport(importId: string): Promise<ReviewState> {
  await requireOwner();
  try { const added = retryExtraction(sqlite, importId); refresh(importId); return { message: `${added} new proposals. Existing edits and decisions were kept.` }; }
  catch { return { error: true, message: "Extraction could not finish. Saved text and review progress are still here; retry." }; }
}
export async function removeImport(importId: string, _state: ReviewState, form: FormData): Promise<ReviewState> {
  await requireOwner();
  if (form.get("confirmation") !== "DELETE") return { error: true, message: "Type DELETE to remove the saved source and proposals." };
  try { deleteImport(sqlite, importId); }
  catch { return { error: true, message: "The import could not be removed. Try again." }; }
  revalidatePath("/career-profile/import"); redirect("/career-profile/import");
}
