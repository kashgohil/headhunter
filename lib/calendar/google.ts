import type { CalendarCredentials, ProviderCalendar, ProviderEvent } from "@/lib/calendar/types";

export const googleCalendarScopes = [
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
] as const;

type GoogleConfig = { clientId: string; clientSecret: string; redirectUri: string };
type Fetch = typeof fetch;

export class CalendarAuthenticationError extends Error {}

export function googleConfig(environment: NodeJS.ProcessEnv = process.env): GoogleConfig {
  const clientId = environment.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = environment.GOOGLE_CALENDAR_CLIENT_SECRET;
  const origin = environment.APP_ORIGIN;
  if (!clientId || !clientSecret || !origin) throw new Error("Google Calendar OAuth is not configured.");
  const parsed = new URL(origin);
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname))) {
    throw new Error("APP_ORIGIN must use HTTPS or a loopback HTTP address.");
  }
  return { clientId, clientSecret, redirectUri: new URL("/api/calendar/google/callback", parsed).toString() };
}

export function googleAuthorizationUrl(state: string, config = googleConfig()) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: googleCalendarScopes.join(" "),
    state,
  }).toString();
  return url;
}

async function jsonRequest<T>(url: string | URL, init: RequestInit, fetcher: Fetch): Promise<T> {
  const response = await fetcher(url, init);
  const body = await response.json().catch(() => ({})) as { error?: string | { message?: string }; error_description?: string } & T;
  if (!response.ok) {
    const code = typeof body.error === "string" ? body.error : undefined;
    const message = body.error_description || (typeof body.error === "object" ? body.error.message : undefined) || "Google Calendar request failed.";
    if (response.status === 401 || code === "invalid_grant") throw new CalendarAuthenticationError(message);
    throw new Error(message);
  }
  return body;
}

export async function exchangeGoogleCode(code: string, config = googleConfig(), fetcher: Fetch = fetch) {
  const body = await jsonRequest<{ access_token: string; refresh_token?: string; expires_in: number; scope?: string }>(
    "https://oauth2.googleapis.com/token",
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: "authorization_code" }) },
    fetcher,
  );
  if (!body.refresh_token) throw new CalendarAuthenticationError("Google did not return offline access. Reconnect and approve access again.");
  return {
    credentials: { accessToken: body.access_token, refreshToken: body.refresh_token, expiresAt: Date.now() + body.expires_in * 1000 },
    scopes: body.scope?.split(/\s+/).filter(Boolean) ?? [],
  };
}

export async function refreshGoogleCredentials(credentials: CalendarCredentials, config = googleConfig(), fetcher: Fetch = fetch) {
  if (credentials.accessToken && credentials.expiresAt > Date.now() + 30_000) return credentials;
  const body = await jsonRequest<{ access_token: string; expires_in: number }>(
    "https://oauth2.googleapis.com/token",
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ refresh_token: credentials.refreshToken, client_id: config.clientId, client_secret: config.clientSecret, grant_type: "refresh_token" }) },
    fetcher,
  );
  return { ...credentials, accessToken: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
}

async function googlePages<T>(url: URL, accessToken: string, fetcher: Fetch) {
  const items: T[] = [];
  let pageToken: string | undefined;
  do {
    if (pageToken) url.searchParams.set("pageToken", pageToken); else url.searchParams.delete("pageToken");
    const page = await jsonRequest<{ items?: T[]; nextPageToken?: string }>(url, { headers: { Authorization: `Bearer ${accessToken}` } }, fetcher);
    items.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return items;
}

export async function listGoogleCalendars(accessToken: string, fetcher: Fetch = fetch): Promise<ProviderCalendar[]> {
  const url = new URL("https://www.googleapis.com/calendar/v3/users/me/calendarList");
  url.searchParams.set("fields", "items(id,summary,timeZone,primary),nextPageToken");
  const items = await googlePages<{ id?: string; summary?: string; timeZone?: string; primary?: boolean }>(url, accessToken, fetcher);
  return items.filter((item) => item.id).map((item) => ({ providerCalendarId: item.id!, name: item.summary || "Unnamed calendar", timeZone: item.timeZone || "UTC", primary: Boolean(item.primary) }));
}

type GoogleEvent = {
  id?: string;
  summary?: string;
  location?: string;
  status?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  updated?: string;
  recurringEventId?: string;
  originalStartTime?: { dateTime?: string; date?: string; timeZone?: string };
};

function zonedDate(date: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  let instant = Date.UTC(year, month - 1, day);
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  for (let iteration = 0; iteration < 2; iteration++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    instant += Date.UTC(year, month - 1, day) - represented;
  }
  return new Date(instant);
}

export function normalizeGoogleEvent(event: GoogleEvent, calendarTimeZone: string): ProviderEvent | null {
  if (!event.id || !event.updated) return null;
  const status = event.status === "cancelled" ? "cancelled" : event.status === "tentative" ? "tentative" : "confirmed";
  const allDay = Boolean(event.start?.date);
  const timeZone = event.start?.timeZone || event.originalStartTime?.timeZone || calendarTimeZone;
  const startAt = event.start?.dateTime ? new Date(event.start.dateTime) : event.start?.date ? zonedDate(event.start.date, timeZone) : null;
  const endAt = event.end?.dateTime ? new Date(event.end.dateTime) : event.end?.date ? zonedDate(event.end.date, event.end.timeZone || timeZone) : null;
  return {
    providerEventId: event.id,
    title: event.summary || (status === "cancelled" ? "Cancelled event" : "Busy"),
    location: event.location || null,
    status,
    startAt: startAt && Number.isFinite(startAt.getTime()) ? startAt : null,
    endAt: endAt && Number.isFinite(endAt.getTime()) ? endAt : null,
    timeZone,
    allDay,
    recurringEventId: event.recurringEventId || null,
    originalStartTime: event.originalStartTime?.dateTime || event.originalStartTime?.date || null,
    providerUpdatedAt: new Date(event.updated),
  };
}

export async function listGoogleEvents(accessToken: string, providerCalendarId: string, calendarTimeZone: string, range: { from: Date; to: Date }, fetcher: Fetch = fetch) {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(providerCalendarId)}/events`);
  url.searchParams.set("fields", "items(id,summary,location,status,start,end,updated,recurringEventId,originalStartTime),nextPageToken");
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("showDeleted", "true");
  url.searchParams.set("timeMin", range.from.toISOString());
  url.searchParams.set("timeMax", range.to.toISOString());
  const items = await googlePages<GoogleEvent>(url, accessToken, fetcher);
  return items.map((item) => normalizeGoogleEvent(item, calendarTimeZone)).filter((item): item is ProviderEvent => Boolean(item));
}

export async function revokeGoogleCredential(token: string, fetcher: Fetch = fetch) {
  const response = await fetcher("https://oauth2.googleapis.com/revoke", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token }) });
  if (!response.ok) throw new Error("Google could not confirm revocation.");
}
