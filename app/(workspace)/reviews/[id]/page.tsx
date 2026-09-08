import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { sqlite } from "@/lib/db";
import { getSavedReview } from "@/lib/weekly-review/storage";
import type { ReviewSource } from "@/lib/weekly-review/model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/accordion";
import { formatDisplayDate } from "@/lib/date";
import { ReviewEditor } from "./review-editor";
export const metadata = { title: "Weekly review" };
function SourceList({ items }: { items: ReviewSource[] }) {
  return items.length ? (
    <ul className="mt-3 space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className="break-words text-sm underline underline-offset-4"
          >
            {item.label}
          </Link>
          {item.detail ? (
            <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
              {item.detail}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  ) : (
    <p className="mt-3 text-sm text-muted-foreground">None recorded.</p>
  );
}
export default async function WeeklyReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const review = getSavedReview(sqlite, id);
  if (!review) notFound();
  const snapshot = review.snapshot;
  const quality = snapshot.risks.filter((item) => item.kind === "quality");
  const stalled = snapshot.risks.filter((item) => item.kind === "stalled");
  const other = snapshot.risks.filter(
    (item) => item.kind !== "quality" && item.kind !== "stalled",
  );
  const riskItems = (items: typeof snapshot.risks) =>
    items.map((item) => ({
      id: item.key,
      label: `${item.title} · ${item.source}`,
      href: item.href,
      detail: `${item.reason}${item.dueAt ? ` Due ${formatDisplayDate(item.dueAt)}.` : ""}`,
    }));
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 lg:py-10">
      <Button asChild variant="ghost" className="-ml-3 mb-5">
        <Link href="/reviews">Back to weekly reviews</Link>
      </Button>
      <header className="border-b pb-7">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            Week of {formatDisplayDate(snapshot.weekStart)}
          </h1>
          <Badge variant={review.status === "reviewed" ? "signal" : "outline"}>
            {review.status === "reviewed" ? "Reviewed" : "Draft"}
          </Badge>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {formatDisplayDate(snapshot.weekStart)} through{" "}
          {formatDisplayDate(snapshot.weekEnd)} (end excluded). Snapshot created{" "}
          {formatDisplayDate(snapshot.generatedAt)}.
        </p>
      </header>
      <section className="mt-8" aria-labelledby="facts-heading">
        <h2 id="facts-heading" className="text-xl font-semibold tracking-tight">
          Recorded facts
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Expand a count to inspect its records. Source links open current
          records; the labels and counts below stay as captured.
        </p>
        <div className="mt-5 grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {snapshot.metrics.map((metric) => (
            <Disclosure
              key={metric.key}
              className="min-w-0 rounded-lg border bg-card px-5"
              triggerClassName="block py-5"
              title={
                <>
                  <span className="font-mono text-3xl font-semibold tracking-tight">
                    {metric.items.length}
                  </span>
                  <span className="mt-2 block text-sm font-medium">
                    {metric.label}
                  </span>
                </>
              }
            >
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {metric.definition}
              </p>
              <SourceList items={metric.items} />
            </Disclosure>
          ))}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Disclosure
            className="rounded-lg border px-4"
            triggerClassName="text-sm font-medium"
            title={`Progressed opportunities · ${snapshot.progressed.length}`}
          >
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Forward transitions between active stage categories. Repeated
              transitions count once per job; terminal outcomes appear
              separately.
            </p>
            <SourceList items={snapshot.progressed} />
          </Disclosure>
          <Disclosure
            className="rounded-lg border px-4"
            triggerClassName="text-sm font-medium"
            title={`Closed opportunities · ${snapshot.closed.length}`}
          >
            <SourceList items={snapshot.closed} />
          </Disclosure>
        </div>
      </section>
      <Disclosure
        className="mt-5 rounded-lg border px-4"
        triggerClassName="text-sm font-medium"
        title={`Missed task dates this week · ${snapshot.missedTasks.length}`}
      >
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Tasks due this week with no completion by the end of their UTC due
          date. Uses recorded task dates at snapshot creation; earlier edits to
          due dates cannot be reconstructed.
        </p>
        <SourceList items={snapshot.missedTasks} />
      </Disclosure>
      <section className="mt-8 space-y-4 border-t pt-8">
        <h2 className="text-xl font-semibold tracking-tight">
          Risks at snapshot creation
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          These are current reminders captured on{" "}
          {formatDisplayDate(snapshot.generatedAt)}, including snoozed and
          dismissed work. They describe what needs attention now, not what was
          necessarily overdue during the reviewed week.
        </p>
        {[
          { label: "Stalled opportunities", items: stalled },
          { label: "Actions, deadlines, and interview risks", items: other },
          { label: "Data-quality gaps", items: quality },
        ].map((group) => (
          <Disclosure
            key={group.label}
            className="rounded-lg border px-4"
            triggerClassName="text-sm font-medium"
            title={`${group.label} · ${group.items.length}`}
          >
            <SourceList items={riskItems(group.items)} />
          </Disclosure>
        ))}
      </section>
      <section className="my-8 space-y-4 border-t pt-8">
        <h2 className="text-xl font-semibold tracking-tight">
          Interpretations to consider
        </h2>
        <p className="text-sm text-muted-foreground">
          Rule-based prompts for reflection, not verified explanations.
        </p>
        <ul className="space-y-3">
          {snapshot.signals.map((signal) => (
            <li key={signal} className="text-sm leading-6">
              {signal}
            </li>
          ))}
        </ul>
        <Disclosure
          defaultOpen
          className="rounded-lg border bg-muted/25 px-4"
          triggerClassName="text-sm font-medium"
          title="Limits of this snapshot"
        >
          <ul className="mt-3 space-y-2">
            {snapshot.caveats.map((caveat) => (
              <li
                key={caveat}
                className="text-xs leading-5 text-muted-foreground"
              >
                {caveat}
              </li>
            ))}
          </ul>
        </Disclosure>
      </section>
      <ReviewEditor
        key={review.id}
        review={{
          ...review,
          snapshot: {
            weekEnd: snapshot.weekEnd,
            weeklyHours: snapshot.weeklyHours,
            suggestedExperiment: snapshot.suggestedExperiment,
          },
        }}
      />
    </div>
  );
}
