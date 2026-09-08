"use client";

import Link from "next/link";

import { useActionState, useEffect, useRef } from "react";
import { BookOpen, Check, ExternalLink, FileQuestion, Library, LoaderCircle, Plus, Save } from "lucide-react";

import {
  createCompanyResearchAction,
  saveOpportunityResearchAction,
  updateResearchSourceStateAction,
  type CompanyResearchState,
  type OpportunityResearchState,
} from "@/app/(workspace)/jobs/[id]/research-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CompanyResearchEntry = {
  id: string;
  topic: keyof typeof topicLabels;
  content: string;
  provenance: keyof typeof provenanceLabels;
  sourceUrl: string | null;
  sourceState: keyof typeof sourceStateLabels | null;
  accessedAt: string | null;
};

const topicLabels = {
  product: "Product and business",
  team: "Team context",
  culture: "Culture",
  compensation: "Compensation",
  interview_process: "Interview process",
  contact: "Contact",
  open_question: "Open question",
} as const;

const provenanceLabels = {
  sourced_fact: "Sourced fact",
  user_note: "Your note",
  inference: "Inference",
} as const;

const sourceStateLabels = {
  current: "Current",
  stale: "Stale",
  inaccessible: "Inaccessible",
} as const;

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const initialCompanyState: CompanyResearchState = {};
const initialOpportunityState: OpportunityResearchState = {};

function FieldError({ messages }: { messages?: string[] }) {
  return <p className="min-h-4 text-xs text-destructive" aria-live="polite">{messages?.[0]}</p>;
}

function CompanyResearchForm({ jobId }: { jobId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createCompanyResearchAction.bind(null, jobId), initialCompanyState);

  useEffect(() => {
    if (state.saved) formRef.current?.reset();
  }, [state]);

  return (
    <details className="group rounded-lg border border-dashed border-border bg-background/55 open:border-solid open:bg-background">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
        <span className="flex items-center gap-2"><Plus className="size-4" /> Add company research</span>
        <span className="text-xs font-normal text-muted-foreground group-open:hidden">Reusable across roles</span>
      </summary>
      <form ref={formRef} action={formAction} className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium" htmlFor="research-topic">Topic</label>
          <Select name="topic" defaultValue="product">
            <SelectTrigger id="research-topic" className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(topicLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
          <FieldError messages={state.errors?.topic} />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="research-provenance">Information type</label>
          <Select name="provenance" defaultValue="user_note">
            <SelectTrigger id="research-provenance" className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(provenanceLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
          <FieldError messages={state.errors?.provenance} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="research-content">Research note</label>
          <Textarea id="research-content" name="content" className="mt-2 min-h-28" placeholder="What did you learn, observe, or infer?" aria-invalid={Boolean(state.errors?.content)} />
          <FieldError messages={state.errors?.content} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="research-url">Source URL</label>
          <Input id="research-url" name="sourceUrl" type="url" className="mt-2" placeholder="https://…" aria-invalid={Boolean(state.errors?.sourceUrl)} />
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Required for sourced facts. Optional for your notes and inferences.</p>
          <FieldError messages={state.errors?.sourceUrl} />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="research-source-state">Source state</label>
          <Select name="sourceState" defaultValue="unlinked">
            <SelectTrigger id="research-source-state" className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unlinked">No linked source</SelectItem>
              {Object.entries(sourceStateLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <FieldError messages={state.errors?.sourceState} />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="research-accessed-at">Accessed</label>
          <DatePicker id="research-accessed-at" name="accessedAt" className="mt-2" />
          <FieldError messages={state.errors?.accessedAt} />
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <p className={state.errors ? "text-sm text-destructive" : "text-sm text-signal-foreground"} aria-live="polite">{state.message}</p>
          <Button type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <Plus />}{pending ? "Adding…" : "Add to library"}</Button>
        </div>
      </form>
    </details>
  );
}

function SourceStateControl({ jobId, entry }: { jobId: string; entry: CompanyResearchEntry }) {
  if (!entry.sourceUrl) return null;

  return (
    <form action={updateResearchSourceStateAction.bind(null, jobId, entry.id)} className="flex items-center gap-2">
      <Select name="sourceState" defaultValue={entry.sourceState ?? "current"}>
        <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{Object.entries(sourceStateLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
      </Select>
      <Button type="submit" variant="ghost" size="sm">Update</Button>
    </form>
  );
}

function CompanyEntryCard({ jobId, entry }: { jobId: string; entry: CompanyResearchEntry }) {
  const unhealthySource = entry.sourceState === "stale" || entry.sourceState === "inaccessible";

  return (
    <article className={unhealthySource ? "rounded-lg border border-destructive/25 bg-destructive/5 p-4" : "rounded-lg border border-border bg-background p-4"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{provenanceLabels[entry.provenance]}</Badge>
          {entry.sourceState ? <Badge variant={unhealthySource ? "secondary" : "signal"}>{sourceStateLabels[entry.sourceState]}</Badge> : null}
        </div>
        <span className="text-xs text-muted-foreground">{topicLabels[entry.topic]}</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{entry.content}</p>
      <Link href={`/sources/company/${entry.id}`} className="mt-3 inline-block text-xs underline">Inspect source record</Link>
      {entry.sourceUrl ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          <a href={entry.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-primary hover:underline">
            <ExternalLink className="size-3.5 shrink-0" /><span className="truncate">Open source</span>
            {entry.accessedAt ? <span className="shrink-0 font-normal text-muted-foreground">· accessed {dateFormatter.format(new Date(entry.accessedAt))}</span> : null}
          </a>
          <SourceStateControl jobId={jobId} entry={entry} />
        </div>
      ) : null}
    </article>
  );
}

function OpportunityNoteForm({ jobId, content }: { jobId: string; content: string }) {
  const [state, formAction, pending] = useActionState(saveOpportunityResearchAction.bind(null, jobId), initialOpportunityState);

  return (
    <form action={formAction} className="space-y-4">
      <Textarea name="content" defaultValue={content} className="min-h-48 leading-6" placeholder="Role-specific team signals, questions to resolve, application angles, and interview context…" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className={state.error ? "text-sm text-destructive" : "flex items-center gap-2 text-sm text-signal-foreground"} aria-live="polite">{state.message ? <>{state.error ? null : <Check className="size-4" />}{state.message}</> : null}</p>
        <Button type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <Save />}{pending ? "Saving…" : "Save notes"}</Button>
      </div>
    </form>
  );
}

export function ResearchWorkspace({ jobId, company, entries, opportunityNote }: { jobId: string; company: string; entries: CompanyResearchEntry[]; opportunityNote: string }) {
  return (
    <section className="mt-8" aria-labelledby="research-heading">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="research-heading" className="text-xl font-semibold tracking-tight">Research workspace</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Keep durable company knowledge separate from notes for this application.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Library className="size-3.5" /> {entries.length} reusable {entries.length === 1 ? "entry" : "entries"}</div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card>
          <CardHeader className="border-b border-border pb-5">
            <div className="flex items-start gap-3"><BookOpen className="mt-0.5 size-4 text-primary" /><div><CardTitle>{company} library</CardTitle><p className="mt-1 text-sm leading-6 text-muted-foreground">Facts, notes, inferences, contacts, and open questions shared across every role at this company.</p></div></div>
          </CardHeader>
          <CardContent className="space-y-4">
            {entries.length ? <div className="space-y-3">{entries.map((entry) => <CompanyEntryCard key={entry.id} jobId={jobId} entry={entry} />)}</div> : (
              <div className="grid min-h-32 place-items-center rounded-lg border border-dashed border-border px-6 text-center"><div><Library className="mx-auto size-5 text-muted-foreground" /><p className="mt-3 text-sm font-medium">No company research yet</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Add the first reusable signal for {company}.</p></div></div>
            )}
            <CompanyResearchForm jobId={jobId} />
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader className="border-b border-border pb-5">
            <div className="flex items-start gap-3"><FileQuestion className="mt-0.5 size-4 text-primary" /><div><CardTitle>This opportunity</CardTitle><p className="mt-1 text-sm leading-6 text-muted-foreground">Private working notes for this role only. They never overwrite the company library.</p></div></div>
          </CardHeader>
          <CardContent><OpportunityNoteForm jobId={jobId} content={opportunityNote} /></CardContent>
        </Card>
      </div>
    </section>
  );
}
