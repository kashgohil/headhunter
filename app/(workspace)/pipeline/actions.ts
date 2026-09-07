"use server";

import { revalidatePath } from "next/cache";

import { createCustomStage, updatePipelineMetadata } from "@/lib/applications/pipeline";
import { customStageSchema, pipelineMetadataSchema } from "@/lib/applications/validation";

export type PipelineActionState = { success?: boolean; message?: string };

export async function createCustomStageAction(_state: PipelineActionState, formData: FormData): Promise<PipelineActionState> {
  const parsed = customStageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check the stage." };
  try {
    await createCustomStage(parsed.data);
    revalidatePath("/pipeline");
    return { success: true, message: "Custom stage added." };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Could not add the stage." };
  }
}

export async function updatePipelineMetadataAction(jobId: string, formData: FormData) {
  const parsed = pipelineMetadataSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await updatePipelineMetadata(jobId, parsed.data);
  revalidatePath("/pipeline");
  revalidatePath(`/jobs/${jobId}`);
}
