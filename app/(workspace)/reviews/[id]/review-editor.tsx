"use client";
import { startTransition, useActionState, useState } from "react";
import type { SavedReview } from "@/lib/weekly-review/storage";
import { saveReviewAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/action-form";
export function ReviewEditor({
  review,
}: {
  review: Omit<SavedReview, "snapshot"> & {
    snapshot: Pick<
      SavedReview["snapshot"],
      "weekEnd" | "weeklyHours" | "suggestedExperiment"
    >;
  };
}) {
  const [state, action, pending] = useActionState(
    saveReviewAction.bind(null, review.id),
    {},
  );
  const [initialRevision] = useState(review.revision);
  const [available, setAvailable] = useState(String(review.availableHours));
  const [planned, setPlanned] = useState(String(review.plannedHours));
  const overBudget = Number(planned) > Number(available);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
      className="space-y-8"
    >
      <input
        type="hidden"
        name="revision"
        value={state.revision ?? initialRevision}
      />
      <fieldset disabled={pending} className="space-y-8">
        <section className="space-y-4 border-t pt-8">
          <h2 className="text-xl font-semibold tracking-tight">
            Your reflections
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            What felt useful, difficult, or worth changing? Add corrections or
            missing context here without changing the recorded facts.
          </p>
          <label htmlFor="reflection" className="block text-sm font-medium">
            What you learned
          </label>
          <Textarea
            id="reflection"
            name="reflection"
            defaultValue={review.reflection}
            maxLength={12000}
            className="min-h-32"
            placeholder="One thing that worked, one thing that got in the way…"
          />
          <label htmlFor="interpretation" className="block text-sm font-medium">
            Your interpretation
          </label>
          <Textarea
            id="interpretation"
            name="interpretation"
            defaultValue={review.interpretation}
            maxLength={12000}
            className="min-h-24"
            placeholder="What might explain the results? What remains uncertain?"
          />
        </section>
        <section className="space-y-4 border-t pt-8">
          <h2 className="text-xl font-semibold tracking-tight">
            Experiment ideas
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Optional hypotheses to test, not conclusions. Pick at most one to
            run at a time; name the single change, time window, and measure.
          </p>
          <details className="rounded-lg border bg-muted/25 p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Suggested experiment
            </summary>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {review.snapshot.suggestedExperiment}
            </p>
          </details>
          <label htmlFor="experimentOne" className="block text-sm font-medium">
            First idea
          </label>
          <Textarea
            id="experimentOne"
            name="experimentOne"
            defaultValue={review.experimentOne}
            maxLength={12000}
            placeholder="Hypothesis → one change → dates → success measure"
          />
          <label htmlFor="experimentTwo" className="block text-sm font-medium">
            Alternative idea
          </label>
          <Textarea
            id="experimentTwo"
            name="experimentTwo"
            defaultValue={review.experimentTwo}
            maxLength={12000}
            placeholder="Keep an alternative for a later cycle."
          />
        </section>
        <section className="space-y-4 border-t pt-8">
          <h2 className="text-xl font-semibold tracking-tight">
            Next-week plan
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            For the week of {review.snapshot.weekEnd}. Suggestions use risks
            known at snapshot creation and rough planning allowances, not
            measured task durations. Adjust them to your availability.
          </p>
          {review.snapshot.weeklyHours === null ? (
            <p className="text-xs text-muted-foreground">
              No weekly budget was saved in your strategy. The initial 3-hour
              allowance is a placeholder; set your own capacity.
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="availableHours" className="text-sm font-medium">
                Available hours
              </label>
              <Input
                id="availableHours"
                name="availableHours"
                type="number"
                min="0"
                max="168"
                step="0.25"
                required
                value={available}
                onChange={(event) => setAvailable(event.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <label htmlFor="plannedHours" className="text-sm font-medium">
                Planned hours
              </label>
              <Input
                id="plannedHours"
                name="plannedHours"
                type="number"
                min="0"
                max="168"
                step="0.25"
                required
                value={planned}
                onChange={(event) => setPlanned(event.target.value)}
                className="mt-2"
                aria-invalid={overBudget}
                aria-describedby="review-capacity"
              />
            </div>
          </div>
          <p
            id="review-capacity"
            role="status"
            className={
              overBudget
                ? "text-sm text-destructive"
                : "text-sm text-muted-foreground"
            }
          >
            {overBudget
              ? "Your plan exceeds the time available. Trim it or revise your capacity."
              : `${Math.max(0, Number(available) - Number(planned))} hours left unallocated.`}
          </p>
          <label htmlFor="nextWeekPlan" className="block text-sm font-medium">
            Priorities and deliberate deferrals
          </label>
          <Textarea
            id="nextWeekPlan"
            name="nextWeekPlan"
            defaultValue={review.nextWeekPlan}
            maxLength={12000}
            className="min-h-40"
          />
          <p className="text-xs leading-5 text-muted-foreground">
            This is a saved plan. It does not create tasks, change application
            stages, or send messages.
          </p>
          <FormSelect
            name="status"
            label="Review status"
            defaultValue={review.status}
            options={[
              { value: "draft", label: "Draft" },
              { value: "reviewed", label: "Reviewed" },
            ]}
          />
          <Button disabled={pending || overBudget}>
            {pending ? "Saving review…" : "Save review"}
          </Button>
        </section>
      </fieldset>
      {state.message ? (
        <div>
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
          {!state.success && state.message.includes("another tab") ? (
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={() => {
                if (
                  window.confirm(
                    "Copy your unsaved notes first. Reload and discard unsaved changes?",
                  )
                ) {
                  window.location.reload();
                }
              }}
            >
              Reload saved review
            </Button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
