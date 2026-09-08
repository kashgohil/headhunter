import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';

import { createInterviewFromCalendarEvent, disconnectCalendarData, linkCalendarEvent, storeProviderEvents } from '../lib/calendar/storage.ts';
import { synchronizeCalendar } from '../lib/calendar/service.ts';

function database() {
  const db = new Database(':memory:');
  const journal = JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8'));
  for (const entry of journal.entries) db.exec(readFileSync(new URL(`../drizzle/${entry.tag}.sql`, import.meta.url), 'utf8'));
  db.pragma('foreign_keys=ON');
  const now = Date.now();
  db.prepare("INSERT INTO jobs (id,title,company,original_description,captured_at) VALUES ('job','Engineer','Fixture','Role',?)").run(now);
  db.prepare("INSERT INTO application_interviews (id,job_id,label,scheduled_at,status,notes,created_at,updated_at) VALUES ('interview','job','Manual label',?,'scheduled','Keep these private notes',?,?)").run(now, now, now);
  db.prepare("INSERT INTO calendar_connections (id,provider,encrypted_credentials,created_at,updated_at) VALUES ('connection','google','encrypted',?,?)").run(now, now);
  db.prepare("INSERT INTO external_calendars (id,connection_id,provider_calendar_id,name,time_zone,selected,updated_at) VALUES ('calendar','connection','primary','Interviews','America/New_York',1,?)").run(now);
  return db;
}

const event = (overrides = {}) => ({
  providerEventId: 'event-instance', title: 'Panel interview', location: 'Meet', status: 'confirmed',
  startAt: new Date('2026-11-01T05:30:00Z'), endAt: new Date('2026-11-01T06:30:00Z'), timeZone: 'America/New_York', allDay: false,
  recurringEventId: 'series', originalStartTime: '2026-11-01T01:30:00-04:00', providerUpdatedAt: new Date('2026-09-08T12:00:00Z'), ...overrides,
});

describe('calendar event persistence', () => {
  it('syncs idempotently and preserves provider instance identity across a reschedule', () => {
    const db = database();
    try {
      storeProviderEvents(db, 'calendar', [event()]);
      storeProviderEvents(db, 'calendar', [event({ startAt: new Date('2026-11-01T07:30:00Z'), endAt: new Date('2026-11-01T08:30:00Z'), providerUpdatedAt: new Date('2026-09-09T12:00:00Z') })]);
      assert.equal(db.prepare('SELECT count(*) n FROM external_calendar_events').get().n, 1);
      const stored = db.prepare('SELECT start_at,recurring_event_id,original_start_time FROM external_calendar_events').get();
      assert.deepEqual(stored, { start_at: Date.parse('2026-11-01T07:30:00Z'), recurring_event_id: 'series', original_start_time: '2026-11-01T01:30:00-04:00' });
    } finally { db.close(); }
  });

  it('updates linked timing and cancellation without overwriting manual labels or notes', () => {
    const db = database();
    try {
      storeProviderEvents(db, 'calendar', [event()]);
      const eventId = db.prepare('SELECT id FROM external_calendar_events').get().id;
      linkCalendarEvent(db, eventId, 'interview');
      assert.equal(linkCalendarEvent(db, eventId, 'interview').interview_id, 'interview');
      storeProviderEvents(db, 'calendar', [event({ status: 'cancelled', startAt: null, endAt: null, providerUpdatedAt: new Date('2026-09-10T12:00:00Z') })]);
      const interview = db.prepare("SELECT label,notes,status,scheduled_at FROM application_interviews WHERE id='interview'").get();
      assert.deepEqual(interview, { label: 'Manual label', notes: 'Keep these private notes', status: 'cancelled', scheduled_at: Date.parse('2026-11-01T05:30:00Z') });
    } finally { db.close(); }
  });

  it('creates one explicit opportunity round and rejects duplicate links', () => {
    const db = database();
    try {
      storeProviderEvents(db, 'calendar', [event()]);
      const eventId = db.prepare('SELECT id FROM external_calendar_events').get().id;
      const interviewId = createInterviewFromCalendarEvent(db, eventId, 'job');
      assert.match(interviewId, /^[a-f0-9-]{36}$/);
      assert.equal(db.prepare('SELECT count(*) n FROM calendar_event_links').get().n, 1);
      assert.throws(() => createInterviewFromCalendarEvent(db, eventId, 'job'), /already linked/);
    } finally { db.close(); }
  });

  it('keeps cached events and manual notes when sync fails, and exposes authentication expiry', async () => {
    const db = database();
    const calendar = { providerCalendarId: 'primary', name: 'Interviews', timeZone: 'America/New_York', primary: true };
    const credentials = { accessToken: 'access', refreshToken: 'refresh', expiresAt: Date.now() + 60_000 };
    const dependencies = {
      decrypt: () => credentials,
      encrypt: () => 'encrypted-next',
      refresh: async value => value,
      listCalendars: async () => [calendar],
      listEvents: async () => [event()],
      isAuthenticationError: error => error?.name === 'AuthError',
    };
    try {
      await synchronizeCalendar(db, 'connection', new Date('2026-09-08T12:00:00Z'), dependencies);
      const eventId = db.prepare('SELECT id FROM external_calendar_events').get().id;
      linkCalendarEvent(db, eventId, 'interview');
      await assert.rejects(
        synchronizeCalendar(db, 'connection', new Date('2026-09-08T12:05:00Z'), { ...dependencies, listEvents: async () => { throw new Error('provider unavailable'); } }),
        /Existing events and interview notes were kept/,
      );
      assert.equal(db.prepare('SELECT count(*) n FROM external_calendar_events').get().n, 1);
      assert.deepEqual(db.prepare("SELECT notes,status FROM application_interviews WHERE id='interview'").get(), { notes: 'Keep these private notes', status: 'scheduled' });
      assert.equal(db.prepare("SELECT status FROM calendar_connections WHERE id='connection'").get().status, 'error');

      const authError = new Error('invalid grant');
      authError.name = 'AuthError';
      await assert.rejects(
        synchronizeCalendar(db, 'connection', new Date('2026-09-08T12:10:00Z'), { ...dependencies, refresh: async () => { throw authError; } }),
        /Reconnect/,
      );
      assert.equal(db.prepare("SELECT status FROM calendar_connections WHERE id='connection'").get().status, 'expired');
    } finally { db.close(); }
  });

  it('disconnects cached provider data and permits reconnect without deleting interview notes', () => {
    const db = database();
    try {
      storeProviderEvents(db, 'calendar', [event()]);
      linkCalendarEvent(db, db.prepare('SELECT id FROM external_calendar_events').get().id, 'interview');
      disconnectCalendarData(db, 'connection');
      assert.equal(db.prepare('SELECT count(*) n FROM calendar_connections').get().n, 0);
      assert.equal(db.prepare('SELECT count(*) n FROM external_calendar_events').get().n, 0);
      assert.deepEqual(db.prepare("SELECT label,notes FROM application_interviews WHERE id='interview'").get(), { label: 'Manual label', notes: 'Keep these private notes' });

      const now = Date.now();
      db.prepare("INSERT INTO calendar_connections (id,provider,encrypted_credentials,created_at,updated_at) VALUES ('connection','google','new-encrypted',?,?)").run(now, now);
      db.prepare("INSERT INTO external_calendars (id,connection_id,provider_calendar_id,name,time_zone,selected,updated_at) VALUES ('calendar-2','connection','primary','Interviews','America/New_York',1,?)").run(now);
      storeProviderEvents(db, 'calendar-2', [event()]);
      assert.equal(db.prepare('SELECT count(*) n FROM external_calendar_events').get().n, 1);
    } finally { db.close(); }
  });
});
