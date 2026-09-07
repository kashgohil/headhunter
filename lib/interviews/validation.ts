import { z } from "zod";
import { interviewKinds } from "./preparation";
const note = (limit = 4000) => z.string().trim().max(limit);
export const roundPlanSchema = z.object({
  label: z.string().trim().min(1).max(120),
  scheduledAt: z.iso
    .datetime({ offset: true })
    .transform((value) => new Date(value)),
  status: z.enum(["scheduled", "completed", "cancelled"]),
  kind: z.enum(interviewKinds),
  interviewers: note(1000),
  objectives: note(),
  commitments: note(),
  studyPlan: note(8000),
  questionsForInterviewer: note(),
});
export const debriefSchema = z.object({
  actualQuestions: note(8000),
  wentWell: note(),
  answerGaps: note(),
  thankYouDraft: note(8000),
  nextAction: z
    .string()
    .trim()
    .min(1, "Record the next useful action.")
    .max(240),
  nextActionDueAt: z
    .union([z.literal(""), z.iso.date()])
    .transform((value) => (value ? new Date(`${value}T12:00:00Z`) : null)),
});
export const practiceSchema = z.object({
  prompt: z.string().trim().min(1).max(1000),
  response: z
    .string()
    .trim()
    .min(1, "Add practice notes or a transcript.")
    .max(16000),
  clarity: z.coerce.number().int().min(1).max(5),
  relevance: z.coerce.number().int().min(1).max(5),
  evidence: z.coerce.number().int().min(1).max(5),
  feedback: note(),
  nextPractice: z
    .string()
    .trim()
    .min(1, "Choose one thing to practice next.")
    .max(1000),
});
