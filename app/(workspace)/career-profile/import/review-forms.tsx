"use client";

import { useActionState } from "react";
import { addFact, removeImport, retryImport, reviewFact, type ReviewState } from "./actions";
import { fieldLabels, kinds, type Proposal } from "@/lib/resume-import/model";
import type { Match } from "@/lib/resume-import/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
const initial: ReviewState = {};
const choices: Record<string, [string, string][]> = {
  isCurrent: [["true", "Yes, this is my current role"], ["false", "No"]],
  recency: [["current", "Using currently"], ["recent", "Used in the last two years"], ["past", "Used earlier"]],
  proficiency: [["learning", "Learning"], ["working", "Working knowledge"], ["advanced", "Advanced"], ["expert", "Expert"]],
};
function Feedback({ state }: { state: ReviewState }) { return state.message ? <p role={state.error ? "alert" : "status"} className={`text-sm ${state.error ? "text-destructive" : "text-muted-foreground"}`}>{state.message}</p> : null; }
function retain(event: React.FormEvent) { event.preventDefault(); event.stopPropagation(); }
export function ProposalEditor({ proposal, experiences, matches }: { proposal: Proposal; experiences: { id: string; label: string }[]; matches: Match[] }) {
  const [state, action, pending] = useActionState(reviewFact.bind(null, proposal.importId, proposal.id), initial);
  return <form action={action} onResetCapture={retain} className="space-y-5">
    <input type="hidden" name="revision" value={state.revision ?? proposal.revision}/>
    <div className="grid gap-4 sm:grid-cols-2">{Object.entries(fieldLabels[proposal.kind]).map(([key, label]) => {
      const id = `${proposal.id}-${key}`;
      const options = key === "experienceId" ? experiences.map(e => [e.id, e.label]) : choices[key];
      const multiline = ["summary", "description", "context", "problem", "action", "result"].includes(key);
      return <div key={key} className={multiline ? "space-y-2 sm:col-span-2" : "space-y-2"}><label htmlFor={id} className="text-sm font-medium">{label}</label>{options ? <Select name={key} defaultValue={proposal.fields[key] || undefined} disabled={pending}><SelectTrigger id={id} className="w-full"><SelectValue placeholder="Not established — choose"/></SelectTrigger><SelectContent>{options.map(([value, title]) => <SelectItem key={value} value={value}>{title}</SelectItem>)}</SelectContent></Select> : multiline ? <Textarea id={id} name={key} defaultValue={proposal.fields[key] || ""} maxLength={2000} disabled={pending} placeholder="Not established in the source" className="min-h-24"/> : <Input id={id} name={key} defaultValue={proposal.fields[key] || ""} maxLength={2000} disabled={pending} placeholder="Not established"/>}</div>;
    })}</div>
    {proposal.kind === "achievement" ? <p className="text-xs leading-5 text-muted-foreground">Approve the related role first, or choose a usable experience already in your profile. Fill in only context and results you can verify.</p> : null}
    {matches.length ? <div className="space-y-3 rounded-md border border-amber-600/30 bg-amber-600/5 p-4"><p className="text-sm font-medium">Possible duplicate or conflicting fact</p>{matches.map(m => <p key={m.id} className="text-sm"><a href={`/sources/evidence/${m.id}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">{m.label}</a> · {m.state.replaceAll("_", " ")}{m.locked ? " · locked" : ""}</p>)}{proposal.kind === "skill" ? <p className="text-xs">This skill already exists. Reject this proposal or review the existing record; importing cannot replace it.</p> : null}</div> : null}
    {matches.length > 0 && proposal.kind !== "skill" ? <label className="flex items-start gap-3 text-sm"><Checkbox name="acknowledgeMatch" value="on" disabled={pending}/><span>If a matching fact exists, I reviewed it and want a separate record. Existing facts will stay unchanged.</span></label> : null}
    <label className="flex items-start gap-3 text-sm"><Checkbox name="confirmed" value="on" disabled={pending}/><span>I checked this fact against the source and confirm the completed fields are accurate.</span></label>
    <Feedback state={state}/>
    <div className="flex flex-wrap gap-2"><Button type="submit" name="decision" value="approve" disabled={pending || (proposal.kind === "skill" && matches.length > 0)}>Approve fact</Button><Button type="submit" name="decision" value="save" variant="outline" disabled={pending}>Save draft</Button><Button type="submit" name="decision" value="reject" variant="ghost" disabled={pending}>Reject</Button></div>
  </form>;
}
export function AddFactForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(addFact.bind(null, id), initial);
  return <form action={action} onResetCapture={retain} className="space-y-4"><p className="text-sm leading-6 text-muted-foreground">If extraction missed a fact, copy its exact excerpt from the recovered source. You will complete and approve its fields separately.</p><div className="space-y-2"><label htmlFor="manual-kind" className="text-sm font-medium">Fact type</label><Select name="kind" defaultValue="experience"><SelectTrigger id="manual-kind" className="w-full"><SelectValue/></SelectTrigger><SelectContent>{kinds.map(k => <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><label htmlFor="manual-quote" className="text-sm font-medium">Exact source excerpt</label><Textarea id="manual-quote" name="quote" maxLength={4000} className="min-h-28"/></div><Feedback state={state}/><Button variant="outline" disabled={pending}>Add proposal</Button></form>;
}
export function RetryForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(retryImport.bind(null, id), initial);
  return <form action={action} className="space-y-3"><Button variant="outline" disabled={pending}>Retry fact extraction</Button><Feedback state={state}/></form>;
}
export function DeleteForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(removeImport.bind(null, id), initial);
  return <form action={action} className="space-y-3"><p className="text-sm text-muted-foreground">Removes this saved source and its review proposals. Approved career facts remain in your evidence bank.</p><label htmlFor="delete-import" className="text-sm font-medium">Type DELETE to remove this import</label><Input id="delete-import" name="confirmation" autoComplete="off"/><Feedback state={state}/><Button variant="destructive" disabled={pending}>Delete import</Button></form>;
}
