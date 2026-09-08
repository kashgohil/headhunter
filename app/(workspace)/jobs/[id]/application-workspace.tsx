"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import {
  Archive,
  CalendarClock,
  Clock3,
  FileArchive,
  FileText,
  Library,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  Plus,
  Send,
} from "lucide-react";

import {
  addTimelineNoteAction,
  createAnswerAction,
  createArtifactAction,
  createInterviewAction,
  createOutreachAction,
  createTaskAction,
  saveNextActionAction,
  setChecklistItemAction,
  setTaskCompletedAction,
  submitApplicationAction,
  updateAnswerAction,
  updateStageAction,
  type ApplicationActionState,
} from "@/app/(workspace)/jobs/[id]/application-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { checklistItems } from "@/lib/applications/types";

type WorkspaceData = {
  opportunity: { stage: string; nextAction: string | null; nextActionDueAt: string | null; waiting: boolean; waitingReason: string | null; checklist: Record<string, boolean> };
  tasks: Array<{ id: string; title: string; dueAt: string | null; completedAt: string | null }>;
  answers: Array<{ id: string; canonicalAnswerId: string | null; question: string; answer: string; sensitiveDataWarning: string | null; updatedAt: string }>;
  artifacts: Array<{ id: string; kind: "cover_letter" | "portfolio" | "attachment"; name: string; content: string; status: "draft" | "ready"; updatedAt: string }>;
  outreach: Array<{ id: string; kind: "recruiter_outreach" | "referral_request" | "follow_up"; recipient: string | null; subject: string | null; body: string; updatedAt: string }>;
  submissions: Array<{ id: string; method: string; source: string | null; referral: string | null; confirmationId: string | null; submittedAt: string; snapshot: { documents: unknown[]; answers: unknown[] } }>;
  events: Array<{ id: string; kind: string; title: string; detail: string | null; occurredAt: string }>;
  libraryAnswers: Array<{ id: string; question: string; answer: string; contexts: string[] }>;
  resumes: Array<{ id: string; version: number; status: "draft" | "submitted"; submittedAt: string | null; updatedAt: string; baseName: string }>;
  interviews: Array<{ id: string; label: string; scheduledAt: string; status: "scheduled" | "completed" | "cancelled"; notes: string | null }>;
  stages: Array<{ key: string; label: string; category: string; isTerminal: boolean }>;
};
const artifactLabels = { cover_letter: "Cover letter", portfolio: "Portfolio", attachment: "Attachment" } as const;
const outreachLabels = { recruiter_outreach: "Recruiter outreach", referral_request: "Referral request", follow_up: "Follow-up" } as const;
const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });
const initialState: ApplicationActionState = {};

function Feedback({ state }: { state: ApplicationActionState }) {
  if (!state.message) return null;
  return <p role="status" className={state.success ? "text-xs text-signal-foreground" : "text-xs text-destructive"}>{state.message}</p>;
}

function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return <Button type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : null}{children}</Button>;
}

function StageControl({ jobId, stage, stages }: { jobId: string; stage: string; stages: WorkspaceData["stages"] }) {
  const [state, action, pending] = useActionState(updateStageAction.bind(null, jobId), initialState);
  const [selectedStage, setSelectedStage] = useState(stage);
  const [waiver, setWaiver] = useState("");
  const [outcomeReason, setOutcomeReason] = useState("");
  const current = stages.find((item) => item.key === stage);
  return (
    <Popover>
      <PopoverTrigger asChild><Button variant="outline" className="min-w-44 justify-between bg-background">{current?.label ?? stage}<span className="text-muted-foreground">Change</span></Button></PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <form action={action} className="space-y-4" onResetCapture={(event) => {
          // Radix listens to native resets even for controlled selects. Preserve the
          // attempted transition so a validation retry cannot change its target.
          event.preventDefault();
          event.stopPropagation();
        }}>
          <div><label htmlFor="target-stage" className="text-sm font-medium">Move to</label><Select name="stage" value={selectedStage} onValueChange={setSelectedStage}><SelectTrigger id="target-stage" className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{stages.map((item) => <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>)}</SelectContent></Select></div>
          <div><label htmlFor="stage-waiver" className="text-sm font-medium">Applied waiver</label><Textarea id="stage-waiver" name="submissionWaiverReason" value={waiver} onChange={(event) => setWaiver(event.target.value)} className="mt-2 min-h-20" placeholder="Required only when moving to Applied without a submission snapshot" /></div>
          <div><label htmlFor="outcome-reason" className="text-sm font-medium">Outcome reason</label><Textarea id="outcome-reason" name="outcomeReason" value={outcomeReason} onChange={(event) => setOutcomeReason(event.target.value)} className="mt-2 min-h-20" placeholder="Optional context for a terminal stage" /></div>
          <Feedback state={state}/><SubmitButton pending={pending}>Update stage</SubmitButton>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function ToggleForm({ action, checked, label }: { action: (formData: FormData) => void; checked: boolean; label: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={action} className="flex items-start gap-3">
      <input type="hidden" name="checked" value={checked ? "false" : "true"} />
      <Checkbox checked={checked} onCheckedChange={() => formRef.current?.requestSubmit()} aria-label={label} />
      <span className={checked ? "text-sm leading-5 text-muted-foreground line-through" : "text-sm leading-5"}>{label}</span>
    </form>
  );
}

function PlanTab({ jobId, data }: { jobId: string; data: WorkspaceData }) {
  const [nextState, nextAction, nextPending] = useActionState(saveNextActionAction.bind(null, jobId), initialState);
  const [taskState, taskAction, taskPending] = useActionState(createTaskAction.bind(null, jobId), initialState);
  const [interviewState, interviewAction, interviewPending] = useActionState(createInterviewAction.bind(null, jobId), initialState);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Next action</CardTitle><p className="text-sm leading-6 text-muted-foreground">Keep one concrete move visible for this opportunity.</p></CardHeader><CardContent>
        <form action={nextAction} className="space-y-4">
          <div><label htmlFor="next-action" className="text-sm font-medium">Action</label><Input id="next-action" name="nextAction" defaultValue={data.opportunity.nextAction ?? ""} className="mt-2" placeholder="Ask Maya for an introduction" /></div>
          <div><label htmlFor="next-action-due" className="text-sm font-medium">Due date</label><DatePicker id="next-action-due" name="nextActionDueAt" defaultValue={data.opportunity.nextActionDueAt?.slice(0, 10)} className="mt-2" /></div>
          <label className="flex items-start gap-3 rounded-md border bg-background p-3"><Checkbox name="waiting" value="true" defaultChecked={data.opportunity.waiting}/><span><span className="block text-sm font-medium">Waiting on someone else</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">Use this deliberately instead of inventing a next action.</span></span></label>
          <div><label htmlFor="waiting-reason" className="text-sm font-medium">Waiting for</label><Input id="waiting-reason" name="waitingReason" defaultValue={data.opportunity.waitingReason ?? ""} className="mt-2" placeholder="Recruiter response after screen" /></div>
          <div className="flex items-center justify-between gap-3"><Feedback state={nextState} /><SubmitButton pending={nextPending}>Save next action</SubmitButton></div>
        </form>
      </CardContent></Card>
      <Card><CardHeader><div className="flex items-center justify-between"><CardTitle>Tasks</CardTitle><span className="font-mono text-xs text-muted-foreground">{data.tasks.filter((task) => !task.completedAt).length} open</span></div></CardHeader><CardContent className="space-y-5">
        {data.tasks.length ? <div className="divide-y divide-border border-y border-border">{data.tasks.map((task) => <div key={task.id} className="flex items-start justify-between gap-4 py-3"><ToggleForm action={setTaskCompletedAction.bind(null, jobId, task.id)} checked={Boolean(task.completedAt)} label={task.title} />{task.dueAt ? <span className="shrink-0 text-xs text-muted-foreground">{dateFormatter.format(new Date(task.dueAt))}</span> : null}</div>)}</div> : <p className="rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground">No tasks yet. Add the smallest useful next step.</p>}
        <form action={taskAction} className="grid gap-3 sm:grid-cols-[1fr_170px_auto] sm:items-end">
          <div><label htmlFor="task-title" className="text-sm font-medium">New task</label><Input id="task-title" name="title" className="mt-2" placeholder="Review compensation range" /></div>
          <div><label htmlFor="task-due" className="text-sm font-medium">Due</label><DatePicker id="task-due" name="dueAt" className="mt-2" /></div>
          <SubmitButton pending={taskPending}><Plus /> Add</SubmitButton>
        </form><Feedback state={taskState} />
      </CardContent></Card>
      <Card className="lg:col-span-2"><CardHeader><div className="flex items-center justify-between gap-4"><div><CardTitle>Interview rounds</CardTitle><p className="mt-2 text-sm leading-6 text-muted-foreground">Scheduled rounds appear in the pipeline’s upcoming view.</p></div><span className="font-mono text-xs text-muted-foreground">{data.interviews.length}</span></div></CardHeader><CardContent className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-2">{data.interviews.length ? data.interviews.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 rounded-md border bg-background p-4"><div><Link href={`/interviews/${item.id}`} className="text-sm font-semibold hover:text-primary">{item.label}</Link><p className="mt-1 text-xs text-muted-foreground">{item.status} · Open preparation & debrief</p>{item.notes ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.notes}</p> : null}</div><time className="shrink-0 text-xs text-muted-foreground">{dateTimeFormatter.format(new Date(item.scheduledAt))}</time></div>) : <div className="grid min-h-32 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">No interview rounds scheduled.</div>}</div>
        <form action={interviewAction} className="space-y-4"><div><label htmlFor="interview-label" className="text-sm font-medium">Round</label><Input id="interview-label" name="label" className="mt-2" placeholder="Hiring manager conversation" /></div><div><label htmlFor="interview-at" className="text-sm font-medium">Scheduled at (UTC)</label><Input id="interview-at" name="scheduledAt" type="datetime-local" className="mt-2" /></div><div><label htmlFor="interview-notes" className="text-sm font-medium">Notes</label><Textarea id="interview-notes" name="notes" className="mt-2 min-h-20" placeholder="Format, attendees, call link…" /></div><Feedback state={interviewState}/><SubmitButton pending={interviewPending}><Plus/> Add round</SubmitButton></form>
      </CardContent></Card>
    </div>
  );
}

function DocumentsTab({ jobId, data }: { jobId: string; data: WorkspaceData }) {
  const [state, action, pending] = useActionState(createArtifactAction.bind(null, jobId), initialState);
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
    <div className="space-y-3">
      {data.resumes.map((resume) => <Link key={resume.id} href={`/resumes/${resume.id}`} className="flex items-center justify-between gap-4 rounded-lg border bg-background p-4 outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/30"><div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted"><FileText className="size-4" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold">{resume.baseName}</p><p className="mt-0.5 text-xs text-muted-foreground">Tailored resume · version {resume.version}</p></div></div><Badge variant={resume.status === "submitted" ? "signal" : "outline"}>{resume.status}</Badge></Link>)}
      {data.artifacts.map((item) => <article key={item.id} className="rounded-lg border bg-background p-4"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted"><FileArchive className="size-4" /></span><div><h3 className="text-sm font-semibold">{item.name}</h3><p className="mt-1 text-xs text-muted-foreground">{artifactLabels[item.kind]} · updated {dateFormatter.format(new Date(item.updatedAt))}</p></div></div><Badge variant={item.status === "ready" ? "signal" : "outline"}>{item.status}</Badge></div>{item.content ? <p className="mt-4 whitespace-pre-wrap border-t pt-4 text-sm leading-6 text-muted-foreground">{item.content}</p> : null}</article>)}
      {!data.resumes.length && !data.artifacts.length ? <div className="grid min-h-48 place-items-center rounded-lg border border-dashed text-center"><div><FileText className="mx-auto size-6 text-muted-foreground"/><p className="mt-3 text-sm font-medium">No application documents yet</p><Button asChild variant="outline" size="sm" className="mt-4"><Link href="/resumes">Create tailored resume</Link></Button></div></div> : null}
    </div>
    <Card className="h-fit"><CardHeader><CardTitle>Add document</CardTitle><p className="text-sm leading-6 text-muted-foreground">Store cover-letter text, a portfolio selection, or an attachment reference. Ready items are included in the submission snapshot.</p></CardHeader><CardContent><form action={action} className="space-y-4">
      <div><label className="text-sm font-medium">Type</label><Select name="kind" defaultValue="cover_letter"><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(artifactLabels).map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
      <div><label htmlFor="artifact-name" className="text-sm font-medium">Name</label><Input id="artifact-name" name="name" className="mt-2" placeholder="Acme cover letter" /></div>
      <div><label htmlFor="artifact-content" className="text-sm font-medium">Content or reference</label><Textarea id="artifact-content" name="content" className="mt-2 min-h-32" placeholder="Draft text, selected case studies, or where the file is stored…" /></div>
      <div><label className="text-sm font-medium">State</label><Select name="status" defaultValue="draft"><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="ready">Ready</SelectItem></SelectContent></Select></div>
      <Feedback state={state}/><SubmitButton pending={pending}><Plus /> Add document</SubmitButton>
    </form></CardContent></Card>
  </div>;
}

function AnswersTab({ jobId, data }: { jobId: string; data: WorkspaceData }) {
  const [state, action, pending] = useActionState(createAnswerAction.bind(null, jobId), initialState);
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
    <div className="space-y-4">{data.answers.length ? data.answers.map((item) => <Card key={item.id} className="gap-4 py-5"><CardHeader className="px-5"><div className="flex items-start justify-between gap-3"><CardTitle className="text-sm leading-5">{item.question}</CardTitle>{item.canonicalAnswerId ? <Badge variant="outline"><Library /> Library copy</Badge> : null}</div>{item.sensitiveDataWarning ? <p className="text-xs leading-5 text-destructive">Review sensitive data: {item.sensitiveDataWarning}</p> : null}</CardHeader><CardContent className="px-5"><form action={updateAnswerAction.bind(null, jobId, item.id)}><Textarea name="answer" defaultValue={item.answer} className="min-h-28 leading-6"/><div className="mt-3 flex items-center justify-between"><p className="text-xs text-muted-foreground">Edits stay with this job and never change the library source.</p><Button type="submit" variant="outline" size="sm">Save edit</Button></div></form></CardContent></Card>) : <div className="grid min-h-48 place-items-center rounded-lg border border-dashed text-center"><div><MessageSquareText className="mx-auto size-6 text-muted-foreground"/><p className="mt-3 text-sm font-medium">No screening answers yet</p><p className="mt-1 text-xs text-muted-foreground">Add role-specific questions or copy approved source text.</p></div></div>}</div>
    <Card className="h-fit"><CardHeader><CardTitle>Add screening answer</CardTitle><p className="text-sm leading-6 text-muted-foreground">A library answer is copied here so job-specific edits remain isolated.</p></CardHeader><CardContent><form action={action} className="space-y-4">
      <div><label className="text-sm font-medium">Answer library</label><Select name="canonicalAnswerId" defaultValue="new"><SelectTrigger className="mt-2"><SelectValue placeholder="Start from approved text" /></SelectTrigger><SelectContent><SelectItem value="new">Write a new answer</SelectItem>{data.libraryAnswers.map((item) => <SelectItem key={item.id} value={item.id}>{item.question}</SelectItem>)}</SelectContent></Select></div>
      <p className="text-center text-xs text-muted-foreground">or write a job-specific answer</p>
      <div><label htmlFor="answer-question" className="text-sm font-medium">Question</label><Input id="answer-question" name="question" className="mt-2" placeholder="Why this company?" /></div>
      <div><label htmlFor="answer-text" className="text-sm font-medium">Answer</label><Textarea id="answer-text" name="answer" className="mt-2 min-h-32" /></div>
      <div><label htmlFor="answer-warning" className="text-sm font-medium">Sensitive-data warning</label><Input id="answer-warning" name="sensitiveDataWarning" className="mt-2" placeholder="Optional — salary, authorization, personal data…" /></div>
      <Feedback state={state}/><SubmitButton pending={pending}><Plus /> Add answer</SubmitButton>
    </form></CardContent></Card>
  </div>;
}

function OutreachTab({ jobId, data }: { jobId: string; data: WorkspaceData }) {
  const [state, action, pending] = useActionState(createOutreachAction.bind(null, jobId), initialState);
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
    <div className="space-y-3">{data.outreach.length ? data.outreach.map((item) => <article key={item.id} className="rounded-lg border bg-background p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{outreachLabels[item.kind]}</h3><p className="mt-1 text-xs text-muted-foreground">{item.recipient || "Recipient not set"}{item.subject ? ` · ${item.subject}` : ""}</p></div><Badge variant="outline">Private draft</Badge></div><p className="mt-4 whitespace-pre-wrap border-t pt-4 text-sm leading-6">{item.body}</p></article>) : <div className="grid min-h-48 place-items-center rounded-lg border border-dashed text-center"><div><Send className="mx-auto size-6 text-muted-foreground"/><p className="mt-3 text-sm font-medium">No outreach drafts</p><p className="mt-1 text-xs text-muted-foreground">Draft here; sending always stays under your control.</p></div></div>}</div>
    <Card className="h-fit"><CardHeader><CardTitle>Draft outreach</CardTitle><p className="text-sm leading-6 text-muted-foreground">Nothing is sent from this workspace.</p></CardHeader><CardContent><form action={action} className="space-y-4">
      <div><label className="text-sm font-medium">Purpose</label><Select name="kind" defaultValue="recruiter_outreach"><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(outreachLabels).map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
      <div><label htmlFor="outreach-recipient" className="text-sm font-medium">Recipient</label><Input id="outreach-recipient" name="recipient" className="mt-2" placeholder="Name or profile" /></div>
      <div><label htmlFor="outreach-subject" className="text-sm font-medium">Subject</label><Input id="outreach-subject" name="subject" className="mt-2" /></div>
      <div><label htmlFor="outreach-body" className="text-sm font-medium">Message</label><Textarea id="outreach-body" name="body" className="mt-2 min-h-40" /></div>
      <Feedback state={state}/><SubmitButton pending={pending}>Save private draft</SubmitButton>
    </form></CardContent></Card>
  </div>;
}

function SubmitTab({ jobId, data }: { jobId: string; data: WorkspaceData }) {
  const [state, action, pending] = useActionState(submitApplicationAction.bind(null, jobId), initialState);
  const complete = checklistItems.filter((item) => data.opportunity.checklist[item.id]).length;
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
    <Card><CardHeader><div className="flex items-center justify-between"><div><CardTitle>Pre-submission review</CardTitle><p className="mt-2 text-sm leading-6 text-muted-foreground">Resolve incomplete or inconsistent material before recording the application.</p></div><span className="font-mono text-sm font-semibold">{complete}/{checklistItems.length}</span></div></CardHeader><CardContent><div className="space-y-4 rounded-lg border bg-background p-5">{checklistItems.map((item) => <ToggleForm key={item.id} action={setChecklistItemAction.bind(null, jobId, item.id)} checked={Boolean(data.opportunity.checklist[item.id])} label={item.label} />)}</div></CardContent></Card>
    <Card className="h-fit"><CardHeader><div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 size-4 text-primary"/><div><CardTitle>Record submission</CardTitle><p className="mt-2 text-sm leading-6 text-muted-foreground">Creates immutable snapshots. Later edits will not rewrite this record.</p></div></div></CardHeader><CardContent><form action={action} className="space-y-4">
      <div><label className="text-sm font-medium">Method</label><Select name="method" defaultValue="company_site"><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="company_site">Company site</SelectItem><SelectItem value="job_board">Job board</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="referral">Referral</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
      <div><label htmlFor="submission-source" className="text-sm font-medium">Source</label><Input id="submission-source" name="source" className="mt-2" placeholder="Careers page, LinkedIn, email…" /></div>
      <div><label htmlFor="submitted-at" className="text-sm font-medium">Submitted at (UTC)</label><Input id="submitted-at" name="submittedAt" type="datetime-local" className="mt-2" /></div>
      <div><label htmlFor="submission-referral" className="text-sm font-medium">Referral</label><Input id="submission-referral" name="referral" className="mt-2" placeholder="Optional person or route" /></div>
      <div><label htmlFor="confirmation-id" className="text-sm font-medium">Confirmation ID</label><Input id="confirmation-id" name="confirmationId" className="mt-2" placeholder="Optional" /></div>
      <Feedback state={state}/><SubmitButton pending={pending}><Archive /> Record & freeze</SubmitButton>
    </form></CardContent></Card>
  </div>;
}

function TimelineTab({ jobId, data }: { jobId: string; data: WorkspaceData }) {
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
    <Card><CardHeader><CardTitle>Activity</CardTitle></CardHeader><CardContent>{data.events.length ? <ol className="relative ml-2 border-l border-border pl-6">{data.events.map((event) => <li key={event.id} className="relative pb-6 last:pb-0"><span className="absolute -left-[29px] top-0.5 grid size-3 place-items-center rounded-full border border-border bg-card"/><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm font-medium">{event.title}</p><time className="text-xs text-muted-foreground">{dateTimeFormatter.format(new Date(event.occurredAt))}</time></div>{event.detail ? <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{event.detail}</p> : null}</li>)}</ol> : <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Activity will appear as this application moves.</p>}</CardContent></Card>
    <div className="space-y-6"><Card><CardHeader><CardTitle>Add timeline note</CardTitle></CardHeader><CardContent><form action={addTimelineNoteAction.bind(null, jobId)} className="space-y-3"><Textarea name="note" className="min-h-28" placeholder="Decision, call outcome, context to remember…"/><Button type="submit" variant="outline"><Plus /> Add note</Button></form></CardContent></Card>
    {data.submissions.length ? <Card><CardHeader><CardTitle>Submission records</CardTitle></CardHeader><CardContent className="space-y-3">{data.submissions.map((item) => <div key={item.id} className="rounded-md border bg-background p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium capitalize">{item.method.replaceAll("_", " ")}</p><LockKeyhole className="size-3.5 text-muted-foreground"/></div><p className="mt-1 text-xs text-muted-foreground">{dateTimeFormatter.format(new Date(item.submittedAt))} · {item.snapshot.documents.length} documents · {item.snapshot.answers.length} answers</p>{item.confirmationId ? <p className="mt-2 font-mono text-xs">{item.confirmationId}</p> : null}</div>)}</CardContent></Card> : null}</div>
  </div>;
}

export function ApplicationWorkspace({ jobId, data }: { jobId: string; data: WorkspaceData }) {
  const checklistComplete = checklistItems.filter((item) => data.opportunity.checklist[item.id]).length;
  return (
    <section className="mt-8" aria-labelledby="application-workspace-heading">
      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-5 border-b bg-card px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><div className="flex flex-wrap items-center gap-2"><h2 id="application-workspace-heading" className="text-xl font-semibold tracking-tight">Application workspace</h2><Badge variant={data.opportunity.stage === "applied" || data.opportunity.stage === "offer" ? "signal" : "outline"}>{data.stages.find((item) => item.key === data.opportunity.stage)?.label ?? data.opportunity.stage}</Badge></div><p className="mt-2 text-sm text-muted-foreground">Plan, prepare, reach out, submit, and preserve the full record.</p></div>
          <StageControl jobId={jobId} stage={data.opportunity.stage} stages={data.stages} />
        </div>
        <Tabs defaultValue="plan" className="gap-0">
          <div className="overflow-x-auto border-b px-3 sm:px-6"><TabsList variant="line" className="h-12 min-w-max gap-1">
            <TabsTrigger value="plan"><CalendarClock /> Plan</TabsTrigger><TabsTrigger value="documents"><FileText /> Documents <span className="font-mono text-[10px]">{data.resumes.length + data.artifacts.length}</span></TabsTrigger><TabsTrigger value="answers"><MessageSquareText /> Answers <span className="font-mono text-[10px]">{data.answers.length}</span></TabsTrigger><TabsTrigger value="outreach"><Send /> Outreach</TabsTrigger><TabsTrigger value="submit"><ListChecks /> Submit <span className="font-mono text-[10px]">{checklistComplete}/{checklistItems.length}</span></TabsTrigger><TabsTrigger value="timeline"><Clock3 /> Timeline</TabsTrigger>
          </TabsList></div>
          <div className="bg-muted/20 p-4 sm:p-6"><TabsContent value="plan"><PlanTab jobId={jobId} data={data}/></TabsContent><TabsContent value="documents"><DocumentsTab jobId={jobId} data={data}/></TabsContent><TabsContent value="answers"><AnswersTab jobId={jobId} data={data}/></TabsContent><TabsContent value="outreach"><OutreachTab jobId={jobId} data={data}/></TabsContent><TabsContent value="submit"><SubmitTab jobId={jobId} data={data}/></TabsContent><TabsContent value="timeline"><TimelineTab jobId={jobId} data={data}/></TabsContent></div>
        </Tabs>
      </Card>
    </section>
  );
}
