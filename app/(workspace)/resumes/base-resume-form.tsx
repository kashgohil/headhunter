"use client";

import { useActionState } from "react";
import { FilePlus2 } from "lucide-react";

import { createBaseResumeAction, type ResumeActionState } from "@/app/(workspace)/resumes/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CareerProfile } from "@/lib/career-profile/repository";

const initialState: ResumeActionState = {};
const templates = [
  { value: "classic", label: "Classic", note: "Traditional hierarchy" },
  { value: "modern", label: "Modern", note: "Strong typographic contrast" },
  { value: "compact", label: "Compact", note: "Dense one-page layout" },
  { value: "minimal", label: "Minimal", note: "Quiet and spacious" },
] as const;

function EvidenceOption({ name, value, title, detail, state, disabled = false }: { name: string; value: string; title: string; detail: string; state: string; disabled?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 has-[[data-state=checked]]:border-primary/40 has-[[data-state=checked]]:bg-accent/45 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
      <Checkbox name={name} value={value} disabled={disabled} className="mt-0.5" />
      <span className="min-w-0"><span className="block text-sm font-medium">{title}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{detail} · {state.replace("_", " ")}</span></span>
    </label>
  );
}
export function BaseResumeForm({ profile }: { profile: CareerProfile }) {
  const [state, action, pending] = useActionState(createBaseResumeAction, initialState);
  return (
    <form action={action} className="space-y-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <div><label htmlFor="resume-name" className="text-sm font-medium">Profile name</label><Input id="resume-name" name="name" className="mt-2" placeholder="Product leadership" aria-invalid={Boolean(state.errors?.name)} />{state.errors?.name ? <p className="mt-1 text-xs text-destructive">{state.errors.name[0]}</p> : null}</div>
        <div><label htmlFor="role-family" className="text-sm font-medium">Role family</label><Input id="role-family" name="roleFamily" className="mt-2" placeholder="Product management" aria-invalid={Boolean(state.errors?.roleFamily)} />{state.errors?.roleFamily ? <p className="mt-1 text-xs text-destructive">{state.errors.roleFamily[0]}</p> : null}</div>
      </div>
      <fieldset className="space-y-5 rounded-lg border border-border p-5"><legend className="px-1 text-sm font-semibold">Candidate header</legend><p className="text-xs leading-5 text-muted-foreground">These details appear on exported resumes. The profile name above stays internal.</p><div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="candidate-name" className="text-sm font-medium">Full name</label><Input id="candidate-name" name="candidateName" className="mt-2" autoComplete="name" placeholder="José Sharma" aria-invalid={Boolean(state.errors?.candidateName)}/>{state.errors?.candidateName ? <p className="mt-1 text-xs text-destructive">{state.errors.candidateName[0]}</p> : null}</div><div><label htmlFor="candidate-email" className="text-sm font-medium">Email</label><Input id="candidate-email" name="candidateEmail" className="mt-2" type="email" autoComplete="email" placeholder="jose@example.com" aria-invalid={Boolean(state.errors?.candidateEmail)}/>{state.errors?.candidateEmail ? <p className="mt-1 text-xs text-destructive">{state.errors.candidateEmail[0]}</p> : null}</div><div><label htmlFor="candidate-phone" className="text-sm font-medium">Phone</label><Input id="candidate-phone" name="candidatePhone" className="mt-2" autoComplete="tel" placeholder="+91 98765 43210"/></div><div><label htmlFor="candidate-location" className="text-sm font-medium">Location</label><Input id="candidate-location" name="candidateLocation" className="mt-2" autoComplete="address-level2" placeholder="Pune, India"/></div><div className="sm:col-span-2"><label htmlFor="candidate-website" className="text-sm font-medium">Website or profile URL</label><Input id="candidate-website" name="candidateWebsite" className="mt-2" type="url" autoComplete="url" placeholder="https://example.com/portfolio" aria-invalid={Boolean(state.errors?.candidateWebsite)}/>{state.errors?.candidateWebsite ? <p className="mt-1 text-xs text-destructive">{state.errors.candidateWebsite[0]}</p> : null}</div></div></fieldset>
      <div><label htmlFor="positioning" className="text-sm font-medium">Positioning</label><Input id="positioning" name="positioning" className="mt-2" placeholder="Platform leader who turns complex systems into simple products" /><p className="mt-1.5 text-xs leading-5 text-muted-foreground">A truthful angle, not a new claim. This guides job-specific summaries.</p></div>
      <div><label htmlFor="base-summary" className="text-sm font-medium">Base summary</label><Textarea id="base-summary" name="summary" className="mt-2 min-h-24" placeholder="Optional. This remains the original text shown during review." /></div>
      <div><label className="text-sm font-medium">Template</label><Select name="template" defaultValue="classic"><SelectTrigger className="mt-2 w-full sm:w-72"><SelectValue /></SelectTrigger><SelectContent>{templates.map((template) => <SelectItem key={template.value} value={template.value}>{template.label} — {template.note}</SelectItem>)}</SelectContent></Select></div>

      <fieldset><legend className="text-sm font-semibold">Experience</legend><p className="mt-1 text-xs leading-5 text-muted-foreground">Select the roles that belong in this positioning strategy.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{profile.experiences.map((item) => <EvidenceOption key={item.id} name="experienceIds" value={item.id} title={`${item.title} · ${item.company}`} detail={`${item.startDate}–${item.isCurrent ? "Present" : item.endDate || "Unknown"}`} state={item.verificationState} disabled={item.verificationState === "prohibited" || item.verificationState === "archived"} />)}</div>{state.errors?.experienceIds ? <p className="mt-2 text-xs text-destructive">{state.errors.experienceIds[0]}</p> : null}</fieldset>
      <fieldset><legend className="text-sm font-semibold">Achievements</legend><p className="mt-1 text-xs leading-5 text-muted-foreground">Each selected achievement becomes an evidence-linked bullet suggestion.</p><div className="mt-3 grid gap-2">{profile.achievements.map((item) => <EvidenceOption key={item.id} name="achievementIds" value={item.id} title={item.measurableOutcome || item.result} detail={item.action} state={item.verificationState} disabled={item.verificationState === "prohibited" || item.verificationState === "archived"} />)}</div></fieldset>
      <fieldset><legend className="text-sm font-semibold">Skills and supporting records</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{profile.skills.map((item) => <EvidenceOption key={item.id} name="skillIds" value={item.id} title={item.name} detail={item.context || item.proficiency} state={item.verificationState} disabled={item.verificationState === "prohibited" || item.verificationState === "archived"} />)}{profile.profileItems.map((item) => <EvidenceOption key={item.id} name="profileItemIds" value={item.id} title={item.title} detail={item.kind} state={item.verificationState} disabled={item.verificationState === "prohibited" || item.verificationState === "archived"} />)}</div></fieldset>
      {state.message ? <p role="status" className={`text-sm ${state.success ? "text-signal-foreground" : "text-destructive"}`}>{state.message}</p> : null}
      <Button type="submit" disabled={pending}><FilePlus2 /> {pending ? "Saving…" : "Save base resume"}</Button>
    </form>
  );
}
