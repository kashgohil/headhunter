# Google Calendar integration

Google Calendar is the first supported provider. Headhunter uses Google's web-server OAuth flow and requests only these scopes:

- `https://www.googleapis.com/auth/calendar.calendarlist.readonly` to show the calendars available for selection.
- `https://www.googleapis.com/auth/calendar.events.readonly` to read events from selected calendars.

These scopes do not allow Headhunter to create or edit events, send invitations, change RSVP state, or read email. The provider choice and scopes follow Google's [Calendar authorization guidance](https://developers.google.com/workspace/calendar/api/auth).

## Local setup

1. Enable the Google Calendar API in a Google Cloud project.
2. Configure an OAuth consent screen and create a Web application OAuth client.
3. Add `http://localhost:3050/api/calendar/google/callback` as an authorized redirect URI for local development.
4. Set the following server environment variables:

```sh
APP_ORIGIN=http://localhost:3050
GOOGLE_CALENDAR_CLIENT_ID=your-client-id
GOOGLE_CALENDAR_CLIENT_SECRET=your-client-secret
CALENDAR_TOKEN_KEY=64-hex-characters
```

Generate the encryption key with `openssl rand -hex 32`. Keep the client secret and token key outside source control. Changing `CALENDAR_TOKEN_KEY` makes existing stored credentials unreadable; disconnect the integration before planned rotation, set the new key, and reconnect.

Local mode remains a trusted single-user system. Hosted callbacks require the authentication, owner authorization, protected secret storage, TLS, and recovery controls in [Private hosted deployment](hosted-deployment.md).

## Connection and sync behavior

OAuth requests offline access so the server can refresh short-lived access tokens during a user-requested sync. Access and refresh tokens are encrypted with AES-256-GCM before SQLite persistence. OAuth state is single-use, hashed, and expires after ten minutes. OAuth redirects disable caching and referrer propagation.

After connecting, select calendars in `/settings/calendar` and choose **Sync now**. Sync is manual; visiting the application does not contact Google. Each sync:

1. refreshes credentials when necessary;
2. refreshes calendar names and time zones;
3. requests events from the previous 30 days through the next 365 days;
4. expands recurring series into instances and includes cancelled instances;
5. stores only event identity, title, location, timing, time zone, recurrence identity, status, and provider update time.

The API request excludes descriptions, attendees, reminders, conferencing payloads, and organizer email. Repeated syncs upsert the provider's calendar and event identifiers. A recurring instance keeps its immutable original start alongside its current start, so a reschedule updates one record instead of creating a duplicate. The implementation follows Google's [event-list synchronization contract](https://developers.google.com/workspace/calendar/api/v3/reference/events/list) and [recurring instance identity](https://developers.google.com/workspace/calendar/api/v3/reference/events).

Candidate events remain in integration tables. They do not create job or interview records until the user explicitly links one to an existing interview or creates a linked round for an opportunity. Sync updates only a linked round's time and scheduled/cancelled state. It never replaces its label, preparation plan, practice, debrief, or private notes. Completed rounds remain completed.

Authentication expiry and provider failures remain visible in calendar settings. A failed sync updates its attempt/error state while preserving the previous successful event cache and all interview data. Stale means the last successful sync is more than fifteen minutes old. Reschedules, cancellations, and removed instances appear after the next manual sync; no background refresh is implied.

## Disconnect, exports, and deletion

Disconnect first asks Google to revoke the stored grant, then removes local credentials, cached calendars, cached events, OAuth state, and event links. Existing interview rounds retain their latest recorded timing, status, plans, and notes. If Google does not confirm revocation, the UI directs the user to revoke Headhunter from their Google Account while still removing the local credential.

Ordinary workspace exports contain no calendar credentials, OAuth state, cached provider calendars/events, or links. Internal pre-restore recovery copies retain encrypted integration data because they remain local with owner-only file permissions. Restoring an ordinary export leaves Google Calendar disconnected; reconnect explicitly afterward.
