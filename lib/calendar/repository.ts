import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { connection } from "next/server";

import { decryptCalendarCredentials, encryptCalendarCredentials } from "@/lib/calendar/credentials";
import {
  CalendarAuthenticationError,
  exchangeGoogleCode,
  googleAuthorizationUrl,
  googleCalendarScopes,
  googleConfig,
  listGoogleCalendars,
  listGoogleEvents,
  refreshGoogleCredentials,
  revokeGoogleCredential,
} from "@/lib/calendar/google";
import { createInterviewFromCalendarEvent, linkCalendarEvent, storeProviderEvents } from "@/lib/calendar/storage";
import { db, sqlite } from "@/lib/db";
import {
  applicationInterviews,
  calendarConnections,
  calendarEventLinks,
  externalCalendarEvents,
  externalCalendars,
  jobs,
} from "@/lib/db/schema";

const googleConnectionId = "google-local";
const stateLifetime = 10 * 60_000;
const syncPast = 30 * 86_400_000;
const syncFuture = 365 * 86_400_000;
const staleAfter = 15 * 60_000;

function hashState(state: string) {
  return createHash("sha256").update(state).digest("hex");
}

function upsertCalendars(calendars: Awaited<ReturnType<typeof listGoogleCalendars>>, now: Date) {
  const statement = sqlite.prepare(`
    INSERT INTO external_calendars (id,connection_id,provider_calendar_id,name,time_zone,is_primary,selected,updated_at)
    VALUES (?,?,?,?,?,?,0,?)
    ON CONFLICT(connection_id,provider_calendar_id) DO UPDATE SET
      name=excluded.name,time_zone=excluded.time_zone,is_primary=excluded.is_primary,updated_at=excluded.updated_at
  `);
  for (const calendar of calendars) {
    statement.run(crypto.randomUUID(), googleConnectionId, calendar.providerCalendarId, calendar.name, calendar.timeZone, calendar.primary ? 1 : 0, now.getTime());
  }
}

function audit(action: "calendar.connected" | "calendar.synced" | "calendar.linked" | "calendar.disconnected", entityType: "calendar_connection" | "calendar_event", entityId: string, occurredAt = new Date()) {
  sqlite.prepare("INSERT INTO audit_events (id,action,entity_type,entity_id,occurred_at) VALUES (?,?,?,?,?)")
    .run(crypto.randomUUID(), action, entityType, entityId, occurredAt.getTime());
}

export function calendarConfiguration() {
  try {
    googleConfig();
    encryptCalendarCredentials({ accessToken: "check", refreshToken: "check", expiresAt: 0 });
    return { configured: true as const, error: null };
  } catch (error) {
    return { configured: false as const, error: error instanceof Error ? error.message : "Calendar integration is not configured." };
  }
}

export function beginGoogleCalendarConnection() {
  const state = randomBytes(32).toString("base64url");
  const now = new Date();
  sqlite.transaction(() => {
    sqlite.prepare("DELETE FROM calendar_oauth_states WHERE expires_at <= ?").run(now.getTime());
    sqlite.prepare("INSERT INTO calendar_oauth_states (state_hash,provider,expires_at,created_at) VALUES (?,'google',?,?)")
      .run(hashState(state), now.getTime() + stateLifetime, now.getTime());
  })();
  return googleAuthorizationUrl(state);
}

function consumeOauthState(state: string) {
  const result = sqlite.prepare("DELETE FROM calendar_oauth_states WHERE state_hash=? AND provider='google' AND expires_at>?").run(hashState(state), Date.now());
  if (result.changes !== 1) throw new Error("This calendar connection request expired or was already used. Start again.");
}

export async function completeGoogleCalendarConnection(code: string, state: string) {
  consumeOauthState(state);
  const exchanged = await exchangeGoogleCode(code);
  if (!googleCalendarScopes.every((scope) => exchanged.scopes.includes(scope))) {
    throw new Error("Google Calendar read access was not granted. Reconnect and approve both read-only scopes.");
  }
  const calendars = await listGoogleCalendars(exchanged.credentials.accessToken);
  const now = new Date();
  const primary = calendars.find((calendar) => calendar.primary);
  sqlite.transaction(() => {
    sqlite.prepare(`
      INSERT INTO calendar_connections (id,provider,account_label,encrypted_credentials,granted_scopes,status,last_error,created_at,updated_at)
      VALUES (?,'google',?,?,?,'connected',NULL,?,?)
      ON CONFLICT(id) DO UPDATE SET account_label=excluded.account_label,encrypted_credentials=excluded.encrypted_credentials,
        granted_scopes=excluded.granted_scopes,status='connected',last_error=NULL,updated_at=excluded.updated_at
    `).run(googleConnectionId, primary?.name || "Google Calendar", encryptCalendarCredentials(exchanged.credentials), JSON.stringify(exchanged.scopes), now.getTime(), now.getTime());
    upsertCalendars(calendars, now);
    audit("calendar.connected", "calendar_connection", googleConnectionId, now);
  })();
}

export async function getCalendarWorkspace() {
  await connection();
  const now = new Date();
  const [record, calendars, events, interviews, opportunities] = await Promise.all([
    db.select({ id: calendarConnections.id, provider: calendarConnections.provider, accountLabel: calendarConnections.accountLabel, grantedScopes: calendarConnections.grantedScopes, status: calendarConnections.status, lastAttemptAt: calendarConnections.lastAttemptAt, lastSuccessAt: calendarConnections.lastSuccessAt, lastError: calendarConnections.lastError })
      .from(calendarConnections).where(eq(calendarConnections.id, googleConnectionId)).get(),
    db.select().from(externalCalendars).where(eq(externalCalendars.connectionId, googleConnectionId)).orderBy(asc(externalCalendars.name)),
    db.select({ event: externalCalendarEvents, calendarName: externalCalendars.name, link: calendarEventLinks, interviewLabel: applicationInterviews.label, company: jobs.company, jobTitle: jobs.title })
      .from(externalCalendarEvents)
      .innerJoin(externalCalendars, eq(externalCalendarEvents.calendarId, externalCalendars.id))
      .leftJoin(calendarEventLinks, eq(calendarEventLinks.eventId, externalCalendarEvents.id))
      .leftJoin(applicationInterviews, eq(applicationInterviews.id, calendarEventLinks.interviewId))
      .leftJoin(jobs, eq(jobs.id, applicationInterviews.jobId))
      .where(and(eq(externalCalendars.selected, true), eq(externalCalendarEvents.removed, false), gte(externalCalendarEvents.endAt, new Date(now.getTime() - syncPast)), lte(externalCalendarEvents.startAt, new Date(now.getTime() + syncFuture))))
      .orderBy(asc(externalCalendarEvents.startAt)),
    db.select({ round: applicationInterviews, company: jobs.company, jobTitle: jobs.title }).from(applicationInterviews).innerJoin(jobs, eq(jobs.id, applicationInterviews.jobId)).orderBy(asc(applicationInterviews.scheduledAt)),
    db.select({ id: jobs.id, company: jobs.company, title: jobs.title }).from(jobs).orderBy(asc(jobs.company), asc(jobs.title)),
  ]);
  return {
    configuration: calendarConfiguration(),
    connection: record ? { ...record, stale: !record.lastSuccessAt || now.getTime() - record.lastSuccessAt.getTime() > staleAfter } : null,
    calendars,
    events,
    interviews,
    opportunities,
  };
}

export async function selectCalendars(calendarIds: string[]) {
  const available = await db.select({ id: externalCalendars.id }).from(externalCalendars).where(eq(externalCalendars.connectionId, googleConnectionId));
  const allowed = new Set(available.map((calendar) => calendar.id));
  if (calendarIds.some((id) => !allowed.has(id))) throw new Error("Choose calendars from the connected account.");
  const now = new Date();
  sqlite.transaction(() => {
    sqlite.prepare("UPDATE external_calendars SET selected=0,updated_at=? WHERE connection_id=?").run(now.getTime(), googleConnectionId);
    const select = sqlite.prepare("UPDATE external_calendars SET selected=1,updated_at=? WHERE id=? AND connection_id=?");
    for (const id of new Set(calendarIds)) select.run(now.getTime(), id, googleConnectionId);
  })();
}

export async function syncGoogleCalendar(now = new Date()) {
  const record = await db.select().from(calendarConnections).where(eq(calendarConnections.id, googleConnectionId)).get();
  if (!record) throw new Error("Connect Google Calendar before syncing.");
  await db.update(calendarConnections).set({ lastAttemptAt: now, updatedAt: now }).where(eq(calendarConnections.id, googleConnectionId));
  try {
    const credentials = await refreshGoogleCredentials(decryptCalendarCredentials(record.encryptedCredentials));
    const remoteCalendars = await listGoogleCalendars(credentials.accessToken);
    const selected = await db.select().from(externalCalendars).where(and(eq(externalCalendars.connectionId, googleConnectionId), eq(externalCalendars.selected, true)));
    const selectedByProviderId = new Set(selected.map((calendar) => calendar.providerCalendarId));
    const eventSets = await Promise.all(remoteCalendars.filter((calendar) => selectedByProviderId.has(calendar.providerCalendarId)).map(async (calendar) => ({
      providerCalendarId: calendar.providerCalendarId,
      events: await listGoogleEvents(credentials.accessToken, calendar.providerCalendarId, calendar.timeZone, { from: new Date(now.getTime() - syncPast), to: new Date(now.getTime() + syncFuture) }),
    })));
    sqlite.transaction(() => {
      upsertCalendars(remoteCalendars, now);
      for (const eventSet of eventSets) {
        const local = sqlite.prepare("SELECT id FROM external_calendars WHERE connection_id=? AND provider_calendar_id=?").get(googleConnectionId, eventSet.providerCalendarId) as { id: string } | undefined;
        if (local) storeProviderEvents(sqlite, local.id, eventSet.events, now.getTime());
      }
      sqlite.prepare("UPDATE calendar_connections SET encrypted_credentials=?,status='connected',last_success_at=?,last_error=NULL,updated_at=? WHERE id=?")
        .run(encryptCalendarCredentials(credentials), now.getTime(), now.getTime(), googleConnectionId);
      audit("calendar.synced", "calendar_connection", googleConnectionId, now);
    })();
    return eventSets.reduce((total, item) => total + item.events.length, 0);
  } catch (error) {
    const expired = error instanceof CalendarAuthenticationError;
    const message = expired ? "Google access expired or was revoked. Reconnect to resume syncing." : "Calendar sync failed. Existing events and interview notes were kept; retry when the provider is available.";
    await db.update(calendarConnections).set({ status: expired ? "expired" : "error", lastError: message, updatedAt: now }).where(eq(calendarConnections.id, googleConnectionId));
    throw new Error(message, { cause: error });
  }
}

export function linkEventToInterview(eventId: string, interviewId: string) {
  linkCalendarEvent(sqlite, eventId, interviewId);
  audit("calendar.linked", "calendar_event", eventId);
}

export function linkEventToOpportunity(eventId: string, jobId: string) {
  const interviewId = createInterviewFromCalendarEvent(sqlite, eventId, jobId);
  audit("calendar.linked", "calendar_event", eventId);
  return interviewId;
}

export async function disconnectGoogleCalendar() {
  const record = await db.select().from(calendarConnections).where(eq(calendarConnections.id, googleConnectionId)).get();
  if (!record) return { revoked: true };
  let revoked = true;
  try {
    const credentials = decryptCalendarCredentials(record.encryptedCredentials);
    await revokeGoogleCredential(credentials.refreshToken || credentials.accessToken);
  } catch {
    revoked = false;
  }
  sqlite.transaction(() => {
    sqlite.prepare("DELETE FROM calendar_connections WHERE id=?").run(googleConnectionId);
    sqlite.prepare("DELETE FROM calendar_oauth_states WHERE provider='google'").run();
    audit("calendar.disconnected", "calendar_connection", googleConnectionId);
  })();
  return { revoked };
}
