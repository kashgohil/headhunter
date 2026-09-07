export const checklistItems = [
  { id: "job_reviewed", label: "Job details and source reviewed" },
  { id: "fit_reviewed", label: "Fit, gaps, and blockers reviewed" },
  { id: "resume_ready", label: "Tailored resume is final" },
  { id: "answers_reviewed", label: "Screening answers are complete" },
  { id: "attachments_ready", label: "Attachments and links are correct" },
  { id: "final_review", label: "Final application reviewed in the employer form" },
] as const;

export const pipelineStageDefinitions = [
  { key: "inbox", label: "Inbox", category: "inbox", terminal: false },
  { key: "researching", label: "Researching", category: "researching", terminal: false },
  { key: "preparing", label: "Preparing", category: "preparing", terminal: false },
  { key: "ready_to_apply", label: "Ready to apply", category: "ready_to_apply", terminal: false },
  { key: "applied", label: "Applied", category: "applied", terminal: false },
  { key: "recruiter_screen", label: "Recruiter screen", category: "recruiter_screen", terminal: false },
  { key: "interviewing", label: "Interviewing", category: "interviewing", terminal: false },
  { key: "offer", label: "Offer", category: "offer", terminal: false },
  { key: "accepted", label: "Accepted", category: "accepted", terminal: true },
  { key: "skipped", label: "Skipped", category: "skipped", terminal: true },
  { key: "rejected", label: "Rejected", category: "rejected", terminal: true },
  { key: "withdrawn", label: "Withdrawn", category: "withdrawn", terminal: true },
  { key: "ghosted", label: "Ghosted", category: "ghosted", terminal: true },
  { key: "archived", label: "Archived", category: "archived", terminal: true },
] as const;

export type StandardStage = typeof pipelineStageDefinitions[number]["key"];
export type PipelineStageCategory = typeof pipelineStageDefinitions[number]["category"];

export const terminalStageCategories = new Set<PipelineStageCategory>(
  pipelineStageDefinitions.filter((stage) => stage.terminal).map((stage) => stage.category),
);
