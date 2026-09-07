"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateAlertPreference } from "@/lib/command-center/repository";

export async function updateAlertAction(
  _state: { message?: string },
  formData: FormData,
) {
  const parsed = z
    .object({
      key: z.string().min(1).max(2000),
      operation: z.enum(["dismiss", "snooze", "restore"]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Choose a valid alert action." };
  try {
    await updateAlertPreference(parsed.data.key, parsed.data.operation);
    revalidatePath("/");
    return {};
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Could not update this alert. Try again.",
    };
  }
}
