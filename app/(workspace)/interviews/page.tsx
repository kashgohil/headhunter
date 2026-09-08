import Link from "next/link";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { listInterviews } from "@/lib/interviews/repository";
import { ActionForm, FormSelect } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Disclosure } from "@/components/ui/accordion";
import { saveRoundAction } from "./actions";
import { PlanFields } from "./plan-fields";

export default async function InterviewsPage() {
  const rounds = await listInterviews();
  const roles = await db
    .select({ id: jobs.id, title: jobs.title, company: jobs.company })
    .from(jobs);
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="border-b pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Interviews</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Prepare with evidence, practice deliberately, and leave every
          conversation with a next step.
        </p>
      </header>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section>
          <h2 className="mb-4 text-xl font-semibold">Your rounds</h2>
          <ul className="divide-y rounded-lg border bg-card px-5">
            {rounds.map(({ round, title, company }) => (
              <li key={round.id} className="py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/interviews/${round.id}`}
                    className="font-semibold hover:text-primary"
                  >
                    {round.label}
                  </Link>
                  <Badge variant="outline">{round.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {company} · {title}
                </p>
                <time className="mt-2 block font-mono text-xs text-muted-foreground">
                  {round.scheduledAt
                    .toISOString()
                    .slice(0, 16)
                    .replace("T", " ")}{" "}
                  UTC
                </time>
                <Link
                  className="mt-3 block text-sm text-primary"
                  href={`/interviews/${round.id}`}
                >
                  {round.status === "completed"
                    ? "Review debrief"
                    : round.status === "scheduled" &&
                        round.scheduledAt < new Date()
                      ? "Record debrief"
                      : "Open preparation"}
                </Link>
              </li>
            ))}
          </ul>
          {!rounds.length ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Schedule a round for a saved role to begin preparing.
            </p>
          ) : null}
        </section>
        <Disclosure
          className="rounded-lg border bg-card px-5"
          triggerClassName="text-lg font-semibold"
          title="Schedule a round"
        >
          <div className="mt-1">
            {roles.length ? (
              <ActionForm
                action={saveRoundAction.bind(null, null)}
                label="Schedule round"
              >
                <FormSelect
                  name="jobId"
                  label="Opportunity"
                  options={roles.map((job) => ({
                    value: job.id,
                    label: `${job.company} · ${job.title}`,
                  }))}
                />
                <PlanFields />
              </ActionForm>
            ) : (
              <Link href="/jobs/new" className="text-sm text-primary">
                Capture a job first
              </Link>
            )}
          </div>
        </Disclosure>
      </div>
    </div>
  );
}
