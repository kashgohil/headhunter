"use client";

import { useActionState, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, LoaderCircle } from "lucide-react";

import { captureJob, type CaptureJobState } from "@/app/(workspace)/jobs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

const initialState: CaptureJobState = {};

function FieldError({ messages }: { messages?: string[] }) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {messages?.[0] ? (
        <motion.p
          initial={{ opacity: 0, transform: reduceMotion ? "none" : "translateY(-3px)" }}
          animate={{ opacity: 1, transform: "translateY(0)" }}
          exit={{ opacity: 0, transform: reduceMotion ? "none" : "translateY(-3px)" }}
          transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
          className="text-xs text-destructive"
        >
          {messages[0]}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

export function CaptureJobForm() {
  const [state, formAction, pending] = useActionState(captureJob, initialState);
  const [sourceType, setSourceType] = useState<"pasted" | "manual">("pasted");

  return (
    <form action={formAction} className="space-y-7" onResetCapture={(event) => {
      // Returned validation/storage errors are completed React actions, which
      // otherwise reset uncontrolled fields. Successful saves navigate away.
      event.preventDefault();
      event.stopPropagation();
    }}>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">How are you adding this job?</legend>
        <RadioGroup
          name="sourceType"
          value={sourceType}
          onValueChange={(value) => setSourceType(value as "pasted" | "manual")}
          className="grid gap-3 sm:grid-cols-2"
        >
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/45 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
            <RadioGroupItem value="pasted" className="mt-0.5" />
            <span><span className="block text-sm font-medium">Paste a description</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Extract useful details from the source text.</span></span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/45 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
            <RadioGroupItem value="manual" className="mt-0.5" />
            <span><span className="block text-sm font-medium">Enter it manually</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Save a role even when no source text is available.</span></span>
          </label>
        </RadioGroup>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium">Role title</label>
          <Input id="title" name="title" placeholder="Senior product designer" autoComplete="off" aria-invalid={Boolean(state.errors?.title)} aria-describedby={state.errors?.title ? "title-error" : undefined} />
          <div id="title-error" aria-live="polite"><FieldError messages={state.errors?.title} /></div>
        </div>

        <div className="space-y-2">
          <label htmlFor="company" className="text-sm font-medium">Company</label>
          <Input id="company" name="company" placeholder="Acme" autoComplete="organization" aria-invalid={Boolean(state.errors?.company)} aria-describedby={state.errors?.company ? "company-error" : undefined} />
          <div id="company-error" aria-live="polite"><FieldError messages={state.errors?.company} /></div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="location" className="text-sm font-medium">Location <span className="font-normal text-muted-foreground">Optional</span></label>
          <Input id="location" name="location" placeholder="Bengaluru · Hybrid" />
          <FieldError messages={state.errors?.location} />
        </div>

        <div className="space-y-2">
          <label htmlFor="sourceUrl" className="text-sm font-medium">Reference URL <span className="font-normal text-muted-foreground">Optional</span></label>
          <Input id="sourceUrl" name="sourceUrl" type="url" placeholder="https://company.com/jobs/..." aria-invalid={Boolean(state.errors?.sourceUrl)} />
          <FieldError messages={state.errors?.sourceUrl} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="originalDescription" className="text-sm font-medium">{sourceType === "pasted" ? "Original job description" : "Source notes"}</label>
          <span className="text-xs text-muted-foreground">{sourceType === "pasted" ? "Stored as captured" : "Optional"}</span>
        </div>
        <Textarea id="originalDescription" name="originalDescription" placeholder={sourceType === "pasted" ? "Paste the complete job description here…" : "Add any context you want to preserve…"} className="min-h-72 font-mono text-[13px]" aria-invalid={Boolean(state.errors?.originalDescription)} />
        <FieldError messages={state.errors?.originalDescription} />
      </div>

      {state.message ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}

      <div className="flex flex-col-reverse items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
        <p className="max-w-md text-xs leading-5 text-muted-foreground">We preserve the source text exactly so future analysis can always be checked against it.</p>
        <Button type="submit" size="lg" disabled={pending} className="min-w-32">
          {pending ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <ArrowRight />}
          {pending ? "Saving…" : "Save job"}
        </Button>
      </div>
    </form>
  );
}
