import { describe, expect, test } from "bun:test";

import { decryptCalendarCredentials, encryptCalendarCredentials } from "@/lib/calendar/credentials";
import { googleAuthorizationUrl, googleCalendarScopes, listGoogleEvents, normalizeGoogleEvent } from "@/lib/calendar/google";

describe("Google Calendar integration boundary", () => {
  test("requests only the two documented read-only scopes", () => {
    const url = googleAuthorizationUrl("state-value", { clientId: "client", clientSecret: "secret", redirectUri: "http://localhost:3050/api/calendar/google/callback" });
    expect(url.searchParams.get("scope")?.split(" ")).toEqual([...googleCalendarScopes]);
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("state")).toBe("state-value");
    expect(url.searchParams.get("scope")).not.toContain("https://www.googleapis.com/auth/calendar ");
  });

  test("encrypts credentials with authenticated encryption", () => {
    const key = Buffer.alloc(32, 7).toString("base64");
    const credentials = { accessToken: "access-secret", refreshToken: "refresh-secret", expiresAt: 123 };
    const encrypted = encryptCalendarCredentials(credentials, key);
    expect(encrypted).not.toContain("secret");
    expect(decryptCalendarCredentials(encrypted, key)).toEqual(credentials);
    expect(() => decryptCalendarCredentials(`${encrypted.slice(0, -1)}x`, key)).toThrow();
  });

  test("preserves recurring identity and handles daylight-saving all-day boundaries", () => {
    const event = normalizeGoogleEvent({
      id: "series_20260308",
      summary: "Panel interview",
      status: "confirmed",
      start: { date: "2026-03-08" },
      end: { date: "2026-03-09" },
      recurringEventId: "series",
      originalStartTime: { date: "2026-03-08", timeZone: "America/New_York" },
      updated: "2026-02-01T12:00:00Z",
    }, "America/New_York");
    expect(event?.providerEventId).toBe("series_20260308");
    expect(event?.recurringEventId).toBe("series");
    expect(event?.originalStartTime).toBe("2026-03-08");
    expect(event?.startAt?.toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(event?.endAt?.toISOString()).toBe("2026-03-09T04:00:00.000Z");
  });

  test("fetches only bounded event fields and retains cancelled instances", async () => {
    let requested = "";
    const fetcher = (async (input: string | URL) => {
      requested = String(input);
      return Response.json({ items: [{ id: "removed-instance", status: "cancelled", updated: "2026-09-08T12:00:00Z", originalStartTime: { dateTime: "2026-09-10T10:00:00-04:00" } }] });
    }) as typeof fetch;
    const events = await listGoogleEvents("token", "primary/id", "America/New_York", { from: new Date("2026-09-01T00:00:00Z"), to: new Date("2026-10-01T00:00:00Z") }, fetcher);
    const url = new URL(requested);
    expect(url.pathname).toContain("primary%2Fid/events");
    expect(url.searchParams.get("singleEvents")).toBe("true");
    expect(url.searchParams.get("showDeleted")).toBe("true");
    expect(url.searchParams.get("fields")).not.toMatch(/attendees|description/);
    expect(events[0]?.status).toBe("cancelled");
    expect(events[0]?.originalStartTime).toBe("2026-09-10T10:00:00-04:00");
  });
});
