import { DateTimeField, FormSelect } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { interviewKinds } from "@/lib/interviews/preparation";
import type { applicationInterviews, interviewPlans } from "@/lib/db/schema";
export function PlanFields({
  round,
  plan,
}: {
  round?: typeof applicationInterviews.$inferSelect;
  plan?: typeof interviewPlans.$inferSelect;
}) {
  return (
    <>
      <div>
        <label htmlFor="round-label" className="text-sm font-medium">
          Round name
        </label>
        <Input
          id="round-label"
          name="label"
          required
          defaultValue={round?.label}
          className="mt-2"
        />
      </div>
      <DateTimeField
        name="scheduledAt"
        label="Scheduled time"
        defaultValue={round?.scheduledAt.toISOString()}
      />
      <FormSelect
        name="status"
        label="Round status"
        defaultValue={round?.status}
        options={["scheduled", "completed", "cancelled"].map((value) => ({
          value,
          label: value,
        }))}
      />
      <FormSelect
        name="kind"
        label="Interview type"
        defaultValue={plan?.kind ?? "other"}
        options={interviewKinds.map((value) => ({
          value,
          label: value.replaceAll("_", " "),
        }))}
      />
      {[
        { name: "interviewers", label: "Interviewers and their roles" },
        { name: "objectives", label: "Objectives for this round" },
        { name: "commitments", label: "Commitments and logistics" },
        { name: "studyPlan", label: "Focused study plan" },
        { name: "questionsForInterviewer", label: "Questions to ask" },
      ].map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name} className="text-sm font-medium">
            {field.label}
          </label>
          <Textarea
            id={field.name}
            name={field.name}
            className="mt-2"
            defaultValue={
              plan?.[
                field.name as
                  | "interviewers"
                  | "objectives"
                  | "commitments"
                  | "studyPlan"
                  | "questionsForInterviewer"
              ] ?? ""
            }
          />
        </div>
      ))}
    </>
  );
}
