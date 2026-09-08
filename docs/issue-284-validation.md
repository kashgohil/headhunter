# ISSUE-284 validation

Validated on 8 September 2026 with Node 24.13.0, Bun 1.3.14, Next.js 16.3.4, Chromium, an isolated SQLite database, and synthetic calendar records. No Google account was connected and no external event, invitation, RSVP, email, or message was read or changed.

## Implemented behavior

- Google Calendar is the first provider, using only calendar-list and event read-only scopes.
- OAuth state is hashed, single-use, and time-limited. Access and refresh credentials use AES-256-GCM at rest and stay out of ordinary exports.
- Users select calendars, manually sync a bounded event window, inspect candidates, and explicitly link an event to an existing interview or opportunity.
- Provider calendar/event identity, provider update time, recurring series identity, immutable original instance time, event time zone, and all-day state are stored for idempotent reconciliation.
- Linked reschedules and cancellations update the interview record used by the interview room, command center, and notification inbox. Manual labels, notes, preparation, practice, debriefs, and completed status are preserved.
- Sync health shows connected, stale, error, and expired states, attempt/success times, reconnect, retry, and disconnect behavior. Sync is user-requested; there is no background delivery.

## Automated coverage

The provider tests verify exact scopes, encrypted credential integrity, bounded field selection, cancelled recurring instances, and daylight-saving behavior for an all-day event. SQLite tests cover duplicate prevention, recurring-instance rescheduling, cancellation without a replacement timestamp, explicit link creation, sync failure rollback behavior, authentication expiry, disconnect/reconnect, and manual-note preservation. Backup tests prove ordinary exports omit the complete private integration graph while encrypted internal recovery can retain it.

The final verification passed ESLint, TypeScript, 103 Bun tests, 38 Node storage tests, and the production webpack build:

```sh
bun run lint
bunx tsc --noEmit
bun run test
DATABASE_FILE=issue284-build.db bunx next build --webpack
```

The Chromium replay verifies scope disclosure, selection persistence, isolation of unrelated candidate events, explicit linking, local sync failure recovery, linked timing in the interview room, command center, and notification inbox, rescheduling, cancellation, manual-note preservation, and a 375 px layout. Its result is:

```text
PASS read-only disclosure, calendar selection, private candidate isolation, explicit linking, sync failure recovery, linked timing across interview/command/notifications, reschedule, cancellation, notes, and mobile layout
```

Run it against an isolated local server whose database matches `ACCEPTANCE_DATABASE`:

```sh
ACCEPTANCE_DATABASE=/absolute/path/.data/issue284-acceptance.db \
ACCEPTANCE_URL=http://localhost:3052 \
PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core/index.mjs \
node scripts/issue-284-acceptance.mjs
```

The runner refuses databases whose basename does not begin with `issue284-` and refuses non-loopback URLs. It deliberately uses an invalid encrypted credential for the retry check, so that check fails locally without contacting Google.

## Deployment boundary

Live OAuth consent remains an installation step because it requires the user's own Google Cloud client. Public callback deployment remains blocked by ISSUE-285. Provider push notifications, automatic periodic sync, calendar writes, invitations, RSVP changes, email access, and outbound messaging are outside this issue.
