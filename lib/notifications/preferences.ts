import { z } from "zod";
import { isAlertOverdue, type Alert } from "@/lib/command-center/overview";
export const eventLabels = {
  deadline: "Application deadlines",
  interview: "Interviews",
  action: "Next actions",
  task: "Tasks",
  contact: "Contact follow-ups",
  stalled: "Stalled applications",
  quality: "Data checks",
  opportunity: "Priority roles",
  setup: "Getting started",
} as const;
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const notificationSchema = z
  .object({
    enabled: z.boolean(),
    eventKinds: z.array(
      z.enum(Object.keys(eventLabels) as [Alert["kind"], ...Alert["kind"][]]),
    ),
    minimumUrgency: z.enum(["all", "upcoming", "urgent"]),
    quietEnabled: z.boolean(),
    quietStart: time,
    quietEnd: time,
    timeZone: z
      .string()
      .max(100)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, "Choose a valid IANA time zone, such as Asia/Kolkata."),
    urgentBypass: z.boolean(),
  })
  .refine(
    (value) => !value.quietEnabled || value.quietStart !== value.quietEnd,
    { message: "Quiet hours must have different start and end times." },
  );
export type NotificationPreferences = z.infer<typeof notificationSchema>;
export const defaultPreferences: NotificationPreferences = {
  enabled: true,
  eventKinds: Object.keys(eventLabels) as Alert["kind"][],
  minimumUrgency: "all",
  quietEnabled: false,
  quietStart: "22:00",
  quietEnd: "08:00",
  timeZone: "UTC",
  urgentBypass: true,
};
export function isQuietTime(preferences: NotificationPreferences, now: Date) {
  if (!preferences.quietEnabled) return false;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: preferences.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const local = `${parts.find((p) => p.type === "hour")!.value}:${parts.find((p) => p.type === "minute")!.value}`;
  return preferences.quietStart < preferences.quietEnd
    ? local >= preferences.quietStart && local < preferences.quietEnd
    : local >= preferences.quietStart || local < preferences.quietEnd;
}
export function urgency(
  alert: Alert,
  now: Date,
): "urgent" | "upcoming" | "routine" {
  if (!alert.dueAt) return "routine";
  const difference = new Date(alert.dueAt).getTime() - now.getTime();
  if (isAlertOverdue(alert, now) || difference <= 86400000) return "urgent";
  return difference <= 7 * 86400000 ? "upcoming" : "routine";
}
export function notificationReason(
  alert: Alert,
  preferences: NotificationPreferences,
  now: Date,
): string | null {
  if (!preferences.enabled) return "Notifications paused";
  if (!preferences.eventKinds.includes(alert.kind))
    return "Event type disabled";
  const level = urgency(alert, now);
  if (
    (preferences.minimumUrgency === "urgent" && level !== "urgent") ||
    (preferences.minimumUrgency === "upcoming" && level === "routine")
  )
    return "Below your urgency threshold";
  if (
    isQuietTime(preferences, now) &&
    !(preferences.urgentBypass && level === "urgent")
  )
    return "Held during quiet hours";
  return null;
}
