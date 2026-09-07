import Link from "next/link";
import { ArrowLeft, CalendarDays, ExternalLink, MapPin, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getJob } from "@/lib/jobs/repository";

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

export default async function JobDetailPage(props: PageProps<"/jobs/[id]">) {
  const { id } = await props.params;
  const job = await getJob(id);

  if (!job) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-14">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-8 text-muted-foreground"><Link href="/jobs"><ArrowLeft /> Back to inbox</Link></Button>

      <header className="border-b border-border pb-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{job.title}</h1>
            <p className="mt-3 text-base font-medium">{job.company}</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {job.location ? <span className="flex items-center gap-2"><MapPin className="size-3.5" /> {job.location}</span> : null}
              <span className="flex items-center gap-2"><CalendarDays className="size-3.5" /> {dateFormatter.format(job.capturedAt)}</span>
              <span className="flex items-center gap-2"><ShieldCheck className="size-3.5" /> Source preserved</span>
            </div>
          </div>
          {job.sourceUrl ? <Button asChild variant="outline"><a href={job.sourceUrl} target="_blank" rel="noreferrer">Open source <ExternalLink /></a></Button> : null}
        </div>
      </header>

      <div className="grid gap-6 pt-8 lg:grid-cols-[minmax(0,1fr)_260px]">
        <Card>
          <CardHeader className="border-b border-border pb-6"><div className="flex items-center justify-between gap-4"><CardTitle>Original job description</CardTitle><span className="font-mono text-xs text-muted-foreground">Version 1 · immutable</span></div></CardHeader>
          <CardContent><div className="whitespace-pre-wrap font-mono text-[13px] leading-6 text-foreground/80">{job.originalDescription}</div></CardContent>
        </Card>

        <aside className="space-y-4">
          <Card className="gap-4 bg-primary text-primary-foreground">
            <CardHeader><CardTitle className="leading-5">Build your evidence bank</CardTitle></CardHeader>
            <CardContent><p className="text-sm leading-6 text-primary-foreground/65">Fit analysis stays locked until there is verified career evidence to compare.</p></CardContent>
          </Card>
          <div className="rounded-lg border border-dashed border-border p-4 text-xs leading-5 text-muted-foreground">No extraction has run. Every field above was entered by you.</div>
        </aside>
      </div>
    </div>
  );
}
