"use server";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/action-form";
import { notificationSchema } from "@/lib/notifications/preferences";
import { saveNotificationPreferences } from "@/lib/notifications/repository";
export async function savePreferences(
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  const parsed = notificationSchema.safeParse({
    ...Object.fromEntries(data),
    eventKinds: data.getAll("eventKinds"),
    enabled: data.get("enabled") === "on",
    quietEnabled: data.get("quietEnabled") === "on",
    urgentBypass: data.get("urgentBypass") === "on",
  });
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  try {
    saveNotificationPreferences(parsed.data);
  } catch {
    return {
      message:
        "Preferences could not be saved. Your choices are still here; try again.",
    };
  }
  revalidatePath("/notifications");
  return { success: true, message: "Notification preferences saved." };
}
