"use server";


import { requireOwner } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";

import {
  addTimelineNote,
  createApplicationAnswer,
  createArtifact,
  createOutreachDraft,
  createTask,
  saveNextAction,
  setChecklistItem,
  setTaskCompleted,
  submitApplication,
  updateApplicationAnswer,
  updateStage,
} from "@/lib/applications/repository";
import { createInterview } from "@/lib/applications/pipeline";
import {
  applicationAnswerSchema,
  artifactSchema,
  interviewSchema,
  nextActionSchema,
  outreachSchema,
  submissionSchema,
  stageTransitionSchema,
  taskSchema,
} from "@/lib/applications/validation";

export type ApplicationActionState = { success?: boolean; message?: string; errors?: Record<string, string[] | undefined> };

function failure(error: unknown, fallback: string): ApplicationActionState {
  return { message: error instanceof Error ? error.message : fallback };
}

function refresh(jobId: string) {
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  revalidatePath("/pipeline");
}

export async function updateStageAction(jobId: string, _state: ApplicationActionState, formData: FormData): Promise<ApplicationActionState> {
  await requireOwner();
  const parsed = stageTransitionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check the stage change.", errors: parsed.error.flatten().fieldErrors };
  try { await updateStage(jobId, parsed.data); refresh(jobId); return { success: true, message: "Stage updated." }; }
  catch (error) { return failure(error, "Could not update the stage."); }
}

export async function saveNextActionAction(jobId: string, _state: ApplicationActionState, formData: FormData): Promise<ApplicationActionState> {
  await requireOwner();
  const parsed = nextActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Check the next action.", errors: parsed.error.flatten().fieldErrors };
  try { await saveNextAction(jobId, parsed.data); refresh(jobId); return { success: true, message: "Next action saved." }; }
  catch (error) { return failure(error, "Could not save the next action."); }
}

export async function setChecklistItemAction(jobId: string, itemId: string, formData: FormData) {
  await requireOwner();
  await setChecklistItem(jobId, itemId, formData.get("checked") === "true");
  refresh(jobId);
}

export async function createTaskAction(jobId: string, _state: ApplicationActionState, formData: FormData): Promise<ApplicationActionState> {
  await requireOwner();
  const parsed = taskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Check the task.", errors: parsed.error.flatten().fieldErrors };
  try { await createTask(jobId, parsed.data); refresh(jobId); return { success: true, message: "Task added." }; }
  catch (error) { return failure(error, "Could not add the task."); }
}

export async function createInterviewAction(jobId: string, _state: ApplicationActionState, formData: FormData): Promise<ApplicationActionState> {
  await requireOwner();
  const parsed = interviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check the interview round.", errors: parsed.error.flatten().fieldErrors };
  try { await createInterview(jobId, parsed.data); refresh(jobId); return { success: true, message: "Interview round scheduled." }; }
  catch (error) { return failure(error, "Could not schedule the interview."); }
}

export async function setTaskCompletedAction(jobId: string, taskId: string, formData: FormData) {
  await requireOwner();
  await setTaskCompleted(jobId, taskId, formData.get("completed") === "true");
  refresh(jobId);
}

export async function createAnswerAction(jobId: string, _state: ApplicationActionState, formData: FormData): Promise<ApplicationActionState> {
  await requireOwner();
  const values = Object.fromEntries(formData);
  if (values.canonicalAnswerId === "new") values.canonicalAnswerId = "";
  const parsed = applicationAnswerSchema.safeParse(values);
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check the answer.", errors: parsed.error.flatten().fieldErrors };
  try { await createApplicationAnswer(jobId, parsed.data); refresh(jobId); return { success: true, message: "Answer added to this application." }; }
  catch (error) { return failure(error, "Could not add the answer."); }
}

export async function updateAnswerAction(jobId: string, answerId: string, formData: FormData) {
  await requireOwner();
  const answer = String(formData.get("answer") ?? "").trim();
  if (!answer || answer.length > 8000) return;
  await updateApplicationAnswer(jobId, answerId, answer);
  refresh(jobId);
}

export async function createArtifactAction(jobId: string, _state: ApplicationActionState, formData: FormData): Promise<ApplicationActionState> {
  await requireOwner();
  const parsed = artifactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Check the document.", errors: parsed.error.flatten().fieldErrors };
  try { await createArtifact(jobId, parsed.data); refresh(jobId); return { success: true, message: "Document added." }; }
  catch (error) { return failure(error, "Could not add the document."); }
}

export async function createOutreachAction(jobId: string, _state: ApplicationActionState, formData: FormData): Promise<ApplicationActionState> {
  await requireOwner();
  const parsed = outreachSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Check the outreach draft.", errors: parsed.error.flatten().fieldErrors };
  try { await createOutreachDraft(jobId, parsed.data); refresh(jobId); return { success: true, message: "Private draft saved." }; }
  catch (error) { return failure(error, "Could not save the draft."); }
}

export async function addTimelineNoteAction(jobId: string, formData: FormData) {
  await requireOwner();
  const note = String(formData.get("note") ?? "").trim();
  if (!note || note.length > 4000) return;
  await addTimelineNote(jobId, note);
  refresh(jobId);
}

export async function submitApplicationAction(jobId: string, _state: ApplicationActionState, formData: FormData): Promise<ApplicationActionState> {
  await requireOwner();
  const parsed = submissionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check the submission details.", errors: parsed.error.flatten().fieldErrors };
  try { await submitApplication(jobId, parsed.data); refresh(jobId); return { success: true, message: "Submission recorded with immutable snapshots." }; }
  catch (error) { return failure(error, "Could not record the submission."); }
}
