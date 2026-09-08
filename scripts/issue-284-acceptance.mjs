import assert from 'node:assert/strict';
import path from 'node:path';
import Database from 'better-sqlite3';

import { storeProviderEvents } from '../lib/calendar/storage.ts';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const databasePath = process.env.ACCEPTANCE_DATABASE;
const base = process.env.ACCEPTANCE_URL;
assert.ok(databasePath && path.basename(databasePath).startsWith('issue284-'), 'Provide an isolated issue284-* database');
assert.ok(base && ['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Provide an isolated local server URL');

const db = new Database(databasePath, { fileMustExist: true });
db.pragma('foreign_keys=ON');
const nonce = Date.now().toString();
const now = Date.now();
const jobId = `job-${nonce}`;
const interviewId = `interview-${nonce}`;
const calendarId = `calendar-${nonce}`;
const eventStart = new Date(now + 2 * 86_400_000);
const eventEnd = new Date(eventStart.getTime() + 60 * 60_000);
const event = {
  providerEventId: `event-${nonce}`,
  title: 'Calendar-linked panel',
  location: 'Video call',
  status: 'confirmed',
  startAt: eventStart,
  endAt: eventEnd,
  timeZone: 'America/New_York',
  allDay: false,
  recurringEventId: `series-${nonce}`,
  originalStartTime: eventStart.toISOString(),
  providerUpdatedAt: new Date(now),
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
page.setDefaultTimeout(20000);
const go = route => page.goto(base + route, { waitUntil: 'networkidle' });

try {
  await go('/settings/calendar');
  await page.getByText('Connect Google Calendar', { exact: true }).first().waitFor();
  await page.getByRole('link', { name: /Connect Google Calendar/ }).waitFor();
  assert.match(await page.locator('main').innerText(), /cannot create events, change invitations, read email, or send messages/i);

  db.prepare('INSERT INTO jobs (id,title,company,original_description,captured_at) VALUES (?,?,?,?,?)').run(jobId, 'Senior Engineer', `Fixture ${nonce}`, 'Build reliable systems.', now);
  db.prepare('INSERT INTO opportunities (id,job_id,stage,created_at,updated_at) VALUES (?,?,?,?,?)').run(`opportunity-${nonce}`, jobId, 'interviewing', now, now);
  db.prepare('INSERT INTO application_interviews (id,job_id,label,scheduled_at,status,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(interviewId, jobId, 'Manual interview label', now + 5 * 86_400_000, 'scheduled', 'Keep this manual preparation note.', now, now);
  db.prepare("INSERT INTO calendar_connections (id,provider,account_label,encrypted_credentials,granted_scopes,status,last_success_at,created_at,updated_at) VALUES ('google-local','google','avery@example.com','invalid-encrypted-value','[\"https://www.googleapis.com/auth/calendar.calendarlist.readonly\",\"https://www.googleapis.com/auth/calendar.events.readonly\"]','connected',?,?,?)")
    .run(now - 60 * 60_000, now, now);
  db.prepare("INSERT INTO external_calendars (id,connection_id,provider_calendar_id,name,time_zone,is_primary,selected,updated_at) VALUES (?,'google-local','primary','Interview calendar','America/New_York',1,1,?)")
    .run(calendarId, now);
  storeProviderEvents(db, calendarId, [event, { ...event, providerEventId: `private-${nonce}`, title: 'Private appointment', recurringEventId: null, originalStartTime: null, startAt: new Date(now + 3 * 86_400_000), endAt: new Date(now + 3 * 86_400_000 + 30 * 60_000) }], now);

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('avery@example.com', { exact: true }).waitFor();
  await page.getByText('stale', { exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Calendar-linked panel', exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Private appointment', exact: true }).waitFor();
  assert.equal(db.prepare('SELECT count(*) n FROM application_interviews').get().n, 1, 'candidate events are not copied into job records');

  const calendarCheckbox = page.locator(`button[role="checkbox"][value="${calendarId}"]`);
  assert.equal(await calendarCheckbox.getAttribute('aria-checked'), 'true');
  await calendarCheckbox.click();
  await page.getByRole('button', { name: 'Save selection', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Calendar selection saved.' }).waitFor();
  assert.equal(db.prepare('SELECT selected FROM external_calendars WHERE id=?').get(calendarId).selected, 0);
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.getByRole('heading', { name: 'Calendar-linked panel', exact: true }).count(), 0);
  await page.locator(`button[role="checkbox"][value="${calendarId}"]`).click();
  await page.getByRole('button', { name: 'Save selection', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Calendar selection saved.' }).waitFor();
  await page.reload({ waitUntil: 'networkidle' });

  const eventCard = page.getByRole('heading', { name: 'Calendar-linked panel', exact: true }).locator('xpath=ancestor::div[@data-slot="card"][1]');
  await eventCard.locator('summary').click();
  await eventCard.getByRole('combobox', { name: 'Existing interview', exact: true }).click();
  await page.getByRole('option', { name: `Fixture ${nonce} · Senior Engineer · Manual interview label`, exact: true }).click();
  await eventCard.getByRole('button', { name: 'Link round', exact: true }).click();
  await eventCard.getByText('Linked to Manual interview label', { exact: true }).waitFor();
  const linkedRound = db.prepare('SELECT label,notes,scheduled_at FROM application_interviews WHERE id=?').get(interviewId);
  assert.deepEqual(linkedRound, { label: 'Manual interview label', notes: 'Keep this manual preparation note.', scheduled_at: eventStart.getTime() });

  await page.getByRole('button', { name: 'Sync now', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Existing events and interview notes were kept' }).first().waitFor();
  assert.equal(db.prepare('SELECT count(*) n FROM external_calendar_events').get().n, 2);
  assert.equal(db.prepare('SELECT notes FROM application_interviews WHERE id=?').get(interviewId).notes, 'Keep this manual preparation note.');

  await go(`/interviews/${interviewId}`);
  await page.getByText('Linked to Interview calendar', { exact: true }).waitFor();
  await page.getByText('Manual interview label', { exact: true }).waitFor();
  await go('/');
  await page.getByRole('link', { name: /Manual interview label/ }).first().waitFor();
  await go('/notifications');
  await page.getByRole('link', { name: 'Manual interview label', exact: true }).waitFor();
  const expectedNotificationTime = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' }).format(eventStart);
  await page.getByText(expectedNotificationTime, { exact: true }).waitFor();

  const rescheduledStart = new Date(eventStart.getTime() + 4 * 60 * 60_000);
  storeProviderEvents(db, calendarId, [{ ...event, startAt: rescheduledStart, endAt: new Date(rescheduledStart.getTime() + 60 * 60_000), providerUpdatedAt: new Date(now + 60_000) }], now + 60_000);
  assert.equal(db.prepare('SELECT scheduled_at FROM application_interviews WHERE id=?').get(interviewId).scheduled_at, rescheduledStart.getTime());
  await go(`/interviews/${interviewId}`);
  await page.getByText(rescheduledStart.toISOString().slice(0, 16).replace('T', ' ') + ' UTC', { exact: true }).waitFor();

  storeProviderEvents(db, calendarId, [{ ...event, status: 'cancelled', startAt: null, endAt: null, providerUpdatedAt: new Date(now + 120_000) }], now + 120_000);
  assert.deepEqual(db.prepare('SELECT status,notes FROM application_interviews WHERE id=?').get(interviewId), { status: 'cancelled', notes: 'Keep this manual preparation note.' });
  await go('/notifications');
  assert.equal(await page.getByRole('link', { name: 'Manual interview label', exact: true }).count(), 0);

  await page.setViewportSize({ width: 375, height: 812 });
  await go('/settings/calendar');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  console.log('PASS read-only disclosure, calendar selection, private candidate isolation, explicit linking, sync failure recovery, linked timing across interview/command/notifications, reschedule, cancellation, notes, and mobile layout');
} catch (error) {
  console.error(await page.locator('main').innerText().catch(() => 'No page content'));
  throw error;
} finally {
  await browser.close();
  db.close();
}
