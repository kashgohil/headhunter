"use client";
import { startTransition, useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/action-form";
import {
  createExperimentAction,
  saveAnnotationAction,
  updateExperimentAction,
  type AnalyticsFormState,
} from "./actions";
import {
  segmentLabels,
  segmentKeys,
  outcomeLabels,
} from "@/lib/analytics/segments";
import type { Annotation, SavedExperiment } from "@/lib/analytics/storage";
const dimensionOptions = segmentKeys.map((value) => ({
  value,
  label: segmentLabels[value],
}));
export function SaveForm({
  action,
  revision,
  children,
  label,
}: {
  action: (
    state: AnalyticsFormState,
    data: FormData,
  ) => Promise<AnalyticsFormState>;
  revision?: number;
  children: React.ReactNode;
  label: string;
}) {
  const [state, submit, pending] = useActionState(action, { revision });
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => submit(data));
      }}
    >
      <input
        type="hidden"
        name="revision"
        value={state.revision ?? revision ?? 0}
      />
      <fieldset disabled={pending} className="space-y-4">
        {children}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : label}
        </Button>
      </fieldset>
      {state.message ? (
        <p
          role={state.success ? "status" : "alert"}
          className={
            state.success
              ? "text-sm text-muted-foreground"
              : "text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
function Field({
  name,
  label,
  value = "",
  type = "text",
  required = false,
  maxLength = 160,
}: {
  name: string;
  label: string;
  value?: string | number;
  type?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <Input
        name={name}
        defaultValue={value}
        type={type}
        required={required}
        maxLength={maxLength}
        min={type === "number" ? 0 : undefined}
        className="mt-2"
      />
    </label>
  );
}
export function ExperimentForm() {
  return (
    <SaveForm action={createExperimentAction} label="Save experiment plan">
      <Field name="title" label="Experiment name" required />
      <label className="block text-sm font-medium">
        Hypothesis
        <Textarea
          name="hypothesis"
          required
          maxLength={2000}
          placeholder="I expect this one change to improve…"
          className="mt-2"
        />
      </label>
      <FormSelect
        name="variable"
        label="One changed variable"
        options={dimensionOptions}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="baseline" label="Baseline segment value" required />
        <Field name="treatment" label="Changed segment value" required />
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Use the exact segment values shown in the comparison table. Matching
        ignores case and repeated spaces. Unmatched applications are excluded.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          name="targetDimension"
          label="Target segment"
          options={[
            { value: "all", label: "All applications" },
            ...dimensionOptions,
          ]}
        />
        <Field
          name="targetValue"
          label="Target value (unless all applications)"
        />
      </div>
      <label className="block text-sm font-medium">
        What will you keep the same?
        <Textarea
          name="controls"
          required
          maxLength={2000}
          placeholder="Keep role, seniority, location, and other preparation choices consistent. Describe how you will split the groups."
          className="mt-2"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="startDate"
          label="First application date (UTC)"
          type="date"
          required
        />
        <Field
          name="endDate"
          label="Last application date (UTC, inclusive)"
          type="date"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          name="outcome"
          label="Success milestone"
          options={Object.entries(outcomeLabels).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <FormSelect
          name="observationDays"
          label="Observe each application for"
          options={[7, 14, 30, 60, 90].map((days) => ({
            value: String(days),
            label: `${days} days`,
          }))}
          defaultValue="30"
        />
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        The plan is fixed when saved. Cancel and create a new plan to change its
        definition. Run one experiment at a time; keep other changes constant.
        Groups are matched from recorded attributes, so deliberate group
        assignment and consistent execution are your responsibility.
      </p>
    </SaveForm>
  );
}
export function AnnotationForm({
  jobId,
  annotation,
}: {
  jobId: string;
  annotation?: Annotation;
}) {
  return (
    <SaveForm
      action={saveAnnotationAction.bind(null, jobId)}
      revision={annotation?.revision ?? 0}
      label="Save annotations"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          ["roleFamily", "industry", "companySize", "resumeStrategy"] as const
        ).map((key) => (
          <Field
            key={key}
            name={key}
            label={segmentLabels[key]}
            value={annotation?.[key] ?? ""}
          />
        ))}
        <Field
          name="preparationMinutes"
          label="Actual preparation minutes"
          type="number"
          value={annotation?.preparationMinutes ?? ""}
        />
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        Record what was true when applying. Blank fields remain unknown or use
        the submitted resume profile name. These annotations do not change job
        or resume snapshots.
      </p>
    </SaveForm>
  );
}
export function ExperimentEditor({
  experiment,
}: {
  experiment: SavedExperiment;
}) {
  const notesId = useId();
  const statuses = [
    experiment.status,
    ...(experiment.status === "planned"
      ? ["running", "cancelled"]
      : experiment.status === "running"
        ? ["completed", "cancelled"]
        : []),
  ];
  return (
    <SaveForm
      action={updateExperimentAction.bind(null, experiment.id)}
      revision={experiment.revision}
      label="Save experiment"
    >
      <FormSelect
        key={experiment.status}
        name="status"
        label="Experiment state"
        defaultValue={experiment.status}
        options={statuses.map((value) => ({
          value,
          label: value[0].toUpperCase() + value.slice(1),
        }))}
      />
      <div>
        <label htmlFor={notesId} className="block text-sm font-medium">
          Execution notes and interpretation
        </label>
        <Textarea
          id={notesId}
          name="notes"
          defaultValue={experiment.notes}
          maxLength={12000}
          className="mt-2 min-h-32"
          placeholder="Record deviations, uncontrolled changes, and what you learned."
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Complete after every application has had the full observation period.
        Completion saves the result as a historical snapshot; notes remain
        editable.
      </p>
    </SaveForm>
  );
}
