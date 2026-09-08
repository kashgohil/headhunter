import { describe, expect, test } from "bun:test";
import {
  defaultPreferences,
  isQuietTime,
  notificationReason,
  notificationSchema,
  urgency,
} from "@/lib/notifications/preferences";
import type { Alert } from "@/lib/command-center/overview";
const now = new Date("2026-09-08T18:00:00Z");
const alert: Alert = {
  key: "task:1",
  kind: "task",
  title: "Task",
  source: "Job",
  href: "/jobs/1",
  reason: "Do it",
  dueAt: null,
  rank: 0,
};
describe("notification delivery preferences", () => {
  test("classifies urgency from dates rather than ranking or priority", () => {
    expect(urgency({ ...alert, rank: 9999 }, now)).toBe("routine");
    expect(urgency({ ...alert, dueAt: "2026-09-08T00:00:00Z" }, now)).toBe(
      "urgent",
    );
    expect(urgency({ ...alert, dueAt: "2026-09-10T00:00:00Z" }, now)).toBe(
      "upcoming",
    );
    expect(urgency({ ...alert, dueAt: "2026-10-10T00:00:00Z" }, now)).toBe(
      "routine",
    );
  });
  test("honors overnight quiet hours in the selected time zone with exclusive end", () => {
    const p = {
      ...defaultPreferences,
      quietEnabled: true,
      timeZone: "Asia/Kolkata",
    };
    expect(isQuietTime(p, now)).toBe(true);
    expect(isQuietTime(p, new Date("2026-09-08T16:30:00Z"))).toBe(true);
    expect(isQuietTime(p, new Date("2026-09-09T02:30:00Z"))).toBe(false);
    expect(
      isQuietTime(
        { ...p, quietStart: "09:00", quietEnd: "17:00" },
        new Date("2026-09-08T06:00:00Z"),
      ),
    ).toBe(true);
  });
  test("uses local wall time across daylight saving transitions", () => {
    const p = {
      ...defaultPreferences,
      quietEnabled: true,
      timeZone: "America/New_York",
      quietStart: "01:00",
      quietEnd: "03:00",
    };
    expect(isQuietTime(p, new Date("2026-11-01T05:30:00Z"))).toBe(true);
    expect(isQuietTime(p, new Date("2026-11-01T06:30:00Z"))).toBe(true);
    expect(isQuietTime(p, new Date("2026-11-01T08:00:00Z"))).toBe(false);
  });
  test("urgent bypass never overrides disabled delivery or event types", () => {
    const p = {
      ...defaultPreferences,
      quietEnabled: true,
      timeZone: "Asia/Kolkata",
    };
    const urgent = { ...alert, dueAt: now.toISOString() };
    expect(notificationReason(alert, p, now)).toBe("Held during quiet hours");
    expect(notificationReason(urgent, p, now)).toBeNull();
    expect(notificationReason(urgent, { ...p, urgentBypass: false }, now)).toBe(
      "Held during quiet hours",
    );
    expect(notificationReason(urgent, { ...p, enabled: false }, now)).toBe(
      "Notifications paused",
    );
    expect(notificationReason(urgent, { ...p, eventKinds: [] }, now)).toBe(
      "Event type disabled",
    );
    expect(
      notificationReason(alert, { ...p, minimumUrgency: "upcoming" }, now),
    ).toBe("Below your urgency threshold");
  });
  test("rejects invalid clocks, zones, event types and equal quiet boundaries", () => {
    for (const patch of [
      { quietStart: "24:00" },
      { timeZone: "invalid/zone" },
      { eventKinds: ["unknown"] },
      { quietEnabled: true, quietEnd: "22:00" },
    ])
      expect(
        notificationSchema.safeParse({ ...defaultPreferences, ...patch })
          .success,
      ).toBe(false);
    expect(notificationSchema.safeParse(defaultPreferences).success).toBe(true);
  });
});
