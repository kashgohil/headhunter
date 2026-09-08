import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { DownloadButton } from "@/components/download-button";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, FileLock2, Lock, ShieldCheck, Unlock, X } from "lucide-react";

import {
  regenerateEditAction,
  regenerateSummaryAction,
  reviewEditAction,
  reviewSectionAction,
  reviewSummaryAction,
  setEditLockAction,
  setSectionLockAction,
  setSummaryLockAction,
  setTemplateAction,
  setSectionOrderAction,
  submitResumeAction,
  updateProposalAction,
  updateSummaryAction,
} from "@/app/(workspace)/resumes/actions";
import { ResumePreview } from "@/app/(workspace)/resumes/[id]/resume-preview";
import { IdentityForm } from "@/app/(workspace)/resumes/[id]/identity-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { buildSnapshot, getTailoredResume } from "@/lib/resumes/repository";

const templateNames = ["classic", "modern", "compact", "minimal"] as const;

function ReviewMetadata({ reason, requirement, evidenceIds, evidence, confidence, risk }: { reason: string; requirement: string; evidenceIds: string[]; evidence: Map<string, { label: string; state: string }>; confidence: string; risk: string }) {
  return <details className="mt-4 rounded-md border border-border bg-muted/35"><summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring/30">Why this changed</summary><dl className="grid gap-3 border-t border-border px-4 py-4 text-xs leading-5 sm:grid-cols-2"><div><dt className="font-medium text-foreground">Reason</dt><dd className="mt-1 text-muted-foreground">{reason}</dd></div><div><dt className="font-medium text-foreground">Requirement addressed</dt><dd className="mt-1 text-muted-foreground">{requirement}</dd></div><div><dt className="font-medium text-foreground">Evidence</dt><dd className="mt-1 space-y-1 text-muted-foreground">{evidenceIds.length ? evidenceIds.map((id) => <Link key={id} href={`/sources/evidence/${id}`} className="block underline decoration-border underline-offset-2 hover:text-foreground">{evidence.get(id)?.label || "Evidence record"} · {evidence.get(id)?.state.replace("_", " ") || "source unavailable"}</Link>) : "No supporting evidence linked"}</dd></div><div><dt className="font-medium text-foreground">Assessment</dt><dd className="mt-1 flex gap-2"><Badge variant="outline">{confidence} confidence</Badge><Badge variant={risk === "low" ? "signal" : "outline"}>{risk} risk</Badge></dd></div></dl></details>;
}

export const metadata = { title: "Tailored resume" };

export default async function TailoredResumePage({ params }: PageProps<"/resumes/[id]">) {
  const { id } = await params;
  const detail = await getTailoredResume(id);
  if (!detail) notFound();
  const snapshot = buildSnapshot(detail);
  const isSubmitted = detail.resume.status === "submitted";
  const pendingCount = (detail.resume.summaryDecision === "pending" ? 1 : 0) + detail.edits.filter((edit) => edit.decision === "pending").length;
  const experienceLock = detail.locks.find((lock) => lock.section === "experience")?.locked ?? false;
  const addressedRequirements = new Set(detail.edits.map((edit) => edit.requirementAddressed));
  const missingRequirements = detail.job.requiredQualifications.filter((requirement) => !addressedRequirements.has(requirement));
  const highRiskCount = detail.edits.filter((edit) => edit.risk === "high").length + (detail.resume.summaryRisk === "high" ? 1 : 0);
  const normalizedBullets = detail.edits.map((edit) => edit.proposedText.toLowerCase().replace(/\W/g, ""));
  const repeatedCount = normalizedBullets.length - new Set(normalizedBullets).size;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-6 text-muted-foreground"><Link href="/resumes"><ArrowLeft /> Back to studio</Link></Button>
      <header className="flex flex-col gap-5 border-b border-border pb-7 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-semibold tracking-[-0.04em]">{detail.job.title}</h1><Badge variant={isSubmitted ? "signal" : "outline"}>{detail.resume.status}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{detail.job.company} · {detail.base.name} · version {detail.resume.version}</p></div><div className="flex flex-wrap gap-2"><DownloadButton key={detail.resume.updatedAt.getTime()} href={`/resumes/${id}/pdf?revision=${detail.resume.updatedAt.getTime()}`} filename="resume.pdf" label="PDF" />{isSubmitted ? <Button variant="secondary" disabled><FileLock2 /> Immutable snapshot</Button> : <form action={submitResumeAction.bind(null, id)}><Button disabled={pendingCount > 0}><ShieldCheck /> Mark submitted</Button></form>}</div></header>

      {isSubmitted ? <div className="mt-6 flex items-start gap-3 rounded-lg border border-signal/25 bg-signal/10 p-4 text-sm leading-6"><FileLock2 className="mt-0.5 size-4 shrink-0 text-signal-foreground"/><p>This exact version is frozen and linked to {detail.job.company}. Later evidence changes will not rewrite it.</p></div> : pendingCount > 0 ? <div className="mt-6 rounded-lg border border-border bg-card px-4 py-3 text-sm"><span className="font-semibold">{pendingCount} pending {pendingCount === 1 ? "decision" : "decisions"}.</span> <span className="text-muted-foreground">Accept or reject each change before submission.</span></div> : null}

      <div className="grid gap-8 pt-8 xl:grid-cols-[minmax(0,680px)_minmax(480px,1fr)]">
        <aside className="xl:sticky xl:top-8 xl:self-start"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">Document preview</p><p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{detail.resume.template}</p></div><ResumePreview snapshot={snapshot} resumeId={id} revision={detail.resume.updatedAt.getTime()}/></aside>

        <div className="min-w-0 space-y-6">
          <Card><CardHeader><CardTitle>Candidate header</CardTitle><p className="text-sm text-muted-foreground">Employer-facing identity is separate from the internal profile name “{detail.base.name}”.</p></CardHeader><CardContent>{isSubmitted ? <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Full name</dt><dd className="mt-1 font-medium">{snapshot.candidate?.name || "Identity unavailable in this legacy snapshot"}</dd></div>{[["Email",snapshot.candidate?.email],["Phone",snapshot.candidate?.phone],["Location",snapshot.candidate?.location],["Website",snapshot.candidate?.website]].filter(([,value]) => value).map(([label,value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-all">{value}</dd></div>)}</dl> : <IdentityForm resumeId={id} identity={{ candidateName: detail.resume.candidateName, candidateEmail: detail.resume.candidateEmail, candidatePhone: detail.resume.candidatePhone, candidateLocation: detail.resume.candidateLocation, candidateWebsite: detail.resume.candidateWebsite }}/>}</CardContent></Card>

          <Card><CardHeader><CardTitle>Document controls</CardTitle><p className="text-sm text-muted-foreground">Fixed, parser-friendly layouts with conventional reading order.</p></CardHeader><CardContent className="space-y-5"><div><p className="mb-2 text-xs font-medium text-muted-foreground">Template and density</p><form action={setTemplateAction.bind(null, id)} className="grid grid-cols-2 gap-2 sm:grid-cols-4">{templateNames.map((template) => <Button key={template} name="template" value={template} variant={detail.resume.template === template ? "default" : "outline"} disabled={isSubmitted} className="capitalize">{template}</Button>)}</form></div><div><p className="mb-2 text-xs font-medium text-muted-foreground">Section order</p><form action={setSectionOrderAction.bind(null, id)} className="flex gap-2"><Button name="preset" value="experience-first" variant={detail.resume.sectionOrder[1] === "experience" ? "secondary" : "outline"} size="sm" disabled={isSubmitted}>Experience first</Button><Button name="preset" value="skills-first" variant={detail.resume.sectionOrder[1] === "skills" ? "secondary" : "outline"} size="sm" disabled={isSubmitted}>Skills first</Button></form></div></CardContent></Card>

          <Card><CardHeader><CardTitle>Content checks</CardTitle><p className="text-sm text-muted-foreground">Checks run against this version before submission.</p></CardHeader><CardContent className="grid gap-3 text-sm sm:grid-cols-3"><div className="rounded-md border p-3"><p className="font-mono text-lg font-semibold">{highRiskCount}</p><p className="mt-1 text-xs text-muted-foreground">unsupported or unverified</p></div><div className="rounded-md border p-3"><p className="font-mono text-lg font-semibold">{repeatedCount}</p><p className="mt-1 text-xs text-muted-foreground">repeated bullets</p></div><div className="rounded-md border p-3"><p className="font-mono text-lg font-semibold">{missingRequirements.length}</p><p className="mt-1 text-xs text-muted-foreground">requirements without direct evidence</p></div>{missingRequirements.length ? <details className="sm:col-span-3"><summary className="cursor-pointer text-xs font-medium">Review missing requirements</summary><ul className="mt-2 space-y-1 pl-4 text-xs leading-5 text-muted-foreground">{missingRequirements.map((item) => <li key={item} className="list-disc">{item}</li>)}</ul></details> : null}</CardContent></Card>

          <Card className={detail.resume.summaryRisk === "high" ? "border-destructive/30" : ""}><CardHeader className="border-b border-border pb-5"><div className="flex items-start justify-between gap-4"><div><CardTitle>Role-specific summary</CardTitle><p className="mt-1 text-xs text-muted-foreground">{detail.resume.summaryDecision === "pending" ? "Awaiting review" : detail.resume.summaryDecision}</p></div>{!isSubmitted ? <form action={setSummaryLockAction.bind(null, id)}><input type="hidden" name="locked" value={String(!detail.resume.summaryLocked)} /><Button variant="ghost" size="sm">{detail.resume.summaryLocked ? <Unlock /> : <Lock />}{detail.resume.summaryLocked ? "Unlock" : "Lock"}</Button></form> : <Lock className="size-4 text-muted-foreground" />}</div></CardHeader><CardContent>
            <div className="grid gap-4 sm:grid-cols-2"><div><p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Original</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{detail.resume.summaryOriginal || "No base summary supplied."}</p></div><div><p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Proposed</p>{!isSubmitted && !detail.resume.summaryLocked ? <form action={updateSummaryAction.bind(null, id)} className="mt-2"><Textarea name="proposedText" defaultValue={detail.resume.summaryProposed} className="min-h-28 text-sm leading-6"/><Button variant="ghost" size="sm" className="mt-2">Save edit</Button></form> : <p className="mt-2 text-sm leading-6">{detail.resume.summaryProposed}</p>}</div></div>
            <ReviewMetadata reason={detail.resume.summaryReason} requirement={detail.resume.summaryRequirement} evidenceIds={detail.resume.summaryEvidenceIds} evidence={detail.evidence} confidence={detail.resume.summaryConfidence} risk={detail.resume.summaryRisk} />
            {!isSubmitted && !detail.resume.summaryLocked ? <div className="mt-4 flex flex-wrap gap-2"><form action={reviewSummaryAction.bind(null, id)} className="flex gap-2"><Button name="decision" value="accepted" variant={detail.resume.summaryDecision === "accepted" ? "default" : "outline"} size="sm"><Check /> Accept</Button><Button name="decision" value="rejected" variant={detail.resume.summaryDecision === "rejected" ? "secondary" : "ghost"} size="sm"><X /> Keep original</Button></form><ActionForm action={regenerateSummaryAction.bind(null, id)} label="Regenerate summary"><span className="sr-only">Regenerate this summary only</span></ActionForm></div> : null}
          </CardContent></Card>

          <section aria-labelledby="experience-review-heading"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 id="experience-review-heading" className="text-sm font-semibold">Experience bullets</h2><p className="mt-1 text-xs text-muted-foreground">Rejected changes retain the original wording and will not return in this version.</p></div>{!isSubmitted ? <div className="flex gap-1"><form action={reviewSectionAction.bind(null, id)} className="flex gap-1"><input type="hidden" name="section" value="experience"/><Button name="decision" value="accepted" variant="ghost" size="sm" disabled={experienceLock}>Accept section</Button><Button name="decision" value="rejected" variant="ghost" size="sm" disabled={experienceLock}>Reject section</Button></form><form action={setSectionLockAction.bind(null, id)}><input type="hidden" name="section" value="experience"/><input type="hidden" name="locked" value={String(!experienceLock)}/><Button variant="ghost" size="sm">{experienceLock ? <Unlock/> : <Lock/>}{experienceLock ? "Unlock" : "Lock"}</Button></form></div> : null}</div>
            <div className="space-y-4">{detail.edits.length ? detail.edits.map((edit) => <Card key={edit.id} className={edit.risk === "high" ? "border-destructive/30" : ""}><CardContent>
              <div className="flex items-start justify-between gap-3"><Badge variant={edit.decision === "accepted" ? "signal" : "outline"}>{edit.decision}</Badge>{!isSubmitted ? <form action={setEditLockAction.bind(null, id)}><input type="hidden" name="editId" value={edit.id}/><input type="hidden" name="locked" value={String(!edit.locked)}/><Button variant="ghost" size="sm">{edit.locked ? <Unlock/> : <Lock/>}{edit.locked ? "Unlock" : "Lock"}</Button></form> : <Lock className="size-4 text-muted-foreground"/>}</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Original</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{edit.originalText}</p></div><div><p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Proposed</p>{!isSubmitted && !edit.locked ? <form action={updateProposalAction.bind(null, id)} className="mt-2"><input type="hidden" name="editId" value={edit.id}/><Textarea key={edit.proposedText} name="proposedText" defaultValue={edit.proposedText} className="min-h-24 text-sm leading-6"/><Button variant="ghost" size="sm" className="mt-2">Save edit</Button></form> : <p className="mt-2 text-sm leading-6">{edit.proposedText}</p>}</div></div>
              <ReviewMetadata reason={edit.reason} requirement={edit.requirementAddressed} evidenceIds={edit.evidenceIds} evidence={detail.evidence} confidence={edit.confidence} risk={edit.risk}/>
              {!isSubmitted && !edit.locked && !experienceLock ? <div className="mt-4 flex flex-wrap gap-2"><form action={reviewEditAction.bind(null, id)} className="flex gap-2"><input type="hidden" name="editId" value={edit.id}/><Button name="decision" value="accepted" variant={edit.decision === "accepted" ? "default" : "outline"} size="sm"><Check/>Accept</Button><Button name="decision" value="rejected" variant={edit.decision === "rejected" ? "secondary" : "ghost"} size="sm"><X/>Keep original</Button></form><ActionForm action={regenerateEditAction.bind(null, id)} label="Regenerate bullet"><input type="hidden" name="editId" value={edit.id}/></ActionForm></div> : null}
            </CardContent></Card>) : <Card className="border-dashed"><CardContent className="text-sm leading-6 text-muted-foreground">No achievements were selected for this base profile. Add verified achievements before creating the next version.</CardContent></Card>}</div>
          </section>
        </div>
      </div>
    </div>
  );
}
