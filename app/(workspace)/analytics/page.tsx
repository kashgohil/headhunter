import Link from "next/link";
import { connection } from "next/server";
import { sqlite } from "@/lib/db";
import { calculateFunnel } from "@/lib/analytics/funnel";
import { getAnalyticsInput } from "@/lib/analytics/repository";
import {
  segmentKey,
  segmentKeys,
  segmentLabels,
  summarizeSegments,
  outcomeKey,
  outcomeLabels,
} from "@/lib/analytics/segments";
import { listExperiments } from "@/lib/analytics/storage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Disclosure } from "@/components/ui/accordion";
import { FormSelect } from "@/components/action-form";
import { ExperimentForm } from "./forms";
import { formatDisplayDate } from "@/lib/date";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    window?: string;
    segment?: string;
    outcome?: string;
  }>;
}) {
  await connection();
  const query = await searchParams;
  const days = query.window === "all" ? null : query.window === "90" ? 90 : 30;
  const key = segmentKey(query.segment),
    outcome = outcomeKey(query.outcome),
    now = new Date();
  const input = getAnalyticsInput(now);
  const funnel = calculateFunnel(input, now, days);
  const groups = summarizeSegments(input, now, days, key, outcome);
  const experiments = listExperiments(sqlite);
  const windowLabel = `${funnel.since ? formatDisplayDate(funnel.since) : "All history"} – ${formatDisplayDate(now)}`;
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="border-b pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Application funnel
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Follow outcomes, compare similar applications, and test one change at
          a time.
        </p>
      </header>
      <nav
        aria-label="Funnel time window"
        className="my-6 flex flex-wrap gap-2"
      >
        {["30", "90", "all"].map((value) => (
          <Button
            key={value}
            asChild
            variant={String(days ?? "all") === value ? "default" : "outline"}
          >
            <Link
              aria-current={
                String(days ?? "all") === value ? "page" : undefined
              }
              href={`/analytics?window=${value}&segment=${key}&outcome=${outcome}`}
            >
              {value === "all" ? "All time" : `Last ${value} days`}
            </Link>
          </Button>
        ))}
        <Button asChild variant="ghost">
          <Link href="#experiments">Experiments</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/reviews">Weekly reviews</Link>
        </Button>
      </nav>
      <section className="rounded-lg border bg-card p-5 sm:p-7">
        <h2 className="text-xl font-semibold">
          {funnel.sampleSize} recorded{" "}
          {funnel.sampleSize === 1 ? "application" : "applications"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {windowLabel}. Membership uses the first Applied event or submission,
          including explicit waivers. Outcomes are observed through now.
          Repeated transitions count once; skipped milestones are not inferred.
        </p>
        <div className="mt-6 divide-y">
          {funnel.rows.map((row) => (
            <Disclosure
              key={row.category}
              className="py-4"
              triggerClassName="py-0 text-sm"
              title={
                <>
                  <span className="ml-1 font-medium">{row.label}</span>
                  <span className="ml-auto font-mono">
                    {row.count}/{row.denominator} ·{" "}
                    {row.rate === null
                      ? "—"
                      : `${(row.rate * 100).toFixed(1)}%`}
                  </span>
                </>
              }
            >
              <p className="mt-3 text-xs text-muted-foreground">
                n={row.denominator} · {windowLabel}
              </p>
              {row.applications.length ? (
                <ul className="mt-3 space-y-2">
                  {row.applications.map((job) => (
                    <li key={job.id}>
                      <Link
                        className="text-sm text-primary hover:underline"
                        href={`/jobs/${job.id}#application-workspace-heading`}
                      >
                        {job.company} · {job.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No recorded applications at this milestone.
                </p>
              )}
            </Disclosure>
          ))}
        </div>
      </section>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {funnel.sampleSize < 20
          ? "Small sample: use these counts to check your workflow, not to draw conclusions about strategy. "
          : "Descriptive counts do not establish which strategy caused an outcome. "}
        Recent applications have less time to progress. Screens and interviews
        are separate milestones; neither is automatically a qualified interview.
      </p>
      {funnel.missingAppliedHistory ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {funnel.missingAppliedHistory} opportunities with later milestones
          lack an application date and are excluded.{" "}
          <Link href="/pipeline?view=timeline" className="text-primary">
            Review history
          </Link>
          .
        </p>
      ) : null}
      <section className="mt-10" aria-labelledby="segments-heading">
        <h2
          id="segments-heading"
          className="text-2xl font-semibold tracking-tight"
        >
          Compare segments
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Explore observed correlations. Role mix, employer differences, missing
          records, and time to respond can explain apparent differences. These
          comparisons do not establish causation or statistical significance.
        </p>
        <form
          action="/analytics"
          className="my-6 flex flex-wrap items-end gap-4"
        >
          <input type="hidden" name="window" value={days ?? "all"} />
          <FormSelect
            key={key}
            name="segment"
            label="Group applications by"
            defaultValue={key}
            options={segmentKeys.map((value) => ({
              value,
              label: segmentLabels[value],
            }))}
          />
          <FormSelect
            key={outcome}
            name="outcome"
            label="Compare outcome"
            defaultValue={outcome}
            options={Object.entries(outcomeLabels).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Button type="submit" variant="outline">
            Compare
          </Button>
        </form>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[680px] text-left text-sm">
            <caption className="border-b bg-muted/30 px-5 py-3 text-left text-sm text-muted-foreground">
              {outcomeLabels[outcome]} by {segmentLabels[key].toLowerCase()} ·{" "}
              {windowLabel}
            </caption>
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="p-4 font-medium">Segment / applications</th>
                <th className="p-4 font-medium">Count / sample</th>
                <th className="p-4 font-medium">Rate</th>
                <th className="p-4 font-medium">Uncertainty</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {groups.map((group) => (
                <tr key={group.value} className="align-top">
                  <td className="max-w-80 p-4">
                    <Disclosure
                      triggerClassName="py-0 break-words font-medium"
                      title={group.value}
                    >
                      <ul className="mt-3 space-y-2">
                        {group.applications.map((job) => (
                          <li key={job.id}>
                            <Link
                              href={`/analytics/applications/${job.id}`}
                              className="text-primary hover:underline"
                            >
                              {job.company} · {job.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </Disclosure>
                  </td>
                  <td className="p-4 font-mono">
                    {group.count}/{group.sampleSize}
                    <span className="mt-1 block text-xs text-muted-foreground">
                      n={group.sampleSize}
                    </span>
                  </td>
                  <td className="p-4 font-mono">
                    {(group.rate * 100).toFixed(1)}%
                  </td>
                  <td className="max-w-64 p-4 text-xs leading-5 text-muted-foreground">
                    {group.sampleSize < 20
                      ? "Small sample; insufficient for a strategy conclusion."
                      : "Descriptive correlation; uncontrolled differences remain."}
                    {group.recent
                      ? ` ${group.recent} applied within 14 days; outcomes may be immature.`
                      : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!groups.length ? (
            <p className="p-6 text-sm text-muted-foreground">
              No applications in this window. Record an application in the{" "}
              <Link className="text-primary" href="/pipeline">
                pipeline
              </Link>{" "}
              or choose a longer window.
            </p>
          ) : null}
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Each denominator is that segment’s full application cohort, including
          pending outcomes. Missing values remain in “Not recorded.” Open a
          segment to inspect applications or record annotations. Resume strategy
          defaults to the submitted profile name; fit buckets use the last
          analysis recorded by application time. Compensation uses posted ranges
          in their original currency without assuming a pay period.
        </p>
      </section>
      <section id="experiments" className="mt-12 scroll-mt-8 border-t pt-8">
        <h2 className="text-2xl font-semibold tracking-tight">
          One change at a time
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Write a hypothesis, define two values of one variable, and give both
          groups the same observation period.
        </p>
        <div className="mt-6 divide-y rounded-lg border">
          {experiments.length ? (
            experiments.map((experiment) => (
              <Link
                key={experiment.id}
                href={`/analytics/experiments/${experiment.id}`}
                className="flex items-center justify-between gap-4 p-5 hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <h3 className="break-words text-sm font-medium">
                    {experiment.plan.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {segmentLabels[experiment.plan.variable]} ·{" "}
                    {experiment.plan.startDate} – {experiment.plan.endDate}
                  </p>
                </div>
                <Badge variant="secondary">{experiment.status}</Badge>
              </Link>
            ))
          ) : (
            <p className="p-5 text-sm text-muted-foreground">
              No experiments yet. Start with one specific change you can keep
              consistent.
            </p>
          )}
        </div>
        <Disclosure
          className="mt-6 rounded-lg border bg-card px-5 sm:px-7"
          triggerClassName="font-semibold"
          title="Plan an experiment"
        >
          <div className="mt-6 max-w-3xl">
            <ExperimentForm />
          </div>
        </Disclosure>
      </section>
    </div>
  );
}
