"use client";

import { useActionState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Download, LoaderCircle } from "lucide-react";

import { captureJobFromUrl, type ImportJobState } from "@/app/(workspace)/jobs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: ImportJobState = {};

export function UrlCaptureForm() {
  const [state, formAction, pending] = useActionState(captureJobFromUrl, initialState);
  const reduceMotion = useReducedMotion();

  return (
    <form action={formAction} className="space-y-3">
      <label htmlFor="importSourceUrl" className="text-sm font-medium">Job URL</label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          id="importSourceUrl"
          name="sourceUrl"
          type="url"
          placeholder="https://company.com/jobs/..."
          aria-invalid={Boolean(state.errors?.sourceUrl)}
          aria-describedby="import-source-status"
          className="min-w-0 flex-1"
        />
        <Button type="submit" disabled={pending} className="sm:min-w-36">
          {pending ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <Download />}
          {pending ? "Importing…" : "Import page"}
        </Button>
      </div>
      <div id="import-source-status" aria-live="polite" className="min-h-5">
        <AnimatePresence initial={false}>
          {state.errors?.sourceUrl?.[0] || state.message ? (
            <motion.p
              initial={{ opacity: 0, transform: reduceMotion ? "none" : "translateY(-3px)" }}
              animate={{ opacity: 1, transform: "translateY(0)" }}
              exit={{ opacity: 0, transform: reduceMotion ? "none" : "translateY(-3px)" }}
              transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
              className="text-xs text-destructive"
            >
              {state.errors?.sourceUrl?.[0] ?? state.message}
            </motion.p>
          ) : (
            <p className="text-xs leading-5 text-muted-foreground">We’ll preserve the readable source, extract what we can, and let you correct every field.</p>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
