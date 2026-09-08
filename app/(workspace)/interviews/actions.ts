"use server";

import { requireOwner } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  applicationInterviews,
  applicationEvents,
  interviewPlans,
  interviewPractice,
  opportunities,
  pipelineStages,
  jobs,
} from "@/lib/db/schema";
import {
  roundPlanSchema,
  debriefSchema,
  practiceSchema,
} from "@/lib/interviews/validation";
import {
  terminalStageCategories,
  type PipelineStageCategory,
} from "@/lib/applications/types";
import type { FormState } from "@/components/action-form";

function refresh(id: string, jobId: string) {
  revalidatePath(`/interviews/${id}`);
  revalidatePath("/interviews");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/pipeline");
  revalidatePath("/");
}
export async function saveRoundAction(
  id: string | null,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  await requireOwner();
  const parsed = roundPlanSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  try {
    const existing = id
      ? await db
          .select()
          .from(applicationInterviews)
          .where(eq(applicationInterviews.id, id))
          .get()
      : null;
    const jobId = existing?.jobId ?? String(form.get("jobId") ?? "");
    if (id && !existing) throw new Error("Interview not found.");
    if (!(await db.select().from(jobs).where(eq(jobs.id, jobId)).get()))
      throw new Error("Choose an existing opportunity.");
    const now = new Date();
    const key = id ?? crypto.randomUUID();
    const { label, scheduledAt, status, ...plan } = parsed.data;
    db.transaction((tx) => {
      if (id)
        tx.update(applicationInterviews)
          .set({ label, scheduledAt, status, updatedAt: now })
          .where(eq(applicationInterviews.id, id))
          .run();
      else
        tx.insert(applicationInterviews)
          .values({
            id: key,
            jobId,
            label,
            scheduledAt,
            status,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      tx.insert(interviewPlans)
        .values({ interviewId: key, ...plan, updatedAt: now })
        .onConflictDoUpdate({
          target: interviewPlans.interviewId,
          set: { ...plan, updatedAt: now },
        })
        .run();
      tx.insert(applicationEvents)
        .values({
          id: crypto.randomUUID(),
          jobId,
          kind: "note",
          title: id ? "Interview plan updated" : "Interview scheduled",
          detail: `${label} · ${status}`,
          occurredAt: now,
        })
        .run();
    });
    refresh(key, jobId);
    return { success: true, message: "Interview plan saved." };
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : "Could not save interview.",
    };
  }
}
export async function saveDebriefAction(
  id: string,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  await requireOwner();
  const parsed = debriefSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  try {
    const round = await db
      .select()
      .from(applicationInterviews)
      .where(eq(applicationInterviews.id, id))
      .get();
    if (!round) throw new Error("Interview not found.");
    if (round.status === "cancelled")
      throw new Error("Reopen the cancelled round before adding a debrief.");
    if (round.scheduledAt > new Date())
      throw new Error(
        "Record the debrief after the interview time, or correct its schedule first.",
      );
    const opportunity = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.jobId, round.jobId))
      .get();
    if (!opportunity) throw new Error("Opportunity not found.");
    const stage = await db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.key, opportunity.stage))
      .get();
    const terminal =
      stage?.isTerminal ||
      terminalStageCategories.has(opportunity.stage as PipelineStageCategory);
    const now = new Date();
    const { nextActionDueAt, ...values } = parsed.data;
    db.transaction((tx) => {
      tx.insert(interviewPlans)
        .values({
          interviewId: id,
          ...values,
          debriefedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: interviewPlans.interviewId,
          set: { ...values, debriefedAt: now, updatedAt: now },
        })
        .run();
      tx.update(applicationInterviews)
        .set({ status: "completed", updatedAt: now })
        .where(eq(applicationInterviews.id, id))
        .run();
      if (!terminal)
        tx.update(opportunities)
          .set({
            nextAction: values.nextAction,
            nextActionDueAt,
            waiting: false,
            waitingReason: null,
            updatedAt: now,
          })
          .where(eq(opportunities.jobId, round.jobId))
          .run();
      tx.insert(applicationEvents)
        .values({
          id: crypto.randomUUID(),
          jobId: round.jobId,
          kind: "note",
          title: "Interview debrief recorded",
          detail:
            "Private debrief saved; review the pipeline stage and next action.",
          occurredAt: now,
        })
        .run();
    });
    refresh(id, round.jobId);
    return {
      success: true,
      message: terminal
        ? "Debrief saved. The closed opportunity remains closed."
        : "Debrief saved, round completed, and next action updated. Review the pipeline stage when ready.",
    };
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : "Could not save debrief.",
    };
  }
}
export async function savePracticeAction(
  id: string,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  await requireOwner();
  const parsed = practiceSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  try {
    const round = await db
      .select()
      .from(applicationInterviews)
      .where(eq(applicationInterviews.id, id))
      .get();
    if (!round) throw new Error("Interview not found.");
    await db
      .insert(interviewPractice)
      .values({
        id: crypto.randomUUID(),
        interviewId: id,
        ...parsed.data,
        createdAt: new Date(),
      });
    refresh(id, round.jobId);
    return {
      success: true,
      message:
        "Practice session saved as private notes, separate from verified career evidence.",
    };
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Could not save practice session.",
    };
  }
}
