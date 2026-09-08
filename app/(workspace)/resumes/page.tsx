import Link from "next/link";
import { ArrowUpRight, FileCheck2, FilePlus2, Layers3, Plus } from "lucide-react";

import { createTailoredResumeAction } from "@/app/(workspace)/resumes/actions";
import { BaseResumeForm } from "@/app/(workspace)/resumes/base-resume-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCareerProfile } from "@/lib/career-profile/repository";
import { listJobs } from "@/lib/jobs/repository";
import { listResumeStudio } from "@/lib/resumes/repository";

const dateFormatter = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });

export const metadata = { title: "Resume studio" };

export default async function ResumeStudioPage({ searchParams }: PageProps<"/resumes">) {
  const [studio, profile, jobs, query] = await Promise.all([listResumeStudio(), getCareerProfile(), listJobs(), searchParams]);
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-14">
      <header className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Resume studio</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Build from approved evidence, review every proposed change, and preserve exactly what you submit.</p></div>
        <Button asChild variant="outline"><Link href="/career-profile">Review evidence</Link></Button>
      </header>

      {typeof query.error === "string" ? <p role="alert" className="mt-6 rounded-md border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{query.error}</p> : null}

      <section className="grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_340px]" aria-labelledby="drafts-heading">
        <div>
          <div className="mb-4 flex items-center justify-between"><h2 id="drafts-heading" className="text-sm font-semibold">Tailored documents</h2><span className="font-mono text-xs text-muted-foreground">{studio.drafts.length.toString().padStart(2, "0")}</span></div>
          {studio.drafts.length ? <div className="divide-y divide-border overflow-hidden rounded-lg border bg-card shadow-[0_1px_2px_rgba(28,25,20,0.04)]">{studio.drafts.map((draft) => (
            <Link href={`/resumes/${draft.id}`} key={draft.id} className="group grid gap-3 px-5 py-5 outline-none hover:bg-muted/55 focus-visible:bg-muted/55 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
              <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{draft.jobTitle}</h3><Badge variant={draft.status === "submitted" ? "signal" : "outline"}>{draft.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{draft.company} · {draft.baseName} · v{draft.version}</p></div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground"><span>{dateFormatter.format(draft.submittedAt || draft.updatedAt)}</span><ArrowUpRight className="size-4" /></div>
            </Link>
          ))}</div> : <Card className="border-dashed bg-card/55"><CardContent className="grid min-h-64 place-items-center text-center"><div className="max-w-sm"><FileCheck2 className="mx-auto size-7 text-muted-foreground"/><h3 className="mt-4 font-semibold">No tailored documents yet</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Create a base profile, then pair it with a captured job to start a reviewable draft.</p></div></CardContent></Card>}
        </div>

        <Card className="h-fit">
          <CardHeader><CardTitle>Create a tailored draft</CardTitle><p className="text-sm leading-6 text-muted-foreground">Suggestions are generated locally from the evidence you select.</p></CardHeader>
          <CardContent><form action={createTailoredResumeAction} className="space-y-4"><div><label htmlFor="draft-base-resume" className="text-sm font-medium">Base resume</label><Select name="baseResumeId" required><SelectTrigger id="draft-base-resume" className="mt-2"><SelectValue placeholder="Choose a profile" /></SelectTrigger><SelectContent>{studio.profiles.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div><div><label htmlFor="draft-target-job" className="text-sm font-medium">Target job</label><Select name="jobId" required><SelectTrigger id="draft-target-job" className="mt-2"><SelectValue placeholder="Choose a job" /></SelectTrigger><SelectContent>{jobs.map((job) => <SelectItem key={job.id} value={job.id}>{job.title} · {job.company}</SelectItem>)}</SelectContent></Select></div><Button className="w-full" disabled={!studio.profiles.length || !jobs.length}><FilePlus2 /> Generate review draft</Button>{!studio.profiles.length || !jobs.length ? <p className="text-xs leading-5 text-muted-foreground">You need at least one base resume and one captured job.</p> : null}</form></CardContent>
        </Card>
      </section>

      <section className="border-t border-border pt-8" aria-labelledby="profiles-heading">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="profiles-heading" className="text-xl font-semibold tracking-tight">Base profiles</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Reusable source selections for each role family or positioning strategy.</p></div><span className="font-mono text-xs text-muted-foreground">{studio.profiles.length} profiles</span></div>
        {studio.profiles.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{studio.profiles.map((item) => <Card key={item.id} className="gap-4 py-5"><CardHeader className="px-5"><div className="flex items-start justify-between gap-3"><span className="grid size-9 place-items-center rounded-md bg-muted"><Layers3 className="size-4" /></span><span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{item.template}</span></div><CardTitle className="mt-3">{item.name}</CardTitle><p className="text-sm text-muted-foreground">{item.roleFamily}</p></CardHeader><CardContent className="px-5 text-xs leading-5 text-muted-foreground">{item.experienceIds.length} experiences · {item.achievementIds.length} achievements · {item.skillIds.length} skills</CardContent></Card>)}</div> : null}

        <details className="mt-6 rounded-lg border border-border bg-card open:shadow-sm"><summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring/30"><Plus className="size-4" /> Create base resume</summary><div className="border-t border-border px-6 py-6"><BaseResumeForm profile={profile} /></div></details>
      </section>
    </div>
  );
}
