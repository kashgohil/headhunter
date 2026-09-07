"use client";

import { useActionState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, LoaderCircle, Save } from "lucide-react";

import {
  saveSearchStrategy,
  type SearchStrategyState,
} from "@/app/(workspace)/settings/search-strategy/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SearchStrategy } from "@/lib/search-strategy/repository";

const initialState: SearchStrategyState = {};

function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  const reduceMotion = useReducedMotion();

  return (
    <div id={id} aria-live="polite" className="min-h-4">
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
    </div>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className="text-sm font-medium">{children}</label>;
}

function listValue(items: string[] | undefined) {
  return items?.join(", ") ?? "";
}

function linesValue(items: string[] | undefined) {
  return items?.join("\n") ?? "";
}

export function SearchStrategyForm({ strategy }: { strategy: SearchStrategy | null }) {
  const [state, formAction, pending] = useActionState(saveSearchStrategy, initialState);
  const reduceMotion = useReducedMotion();
  const currentVersion = state.savedVersion ?? strategy?.version;

  return (
    <form action={formAction} className="space-y-5">
      <div className="flex min-h-6 items-center justify-between gap-4">
        <p className="text-xs leading-5 text-muted-foreground">
          Every save creates a new immutable version for future fit analysis.
        </p>
        {currentVersion ? (
          <span className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
            Version {currentVersion}
          </span>
        ) : null}
      </div>

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>Target roles</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">Define the work you want and the neighboring roles worth considering.</p>
        </CardHeader>
        <CardContent className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel htmlFor="primaryTitle">Primary title</FieldLabel>
            <Input id="primaryTitle" name="primaryTitle" defaultValue={strategy?.primaryTitle} placeholder="Senior Product Designer" aria-invalid={Boolean(state.errors?.primaryTitle)} aria-describedby="primaryTitle-error" />
            <FieldError id="primaryTitle-error" messages={state.errors?.primaryTitle} />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="adjacentTitles">Adjacent titles</FieldLabel>
            <Input id="adjacentTitles" name="adjacentTitles" defaultValue={listValue(strategy?.adjacentTitles)} placeholder="Staff Designer, Design Lead" aria-invalid={Boolean(state.errors?.adjacentTitles)} aria-describedby="adjacentTitles-error" />
            <FieldError id="adjacentTitles-error" messages={state.errors?.adjacentTitles} />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="seniorityLevels">Seniority levels</FieldLabel>
            <Input id="seniorityLevels" name="seniorityLevels" defaultValue={listValue(strategy?.seniorityLevels)} placeholder="Senior, Staff" aria-invalid={Boolean(state.errors?.seniorityLevels)} aria-describedby="seniorityLevels-error" />
            <FieldError id="seniorityLevels-error" messages={state.errors?.seniorityLevels} />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="weeklyHours">Weekly time budget</FieldLabel>
            <div className="relative">
              <Input id="weeklyHours" name="weeklyHours" type="number" min="1" max="80" defaultValue={strategy?.weeklyHours} placeholder="6" className="pr-28" aria-invalid={Boolean(state.errors?.weeklyHours)} aria-describedby="weeklyHours-error" />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">hours / week</span>
            </div>
            <FieldError id="weeklyHours-error" messages={state.errors?.weeklyHours} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>Locations and compensation</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">Set the practical boundaries that determine whether a role is viable.</p>
        </CardHeader>
        <CardContent className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel htmlFor="workArrangements">Work arrangements</FieldLabel>
            <Input id="workArrangements" name="workArrangements" defaultValue={listValue(strategy?.workArrangements)} placeholder="Remote, Hybrid" aria-invalid={Boolean(state.errors?.workArrangements)} aria-describedby="workArrangements-error" />
            <FieldError id="workArrangements-error" messages={state.errors?.workArrangements} />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="locations">Acceptable locations</FieldLabel>
            <Input id="locations" name="locations" defaultValue={listValue(strategy?.locations)} placeholder="India, United Kingdom" aria-invalid={Boolean(state.errors?.locations)} aria-describedby="locations-error" />
            <FieldError id="locations-error" messages={state.errors?.locations} />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="minimumCompensation">Minimum compensation</FieldLabel>
            <Input id="minimumCompensation" name="minimumCompensation" type="number" min="0" defaultValue={strategy?.minimumCompensation} placeholder="150000" aria-invalid={Boolean(state.errors?.minimumCompensation)} aria-describedby="minimumCompensation-error" />
            <FieldError id="minimumCompensation-error" messages={state.errors?.minimumCompensation} />
          </div>
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <div className="space-y-2">
              <FieldLabel htmlFor="targetCompensation">Target compensation</FieldLabel>
              <Input id="targetCompensation" name="targetCompensation" type="number" min="0" defaultValue={strategy?.targetCompensation} placeholder="175000" aria-invalid={Boolean(state.errors?.targetCompensation)} aria-describedby="targetCompensation-error" />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="currency">Currency</FieldLabel>
              <Input id="currency" name="currency" defaultValue={strategy?.currency ?? "USD"} placeholder="USD" className="font-mono uppercase" maxLength={3} aria-invalid={Boolean(state.errors?.currency)} aria-describedby="currency-error" />
            </div>
            <div className="col-span-2 grid grid-cols-[1fr_6rem] gap-3">
              <FieldError id="targetCompensation-error" messages={state.errors?.targetCompensation} />
              <FieldError id="currency-error" messages={state.errors?.currency} />
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <FieldLabel htmlFor="workAuthorization">Work authorization</FieldLabel>
            <Input id="workAuthorization" name="workAuthorization" defaultValue={strategy?.workAuthorization} placeholder="Authorized to work in India; UK roles require sponsorship" aria-invalid={Boolean(state.errors?.workAuthorization)} aria-describedby="workAuthorization-error" />
            <FieldError id="workAuthorization-error" messages={state.errors?.workAuthorization} />
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/35 p-4 sm:col-span-2">
            <Checkbox name="sponsorshipRequired" value="true" defaultChecked={strategy?.sponsorshipRequired} className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium">I require employer sponsorship in some target locations</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">This becomes a hard viability check when a job explicitly excludes sponsorship.</span>
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle>Hard blockers</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">Conditions that make a role non-viable, not merely less attractive.</p>
          </CardHeader>
          <CardContent>
            <Textarea id="hardBlockers" name="hardBlockers" defaultValue={linesValue(strategy?.hardBlockers)} placeholder={"No sponsorship offered\nOn-site five days a week"} className="min-h-32" aria-invalid={Boolean(state.errors?.hardBlockers)} aria-describedby="hardBlockers-error" />
            <p className="mt-2 text-xs text-muted-foreground">One blocker per line</p>
            <FieldError id="hardBlockers-error" messages={state.errors?.hardBlockers} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle>Soft preferences</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">Signals that improve desirability without automatically excluding a role.</p>
          </CardHeader>
          <CardContent>
            <Textarea id="softPreferences" name="softPreferences" defaultValue={linesValue(strategy?.softPreferences)} placeholder={"Small product team\nDeveloper tools or fintech"} className="min-h-32" aria-invalid={Boolean(state.errors?.softPreferences)} aria-describedby="softPreferences-error" />
            <p className="mt-2 text-xs text-muted-foreground">One preference per line</p>
            <FieldError id="softPreferences-error" messages={state.errors?.softPreferences} />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite" className="min-h-5">
          <AnimatePresence mode="wait" initial={false}>
            {state.message ? (
              <motion.p
                key={state.message}
                initial={{ opacity: 0, transform: reduceMotion ? "none" : "translateY(-2px)" }}
                animate={{ opacity: 1, transform: "translateY(0)" }}
                exit={{ opacity: 0, transform: reduceMotion ? "none" : "translateY(-2px)" }}
                transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
                className={state.errors ? "text-sm text-destructive" : "flex items-center gap-2 text-sm text-signal-foreground"}
              >
                {state.errors ? null : <Check className="size-4" />}
                {state.message}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
        <Button type="submit" size="lg" disabled={pending} className="min-w-36">
          {pending ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <Save />}
          {pending ? "Saving…" : strategy ? "Save new version" : "Save strategy"}
        </Button>
      </div>
    </form>
  );
}
