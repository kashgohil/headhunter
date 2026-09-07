"use client";

import { useActionState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, LoaderCircle, Save } from "lucide-react";

import { updateJobMetadataAction, type JobMetadataState } from "@/app/(workspace)/jobs/actions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

type EditableJob = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  employmentType: string | null;
  workArrangement: "remote" | "hybrid" | "on_site" | "unknown";
  seniority: string | null;
  minimumCompensation: number | null;
  maximumCompensation: number | null;
  compensationCurrency: string | null;
  postedAt: string;
  applicationDeadline: string;
  responsibilities: string[];
  requiredQualifications: string[];
  preferredQualifications: string[];
  skills: string[];
  technologies: string[];
};

const initialState: JobMetadataState = {};

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className="text-sm font-medium">{children}</label>;
}

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

function lines(items: string[]) {
  return items.join("\n");
}

const arrangements = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "on_site", label: "On-site" },
  { value: "unknown", label: "Unknown" },
] as const;

export function JobMetadataForm({ job }: { job: EditableJob }) {
  const updateAction = updateJobMetadataAction.bind(null, job.id);
  const [state, formAction, pending] = useActionState(updateAction, initialState);
  const reduceMotion = useReducedMotion();

  return (
    <form action={formAction} className="space-y-7">
      <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel htmlFor="title">Role title</FieldLabel>
          <Input id="title" name="title" defaultValue={job.title} aria-invalid={Boolean(state.errors?.title)} aria-describedby="title-error" />
          <FieldError id="title-error" messages={state.errors?.title} />
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="company">Company</FieldLabel>
          <Input id="company" name="company" defaultValue={job.company} aria-invalid={Boolean(state.errors?.company)} aria-describedby="company-error" />
          <FieldError id="company-error" messages={state.errors?.company} />
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="location">Location</FieldLabel>
          <Input id="location" name="location" defaultValue={job.location ?? ""} placeholder="Bengaluru, India" aria-invalid={Boolean(state.errors?.location)} aria-describedby="location-error" />
          <FieldError id="location-error" messages={state.errors?.location} />
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="seniority">Seniority</FieldLabel>
          <Input id="seniority" name="seniority" defaultValue={job.seniority ?? ""} placeholder="Senior" aria-invalid={Boolean(state.errors?.seniority)} aria-describedby="seniority-error" />
          <FieldError id="seniority-error" messages={state.errors?.seniority} />
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="employmentType">Employment type</FieldLabel>
          <Input id="employmentType" name="employmentType" defaultValue={job.employmentType ?? ""} placeholder="Full-time" aria-invalid={Boolean(state.errors?.employmentType)} aria-describedby="employmentType-error" />
          <FieldError id="employmentType-error" messages={state.errors?.employmentType} />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Work arrangement</legend>
          <RadioGroup name="workArrangement" defaultValue={job.workArrangement} className="grid grid-cols-2 gap-2">
            {arrangements.map((arrangement) => (
              <label key={arrangement.value} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/45 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                <RadioGroupItem value={arrangement.value} />
                {arrangement.label}
              </label>
            ))}
          </RadioGroup>
          <FieldError id="workArrangement-error" messages={state.errors?.workArrangement} />
        </fieldset>
      </div>

      <div className="grid gap-x-5 gap-y-3 border-t border-border pt-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <FieldLabel htmlFor="minimumCompensation">Minimum compensation</FieldLabel>
          <Input id="minimumCompensation" name="minimumCompensation" type="number" min="0" defaultValue={job.minimumCompensation ?? ""} placeholder="150000" aria-invalid={Boolean(state.errors?.minimumCompensation)} aria-describedby="minimumCompensation-error" />
          <FieldError id="minimumCompensation-error" messages={state.errors?.minimumCompensation} />
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="maximumCompensation">Maximum compensation</FieldLabel>
          <Input id="maximumCompensation" name="maximumCompensation" type="number" min="0" defaultValue={job.maximumCompensation ?? ""} placeholder="180000" aria-invalid={Boolean(state.errors?.maximumCompensation)} aria-describedby="maximumCompensation-error" />
          <FieldError id="maximumCompensation-error" messages={state.errors?.maximumCompensation} />
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="compensationCurrency">Currency</FieldLabel>
          <Input id="compensationCurrency" name="compensationCurrency" defaultValue={job.compensationCurrency ?? ""} placeholder="USD" maxLength={3} className="font-mono uppercase" aria-invalid={Boolean(state.errors?.compensationCurrency)} aria-describedby="compensationCurrency-error" />
          <FieldError id="compensationCurrency-error" messages={state.errors?.compensationCurrency} />
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="postedAt">Posted date</FieldLabel>
          <DatePicker id="postedAt" name="postedAt" defaultValue={job.postedAt} aria-invalid={Boolean(state.errors?.postedAt)} aria-describedby="postedAt-error" />
          <FieldError id="postedAt-error" messages={state.errors?.postedAt} />
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="applicationDeadline">Application deadline</FieldLabel>
          <DatePicker id="applicationDeadline" name="applicationDeadline" defaultValue={job.applicationDeadline} aria-invalid={Boolean(state.errors?.applicationDeadline)} aria-describedby="applicationDeadline-error" />
          <FieldError id="applicationDeadline-error" messages={state.errors?.applicationDeadline} />
        </div>
      </div>

      <div className="grid gap-5 border-t border-border pt-6 lg:grid-cols-2">
        <div className="space-y-2 lg:col-span-2">
          <FieldLabel htmlFor="responsibilities">Responsibilities</FieldLabel>
          <Textarea id="responsibilities" name="responsibilities" defaultValue={lines(job.responsibilities)} placeholder={"Own end-to-end product design for a core workflow\nPartner with engineering and research"} className="min-h-32" aria-invalid={Boolean(state.errors?.responsibilities)} aria-describedby="responsibilities-error" />
          <p className="text-xs text-muted-foreground">One responsibility per line</p>
          <FieldError id="responsibilities-error" messages={state.errors?.responsibilities} />
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="requiredQualifications">Required qualifications</FieldLabel>
          <Textarea id="requiredQualifications" name="requiredQualifications" defaultValue={lines(job.requiredQualifications)} placeholder={"Five years of product design experience\nStrong interaction design portfolio"} className="min-h-36" aria-invalid={Boolean(state.errors?.requiredQualifications)} aria-describedby="requiredQualifications-error" />
          <p className="text-xs text-muted-foreground">One requirement per line</p>
          <FieldError id="requiredQualifications-error" messages={state.errors?.requiredQualifications} />
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="preferredQualifications">Preferred qualifications</FieldLabel>
          <Textarea id="preferredQualifications" name="preferredQualifications" defaultValue={lines(job.preferredQualifications)} placeholder={"Experience with developer tools\nBackground in a growth-stage company"} className="min-h-36" aria-invalid={Boolean(state.errors?.preferredQualifications)} aria-describedby="preferredQualifications-error" />
          <p className="text-xs text-muted-foreground">One preference per line</p>
          <FieldError id="preferredQualifications-error" messages={state.errors?.preferredQualifications} />
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="skills">Skills</FieldLabel>
          <Textarea id="skills" name="skills" defaultValue={lines(job.skills)} placeholder={"Product strategy\nStakeholder management"} className="min-h-28" aria-invalid={Boolean(state.errors?.skills)} aria-describedby="skills-error" />
          <p className="text-xs text-muted-foreground">One skill per line</p>
          <FieldError id="skills-error" messages={state.errors?.skills} />
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="technologies">Tools and technologies</FieldLabel>
          <Textarea id="technologies" name="technologies" defaultValue={lines(job.technologies)} placeholder={"Figma\nReact"} className="min-h-28" aria-invalid={Boolean(state.errors?.technologies)} aria-describedby="technologies-error" />
          <p className="text-xs text-muted-foreground">One technology per line</p>
          <FieldError id="technologies-error" messages={state.errors?.technologies} />
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
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
          {pending ? "Saving…" : "Save corrections"}
        </Button>
      </div>
    </form>
  );
}
