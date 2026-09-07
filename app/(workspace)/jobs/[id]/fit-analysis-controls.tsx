"use client";

import { useActionState } from "react";
import { LoaderCircle, RefreshCw, Save } from "lucide-react";

import { analyzeFitAction, overrideFitAction, type FitActionState } from "@/app/(workspace)/jobs/[id]/fit-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { dimensionKeys, type FitWeights, type Recommendation } from "@/lib/fit-analysis/types";

const initialState: FitActionState = {};
const dimensionLabels: Record<keyof FitWeights, string> = {
  qualifications: "Qualifications",
  experience: "Experience & skills",
  seniority: "Seniority",
  location_comp: "Location & comp",
  preferences: "Preferences",
  freshness: "Freshness",
  referral_access: "Referral access",
  prep_effort: "Prep effort",
};
const recommendationOptions: { value: Recommendation; label: string }[] = [
  { value: "apply_now", label: "Apply now" },
  { value: "research_first", label: "Research first" },
  { value: "seek_referral_first", label: "Seek referral first" },
  { value: "stretch", label: "Stretch opportunity" },
  { value: "monitor", label: "Monitor / defer" },
  { value: "skip", label: "Skip" },
];

function ActionMessage({ state }: { state: FitActionState }) {
  return <p aria-live="polite" className={state.error ? "text-xs text-destructive" : "text-xs text-signal-foreground"}>{state.message}</p>;
}

export function AnalyzeFitButton({ jobId, weights }: { jobId: string; weights?: FitWeights }) {
  const [state, action, pending] = useActionState(analyzeFitAction.bind(null, jobId), initialState);
  return (
    <form action={action} className="flex flex-col items-start gap-3 sm:items-end">
      {weights ? dimensionKeys.map((key) => <input key={key} type="hidden" name={key} value={weights[key]} />) : null}
      <Button type="submit" size="lg" disabled={pending}>{pending ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <RefreshCw />}{pending ? "Analyzing…" : "Analyze fit"}</Button>
      <ActionMessage state={state} />
    </form>
  );
}

export function FitWeightsForm({ jobId, weights }: { jobId: string; weights: FitWeights }) {
  const [state, action, pending] = useActionState(analyzeFitAction.bind(null, jobId), initialState);
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dimensionKeys.map((key) => (
          <label key={key} className="space-y-2 text-sm font-medium">
            <span>{dimensionLabels[key]}</span>
            <div className="relative"><Input name={key} type="number" min="0" max="100" defaultValue={weights[key]} className="pr-12 font-mono" /><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">wt.</span></div>
          </label>
        ))}
      </div>
      <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <ActionMessage state={state} />
        <Button type="submit" variant="outline" disabled={pending}>{pending ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <RefreshCw />}{pending ? "Re-analyzing…" : "Save weights & re-analyze"}</Button>
      </div>
    </form>
  );
}

export function FitOverrideForm({ jobId, recommendation, reason }: { jobId: string; recommendation: Recommendation; reason: string | null }) {
  const [state, action, pending] = useActionState(overrideFitAction.bind(null, jobId), initialState);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[240px_1fr]">
        <label className="space-y-2 text-sm font-medium"><span>Decision</span><Select name="recommendation" defaultValue={recommendation}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{recommendationOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></label>
        <label className="space-y-2 text-sm font-medium"><span>Reason</span><Textarea name="reason" defaultValue={reason ?? ""} placeholder="Why are you making a different call?" className="min-h-24" required /></label>
      </div>
      <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between"><ActionMessage state={state} /><Button type="submit" variant="outline" disabled={pending}>{pending ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <Save />}{pending ? "Saving…" : "Save override"}</Button></div>
    </form>
  );
}
