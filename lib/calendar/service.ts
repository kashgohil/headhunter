import type Database from "better-sqlite3";

import { storeProviderEvents } from "./storage.ts";
import type { CalendarCredentials, ProviderCalendar, ProviderEvent } from "@/lib/calendar/types";

export const calendarSyncPast = 30 * 86_400_000;
export const calendarSyncFuture = 365 * 86_400_000;

type SyncDependencies = {
  decrypt: (value: string) => CalendarCredentials;
  encrypt: (credentials: CalendarCredentials) => string;
  refresh: (credentials: CalendarCredentials) => Promise<CalendarCredentials>;
  listCalendars: (accessToken: string) => Promise<ProviderCalendar[]>;
  listEvents: (accessToken: string, calendar: ProviderCalendar, range: { from: Date; to: Date }) => Promise<ProviderEvent[]>;
  isAuthenticationError: (error: unknown) => boolean;
};

function upsertCalendars(database: Database.Database, connectionId: string, calendars: ProviderCalendar[], now: number) {
  const statement = database.prepare(`
    INSERT INTO external_calendars (id,connection_id,provider_calendar_id,name,time_zone,is_primary,selected,updated_at)
    VALUES (?,?,?,?,?,?,0,?)
    ON CONFLICT(connection_id,provider_calendar_id) DO UPDATE SET
      name=excluded.name,time_zone=excluded.time_zone,is_primary=excluded.is_primary,updated_at=excluded.updated_at
  `);
  for (const calendar of calendars) statement.run(crypto.randomUUID(), connectionId, calendar.providerCalendarId, calendar.name, calendar.timeZone, calendar.primary ? 1 : 0, now);
}

export async function synchronizeCalendar(database: Database.Database, connectionId: string, now: Date, dependencies: SyncDependencies) {
  const record = database.prepare("SELECT encrypted_credentials FROM calendar_connections WHERE id=?").get(connectionId) as { encrypted_credentials: string } | undefined;
  if (!record) throw new Error("Connect Google Calendar before syncing.");
  database.prepare("UPDATE calendar_connections SET last_attempt_at=?,updated_at=? WHERE id=?").run(now.getTime(), now.getTime(), connectionId);
  try {
    const credentials = await dependencies.refresh(dependencies.decrypt(record.encrypted_credentials));
    const remoteCalendars = await dependencies.listCalendars(credentials.accessToken);
    const selected = database.prepare("SELECT provider_calendar_id FROM external_calendars WHERE connection_id=? AND selected=1").all(connectionId) as Array<{ provider_calendar_id: string }>;
    const selectedIds = new Set(selected.map((calendar) => calendar.provider_calendar_id));
    const range = { from: new Date(now.getTime() - calendarSyncPast), to: new Date(now.getTime() + calendarSyncFuture) };
    const eventSets = await Promise.all(remoteCalendars.filter((calendar) => selectedIds.has(calendar.providerCalendarId)).map(async (calendar) => ({
      calendar,
      events: await dependencies.listEvents(credentials.accessToken, calendar, range),
    })));
    database.transaction(() => {
      upsertCalendars(database, connectionId, remoteCalendars, now.getTime());
      for (const eventSet of eventSets) {
        const local = database.prepare("SELECT id FROM external_calendars WHERE connection_id=? AND provider_calendar_id=?").get(connectionId, eventSet.calendar.providerCalendarId) as { id: string } | undefined;
        if (local) storeProviderEvents(database, local.id, eventSet.events, now.getTime());
      }
      database.prepare("UPDATE calendar_connections SET encrypted_credentials=?,status='connected',last_success_at=?,last_error=NULL,updated_at=? WHERE id=?")
        .run(dependencies.encrypt(credentials), now.getTime(), now.getTime(), connectionId);
    })();
    return eventSets.reduce((total, item) => total + item.events.length, 0);
  } catch (error) {
    const expired = dependencies.isAuthenticationError(error);
    const message = expired ? "Google access expired or was revoked. Reconnect to resume syncing." : "Calendar sync failed. Existing events and interview notes were kept; retry when the provider is available.";
    database.prepare("UPDATE calendar_connections SET status=?,last_error=?,updated_at=? WHERE id=?").run(expired ? "expired" : "error", message, now.getTime(), connectionId);
    throw new Error(message, { cause: error });
  }
}
