"use client";

import { cloneElement, isValidElement, useActionState, useEffect, useId, useRef } from "react";
import { LoaderCircle, Save } from "lucide-react";

import {
  createAchievement,
  createExperience,
  createSkill,
  updateAchievement,
  updateExperience,
  updateSkill,
  type CareerProfileActionState,
} from "@/app/(workspace)/career-profile/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { MonthPicker } from "@/components/ui/month-picker";
import { Textarea } from "@/components/ui/textarea";
import type {
  CareerAchievement,
  CareerExperience,
  CareerSkill,
} from "@/lib/career-profile/repository";
import { cn } from "@/lib/utils";

const initialState: CareerProfileActionState = {};

export function Field({
  label,
  name,
  error,
  children,
  className,
}: {
  label: string;
  name: string;
  error?: string[];
  children: React.ReactNode;
  className?: string;
}) {
  const generatedId = useId();
  const fieldId = `${name}-${generatedId.replaceAll(":", "")}`;
  const errorId = `${fieldId}-error`;
  const control = isValidElement(children)
    ? cloneElement(children, { id: fieldId, "aria-describedby": errorId } as React.HTMLAttributes<HTMLElement>)
    : children;

  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={fieldId} className="text-sm font-medium">{label}</label>
      {control}
      <p id={errorId} aria-live="polite" className="min-h-4 text-xs text-destructive">
        {error?.[0]}
      </p>
    </div>
  );
}

export function FormFeedback({ state }: { state: CareerProfileActionState }) {
  return (
    <p aria-live="polite" className={cn("min-h-5 text-sm", state.success ? "text-signal-foreground" : "text-destructive")}>
      {state.message}
    </p>
  );
}

export function SubmitButton({ pending, editing }: { pending: boolean; editing: boolean }) {
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <LoaderCircle className="animate-spin motion-reduce:animate-none" /> : <Save />}
      {pending ? "Saving…" : editing ? "Save changes" : "Add to profile"}
    </Button>
  );
}

export function useResetOnSuccess(state: CareerProfileActionState, editing: boolean) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && !editing) formRef.current?.reset();
  }, [editing, state]);

  return formRef;
}

export function ExperienceForm({ experience }: { experience?: CareerExperience }) {
  const editing = Boolean(experience);
  const action = experience ? updateExperience.bind(null, experience.id) : createExperience;
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useResetOnSuccess(state, editing);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="Company or organization" name="company" error={state.errors?.company}>
          <Input id="company" name="company" defaultValue={experience?.company} placeholder="Acme" required aria-invalid={Boolean(state.errors?.company)} aria-describedby="company-error" />
        </Field>
        <Field label="Role title" name="title" error={state.errors?.title}>
          <Input id="title" name="title" defaultValue={experience?.title} placeholder="Senior Product Designer" required aria-invalid={Boolean(state.errors?.title)} aria-describedby="title-error" />
        </Field>
        <Field label="Location" name="location" error={state.errors?.location}>
          <Input id="location" name="location" defaultValue={experience?.location ?? ""} placeholder="Bengaluru, India" aria-invalid={Boolean(state.errors?.location)} aria-describedby="location-error" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Started" name="startDate" error={state.errors?.startDate}>
            <MonthPicker id="startDate" name="startDate" defaultValue={experience?.startDate} aria-invalid={Boolean(state.errors?.startDate)} aria-describedby="startDate-error" />
          </Field>
          <Field label="Ended" name="endDate" error={state.errors?.endDate}>
            <MonthPicker id="endDate" name="endDate" defaultValue={experience?.endDate} aria-invalid={Boolean(state.errors?.endDate)} aria-describedby="endDate-error" />
          </Field>
        </div>
        <Field label="Role summary" name="summary" error={state.errors?.summary} className="sm:col-span-2">
          <Textarea id="summary" name="summary" defaultValue={experience?.summary ?? ""} placeholder="Scope, responsibilities, and the kind of problems you owned." className="min-h-24" aria-invalid={Boolean(state.errors?.summary)} aria-describedby="summary-error" />
        </Field>
        <Field label="Responsibilities" name="responsibilities" error={state.errors?.responsibilities} className="sm:col-span-2">
          <Textarea id="responsibilities" name="responsibilities" defaultValue={experience?.responsibilities.join("\n")} placeholder={"Led discovery for the core workflow\nOwned the design system roadmap"} className="min-h-24" aria-invalid={Boolean(state.errors?.responsibilities)} aria-describedby="responsibilities-error" />
        </Field>
        <Field label="Technologies" name="technologies" error={state.errors?.technologies}>
          <Input id="technologies" name="technologies" defaultValue={experience?.technologies.join(", ")} placeholder="Figma, React, SQL" aria-invalid={Boolean(state.errors?.technologies)} aria-describedby="technologies-error" />
        </Field>
        <Field label="Source" name="sourceLabel" error={state.errors?.sourceLabel}>
          <Input id="sourceLabel" name="sourceLabel" defaultValue={experience?.sourceLabel ?? ""} placeholder="Resume 2026 or personal recollection" aria-invalid={Boolean(state.errors?.sourceLabel)} aria-describedby="sourceLabel-error" />
        </Field>
      </div>
      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
        <Checkbox name="isCurrent" value="true" defaultChecked={experience?.isCurrent} />
        This is my current role
      </label>
      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <FormFeedback state={state} />
        <SubmitButton pending={pending} editing={editing} />
      </div>
    </form>
  );
}

export function AchievementForm({
  achievement,
  experiences,
}: {
  achievement?: CareerAchievement;
  experiences: CareerExperience[];
}) {
  const editing = Boolean(achievement);
  const action = achievement ? updateAchievement.bind(null, achievement.id) : createAchievement;
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useResetOnSuccess(state, editing);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <Field label="Related experience" name="experienceId" error={state.errors?.experienceId}>
        <select id="experienceId" name="experienceId" defaultValue={achievement?.experienceId ?? ""} required aria-invalid={Boolean(state.errors?.experienceId)} aria-describedby="experienceId-error" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30">
          <option value="" disabled>Choose an experience</option>
          {experiences.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.company}</option>)}
        </select>
      </Field>
      <div className="grid gap-x-4 lg:grid-cols-3">
        <Field label="Problem or context" name="problem" error={state.errors?.problem}>
          <Textarea id="problem" name="problem" defaultValue={achievement?.problem} placeholder="What needed to change, and why did it matter?" className="min-h-32" required aria-invalid={Boolean(state.errors?.problem)} aria-describedby="problem-error" />
        </Field>
        <Field label="Your action" name="action" error={state.errors?.action}>
          <Textarea id="action" name="action" defaultValue={achievement?.action} placeholder="What did you personally decide, build, or lead?" className="min-h-32" required aria-invalid={Boolean(state.errors?.action)} aria-describedby="action-error" />
        </Field>
        <Field label="Result" name="result" error={state.errors?.result}>
          <Textarea id="result" name="result" defaultValue={achievement?.result} placeholder="What changed for customers or the business?" className="min-h-32" required aria-invalid={Boolean(state.errors?.result)} aria-describedby="result-error" />
        </Field>
      </div>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="Measurable outcome" name="measurableOutcome" error={state.errors?.measurableOutcome}>
          <Input id="measurableOutcome" name="measurableOutcome" defaultValue={achievement?.measurableOutcome ?? ""} placeholder="Reduced time-to-complete by 28%" aria-invalid={Boolean(state.errors?.measurableOutcome)} aria-describedby="measurableOutcome-error" />
        </Field>
        <Field label="Tools and methods" name="tools" error={state.errors?.tools}>
          <Input id="tools" name="tools" defaultValue={achievement?.tools.join(", ")} placeholder="Research, prototyping, SQL" aria-invalid={Boolean(state.errors?.tools)} aria-describedby="tools-error" />
        </Field>
        <Field label="Relevant role families" name="roleFamilies" error={state.errors?.roleFamilies}>
          <Input id="roleFamilies" name="roleFamilies" defaultValue={achievement?.roleFamilies.join(", ")} placeholder="Product design, Design systems" aria-invalid={Boolean(state.errors?.roleFamilies)} aria-describedby="roleFamilies-error" />
        </Field>
        <Field label="Source" name="sourceLabel" error={state.errors?.sourceLabel}>
          <Input id="sourceLabel" name="sourceLabel" defaultValue={achievement?.sourceLabel ?? ""} placeholder="Performance review or project notes" aria-invalid={Boolean(state.errors?.sourceLabel)} aria-describedby="sourceLabel-error" />
        </Field>
      </div>
      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <FormFeedback state={state} />
        <SubmitButton pending={pending} editing={editing} />
      </div>
    </form>
  );
}

export function SkillForm({
  skill,
  achievements,
}: {
  skill?: CareerSkill;
  achievements: CareerAchievement[];
}) {
  const editing = Boolean(skill);
  const action = skill ? updateSkill.bind(null, skill.id) : createSkill;
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useResetOnSuccess(state, editing);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Skill" name="name" error={state.errors?.name}>
          <Input id="name" name="name" defaultValue={skill?.name} placeholder="Product strategy" required aria-invalid={Boolean(state.errors?.name)} aria-describedby="name-error" />
        </Field>
        <Field label="Last used" name="recency" error={state.errors?.recency}>
          <select id="recency" name="recency" defaultValue={skill?.recency ?? "current"} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30">
            <option value="current">Using currently</option>
            <option value="recent">Used in the last 2 years</option>
            <option value="past">Used earlier</option>
          </select>
        </Field>
        <Field label="Proficiency" name="proficiency" error={state.errors?.proficiency}>
          <select id="proficiency" name="proficiency" defaultValue={skill?.proficiency ?? "working"} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30">
            <option value="learning">Learning</option>
            <option value="working">Working knowledge</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>
        </Field>
        <Field label="Source" name="sourceLabel" error={state.errors?.sourceLabel}>
          <Input id="sourceLabel" name="sourceLabel" defaultValue={skill?.sourceLabel ?? ""} placeholder="Project or resume" aria-invalid={Boolean(state.errors?.sourceLabel)} aria-describedby="sourceLabel-error" />
        </Field>
        <Field label="How you use it" name="context" error={state.errors?.context} className="sm:col-span-2">
          <Textarea id="context" name="context" defaultValue={skill?.context ?? ""} placeholder="The scope and situations where you have applied this skill." className="min-h-24" aria-invalid={Boolean(state.errors?.context)} aria-describedby="context-error" />
        </Field>
        <Field label="Supporting achievement" name="supportingAchievementId" error={state.errors?.supportingAchievementId} className="sm:col-span-2">
          <select id="supportingAchievementId" name="supportingAchievementId" defaultValue={skill?.supportingAchievementId ?? ""} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30">
            <option value="">No linked achievement yet</option>
            {achievements.map((item) => <option key={item.id} value={item.id}>{item.result.slice(0, 80)}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <FormFeedback state={state} />
        <SubmitButton pending={pending} editing={editing} />
      </div>
    </form>
  );
}
