"use client";

import { useActionState } from "react";

import {
  createAnswer,
  createProfileItem,
  createStory,
  createVoiceProfile,
  updateAnswer,
  updateProfileItem,
  updateStory,
  updateVoiceProfile,
  type CareerProfileActionState,
} from "@/app/(workspace)/career-profile/actions";
import {
  Field,
  FormFeedback,
  SubmitButton,
  useResetOnSuccess,
} from "@/app/(workspace)/career-profile/career-profile-forms";
import { Input } from "@/components/ui/input";
import { MonthPicker } from "@/components/ui/month-picker";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/action-form";
import type {
  CareerAchievement,
  CareerAnswer,
  CareerProfileItem,
  CareerStory,
  CareerVoiceProfile,
} from "@/lib/career-profile/repository";

const initialState: CareerProfileActionState = {};

export function ProfileItemForm({ item }: { item?: CareerProfileItem }) {
  const editing = Boolean(item);
  const action = item
    ? updateProfileItem.bind(null, item.id)
    : createProfileItem;
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useResetOnSuccess(state, editing);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Record type" name="kind" error={state.errors?.kind}>
          <FormSelect
            name="kind"
            defaultValue={item?.kind ?? "project"}
            options={[
              { value: "project", label: "Project" },
              { value: "education", label: "Education" },
              { value: "certification", label: "Certification" },
              { value: "award", label: "Award" },
              { value: "publication", label: "Publication" },
              { value: "link", label: "Professional link" },
            ]}
          />
        </Field>
        <Field
          label="Title"
          name="title"
          error={state.errors?.title}
          className="lg:col-span-2"
        >
          <Input
            name="title"
            defaultValue={item?.title}
            placeholder="Project, qualification, credential, or link title"
            required
            aria-invalid={Boolean(state.errors?.title)}
          />
        </Field>
        <Field
          label="Organization"
          name="organization"
          error={state.errors?.organization}
        >
          <Input
            name="organization"
            defaultValue={item?.organization ?? ""}
            placeholder="School, issuer, publisher"
            aria-invalid={Boolean(state.errors?.organization)}
          />
        </Field>
        <Field
          label="Description"
          name="description"
          error={state.errors?.description}
          className="sm:col-span-2 lg:col-span-4"
        >
          <Textarea
            name="description"
            defaultValue={item?.description}
            placeholder="What this represents, what you contributed, and why it matters."
            className="min-h-24"
            required
            aria-invalid={Boolean(state.errors?.description)}
          />
        </Field>
        <Field
          label="Started or issued"
          name="startDate"
          error={state.errors?.startDate}
        >
          <MonthPicker
            name="startDate"
            defaultValue={item?.startDate}
            aria-invalid={Boolean(state.errors?.startDate)}
          />
        </Field>
        <Field
          label="Ended or expires"
          name="endDate"
          error={state.errors?.endDate}
        >
          <MonthPicker
            name="endDate"
            defaultValue={item?.endDate}
            aria-invalid={Boolean(state.errors?.endDate)}
          />
        </Field>
        <Field label="URL" name="url" error={state.errors?.url}>
          <Input
            name="url"
            type="url"
            defaultValue={item?.url ?? ""}
            placeholder="https://…"
            aria-invalid={Boolean(state.errors?.url)}
          />
        </Field>
        <Field
          label="Credential ID"
          name="credentialId"
          error={state.errors?.credentialId}
        >
          <Input
            name="credentialId"
            defaultValue={item?.credentialId ?? ""}
            placeholder="Optional identifier"
            aria-invalid={Boolean(state.errors?.credentialId)}
          />
        </Field>
        <Field
          label="Technologies or topics"
          name="technologies"
          error={state.errors?.technologies}
          className="sm:col-span-2"
        >
          <Input
            name="technologies"
            defaultValue={item?.technologies.join(", ")}
            placeholder="React, research, distributed systems"
            aria-invalid={Boolean(state.errors?.technologies)}
          />
        </Field>
        <Field
          label="Source"
          name="sourceLabel"
          error={state.errors?.sourceLabel}
          className="sm:col-span-2"
        >
          <Input
            name="sourceLabel"
            defaultValue={item?.sourceLabel ?? ""}
            placeholder="Portfolio, transcript, credential page, or personal recollection"
            aria-invalid={Boolean(state.errors?.sourceLabel)}
          />
        </Field>
      </div>
      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <FormFeedback state={state} />
        <SubmitButton pending={pending} editing={editing} />
      </div>
    </form>
  );
}

function AchievementSelect({
  achievements,
  defaultValue,
}: {
  achievements: CareerAchievement[];
  defaultValue?: string | null;
}) {
  return (
    <FormSelect
      name="supportingAchievementId"
      defaultValue={defaultValue ?? ""}
      options={[
        { value: "", label: "No linked achievement yet" },
        ...achievements.map((achievement) => ({
          value: achievement.id,
          label: achievement.result.slice(0, 90),
        })),
      ]}
    />
  );
}

export function StoryForm({
  story,
  achievements,
}: {
  story?: CareerStory;
  achievements: CareerAchievement[];
}) {
  const editing = Boolean(story);
  const action = story ? updateStory.bind(null, story.id) : createStory;
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useResetOnSuccess(state, editing);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <Field label="Story title" name="title" error={state.errors?.title}>
        <Input
          name="title"
          defaultValue={story?.title}
          placeholder="Turning around a stalled launch"
          required
          aria-invalid={Boolean(state.errors?.title)}
        />
      </Field>
      <div className="grid gap-x-4 lg:grid-cols-2">
        <Field
          label="Situation"
          name="situation"
          error={state.errors?.situation}
        >
          <Textarea
            name="situation"
            defaultValue={story?.situation}
            placeholder="Set the context without unnecessary background."
            className="min-h-28"
            required
            aria-invalid={Boolean(state.errors?.situation)}
          />
        </Field>
        <Field label="Task" name="task" error={state.errors?.task}>
          <Textarea
            name="task"
            defaultValue={story?.task}
            placeholder="What were you responsible for achieving?"
            className="min-h-28"
            required
            aria-invalid={Boolean(state.errors?.task)}
          />
        </Field>
        <Field label="Action" name="action" error={state.errors?.action}>
          <Textarea
            name="action"
            defaultValue={story?.action}
            placeholder="What did you personally decide and do?"
            className="min-h-32"
            required
            aria-invalid={Boolean(state.errors?.action)}
          />
        </Field>
        <Field label="Result" name="result" error={state.errors?.result}>
          <Textarea
            name="result"
            defaultValue={story?.result}
            placeholder="What changed, preferably with defensible evidence?"
            className="min-h-32"
            required
            aria-invalid={Boolean(state.errors?.result)}
          />
        </Field>
        <Field
          label="Reflection"
          name="reflection"
          error={state.errors?.reflection}
          className="lg:col-span-2"
        >
          <Textarea
            name="reflection"
            defaultValue={story?.reflection}
            placeholder="What did you learn, and what would you repeat or change?"
            className="min-h-24"
            required
            aria-invalid={Boolean(state.errors?.reflection)}
          />
        </Field>
      </div>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field
          label="Useful for prompts"
          name="prompts"
          error={state.errors?.prompts}
        >
          <Input
            name="prompts"
            defaultValue={story?.prompts.join(", ")}
            placeholder="Conflict, leadership, ambiguity"
            aria-invalid={Boolean(state.errors?.prompts)}
          />
        </Field>
        <Field
          label="Relevant role families"
          name="roleFamilies"
          error={state.errors?.roleFamilies}
        >
          <Input
            name="roleFamilies"
            defaultValue={story?.roleFamilies.join(", ")}
            placeholder="Product design, management"
            aria-invalid={Boolean(state.errors?.roleFamilies)}
          />
        </Field>
        <Field
          label="Supporting achievement"
          name="supportingAchievementId"
          error={state.errors?.supportingAchievementId}
        >
          <AchievementSelect
            achievements={achievements}
            defaultValue={story?.supportingAchievementId}
          />
        </Field>
        <Field
          label="Source"
          name="sourceLabel"
          error={state.errors?.sourceLabel}
        >
          <Input
            name="sourceLabel"
            defaultValue={story?.sourceLabel ?? ""}
            placeholder="Project notes or performance review"
            aria-invalid={Boolean(state.errors?.sourceLabel)}
          />
        </Field>
      </div>
      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <FormFeedback state={state} />
        <SubmitButton pending={pending} editing={editing} />
      </div>
    </form>
  );
}

export function AnswerForm({
  answer,
  achievements,
}: {
  answer?: CareerAnswer;
  achievements: CareerAchievement[];
}) {
  const editing = Boolean(answer);
  const action = answer ? updateAnswer.bind(null, answer.id) : createAnswer;
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useResetOnSuccess(state, editing);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <Field label="Question" name="question" error={state.errors?.question}>
        <Input
          name="question"
          defaultValue={answer?.question}
          placeholder="Why are you interested in this kind of role?"
          required
          aria-invalid={Boolean(state.errors?.question)}
        />
      </Field>
      <Field label="Reusable answer" name="answer" error={state.errors?.answer}>
        <Textarea
          name="answer"
          defaultValue={answer?.answer}
          placeholder="Write a truthful base answer that can be adapted to a specific application."
          className="min-h-36"
          required
          aria-invalid={Boolean(state.errors?.answer)}
        />
      </Field>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field
          label="Useful contexts"
          name="contexts"
          error={state.errors?.contexts}
        >
          <Input
            name="contexts"
            defaultValue={answer?.contexts.join(", ")}
            placeholder="Application form, recruiter screen"
            aria-invalid={Boolean(state.errors?.contexts)}
          />
        </Field>
        <Field
          label="Supporting achievement"
          name="supportingAchievementId"
          error={state.errors?.supportingAchievementId}
        >
          <AchievementSelect
            achievements={achievements}
            defaultValue={answer?.supportingAchievementId}
          />
        </Field>
        <Field
          label="Source"
          name="sourceLabel"
          error={state.errors?.sourceLabel}
          className="sm:col-span-2"
        >
          <Input
            name="sourceLabel"
            defaultValue={answer?.sourceLabel ?? ""}
            placeholder="Prior application or personal draft"
            aria-invalid={Boolean(state.errors?.sourceLabel)}
          />
        </Field>
      </div>
      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <FormFeedback state={state} />
        <SubmitButton pending={pending} editing={editing} />
      </div>
    </form>
  );
}

export function VoiceProfileForm({
  profile,
}: {
  profile?: CareerVoiceProfile;
}) {
  const editing = Boolean(profile);
  const action = profile
    ? updateVoiceProfile.bind(null, profile.id)
    : createVoiceProfile;
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useResetOnSuccess(state, editing);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="Profile name" name="name" error={state.errors?.name}>
          <Input
            name="name"
            defaultValue={profile?.name}
            placeholder="Direct and thoughtful"
            required
            aria-invalid={Boolean(state.errors?.name)}
          />
        </Field>
        <Field
          label="Source"
          name="sourceLabel"
          error={state.errors?.sourceLabel}
        >
          <Input
            name="sourceLabel"
            defaultValue={profile?.sourceLabel ?? ""}
            placeholder="Samples reviewed to define this voice"
            aria-invalid={Boolean(state.errors?.sourceLabel)}
          />
        </Field>
        <Field
          label="Tone"
          name="tone"
          error={state.errors?.tone}
          className="sm:col-span-2"
        >
          <Textarea
            name="tone"
            defaultValue={profile?.tone}
            placeholder="Describe the pace, level of formality, and qualities that should carry through your writing."
            className="min-h-24"
            required
            aria-invalid={Boolean(state.errors?.tone)}
          />
        </Field>
        <Field
          label="Writing principles"
          name="principles"
          error={state.errors?.principles}
        >
          <Textarea
            name="principles"
            defaultValue={profile?.principles.join("\n")}
            placeholder={
              "Lead with the point\nPrefer concrete examples\nKeep sentences compact"
            }
            className="min-h-28"
            required
            aria-invalid={Boolean(state.errors?.principles)}
          />
        </Field>
        <Field label="Avoid" name="avoid" error={state.errors?.avoid}>
          <Textarea
            name="avoid"
            defaultValue={profile?.avoid.join("\n")}
            placeholder={
              "Corporate filler\nUnsupported superlatives\nOverlong introductions"
            }
            className="min-h-28"
            aria-invalid={Boolean(state.errors?.avoid)}
          />
        </Field>
        <Field
          label="Representative sample"
          name="sample"
          error={state.errors?.sample}
          className="sm:col-span-2"
        >
          <Textarea
            name="sample"
            defaultValue={profile?.sample ?? ""}
            placeholder="Paste a short piece of writing that sounds like you."
            className="min-h-32"
            aria-invalid={Boolean(state.errors?.sample)}
          />
        </Field>
      </div>
      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <FormFeedback state={state} />
        <SubmitButton pending={pending} editing={editing} />
      </div>
    </form>
  );
}
