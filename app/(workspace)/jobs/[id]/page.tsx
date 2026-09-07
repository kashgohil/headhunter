import Link from "next/link";
import { AlertTriangle, ArrowLeft, CalendarDays, ExternalLink, MapPin, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { JobMetadataForm } from "@/app/(workspace)/jobs/[id]/job-metadata-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getJob } from "@/lib/jobs/repository";

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

const confidenceLabel = {
  not_run: "Not extracted",
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

const duplicateReason = {
  exact_url: "Same source URL",
  same_role: "Same company and title",
  similar_description: "Similar description",
};

function inputDate(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? "";
}

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

      {job.duplicateJobs.length > 0 ? (
        <div className="mt-8 rounded-lg border border-destructive/25 bg-destructive/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <h2 className="text-sm font-semibold">Possible duplicate {job.duplicateJobs.length === 1 ? "job" : "jobs"}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Nothing was merged or removed. Compare the existing capture before deciding what to keep.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {job.duplicateJobs.map((duplicate) => (
                  <Button key={duplicate.id} asChild variant="outline" size="sm">
                    <Link href={`/jobs/${duplicate.id}`}>{duplicate.company} · {duplicate.title} <span className="text-muted-foreground">({duplicateReason[duplicate.reason]})</span></Link>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Card className="mt-8">
        <CardHeader className="border-b border-border pb-6"><CardTitle>Structured job details</CardTitle><p className="text-sm leading-6 text-muted-foreground">Review the extracted fields and correct anything the source expressed differently.</p></CardHeader>
        <CardContent>
          <JobMetadataForm job={{
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            employmentType: job.employmentType,
            workArrangement: job.workArrangement,
            seniority: job.seniority,
            minimumCompensation: job.minimumCompensation,
            maximumCompensation: job.maximumCompensation,
            compensationCurrency: job.compensationCurrency,
            postedAt: inputDate(job.postedAt),
            applicationDeadline: inputDate(job.applicationDeadline),
            responsibilities: job.responsibilities,
            requiredQualifications: job.requiredQualifications,
            preferredQualifications: job.preferredQualifications,
            skills: job.skills,
            technologies: job.technologies,
          }} />
        </CardContent>
      </Card>

      <div className="grid gap-6 pt-8 lg:grid-cols-[minmax(0,1fr)_260px]">
        <Card>
          <CardHeader className="border-b border-border pb-6"><div className="flex items-center justify-between gap-4"><CardTitle>Original source</CardTitle><span className="font-mono text-xs text-muted-foreground">Immutable</span></div></CardHeader>
          <CardContent><div className="whitespace-pre-wrap font-mono text-[13px] leading-6 text-foreground/80">{job.originalDescription || "No source text was captured for this manually entered role."}</div></CardContent>
        </Card>

        <aside className="space-y-4">
          <Card className="gap-4">
            <CardHeader><CardTitle className="leading-5">Source record</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-xs leading-5 text-muted-foreground">
              <div><p className="font-medium text-foreground">Capture method</p><p className="mt-1 capitalize">{job.sourceType === "url" ? "Imported URL" : job.sourceType}</p></div>
              <div><p className="font-medium text-foreground">Extraction</p><Badge variant="outline" className="mt-1">{confidenceLabel[job.extractionConfidence]}</Badge></div>
              {job.sourceFetchedAt ? <div><p className="font-medium text-foreground">Fetched</p><p className="mt-1">{dateFormatter.format(job.sourceFetchedAt)}</p></div> : null}
              {job.metadataUpdatedAt ? <div><p className="font-medium text-foreground">Last corrected</p><p className="mt-1">{dateFormatter.format(job.metadataUpdatedAt)}</p></div> : null}
            </CardContent>
          </Card>
          <div className="rounded-lg border border-dashed border-border p-4 text-xs leading-5 text-muted-foreground">Extracted values are suggestions. Saving corrections never changes the preserved source above.</div>
        </aside>
      </div>

    </div>
  );
}
