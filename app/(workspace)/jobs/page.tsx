import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listJobs } from "@/lib/jobs/repository";

const dateFormatter = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });

export default async function JobsPage() {
  const jobs = await listJobs();

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-14">
      <header className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Job inbox</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">A quiet place for roles worth a closer look. Capture the source first; qualify it later.</p>
        </div>
        <Button asChild size="lg"><Link href="/jobs/new"><Plus /> Add a job</Link></Button>
      </header>

      <section className="pt-8" aria-labelledby="inbox-heading">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="inbox-heading" className="text-sm font-semibold">Unqualified roles</h2>
          <span className="font-mono text-xs text-muted-foreground">{jobs.length.toString().padStart(2, "0")}</span>
        </div>

        {jobs.length === 0 ? (
          <Card className="overflow-hidden border-dashed bg-card/55 py-0">
            <CardContent className="grid min-h-80 place-items-center px-6 py-14 text-center">
              <div className="max-w-sm">
                <span className="mx-auto mb-5 grid size-11 place-items-center rounded-lg border border-border bg-background shadow-sm"><BriefcaseBusiness className="size-5" /></span>
                <h3 className="text-base font-semibold">Your inbox is clear</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Start with one real role. We’ll preserve the original posting before any analysis touches it.</p>
                <Button asChild variant="outline" className="mt-6"><Link href="/jobs/new"><Plus /> Capture first job</Link></Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgba(28,25,20,0.04)]">
            {jobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="group grid gap-4 px-5 py-5 outline-none hover:bg-muted/60 focus-visible:bg-muted/60 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold sm:text-base">{job.title}</h3><Badge variant="outline">Inbox</Badge></div>
                  <p className="mt-1 text-sm text-muted-foreground">{job.company}{job.location ? ` · ${job.location}` : ""}</p>
                </div>
                <div className="flex items-center justify-between gap-5 sm:justify-end">
                  <span className="text-xs text-muted-foreground">Captured {dateFormatter.format(job.capturedAt)}</span>
                  <ArrowUpRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
