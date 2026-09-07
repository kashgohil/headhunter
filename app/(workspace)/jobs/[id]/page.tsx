import Link from "next/link";
import { AlertTriangle, ArrowLeft, CalendarDays, ExternalLink, MapPin, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { JobMetadataForm } from "@/app/(workspace)/jobs/[id]/job-metadata-form";
import { ApplicationWorkspace } from "@/app/(workspace)/jobs/[id]/application-workspace";
import { FitAnalysisPanel } from "@/app/(workspace)/jobs/[id]/fit-analysis-panel";
import { ResearchWorkspace } from "@/app/(workspace)/jobs/[id]/research-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getJob } from "@/lib/jobs/repository";
import { getLatestFitAnalysis } from "@/lib/fit-analysis/repository";
import { getCareerProfile } from "@/lib/career-profile/repository";
import { getOpportunityResearch } from "@/lib/research/repository";
import { getApplicationWorkspace } from "@/lib/applications/repository";
import { getOpportunityContacts } from "@/lib/contacts/repository";

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
  const [job, fitAnalysis, profile, research, application, contacts] = await Promise.all([
    getJob(id),
    getLatestFitAnalysis(id),
    getCareerProfile(),
    getOpportunityResearch(id),
    getApplicationWorkspace(id),
    getOpportunityContacts(id),
  ]);

  if (!job) notFound();

  const usedEvidenceIds = new Set(fitAnalysis?.evidenceIds ?? []);
  const evidenceReferences = [
    ...profile.experiences.map((item) => ({ id: item.id, label: `${item.title} · ${item.company}`, href: `/career-profile#evidence-${item.id}` })),
    ...profile.achievements.map((item) => ({ id: item.id, label: item.result, href: `/career-profile#evidence-${item.id}` })),
    ...profile.skills.map((item) => ({ id: item.id, label: item.name, href: `/career-profile#evidence-${item.id}` })),
    ...profile.profileItems.map((item) => ({ id: item.id, label: item.title, href: `/career-profile/library#evidence-${item.id}` })),
  ].filter((item) => usedEvidenceIds.has(item.id));

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

      <section className="mt-8 rounded-lg border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Contacts & referrals</h2><Link href="/contacts" className="text-sm text-primary">Manage contacts</Link></div>{contacts.length ? <ul className="mt-4 space-y-2">{contacts.map((contact) => <li key={contact.id}><Link href={`/contacts/${contact.id}#opportunity-${job.id}`} className="text-sm font-medium hover:text-primary">{contact.name}</Link><span className="ml-3 text-xs text-muted-foreground">{contact.relationship} · {contact.referralStatus.replaceAll("_", " ")}</span></li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">No linked contacts yet. Link a contact to this role to track introductions and promised follow-ups.</p>}</section>

      {application.opportunity ? <ApplicationWorkspace jobId={job.id} data={{
        opportunity: {
          stage: application.opportunity.stage,
          nextAction: application.opportunity.nextAction,
          nextActionDueAt: application.opportunity.nextActionDueAt?.toISOString() ?? null,
          waiting: application.opportunity.waiting,
          waitingReason: application.opportunity.waitingReason,
          checklist: application.opportunity.checklist,
        },
        tasks: application.tasks.map((item) => ({ ...item, dueAt: item.dueAt?.toISOString() ?? null, completedAt: item.completedAt?.toISOString() ?? null })),
        answers: application.answers.map((item) => ({ ...item, createdAt: undefined, updatedAt: item.updatedAt.toISOString() })),
        artifacts: application.artifacts.map((item) => ({ ...item, createdAt: undefined, updatedAt: item.updatedAt.toISOString() })),
        outreach: application.outreach.map((item) => ({ ...item, createdAt: undefined, updatedAt: item.updatedAt.toISOString() })),
        submissions: application.submissions.map((item) => ({ ...item, createdAt: undefined, submittedAt: item.submittedAt.toISOString() })),
        events: [
          ...application.events.map((item) => ({ ...item, occurredAt: item.occurredAt.toISOString() })),
          { id: `job-${job.id}`, kind: "note", title: "Job captured", detail: "Original source preserved", occurredAt: job.capturedAt.toISOString() },
        ],
        libraryAnswers: application.libraryAnswers.map((item) => ({ id: item.id, question: item.question, answer: item.answer, contexts: item.contexts })),
        resumes: application.resumes.map((item) => ({ ...item, submittedAt: item.submittedAt?.toISOString() ?? null, updatedAt: item.updatedAt.toISOString() })),
        interviews: application.interviews.map((item) => ({ ...item, scheduledAt: item.scheduledAt.toISOString(), createdAt: undefined, updatedAt: undefined })),
        stages: application.stages.map((item) => ({ key: item.key, label: item.label, category: item.category, isTerminal: item.isTerminal })),
      }} /> : null}

      <FitAnalysisPanel jobId={job.id} analysis={fitAnalysis} evidenceReferences={evidenceReferences} />

      <ResearchWorkspace
        jobId={job.id}
        company={job.company}
        entries={research.companyEntries.map((entry) => ({
          id: entry.id,
          topic: entry.topic,
          content: entry.content,
          provenance: entry.provenance,
          sourceUrl: entry.sourceUrl,
          sourceState: entry.sourceState,
          accessedAt: entry.accessedAt?.toISOString() ?? null,
        }))}
        opportunityNote={research.opportunityNote?.content ?? ""}
      />

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
