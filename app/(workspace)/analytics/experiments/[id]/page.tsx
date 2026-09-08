import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { sqlite } from "@/lib/db";
import { getAnalyticsInput } from "@/lib/analytics/repository";
import { listExperiments } from "@/lib/analytics/storage";
import {
  evaluateExperiment,
  segmentLabels,
  outcomeLabels,
} from "@/lib/analytics/segments";
import { Badge } from "@/components/ui/badge";
import { ExperimentEditor } from "../../forms";
export default async function ExperimentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const experiment = listExperiments(sqlite).find((item) => item.id === id);
  if (!experiment) notFound();
  const plan = experiment.plan;
  const result =
    experiment.result ??
    evaluateExperiment(getAnalyticsInput(), plan, new Date());
  const fields = {
    Hypothesis: plan.hypothesis,
    "Changed variable": segmentLabels[plan.variable],
    Baseline: plan.baseline,
    "Changed value": plan.treatment,
    "Target segment":
      plan.targetDimension === "all"
        ? "All applications"
        : `${segmentLabels[plan.targetDimension]}: ${plan.targetValue}`,
    "Keep constant / group assignment": plan.controls,
    "Application window": `${plan.startDate} – ${plan.endDate} UTC (inclusive)`,
    "Success measure": `${outcomeLabels[plan.outcome]} within ${plan.observationDays} days of applying`,
  };
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <Link href="/analytics#experiments" className="text-sm text-primary">
        Back to experiments
      </Link>
      <header className="mt-6 border-b pb-6">
        <h1 className="break-words text-3xl font-semibold tracking-tight">
          {plan.title}
        </h1>
        <Badge variant="secondary" className="mt-3">
          {experiment.status}
        </Badge>
      </header>
      <dl className="my-8 grid gap-6 sm:grid-cols-2">
        {Object.entries(fields).map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <section className="rounded-lg border bg-card p-5 sm:p-7">
        <h2 className="text-xl font-semibold">
          {experiment.result ? "Saved results" : "Observed results"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Applications from {plan.startDate} through {plan.endDate} UTC. Each
          application gets {plan.observationDays} days to reach{" "}
          {outcomeLabels[plan.outcome].toLowerCase()}; later events are
          excluded. Observed at{" "}
          {new Date(result.generatedAt)
            .toISOString()
            .replace("T", " ")
            .slice(0, 19)}{" "}
          UTC.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {result.arms.map((arm) => (
            <div key={arm.arm} className="rounded-md border p-4">
              <h3 className="text-sm font-medium">
                {arm.arm === "baseline" ? "Baseline" : "Changed"} · {arm.label}
              </h3>
              <p className="mt-3 font-mono text-2xl">
                {arm.count}/{arm.sampleSize} ·{" "}
                {arm.rate === null ? "—" : `${(arm.rate * 100).toFixed(1)}%`}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                n={arm.sampleSize} mature applications · {plan.startDate} –{" "}
                {plan.endDate} UTC · {plan.observationDays}-day outcomes.{" "}
                {arm.pending} still in the observation period.
              </p>
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer">
                  Inspect mature applications
                </summary>
                {arm.applications.length ? (
                  <ul className="mt-3 space-y-2">
                    {arm.applications.map((job) => (
                      <li key={job.id}>
                        <Link
                          href={`/analytics/applications/${job.id}`}
                          className="text-primary hover:underline"
                        >
                          {job.company} · {job.title}
                        </Link>
                        <span className="block text-xs text-muted-foreground">
                          {arm.successes.includes(job.id)
                            ? "Milestone recorded within observation period"
                            : "No milestone recorded within observation period"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-muted-foreground">
                    No mature applications in this group.
                  </p>
                )}
              </details>
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm leading-6">
          {result.difference === null
            ? "No rate comparison is available until both groups have mature applications."
            : `Observed difference: ${result.difference >= 0 ? "+" : ""}${(result.difference * 100).toFixed(1)} percentage points (changed minus baseline).`}
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {result.interpretation} The 20-application label is a caution
          threshold, not a significance test.
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {result.excluded} target applications have neither group value and are
          excluded. Groups match recorded attributes; they are not randomly
          assigned by Headhunter. Annotations may be retrospective.{" "}
          {experiment.result
            ? "Results are frozen at completion."
            : "Results reflect current records, including while the plan is not running."}
        </p>
      </section>
      <section className="mt-8 rounded-lg border p-5 sm:p-7">
        <h2 className="mb-5 text-xl font-semibold">Execution and learning</h2>
        <ExperimentEditor experiment={experiment} />
      </section>
    </div>
  );
}
