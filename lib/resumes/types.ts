export const resumeTemplates = ["classic", "modern", "compact", "minimal"] as const;
export type ResumeTemplate = (typeof resumeTemplates)[number];
export type ResumeDecision = "pending" | "accepted" | "rejected";
export type ResumeConfidence = "low" | "medium" | "high";
export type ResumeRisk = "low" | "medium" | "high";

export type TailoringEvidence = {
  id: string;
  verificationState: "needs_clarification" | "verified" | "archived" | "prohibited";
};

export type TailoringAchievement = TailoringEvidence & {
  experienceId: string;
  action: string;
  result: string;
  measurableOutcome: string | null;
  tools: string[];
};

export type TailoringSkill = TailoringEvidence & { name: string };

export type TailoringJob = {
  title: string;
  requiredQualifications: string[];
  preferredQualifications: string[];
  responsibilities: string[];
  skills: string[];
  technologies: string[];
};

export type ResumeSuggestion = {
  experienceId: string;
  achievementId: string;
  originalText: string;
  proposedText: string;
  reason: string;
  requirementAddressed: string;
  evidenceIds: string[];
  confidence: ResumeConfidence;
  risk: ResumeRisk;
};
