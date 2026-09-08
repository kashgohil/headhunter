import Link from "next/link";
import {
  Archive,
  ArrowUpRight,
  CalendarClock,
  Clock3,
  Columns3,
  List,
} from "lucide-react";

import {
  CustomStageControl,
  PipelineMetadataControls,
} from "@/app/(workspace)/pipeline/pipeline-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPipelineOverview } from "@/lib/applications/pipeline";
import { formatDisplayDate } from "@/lib/date";
import { cn } from "@/lib/utils";

const views = [
  { value: "kanban", label: "Board", icon: Columns3 },
  { value: "table", label: "Table", icon: List },
  { value: "timeline", label: "Timeline", icon: Clock3 },
  { value: "upcoming", label: "Upcoming", icon: CalendarClock },
  { value: "archive", label: "Archive", icon: Archive },
] as const;
type View = (typeof views)[number]["value"];
type Pipeline = Awaited<ReturnType<typeof getPipelineOverview>>;
type Application = Pipeline["applications"][number];

const dateFormatter = { format: formatDisplayDate };
const dateTimeFormatter = { format: formatDisplayDate };

function isView(value: unknown): value is View {
  return views.some((view) => view.value === value);
}

function ApplicationCard({ application }: { application: Application }) {
  const needsAction = !application.nextAction && !application.waiting;
  return (
    <article className="rounded-lg border bg-card p-4 shadow-[0_1px_2px_rgba(28,25,20,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/jobs/${application.jobId}`}
            className="text-sm font-semibold leading-5 outline-none hover:text-primary focus-visible:text-primary"
          >
            {application.title}
          </Link>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {application.company}
            {application.location ? ` · ${application.location}` : ""}
          </p>
        </div>
        <Link
          href={`/jobs/${application.jobId}`}
          aria-label={`Open ${application.title}`}
          className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
      <div className="mt-4 border-t pt-3">
        <div className="flex flex-wrap items-center gap-2">
          {application.priority === "high" ? (
            <Badge variant="outline">High priority</Badge>
          ) : null}
          {application.waiting ? (
            <Badge variant="outline">Waiting</Badge>
          ) : null}
          {needsAction ? (
            <Badge
              variant="outline"
              className="border-destructive/30 text-destructive"
            >
              Needs action
            </Badge>
          ) : null}
        </div>
        <p
          className={cn(
            "mt-2 text-xs leading-5",
            needsAction ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {application.waiting
            ? application.waitingReason
            : (application.nextAction ?? "No next action set")}
        </p>
        {application.nextActionDueAt ? (
          <time className="mt-1 block font-mono text-[10px] text-muted-foreground">
            Due {dateFormatter.format(application.nextActionDueAt)}
          </time>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <PipelineMetadataControls
          jobId={application.jobId}
          priority={application.priority}
          interest={application.interest}
        />
        <span className="font-mono text-[10px] text-muted-foreground">
          {application.openTaskCount} tasks
        </span>
      </div>
    </article>
  );
}

function KanbanView({ pipeline }: { pipeline: Pipeline }) {
  const stages = pipeline.stages.filter((stage) => !stage.isTerminal);
  return (
    <div className="relative overflow-x-auto pb-4">
      <div className="flex min-w-max items-start gap-4">
        {stages.map((stage) => {
          const applications = pipeline.applications.filter(
            (application) => application.stage === stage.key,
          );
          return (
            <section
              key={stage.key}
              className="w-72 shrink-0"
              aria-labelledby={`stage-${stage.key}`}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 id={`stage-${stage.key}`} className="text-sm font-semibold">
                  {stage.label}
                </h2>
                <span className="font-mono text-xs text-muted-foreground">
                  {applications.length.toString().padStart(2, "0")}
                </span>
              </div>
              <div className="space-y-3">
                {applications.map((application) => (
                  <ApplicationCard
                    key={application.jobId}
                    application={application}
                  />
                ))}
                {!applications.length ? (
                  <div className="grid min-h-32 place-items-center rounded-lg border border-dashed bg-card/30 px-5 text-center text-xs leading-5 text-muted-foreground">
                    No applications in this stage.
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function TableView({ applications }: { applications: Application[] }) {
  return (
    <div className="relative overflow-x-auto rounded-lg border bg-card">
      <table className="w-full min-w-5xl text-left text-sm">
        <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-5 py-3 font-medium">Opportunity</th>
            <th className="px-4 py-3 font-medium">Stage</th>
            <th className="px-4 py-3 font-medium">Priority / interest</th>
            <th className="px-4 py-3 font-medium">Next action</th>
            <th className="px-4 py-3 font-medium">Applied</th>
            <th className="px-4 py-3 font-medium">Activity</th>
            <th className="px-5 py-3">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {applications.map((application) => (
            <tr key={application.jobId} className="hover:bg-muted/30">
              <td className="px-5 py-4">
                <p className="font-semibold">{application.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {application.company}
                </p>
              </td>
              <td className="px-4 py-4">
                <Badge variant="outline">
                  {application.stageDefinition?.label ?? application.stage}
                </Badge>
              </td>
              <td className="px-4 py-4">
                <PipelineMetadataControls
                  jobId={application.jobId}
                  priority={application.priority}
                  interest={application.interest}
                />
              </td>
              <td className="max-w-64 px-4 py-4">
                <p
                  className={cn(
                    "truncate text-xs",
                    !application.nextAction && !application.waiting
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {application.waiting
                    ? `Waiting: ${application.waitingReason}`
                    : (application.nextAction ?? "Missing")}
                </p>
                {application.nextActionDueAt ? (
                  <time className="mt-1 block font-mono text-[10px] text-muted-foreground">
                    {dateFormatter.format(application.nextActionDueAt)}
                  </time>
                ) : null}
              </td>
              <td className="px-4 py-4 text-xs text-muted-foreground">
                {application.applicationDate
                  ? dateFormatter.format(application.applicationDate)
                  : "—"}
              </td>
              <td className="px-4 py-4 text-xs text-muted-foreground">
                {dateFormatter.format(application.lastInteractionAt)}
              </td>
              <td className="px-5 py-4">
                <Button asChild variant="ghost" size="icon">
                  <Link
                    href={`/jobs/${application.jobId}`}
                    aria-label={`Open ${application.title}`}
                  >
                    <ArrowUpRight />
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!applications.length ? (
        <p className="p-12 text-center text-sm text-muted-foreground">
          No applications in this view.
        </p>
      ) : null}
    </div>
  );
}

function TimelineView({ applications }: { applications: Application[] }) {
  const events = applications
    .flatMap((application) =>
      application.events.map((event) => ({ ...event, application })),
    )
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  return (
    <Card>
      <CardContent>
        {events.length ? (
          <ol className="relative ml-2 border-l pl-7">
            {events.map((event) => (
              <li key={event.id} className="relative pb-7 last:pb-0">
                <span className="absolute -left-[33px] top-1 size-2.5 rounded-full border-2 border-card bg-primary" />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">{event.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <Link
                        className="hover:text-foreground"
                        href={`/jobs/${event.application.jobId}`}
                      >
                        {event.application.company} · {event.application.title}
                      </Link>
                      {event.detail ? ` — ${event.detail}` : ""}
                    </p>
                  </div>
                  <time className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {dateTimeFormatter.format(event.occurredAt)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Pipeline activity will appear here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function UpcomingView({ applications }: { applications: Application[] }) {
  const items = applications
    .flatMap((application) => [
      ...(application.nextAction && application.nextActionDueAt
        ? [
            {
              id: `action-${application.jobId}`,
              kind: "Next action",
              title: application.nextAction,
              at: application.nextActionDueAt,
              application,
            },
          ]
        : []),
      ...application.tasks
        .filter((task) => !task.completedAt && task.dueAt)
        .map((task) => ({
          id: `task-${task.id}`,
          kind: "Task",
          title: task.title,
          at: task.dueAt!,
          application,
        })),
      ...application.interviews
        .filter((interview) => interview.status === "scheduled")
        .map((interview) => ({
          id: `interview-${interview.id}`,
          kind: "Interview",
          title: interview.label,
          at: interview.scheduledAt,
          application,
        })),
    ])
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  const now = new Date();
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const overdue = item.at < now;
        return (
          <Link
            key={item.id}
            href={`/jobs/${item.application.jobId}`}
            className="grid gap-3 rounded-lg border bg-card p-4 outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/30 sm:grid-cols-[120px_1fr_auto] sm:items-center"
          >
            <div>
              <Badge
                variant="outline"
                className={
                  overdue ? "border-destructive/30 text-destructive" : ""
                }
              >
                {overdue ? "Overdue" : item.kind}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.application.company} · {item.application.title}
              </p>
            </div>
            <time className="font-mono text-xs text-muted-foreground">
              {dateTimeFormatter.format(item.at)}
            </time>
          </Link>
        );
      })}
      {!items.length ? (
        <div className="grid min-h-64 place-items-center rounded-lg border border-dashed bg-card/40 text-center">
          <div>
            <CalendarClock className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Nothing scheduled</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Dated actions, tasks, and interview rounds will appear here.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ArchiveView({ applications }: { applications: Application[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {applications.map((application) => (
        <Card key={application.jobId} className="gap-4 py-5">
          <CardContent className="px-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  href={`/jobs/${application.jobId}`}
                  className="text-sm font-semibold hover:text-primary"
                >
                  {application.title}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  {application.company}
                </p>
              </div>
              <Badge variant="outline">
                {application.stageDefinition?.label ?? application.stage}
              </Badge>
            </div>
            <p className="mt-4 border-t pt-4 text-xs leading-5 text-muted-foreground">
              {application.outcomeReason ?? "No outcome reason recorded."}
            </p>
            <p className="mt-3 font-mono text-[10px] text-muted-foreground">
              Last activity{" "}
              {dateFormatter.format(application.lastInteractionAt)}
            </p>
          </CardContent>
        </Card>
      ))}
      {!applications.length ? (
        <div className="col-span-full grid min-h-64 place-items-center rounded-lg border border-dashed bg-card/40 text-sm text-muted-foreground">
          No completed or archived applications.
        </div>
      ) : null}
    </div>
  );
}

export default async function PipelinePage(props: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const query = await props.searchParams;
  const view: View = isView(query.view) ? query.view : "kanban";
  const pipeline = await getPipelineOverview();
  const active = pipeline.applications.filter(
    (application) => !application.stageDefinition?.isTerminal,
  );
  const archived = pipeline.applications.filter(
    (application) => application.stageDefinition?.isTerminal,
  );
  const needsAction = active.filter(
    (application) => !application.nextAction && !application.waiting,
  ).length;
  const sevenDaysFromNow = new Date().getTime() + 7 * 86_400_000;
  const dueSoon = active.filter(
    (application) =>
      application.nextActionDueAt &&
      application.nextActionDueAt.getTime() <= sevenDaysFromNow,
  ).length;

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1500px] px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-14">
      <header className="flex flex-col gap-6 border-b pb-8 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Application pipeline
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Keep every opportunity moving with a visible decision, action, or
            deliberate wait.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-md border bg-card px-3 py-2">
            <span className="font-mono text-lg font-semibold">
              {active.length}
            </span>
            <span className="ml-2 text-xs text-muted-foreground">active</span>
          </div>
          <div className="rounded-md border bg-card px-3 py-2">
            <span
              className={cn(
                "font-mono text-lg font-semibold",
                needsAction ? "text-destructive" : "",
              )}
            >
              {needsAction}
            </span>
            <span className="ml-2 text-xs text-muted-foreground">
              need action
            </span>
          </div>
          <div className="rounded-md border bg-card px-3 py-2">
            <span className="font-mono text-lg font-semibold">{dueSoon}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              due in 7 days
            </span>
          </div>
          <CustomStageControl />
        </div>
      </header>
      <nav
        className="mt-6 flex gap-1 overflow-x-auto"
        aria-label="Pipeline views"
      >
        {views.map((item) => (
          <Button
            key={item.value}
            asChild
            variant={view === item.value ? "default" : "ghost"}
            size="sm"
          >
            <Link href={`/pipeline?view=${item.value}`}>
              <item.icon />
              {item.label}
            </Link>
          </Button>
        ))}
      </nav>
      <section className="pt-7">
        {view === "kanban" ? <KanbanView pipeline={pipeline} /> : null}
        {view === "table" ? <TableView applications={active} /> : null}
        {view === "timeline" ? (
          <TimelineView applications={pipeline.applications} />
        ) : null}
        {view === "upcoming" ? <UpcomingView applications={active} /> : null}
        {view === "archive" ? <ArchiveView applications={archived} /> : null}
      </section>
    </div>
  );
}
