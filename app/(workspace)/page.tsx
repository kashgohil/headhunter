import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/accordion";
import { AlertControls } from "./command-center/alert-controls";
import { getCommandCenter } from "@/lib/command-center/repository";
import type { Alert } from "@/lib/command-center/overview";
import { isAlertOverdue } from "@/lib/command-center/overview";

const date = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const time = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

function AlertRow({
  alert,
  now,
  index,
}: {
  alert: Alert;
  now: Date;
  index: number;
}) {
  const overdue = isAlertOverdue(alert, now);
  return (
    <li className="flex gap-4 py-5 first:pt-0 last:pb-0">
      <span
        aria-hidden="true"
        className="pt-1 font-mono text-xs text-muted-foreground"
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={alert.href}
            className="rounded-sm text-sm font-semibold hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
          >
            {alert.title}
            <ArrowUpRight className="ml-1 inline size-3.5" />
          </Link>
          {overdue ? (
            <Badge
              variant="outline"
              className="border-destructive/30 text-destructive"
            >
              Past due
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{alert.source}</p>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          {alert.reason}
        </p>
        {alert.dueAt ? (
          <time dateTime={alert.dueAt} className="mt-2 block font-mono text-xs">
            {alert.kind === "interview"
              ? `${time.format(new Date(alert.dueAt))} UTC`
              : date.format(new Date(alert.dueAt))}
          </time>
        ) : null}
        <AlertControls alertKey={alert.key} />
      </div>
    </li>
  );
}

export default async function CommandCenterPage() {
  const data = await getCommandCenter();
  const due = data.visible
    .filter(
      (alert) =>
        alert.dueAt &&
        new Date(alert.dueAt) <= new Date(data.now.getTime() + 7 * 86_400_000),
    )
    .sort((a, b) => a.dueAt!.localeCompare(b.dueAt!));
  const warnings = data.visible.filter((alert) => alert.kind === "quality");
  return (
    <div className="mx-auto w-full max-w-[1500px] px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-14">
      <header className="flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Command center
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Make room for the next worthwhile opportunity.
          </p>
        </div>
        <Button asChild>
          <Link href="/jobs/new">
            <Plus /> Capture a job
          </Link>
        </Button>
      </header>
      <div className="grid grid-cols-2 divide-x divide-y border-b sm:grid-cols-4 sm:divide-y-0">
        {[
          {
            label: "Active opportunities",
            value: data.activeCount,
            href: "/pipeline",
          },
          {
            label: "Actions to review",
            value: data.visible.length,
            href: "#daily-actions",
          },
          {
            label: "Due within 7 days · incl. overdue",
            value: due.length,
            href: "#upcoming",
          },
          {
            label: "Data checks",
            value: warnings.length,
            href: "#data-quality",
          },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="px-4 py-6 first:pl-0 hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span className="font-mono text-3xl tracking-tight">
              {item.value}
            </span>
            <span className="mt-2 block text-xs text-muted-foreground">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
      <div className="grid items-start gap-9 pt-9 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
        <section id="daily-actions" className="scroll-mt-16">
          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight">
              Your next moves
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Urgency first, then your priority and interest. Effort is not yet
              measured; use your time budget to choose what fits today.
            </p>
          </div>
          <Card>
            <CardContent>
              {data.visible.length ? (
                <ol className="divide-y">
                  {data.visible.map((alert, index) => (
                    <AlertRow
                      key={alert.key}
                      alert={alert}
                      now={data.now}
                      index={index}
                    />
                  ))}
                </ol>
              ) : (
                <div className="py-8">
                  <h3 className="font-medium">You’re clear for now</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    No visible actions need review. Check your pipeline or
                    restore a hidden reminder below.
                  </p>
                  <Button asChild variant="outline" className="mt-4">
                    <Link href="/pipeline">Review pipeline</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          {data.hidden.length ? (
            <Disclosure
              className="mt-5 rounded-lg border bg-card px-5"
              triggerClassName="text-sm font-medium"
              title={`Dismissed & snoozed (${data.hidden.length})`}
            >
              <ul className="mt-4 divide-y">
                {data.hidden.map((alert) => (
                  <li key={alert.key} className="py-4">
                    <Link
                      href={alert.href}
                      className="text-sm font-medium hover:text-primary"
                    >
                      {alert.title} · {alert.source}
                    </Link>
                    <p className="mt-1 break-words text-xs text-muted-foreground">
                      {alert.hiddenReason}
                    </p>
                    <AlertControls alertKey={alert.key} hidden />
                  </li>
                ))}
              </ul>
            </Disclosure>
          ) : null}
        </section>
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold tracking-tight">
              Search momentum
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {data.capturedThisWeek} roles captured and{" "}
              {data.recentChanges.length} stage changes in the last 7 days.
            </p>
            <Card className="mt-4">
              <CardContent>
                <h3 className="text-sm font-semibold">Recorded funnel</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  All time through {date.format(data.now)}. Unique applications
                  per milestone; expand a count to inspect its sources.
                </p>
                <div className="mt-4 divide-y">
                  {data.funnel.map((row) => (
                    <Disclosure
                      key={row.category}
                      className="py-3"
                      triggerClassName="py-0 text-sm"
                      title={
                        <>
                          <span className="ml-1">{row.label}</span>
                          <span className="ml-auto font-mono tabular-nums">
                            {row.applications.length}
                          </span>
                        </>
                      }
                    >
                      <ul className="mt-3 space-y-2">
                        {row.applications.map((application) => (
                          <li key={application.jobId}>
                            <Link
                              href={`/jobs/${application.jobId}#application-workspace-heading`}
                              className="text-xs text-muted-foreground hover:text-primary"
                            >
                              {application.company} · {application.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      {!row.applications.length ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          No recorded applications at this milestone.
                        </p>
                      ) : null}
                    </Disclosure>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  Counts reflect recorded stage events and submission snapshots.
                  Skipped stages are not inferred. These counts alone do not
                  establish whether your search is improving.
                </p>
              </CardContent>
            </Card>
          </section>
          <section>
            <h2 className="text-lg font-semibold tracking-tight">
              This week’s capacity
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {data.weeklyHours !== null
                ? `${data.weeklyHours} hours budgeted per week. Choose the actions above that fit; time spent is not tracked yet.`
                : "Set a weekly time budget in your search strategy to keep your plan realistic."}
            </p>
            <Button asChild variant="link" className="h-auto px-0 py-2">
              <Link href="/settings/search-strategy">
                Review search strategy <ArrowUpRight />
              </Link>
            </Button>
          </section>
          <section id="upcoming" className="scroll-mt-16">
            <h2 className="text-lg font-semibold tracking-tight">
              Upcoming & at risk
            </h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              The next 7 days, including overdue items. Interview times are
              shown in UTC.
            </p>
            <ul className="mt-4 space-y-3">
              {due.map((alert) => (
                <li key={alert.key}>
                  <Link
                    href={alert.href}
                    className="text-sm font-medium hover:text-primary"
                  >
                    {alert.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {alert.source} · {time.format(new Date(alert.dueAt!))} UTC
                  </p>
                </li>
              ))}
            </ul>
            {!due.length ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No visible reminders due in this window.
              </p>
            ) : null}
          </section>
          <section id="data-quality" className="scroll-mt-16">
            <h2 className="text-lg font-semibold tracking-tight">
              Data quality
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {warnings.length
                ? `${warnings.length} checks are included in your next moves. Resolve them at the source, or use the reminder controls there.`
                : "No visible data checks need attention."}
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold tracking-tight">
              Recent stage changes
            </h2>
            <ul className="mt-4 space-y-4">
              {data.recentChanges.slice(0, 5).map((event) => (
                <li key={event.id}>
                  <Link
                    href={`/jobs/${event.jobId}#application-workspace-heading`}
                    className="text-sm font-medium hover:text-primary"
                  >
                    {event.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.company} · {event.role}
                  </p>
                  <time className="mt-1 block font-mono text-[10px] text-muted-foreground">
                    {date.format(event.occurredAt)}
                  </time>
                </li>
              ))}
            </ul>
            {!data.recentChanges.length ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Stage changes from the last 7 days will appear here.
              </p>
            ) : null}
            <Button asChild variant="link" className="h-auto px-0 py-2">
              <Link href="/pipeline?view=timeline">
                View timeline <ArrowUpRight />
              </Link>
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
