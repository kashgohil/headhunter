import type Database from "better-sqlite3";

import type { ProviderEvent } from "@/lib/calendar/types";

type EventRow = {
  id: string;
  start_at: number;
  end_at: number;
  time_zone: string;
  all_day: number;
};

function syncLinkedInterview(database: Database.Database, eventId: string, now: number) {
  database.prepare(`
    UPDATE application_interviews
    SET scheduled_at = (SELECT start_at FROM external_calendar_events WHERE id = ?),
        status = CASE
          WHEN status = 'completed' THEN status
          WHEN (SELECT removed OR status = 'cancelled' FROM external_calendar_events WHERE id = ?) THEN 'cancelled'
          ELSE 'scheduled'
        END,
        updated_at = ?
    WHERE id = (SELECT interview_id FROM calendar_event_links WHERE event_id = ?)
  `).run(eventId, eventId, now, eventId);
}

export function storeProviderEvents(database: Database.Database, calendarId: string, events: ProviderEvent[], now = Date.now()) {
  const existingStatement = database.prepare("SELECT id,start_at,end_at,time_zone,all_day FROM external_calendar_events WHERE calendar_id=? AND provider_event_id=?");
  const insert = database.prepare(`
    INSERT INTO external_calendar_events (id,calendar_id,provider_event_id,title,location,status,start_at,end_at,time_zone,all_day,recurring_event_id,original_start_time,provider_updated_at,removed,last_seen_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(calendar_id,provider_event_id) DO UPDATE SET
      title=excluded.title,location=excluded.location,status=excluded.status,start_at=excluded.start_at,end_at=excluded.end_at,
      time_zone=excluded.time_zone,all_day=excluded.all_day,recurring_event_id=excluded.recurring_event_id,
      original_start_time=excluded.original_start_time,provider_updated_at=excluded.provider_updated_at,removed=excluded.removed,last_seen_at=excluded.last_seen_at
  `);
  const cancel = database.prepare("UPDATE external_calendar_events SET status='cancelled',removed=1,provider_updated_at=?,last_seen_at=? WHERE id=?");
  let stored = 0;
  database.transaction(() => {
    for (const event of events) {
      const existing = existingStatement.get(calendarId, event.providerEventId) as EventRow | undefined;
      if ((!event.startAt || !event.endAt) && !existing) continue;
      if (!event.startAt || !event.endAt) {
        cancel.run(event.providerUpdatedAt.getTime(), now, existing!.id);
        syncLinkedInterview(database, existing!.id, now);
        stored += 1;
        continue;
      }
      const eventId = existing?.id ?? crypto.randomUUID();
      insert.run(
        eventId,
        calendarId,
        event.providerEventId,
        event.title,
        event.location,
        event.status,
        event.startAt.getTime(),
        event.endAt.getTime(),
        event.timeZone || existing?.time_zone || "UTC",
        event.allDay ? 1 : 0,
        event.recurringEventId,
        event.originalStartTime,
        event.providerUpdatedAt.getTime(),
        event.status === "cancelled" ? 1 : 0,
        now,
      );
      syncLinkedInterview(database, eventId, now);
      stored += 1;
    }
  })();
  return stored;
}

export function linkCalendarEvent(database: Database.Database, eventId: string, interviewId: string, now = Date.now()) {
  return database.transaction(() => {
    const event = database.prepare("SELECT id,removed,status FROM external_calendar_events WHERE id=?").get(eventId) as { id: string; removed: number; status: string } | undefined;
    if (!event || event.removed || event.status === "cancelled") throw new Error("Choose an active calendar event.");
    if (!database.prepare("SELECT id FROM application_interviews WHERE id=?").get(interviewId)) throw new Error("Choose an existing interview round.");
    const linkedEvent = database.prepare("SELECT event_id,interview_id FROM calendar_event_links WHERE event_id=? OR interview_id=?").get(eventId, interviewId) as { event_id: string; interview_id: string } | undefined;
    if (linkedEvent) {
      if (linkedEvent.event_id === eventId && linkedEvent.interview_id === interviewId) return linkedEvent;
      throw new Error("That event or interview round is already linked.");
    }
    database.prepare("INSERT INTO calendar_event_links (id,event_id,interview_id,created_at,updated_at) VALUES (?,?,?,?,?)").run(crypto.randomUUID(), eventId, interviewId, now, now);
    syncLinkedInterview(database, eventId, now);
    return { event_id: eventId, interview_id: interviewId };
  })();
}

export function createInterviewFromCalendarEvent(database: Database.Database, eventId: string, jobId: string, now = Date.now()) {
  return database.transaction(() => {
    const event = database.prepare("SELECT id,title,start_at,removed,status FROM external_calendar_events WHERE id=?").get(eventId) as { id: string; title: string; start_at: number; removed: number; status: string } | undefined;
    if (!event || event.removed || event.status === "cancelled") throw new Error("Choose an active calendar event.");
    if (!database.prepare("SELECT id FROM jobs WHERE id=?").get(jobId)) throw new Error("Choose an existing opportunity.");
    if (database.prepare("SELECT id FROM calendar_event_links WHERE event_id=?").get(eventId)) throw new Error("That event is already linked.");
    const interviewId = crypto.randomUUID();
    database.prepare("INSERT INTO application_interviews (id,job_id,label,scheduled_at,status,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(interviewId, jobId, event.title, event.start_at, "scheduled", null, now, now);
    database.prepare("INSERT INTO calendar_event_links (id,event_id,interview_id,created_at,updated_at) VALUES (?,?,?,?,?)")
      .run(crypto.randomUUID(), eventId, interviewId, now, now);
    return interviewId;
  })();
}

export function disconnectCalendarData(database: Database.Database, connectionId: string) {
  database.transaction(() => {
    database.prepare("DELETE FROM calendar_connections WHERE id=?").run(connectionId);
    database.prepare("DELETE FROM calendar_oauth_states WHERE provider='google'").run();
  })();
}
