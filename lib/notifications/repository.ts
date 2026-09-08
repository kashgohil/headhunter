import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditEvents, notificationPreferences } from "@/lib/db/schema";
import {
  defaultPreferences,
  notificationSchema,
  type NotificationPreferences,
} from "@/lib/notifications/preferences";
export function getNotificationPreferences() {
  const row = db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.id, "local"))
    .get();
  const parsed = notificationSchema.safeParse(row?.settings);
  return parsed.success ? parsed.data : defaultPreferences;
}
export function saveNotificationPreferences(input: NotificationPreferences) {
  const settings = notificationSchema.parse(input);
  db.transaction((tx) => {
    const values = { id: "local", settings, updatedAt: new Date() };
    tx.insert(notificationPreferences)
      .values(values)
      .onConflictDoUpdate({ target: notificationPreferences.id, set: values })
      .run();
    tx.insert(auditEvents)
      .values({
        id: crypto.randomUUID(),
        action: "notifications.updated",
        entityType: "notification_preferences",
        entityId: "local",
        occurredAt: new Date(),
      })
      .run();
  });
}
