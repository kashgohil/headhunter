"use server";

import { requireOwner } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sqlite } from "@/lib/db";
import {
  createExperiment,
  listExperiments,
  saveAnnotation,
  updateExperiment,
  type SavedExperiment,
} from "@/lib/analytics/storage";
import { evaluateExperiment } from "@/lib/analytics/segments";
import { getAnalyticsInput } from "@/lib/analytics/repository";
export type AnalyticsFormState = {
  message?: string;
  success?: boolean;
  revision?: number;
};
function failure(error: unknown, revision?: number): AnalyticsFormState {
  return {
    message:
      error instanceof Error
        ? error.message
        : "Could not save. Your input is still here; try again.",
    revision,
  };
}
export async function createExperimentAction(
  _state: AnalyticsFormState,
  data: FormData,
): Promise<AnalyticsFormState> {
  await requireOwner();
  let id: string;
  try {
    id = createExperiment(sqlite, Object.fromEntries(data));
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/analytics");
  redirect(`/analytics/experiments/${id}`);
}
export async function saveAnnotationAction(
  jobId: string,
  state: AnalyticsFormState,
  data: FormData,
): Promise<AnalyticsFormState> {
  await requireOwner();
  try {
    const revision = saveAnnotation(
      sqlite,
      jobId,
      Number(data.get("revision")),
      Object.fromEntries(data),
    );
    revalidatePath("/analytics", "layout");
    return { success: true, message: "Annotations saved.", revision };
  } catch (error) {
    return failure(error, state.revision);
  }
}
export async function updateExperimentAction(
  id: string,
  state: AnalyticsFormState,
  data: FormData,
): Promise<AnalyticsFormState> {
  await requireOwner();
  try {
    const revision = sqlite
      .transaction(() => {
        const experiment = listExperiments(sqlite).find(
          (item) => item.id === id,
        );
        if (!experiment) throw new Error("Experiment unavailable.");
        const now = new Date();
        const result =
          data.get("status") === "completed" && experiment.status === "running"
            ? evaluateExperiment(getAnalyticsInput(now), experiment.plan, now)
            : undefined;
        return updateExperiment(
          sqlite,
          id,
          Number(data.get("revision")),
          data.get("status") as SavedExperiment["status"],
          String(data.get("notes") ?? ""),
          result,
        );
      })
      .immediate();
    revalidatePath("/analytics", "layout");
    return { success: true, message: "Experiment saved.", revision };
  } catch (error) {
    return failure(error, state.revision);
  }
}
