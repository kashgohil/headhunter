import Link from "next/link";
import { AlertTriangle, CalendarClock, ExternalLink, ShieldCheck } from "lucide-react";

import { ActionForm, FormSelect } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { getCalendarWorkspace } from "@/lib/calendar/repository";
import { disconnectCalendarAction, linkExistingRoundAction, linkOpportunityAction, selectCalendarsAction, syncCalendarAction } from "./actions";

export const metadata = { title: "Calendar integration" };

function eventTime(startAt: Date, endAt: Date, timeZone: string, allDay: boolean) {
  if (allDay) return `${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone }).format(startAt)} · all day · ${timeZone}`;
  const date = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone }).format(startAt);
  const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone, timeZoneName: "short" });
  return `${date} · ${time.format(startAt)}–${time.format(endAt)}`;
}

export default async function CalendarSettingsPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const [workspace, query] = await Promise.all([getCalendarWorkspace(), searchParams]);
  const connected = workspace.connection;
  const unlinkedEvents = workspace.events.filter(({ link }) => !link);
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="border-b pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Calendar integration</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Review events from calendars you select, then link only the ones that belong to an opportunity. Sync runs when you request it; there is no background calendar access.
        </p>
      </header>

      {query.connected ? <p role="status" className="mt-6 rounded-lg border border-signal/25 bg-signal/10 px-4 py-3 text-sm">Google Calendar connected. Select calendars before the first sync.</p> : null}
      {query.error ? <p role="alert" className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{query.error}</p> : null}

      {!connected ? (
        <Card className="mt-8 max-w-3xl">
          <CardHeader>
            <CardTitle>Connect Google Calendar</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">Headhunter requests read access to your calendar list and events. It cannot create events, change invitations, read email, or send messages.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border p-4"><p className="font-medium">Calendar list</p><p className="mt-1 leading-5 text-muted-foreground">Used so you can choose exactly which calendars to sync.</p></div>
              <div className="rounded-lg border p-4"><p className="font-medium">Calendar events</p><p className="mt-1 leading-5 text-muted-foreground">Reads limited event identity, title, location, time, recurrence, and status fields.</p></div>
            </div>
            {workspace.configuration.configured ? (
              <Button asChild><a href="/api/calendar/google/start">Connect Google Calendar <ExternalLink /></a></Button>
            ) : (
              <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-6">
                <p className="font-medium">Local setup required</p>
                <p className="mt-1 text-muted-foreground">Set GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET, APP_ORIGIN, and a 32-byte CALENDAR_TOKEN_KEY before connecting.</p>
              </div>
            )}
            <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" />Credentials stay encrypted in the server-side database and are omitted from workspace exports.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-6 lg:sticky lg:top-8">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3"><div><CardTitle>{connected.accountLabel}</CardTitle><p className="mt-1 text-xs text-muted-foreground">Google Calendar · read only</p></div><Badge variant={connected.status === "connected" && !connected.stale ? "signal" : "outline"}>{connected.status === "connected" && connected.stale ? "stale" : connected.status}</Badge></div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <dl className="space-y-3"><div><dt className="text-xs text-muted-foreground">Last successful sync</dt><dd className="mt-1 font-mono text-xs">{connected.lastSuccessAt ? connected.lastSuccessAt.toISOString().replace("T", " ").slice(0, 19) + " UTC" : "Not synced yet"}</dd></div><div><dt className="text-xs text-muted-foreground">Access</dt><dd className="mt-1">Calendar list and event details, read only</dd></div></dl>
                {connected.lastError ? <p role="alert" className="flex items-start gap-2 rounded-md border border-destructive/25 p-3 text-xs leading-5 text-destructive"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{connected.lastError}</p> : null}
                <ActionForm action={syncCalendarAction} label="Sync now"><span className="sr-only">Refresh selected calendars</span></ActionForm>
                <ActionForm action={disconnectCalendarAction} label="Disconnect" className="border-t pt-4"><p className="text-xs leading-5 text-muted-foreground">Removes credentials and cached calendar events. Existing interview rounds, plans, practice, and notes remain.</p></ActionForm>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Calendars</CardTitle><p className="text-sm leading-6 text-muted-foreground">Only selected calendars contribute candidate events.</p></CardHeader>
              <CardContent>
                <ActionForm action={selectCalendarsAction} label="Save selection" preserveInput>
                  <div className="space-y-3">{workspace.calendars.map((calendar) => <label key={calendar.id} className="flex items-start gap-3 rounded-md border p-3 text-sm"><Checkbox name="calendarIds" value={calendar.id} defaultChecked={calendar.selected} /><span><span className="font-medium">{calendar.name}</span><span className="mt-1 block text-xs text-muted-foreground">{calendar.timeZone}{calendar.primary ? " · primary" : ""}</span></span></label>)}</div>
                </ActionForm>
              </CardContent>
            </Card>
          </aside>

          <section aria-labelledby="candidate-events-heading">
            <div className="flex items-end justify-between gap-4 border-b pb-4"><div><h2 id="candidate-events-heading" className="text-xl font-semibold">Candidate events</h2><p className="mt-1 text-sm text-muted-foreground">{unlinkedEvents.length} unlinked · {workspace.events.length - unlinkedEvents.length} linked</p></div></div>
            {!workspace.calendars.some((calendar) => calendar.selected) ? <p className="mt-5 rounded-lg border border-dashed p-6 text-sm leading-6 text-muted-foreground">Select at least one calendar, save the selection, then sync.</p> : !workspace.events.length ? <p className="mt-5 rounded-lg border border-dashed p-6 text-sm leading-6 text-muted-foreground">No events are cached for the selected calendars. Sync to check the next year and the previous 30 days.</p> : null}
            <div className="mt-5 space-y-4">{workspace.events.map(({ event, calendarName, link, interviewLabel, company, jobTitle }) => <Card key={event.id}><CardContent className="pt-6"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold">{event.title}</h3><p className="mt-1 text-sm text-muted-foreground">{calendarName}{event.location ? ` · ${event.location}` : ""}</p><time className="mt-2 block font-mono text-xs leading-5">{eventTime(event.startAt, event.endAt, event.timeZone, event.allDay)}</time>{event.recurringEventId ? <p className="mt-1 text-xs text-muted-foreground">Recurring instance · original start preserved</p> : null}</div>{event.status === "tentative" ? <Badge variant="outline">tentative</Badge> : null}</div>
                {link ? <div className="mt-5 rounded-md border bg-muted/35 p-3 text-sm"><p className="font-medium">Linked to {interviewLabel}</p><p className="mt-1 text-xs text-muted-foreground">{company} · {jobTitle}</p><Link href={`/interviews/${link.interviewId}`} className="mt-2 inline-block text-xs text-primary">Open interview room</Link></div> : <details className="mt-5 rounded-md border"><summary className="cursor-pointer px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">Link this event</summary><div className="grid gap-5 border-t p-4 sm:grid-cols-2">{workspace.interviews.length ? <ActionForm action={linkExistingRoundAction} label="Link round"><input type="hidden" name="eventId" value={event.id}/><FormSelect name="interviewId" label="Existing interview" options={workspace.interviews.map(({ round, company: roundCompany, jobTitle: roundTitle }) => ({ value: round.id, label: `${roundCompany} · ${roundTitle} · ${round.label}` }))}/></ActionForm> : <p className="text-sm text-muted-foreground">No interview rounds exist yet.</p>}{workspace.opportunities.length ? <ActionForm action={linkOpportunityAction} label="Create linked round"><input type="hidden" name="eventId" value={event.id}/><FormSelect name="jobId" label="Opportunity" options={workspace.opportunities.map((job) => ({ value: job.id, label: `${job.company} · ${job.title}` }))}/></ActionForm> : <p className="text-sm text-muted-foreground">Capture an opportunity before creating a round.</p>}</div></details>}
              </CardContent></Card>)}</div>
            <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><CalendarClock className="mt-0.5 size-4 shrink-0" />Reschedules and cancellations update linked round timing and status on the next manual sync. Manual labels, preparation, practice, and notes are preserved.</p>
          </section>
        </div>
      )}
    </div>
  );
}
