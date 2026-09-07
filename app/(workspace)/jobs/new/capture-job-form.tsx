"use client";

import { useActionState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, LoaderCircle } from "lucide-react";

import { captureJob, type CaptureJobState } from "@/app/(workspace)/jobs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  return (
    <form action={formAction} className="space-y-7">
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
          <label htmlFor="sourceUrl" className="text-sm font-medium">Source URL <span className="font-normal text-muted-foreground">Optional</span></label>
          <Input id="sourceUrl" name="sourceUrl" type="url" placeholder="https://company.com/jobs/..." aria-invalid={Boolean(state.errors?.sourceUrl)} />
          <FieldError messages={state.errors?.sourceUrl} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="originalDescription" className="text-sm font-medium">Original job description</label>
          <span className="text-xs text-muted-foreground">Stored as captured</span>
        </div>
        <Textarea id="originalDescription" name="originalDescription" placeholder="Paste the complete job description here…" className="min-h-72 font-mono text-[13px]" aria-invalid={Boolean(state.errors?.originalDescription)} />
        <FieldError messages={state.errors?.originalDescription} />
      </div>

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
