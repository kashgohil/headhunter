import { describe, expect, test } from "bun:test";

import {
  applicationAnswerSchema,
  artifactSchema,
  customStageSchema,
  interviewSchema,
  nextActionSchema,
  stageTransitionSchema,
  submissionSchema,
  taskSchema,
} from "@/lib/applications/validation";
import { getStageTransitionError } from "@/lib/applications/transitions";

describe("application workspace validation", () => {
  test("accepts a reusable answer reference without changing its source text", () => {
    const result = applicationAnswerSchema.safeParse({
      canonicalAnswerId: "answer-1",
      question: "",
      answer: "",
      sensitiveDataWarning: "",
    });
    expect(result.success).toBe(true);
  });

  test("requires content for a job-specific answer", () => {
    const result = applicationAnswerSchema.safeParse({
      canonicalAnswerId: "",
      question: "Why this role?",
      answer: "",
      sensitiveDataWarning: "",
    });
    expect(result.success).toBe(false);
  });

  test("validates document readiness and task dates", () => {
    expect(artifactSchema.safeParse({ kind: "attachment", name: "Portfolio.pdf", content: "Drive reference", status: "ready" }).success).toBe(true);
    expect(taskSchema.safeParse({ title: "Follow up", dueAt: "not-a-date" }).success).toBe(false);
  });

  test("requires a valid submission timestamp", () => {
    expect(submissionSchema.safeParse({ method: "company_site", source: "", referral: "", confirmationId: "", submittedAt: "2026-09-07T12:30" }).success).toBe(true);
    expect(submissionSchema.safeParse({ method: "company_site", source: "", referral: "", confirmationId: "", submittedAt: "" }).success).toBe(false);
  });

  test("normalizes application and interview times to explicit UTC and rejects impossible dates", () => {
    const submission = { method: "company_site", source: "", referral: "", confirmationId: "", submittedAt: "2026-09-09T15:30" };
    expect(submissionSchema.parse(submission).submittedAt).toBe("2026-09-09T15:30:00Z");
    expect(interviewSchema.parse({ label: "Screen", notes: "", scheduledAt: "2026-09-09T15:30" }).scheduledAt).toBe("2026-09-09T15:30:00Z");
    expect(submissionSchema.parse({ ...submission, submittedAt: "2026-09-09T15:30:00+05:30" }).submittedAt).toBe("2026-09-09T15:30:00+05:30");
    for (const submittedAt of ["2026-02-30T15:30", "2026-09-09", "2026-09-09T25:00", "tomorrow"]) {
      expect(submissionSchema.safeParse({ ...submission, submittedAt }).success).toBe(false);
      expect(interviewSchema.safeParse({ label: "Screen", notes: "", scheduledAt: submittedAt }).success).toBe(false);
    }
  });

  test("requires either a concrete next action or a deliberate waiting reason", () => {
    expect(nextActionSchema.safeParse({ nextAction: "Follow up", nextActionDueAt: "2026-09-12", waiting: false, waitingReason: "" }).success).toBe(true);
    expect(nextActionSchema.safeParse({ nextAction: "", nextActionDueAt: "", waiting: true, waitingReason: "Recruiter response" }).success).toBe(true);
    expect(nextActionSchema.safeParse({ nextAction: "", nextActionDueAt: "", waiting: false, waitingReason: "" }).success).toBe(false);
    expect(nextActionSchema.safeParse({ nextAction: "", nextActionDueAt: "", waiting: true, waitingReason: "" }).success).toBe(false);
  });

  test("accepts built-in and custom pipeline stage transitions", () => {
    expect(stageTransitionSchema.safeParse({ stage: "ready_to_apply", submissionWaiverReason: "", outcomeReason: "" }).success).toBe(true);
    expect(stageTransitionSchema.safeParse({ stage: "custom-technical-exercise-a1b2c3d4", submissionWaiverReason: "", outcomeReason: "" }).success).toBe(true);
    expect(stageTransitionSchema.safeParse({ stage: "not a safe key", submissionWaiverReason: "", outcomeReason: "" }).success).toBe(false);
  });

  test("maps custom stages to a standard analytics category", () => {
    expect(customStageSchema.safeParse({ label: "Technical exercise", category: "interviewing" }).success).toBe(true);
    expect(customStageSchema.safeParse({ label: "X", category: "unknown" }).success).toBe(false);
  });

  test("guards active transitions and Applied snapshot waivers", () => {
    expect(getStageTransitionError({ destination: { category: "preparing", isTerminal: false }, nextAction: null, waiting: false, hasSubmission: false, submissionWaiverReason: null })).toContain("next action");
    expect(getStageTransitionError({ destination: { category: "applied", isTerminal: false }, nextAction: "Follow up", waiting: false, hasSubmission: false, submissionWaiverReason: null })).toContain("submission snapshot");
    expect(getStageTransitionError({ destination: { category: "applied", isTerminal: false }, nextAction: "Follow up", waiting: false, hasSubmission: false, submissionWaiverReason: "Imported historical application" })).toBeNull();
    expect(getStageTransitionError({ destination: { category: "rejected", isTerminal: true }, nextAction: null, waiting: false, hasSubmission: false, submissionWaiverReason: null })).toBeNull();
  });
});
