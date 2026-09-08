import { z } from "zod";

import { pipelineStageDefinitions } from "@/lib/applications/types";

const optionalText = (maximum: number) => z.string().trim().max(maximum).transform((value) => value || null);

// Browser datetime-local controls carry no offset. These forms explicitly use UTC,
// matching the interview room; normalize before persistence on any server timezone.
const utcDateTime = z.string().trim()
  .transform((value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value) ? `${value.length === 16 ? `${value}:00` : value}Z` : value)
  .pipe(z.iso.datetime({ offset: true, error: "Enter a valid date and time (UTC)." }));

export const standardStageSchema = z.enum(pipelineStageDefinitions.map((stage) => stage.key));
export const applicationStageSchema = z.string().trim().min(1).max(100).regex(/^[a-z0-9_-]+$/);

export const stageTransitionSchema = z.object({
  stage: applicationStageSchema,
  submissionWaiverReason: optionalText(500),
  outcomeReason: optionalText(500),
});

export const nextActionSchema = z.object({
  nextAction: optionalText(240),
  nextActionDueAt: z.string().trim().refine((value) => !value || !Number.isNaN(Date.parse(`${value}T00:00:00`)), "Choose a valid date."),
  waiting: z.preprocess((value) => value === "true" || value === "on" || value === true, z.boolean()),
  waitingReason: optionalText(300),
}).superRefine((value, context) => {
  if (!value.nextAction && !value.waiting) context.addIssue({ code: "custom", message: "Add a next action or deliberately mark this application as waiting.", path: ["nextAction"] });
  if (value.waiting && !value.waitingReason) context.addIssue({ code: "custom", message: "Add what you are waiting for.", path: ["waitingReason"] });
});

export const pipelineMetadataSchema = z.object({
  priority: z.enum(["low", "normal", "high"]),
  interest: z.coerce.number().int().min(1).max(5),
});

export const customStageSchema = z.object({
  label: z.string().trim().min(2, "Add a stage name.").max(60),
  category: standardStageSchema,
});

export const interviewSchema = z.object({
  label: z.string().trim().min(2, "Name the interview round.").max(120),
  scheduledAt: utcDateTime,
  notes: optionalText(1000),
});

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Add a task title.").max(180),
  dueAt: z.string().trim().refine((value) => !value || !Number.isNaN(Date.parse(`${value}T00:00:00`)), "Choose a valid date."),
});

export const applicationAnswerSchema = z.object({
  canonicalAnswerId: optionalText(100),
  question: z.string().trim().max(500),
  answer: z.string().trim().max(8000),
  sensitiveDataWarning: optionalText(500),
}).refine((value) => value.canonicalAnswerId || (value.question && value.answer), {
  message: "Choose a library answer or write a question and answer.",
});

export const artifactSchema = z.object({
  kind: z.enum(["cover_letter", "portfolio", "attachment"]),
  name: z.string().trim().min(1, "Add a document name.").max(180),
  content: z.string().trim().max(20000),
  status: z.enum(["draft", "ready"]),
});

export const outreachSchema = z.object({
  kind: z.enum(["recruiter_outreach", "referral_request", "follow_up"]),
  recipient: optionalText(180),
  subject: optionalText(300),
  body: z.string().trim().min(1, "Add the message draft.").max(10000),
});

export const submissionSchema = z.object({
  method: z.enum(["company_site", "job_board", "email", "referral", "other"]),
  source: optionalText(500),
  referral: optionalText(240),
  confirmationId: optionalText(240),
  submittedAt: utcDateTime,
});
