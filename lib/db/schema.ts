import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  sourceUrl: text("source_url"),
  sourceType: text("source_type", { enum: ["url", "pasted", "manual"] }).notNull().default("pasted"),
  sourceFetchedAt: integer("source_fetched_at", { mode: "timestamp_ms" }),
  originalDescription: text("original_description").notNull(),
  employmentType: text("employment_type"),
  workArrangement: text("work_arrangement", { enum: ["remote", "hybrid", "on_site", "unknown"] }).notNull().default("unknown"),
  seniority: text("seniority"),
  minimumCompensation: integer("minimum_compensation"),
  maximumCompensation: integer("maximum_compensation"),
  compensationCurrency: text("compensation_currency"),
  postedAt: integer("posted_at", { mode: "timestamp_ms" }),
  applicationDeadline: integer("application_deadline", { mode: "timestamp_ms" }),
  responsibilities: text("responsibilities", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  requiredQualifications: text("required_qualifications", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  preferredQualifications: text("preferred_qualifications", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  skills: text("skills", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  technologies: text("technologies", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  extractionConfidence: text("extraction_confidence", { enum: ["not_run", "low", "medium", "high"] }).notNull().default("not_run"),
  metadataUpdatedAt: integer("metadata_updated_at", { mode: "timestamp_ms" }),
  capturedAt: integer("captured_at", { mode: "timestamp_ms" }).notNull(),
});

export const jobDuplicateSignals = sqliteTable("job_duplicate_signals", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  candidateJobId: text("candidate_job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  reason: text("reason", { enum: ["exact_url", "same_role", "similar_description"] }).notNull(),
  similarity: real("similarity").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  uniqueIndex("job_duplicate_pair_unique").on(table.jobId, table.candidateJobId),
]);

export const opportunities = sqliteTable("opportunities", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().unique().references(() => jobs.id, { onDelete: "restrict" }),
  stage: text("stage").notNull().default("inbox"),
  priority: text("priority", { enum: ["low", "normal", "high"] }).notNull().default("normal"),
  interest: integer("interest").notNull().default(3),
  nextAction: text("next_action"),
  nextActionDueAt: integer("next_action_due_at", { mode: "timestamp_ms" }),
  waiting: integer("waiting", { mode: "boolean" }).notNull().default(false),
  waitingReason: text("waiting_reason"),
  submissionWaivedAt: integer("submission_waived_at", { mode: "timestamp_ms" }),
  submissionWaiverReason: text("submission_waiver_reason"),
  outcomeReason: text("outcome_reason"),
  checklist: text("checklist", { mode: "json" }).$type<Record<string, boolean>>().notNull().default(sql`'{}'`),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
});

export const pipelineStages = sqliteTable("pipeline_stages", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  category: text("category", { enum: ["inbox", "researching", "preparing", "ready_to_apply", "applied", "recruiter_screen", "interviewing", "offer", "accepted", "skipped", "rejected", "withdrawn", "ghosted", "archived"] }).notNull(),
  position: integer("position").notNull(),
  isTerminal: integer("is_terminal", { mode: "boolean" }).notNull().default(false),
  isBuiltIn: integer("is_built_in", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const commandCenterAlerts = sqliteTable("command_center_alerts", {
  key: text("key").primaryKey(),
  dismissed: integer("dismissed", { mode: "boolean" }).notNull().default(false),
  snoozedUntil: integer("snoozed_until", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const applicationTasks = sqliteTable("application_tasks", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  dueAt: integer("due_at", { mode: "timestamp_ms" }),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const applicationAnswers = sqliteTable("application_answers", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  canonicalAnswerId: text("canonical_answer_id").references(() => careerAnswers.id, { onDelete: "set null" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sensitiveDataWarning: text("sensitive_data_warning"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const applicationArtifacts = sqliteTable("application_artifacts", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["cover_letter", "portfolio", "attachment"] }).notNull(),
  name: text("name").notNull(),
  content: text("content").notNull().default(""),
  status: text("status", { enum: ["draft", "ready"] }).notNull().default("draft"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const outreachDrafts = sqliteTable("outreach_drafts", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["recruiter_outreach", "referral_request", "follow_up"] }).notNull(),
  recipient: text("recipient"),
  subject: text("subject"),
  body: text("body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export type ApplicationSubmissionSnapshot = {
  job: Record<string, unknown>;
  documents: Array<Record<string, unknown>>;
  answers: Array<Record<string, unknown>>;
};

export const applicationSubmissions = sqliteTable("application_submissions", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "restrict" }),
  method: text("method", { enum: ["company_site", "job_board", "email", "referral", "other"] }).notNull(),
  source: text("source"),
  referral: text("referral"),
  confirmationId: text("confirmation_id"),
  submittedAt: integer("submitted_at", { mode: "timestamp_ms" }).notNull(),
  snapshot: text("snapshot", { mode: "json" }).$type<ApplicationSubmissionSnapshot>().notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const applicationEvents = sqliteTable("application_events", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["stage", "task", "answer", "document", "outreach", "submission", "note"] }).notNull(),
  title: text("title").notNull(),
  detail: text("detail"),
  fromStage: text("from_stage"),
  toStage: text("to_stage"),
  occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
});

export const applicationInterviews = sqliteTable("application_interviews", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  scheduledAt: integer("scheduled_at", { mode: "timestamp_ms" }).notNull(),
  status: text("status", { enum: ["scheduled", "completed", "cancelled"] }).notNull().default("scheduled"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company").notNull().default(""),
  email: text("email"),
  profileUrl: text("profile_url"),
  relationship: text("relationship", { enum: ["new", "acquaintance", "warm", "close"] }).notNull().default("new"),
  context: text("context").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const interviewPlans = sqliteTable("interview_plans", {
  interviewId: text("interview_id").primaryKey().references(() => applicationInterviews.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["recruiter", "behavioral", "technical", "hiring_manager", "panel", "other"] }).notNull().default("other"),
  interviewers: text("interviewers").notNull().default(""),
  objectives: text("objectives").notNull().default(""),
  commitments: text("commitments").notNull().default(""),
  studyPlan: text("study_plan").notNull().default(""),
  questionsForInterviewer: text("questions_for_interviewer").notNull().default(""),
  actualQuestions: text("actual_questions").notNull().default(""),
  wentWell: text("went_well").notNull().default(""),
  answerGaps: text("answer_gaps").notNull().default(""),
  thankYouDraft: text("thank_you_draft").notNull().default(""),
  nextAction: text("next_action").notNull().default(""),
  debriefedAt: integer("debriefed_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const interviewPractice = sqliteTable("interview_practice", {
  id: text("id").primaryKey(),
  interviewId: text("interview_id").notNull().references(() => applicationInterviews.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  response: text("response").notNull(),
  clarity: integer("clarity").notNull(),
  relevance: integer("relevance").notNull(),
  evidence: integer("evidence").notNull(),
  feedback: text("feedback").notNull(),
  nextPractice: text("next_practice").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const contactOpportunities = sqliteTable("contact_opportunities", {
  id: text("id").primaryKey(),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  referralStatus: text("referral_status", { enum: ["not_requested", "requested", "introduced", "declined"] }).notNull().default("not_requested"),
  followUpAt: integer("follow_up_at", { mode: "timestamp_ms" }),
  promisedAction: text("promised_action").notNull().default(""),
  draftKind: text("draft_kind", { enum: ["outreach", "referral", "follow_up", "thank_you"] }).notNull().default("outreach"),
  draft: text("draft").notNull().default(""),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [uniqueIndex("contact_opportunity_unique").on(table.contactId, table.jobId)]);

export const contactInteractions = sqliteTable("contact_interactions", {
  id: text("id").primaryKey(),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),
  direction: text("direction", { enum: ["inbound", "outbound", "note"] }).notNull(),
  channel: text("channel", { enum: ["email", "message", "call", "meeting", "other"] }).notNull(),
  summary: text("summary").notNull(),
  occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

const companyResearchTopics = ["product", "team", "culture", "compensation", "interview_process", "contact", "open_question"] as const;
const researchProvenance = ["sourced_fact", "user_note", "inference"] as const;
const researchSourceStates = ["current", "stale", "inaccessible"] as const;

export const companyResearchEntries = sqliteTable("company_research_entries", {
  id: text("id").primaryKey(),
  companyName: text("company_name").notNull(),
  normalizedCompanyName: text("normalized_company_name").notNull(),
  topic: text("topic", { enum: companyResearchTopics }).notNull(),
  content: text("content").notNull(),
  provenance: text("provenance", { enum: researchProvenance }).notNull(),
  sourceUrl: text("source_url"),
  sourceState: text("source_state", { enum: researchSourceStates }),
  accessedAt: integer("accessed_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  index("company_research_name_idx").on(table.normalizedCompanyName),
]);

export const opportunityResearchNotes = sqliteTable("opportunity_research_notes", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().unique().references(() => jobs.id, { onDelete: "cascade" }),
  content: text("content").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

const resumeTemplates = ["classic", "modern", "compact", "minimal"] as const;
const resumeDecisionStates = ["pending", "accepted", "rejected"] as const;

export const baseResumes = sqliteTable("base_resumes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  candidateName: text("candidate_name").notNull().default(""),
  candidateEmail: text("candidate_email").notNull().default(""),
  candidatePhone: text("candidate_phone").notNull().default(""),
  candidateLocation: text("candidate_location").notNull().default(""),
  candidateWebsite: text("candidate_website").notNull().default(""),
  roleFamily: text("role_family").notNull(),
  positioning: text("positioning").notNull().default(""),
  summary: text("summary").notNull().default(""),
  template: text("template", { enum: resumeTemplates }).notNull().default("classic"),
  experienceIds: text("experience_ids", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  achievementIds: text("achievement_ids", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  skillIds: text("skill_ids", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  profileItemIds: text("profile_item_ids", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  sectionOrder: text("section_order", { mode: "json" }).$type<string[]>().notNull().default(sql`'["summary","experience","projects","skills","education"]'`),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export type ResumeSnapshot = {
  name: string;
  candidate?: {
    name: string;
    email: string;
    phone: string;
    location: string;
    website: string;
  };
  roleFamily: string;
  template: typeof resumeTemplates[number];
  job: { id: string; title: string; company: string };
  summary: string;
  experiences: Array<{
    id: string;
    company: string;
    title: string;
    location: string | null;
    startDate: string;
    endDate: string | null;
    bullets: Array<{ id: string; text: string; evidenceIds: string[] }>;
  }>;
  skills: string[];
  profileItems: Array<{ id: string; kind: string; title: string; organization: string | null; description: string }>;
  sectionOrder: string[];
};

export const tailoredResumes = sqliteTable("tailored_resumes", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "restrict" }),
  baseResumeId: text("base_resume_id").notNull().references(() => baseResumes.id, { onDelete: "restrict" }),
  version: integer("version").notNull(),
  template: text("template", { enum: resumeTemplates }).notNull(),
  candidateName: text("candidate_name").notNull().default(""),
  candidateEmail: text("candidate_email").notNull().default(""),
  candidatePhone: text("candidate_phone").notNull().default(""),
  candidateLocation: text("candidate_location").notNull().default(""),
  candidateWebsite: text("candidate_website").notNull().default(""),
  status: text("status", { enum: ["draft", "submitted"] }).notNull().default("draft"),
  summaryOriginal: text("summary_original").notNull().default(""),
  summaryProposed: text("summary_proposed").notNull(),
  summaryReason: text("summary_reason").notNull(),
  summaryRequirement: text("summary_requirement").notNull(),
  summaryEvidenceIds: text("summary_evidence_ids", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  summaryConfidence: text("summary_confidence", { enum: ["low", "medium", "high"] }).notNull(),
  summaryRisk: text("summary_risk", { enum: ["low", "medium", "high"] }).notNull(),
  summaryDecision: text("summary_decision", { enum: resumeDecisionStates }).notNull().default("pending"),
  summaryLocked: integer("summary_locked", { mode: "boolean" }).notNull().default(false),
  sectionOrder: text("section_order", { mode: "json" }).$type<string[]>().notNull(),
  snapshot: text("snapshot", { mode: "json" }).$type<ResumeSnapshot>(),
  submittedAt: integer("submitted_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  uniqueIndex("tailored_resume_job_version_unique").on(table.jobId, table.version),
]);

export const resumeBulletEdits = sqliteTable("resume_bullet_edits", {
  id: text("id").primaryKey(),
  tailoredResumeId: text("tailored_resume_id").notNull().references(() => tailoredResumes.id, { onDelete: "cascade" }),
  experienceId: text("experience_id").notNull().references(() => careerExperiences.id, { onDelete: "restrict" }),
  achievementId: text("achievement_id").notNull().references(() => careerAchievements.id, { onDelete: "restrict" }),
  originalText: text("original_text").notNull(),
  proposedText: text("proposed_text").notNull(),
  reason: text("reason").notNull(),
  requirementAddressed: text("requirement_addressed").notNull(),
  evidenceIds: text("evidence_ids", { mode: "json" }).$type<string[]>().notNull(),
  confidence: text("confidence", { enum: ["low", "medium", "high"] }).notNull(),
  risk: text("risk", { enum: ["low", "medium", "high"] }).notNull(),
  decision: text("decision", { enum: resumeDecisionStates }).notNull().default("pending"),
  locked: integer("locked", { mode: "boolean" }).notNull().default(false),
  position: integer("position").notNull(),
  regeneration: integer("regeneration").notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const resumeSectionLocks = sqliteTable("resume_section_locks", {
  id: text("id").primaryKey(),
  tailoredResumeId: text("tailored_resume_id").notNull().references(() => tailoredResumes.id, { onDelete: "cascade" }),
  section: text("section").notNull(),
  locked: integer("locked", { mode: "boolean" }).notNull().default(false),
}, (table) => [
  uniqueIndex("resume_section_lock_unique").on(table.tailoredResumeId, table.section),
]);

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  action: text("action", { enum: [
    "workspace.restored",
    "resume_import.created",
    "resume_import.retried",
    "resume_import.proposal_added",
    "resume_import.edited",
    "resume_import.approved",
    "resume_import.rejected",
    "resume_import.deleted",
    "notifications.updated",
    "analytics.annotated",
    "experiment.created",
    "experiment.updated",
    "experiment.running",
    "experiment.completed",
    "experiment.cancelled",
    "weekly_review.created",
    "weekly_review.updated",
    "weekly_review.completed",
    "job.captured",
    "job.metadata_updated",
    "search_strategy.saved",
    "career_experience.created",
    "career_experience.updated",
    "career_achievement.created",
    "career_achievement.updated",
    "career_skill.created",
    "career_skill.updated",
    "career_profile_item.created",
    "career_profile_item.updated",
    "career_story.created",
    "career_story.updated",
    "career_answer.created",
    "career_answer.updated",
    "career_voice.created",
    "career_voice.updated",
    "career_evidence.state_changed",
    "fit_analysis.created",
    "fit_analysis.overridden",
    "company_research.created",
    "company_research.source_state_changed",
    "opportunity_research.updated",
    "base_resume.created",
    "tailored_resume.created",
    "resume_edit.reviewed",
    "resume_summary.reviewed",
    "resume_summary.regenerated",
    "resume_edit.regenerated",
    "resume.submitted",
    "resume_identity.updated",
    "application.updated",
    "application.submitted",
  ] }).notNull(),
  entityType: text("entity_type", { enum: [
    "workspace",
    "notification_preferences",
    "experiment",
    "weekly_review",
    "job",
    "search_strategy",
    "career_experience",
    "career_achievement",
    "career_skill",
    "career_profile_item",
    "career_story",
    "career_answer",
    "career_voice",
    "fit_analysis",
    "company_research",
    "opportunity_research",
    "base_resume",
    "tailored_resume",
    "resume_edit",
    "application",
    "application_submission",
  ] }).notNull(),
  entityId: text("entity_id").notNull(),
  occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
});

export const searchStrategyVersions = sqliteTable("search_strategy_versions", {
  id: text("id").primaryKey(),
  version: integer("version").notNull().unique(),
  primaryTitle: text("primary_title").notNull(),
  adjacentTitles: text("adjacent_titles", { mode: "json" }).$type<string[]>().notNull(),
  seniorityLevels: text("seniority_levels", { mode: "json" }).$type<string[]>().notNull(),
  preferredIndustries: text("preferred_industries", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  excludedIndustries: text("excluded_industries", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  companyStages: text("company_stages", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  companySizes: text("company_sizes", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  workArrangements: text("work_arrangements", { mode: "json" }).$type<string[]>().notNull(),
  locations: text("locations", { mode: "json" }).$type<string[]>().notNull(),
  relocationPreference: text("relocation_preference").notNull().default("Not specified"),
  timeZoneConstraints: text("time_zone_constraints").notNull().default(""),
  workAuthorization: text("work_authorization").notNull(),
  sponsorshipRequired: integer("sponsorship_required", { mode: "boolean" }).notNull(),
  minimumCompensation: integer("minimum_compensation").notNull(),
  targetCompensation: integer("target_compensation").notNull(),
  currency: text("currency").notNull(),
  compensationFlexible: integer("compensation_flexible", { mode: "boolean" }).notNull().default(false),
  hardBlockers: text("hard_blockers", { mode: "json" }).$type<string[]>().notNull(),
  softPreferences: text("soft_preferences", { mode: "json" }).$type<string[]>().notNull(),
  weeklyHours: integer("weekly_hours").notNull(),
  searchPace: text("search_pace", { enum: ["quality", "balanced", "volume"] }).notNull().default("balanced"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const fitAnalyses = sqliteTable("fit_analyses", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  searchStrategyVersionId: text("search_strategy_version_id").references(() => searchStrategyVersions.id, { onDelete: "set null" }),
  version: integer("version").notNull(),
  score: integer("score").notNull(),
  recommendation: text("recommendation", { enum: ["apply_now", "research_first", "seek_referral_first", "stretch", "monitor", "skip"] }).notNull(),
  dimensions: text("dimensions", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  gaps: text("gaps", { mode: "json" }).$type<Record<string, unknown>[]>().notNull().default(sql`'[]'`),
  reasonsFor: text("reasons_for", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  reasonsAgainst: text("reasons_against", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  weights: text("weights", { mode: "json" }).$type<Record<string, number>>().notNull(),
  evidenceIds: text("evidence_ids", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  overriddenRecommendation: text("overridden_recommendation", { enum: ["apply_now", "research_first", "seek_referral_first", "stretch", "monitor", "skip"] }),
  overrideReason: text("override_reason"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  uniqueIndex("fit_analysis_job_version_unique").on(table.jobId, table.version),
]);

const evidenceSourceTypes = ["user_entered", "imported", "ai_extracted"] as const;
const evidenceStates = ["needs_clarification", "verified", "archived", "prohibited"] as const;

export const careerExperiences = sqliteTable("career_experiences", {
  id: text("id").primaryKey(),
  company: text("company").notNull(),
  title: text("title").notNull(),
  location: text("location"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
  summary: text("summary"),
  responsibilities: text("responsibilities", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  technologies: text("technologies", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  sourceType: text("source_type", { enum: evidenceSourceTypes }).notNull().default("user_entered"),
  sourceLabel: text("source_label"),
  verificationState: text("verification_state", { enum: evidenceStates }).notNull().default("needs_clarification"),
  locked: integer("locked", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const careerAchievements = sqliteTable("career_achievements", {
  id: text("id").primaryKey(),
  experienceId: text("experience_id").notNull().references(() => careerExperiences.id, { onDelete: "restrict" }),
  problem: text("problem").notNull(),
  action: text("action").notNull(),
  result: text("result").notNull(),
  measurableOutcome: text("measurable_outcome"),
  tools: text("tools", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  roleFamilies: text("role_families", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  sourceType: text("source_type", { enum: evidenceSourceTypes }).notNull().default("user_entered"),
  sourceLabel: text("source_label"),
  verificationState: text("verification_state", { enum: evidenceStates }).notNull().default("needs_clarification"),
  locked: integer("locked", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const careerSkills = sqliteTable("career_skills", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  context: text("context"),
  recency: text("recency", { enum: ["current", "recent", "past"] }).notNull(),
  proficiency: text("proficiency", { enum: ["learning", "working", "advanced", "expert"] }).notNull(),
  supportingAchievementId: text("supporting_achievement_id").references(() => careerAchievements.id, { onDelete: "set null" }),
  sourceType: text("source_type", { enum: evidenceSourceTypes }).notNull().default("user_entered"),
  sourceLabel: text("source_label"),
  verificationState: text("verification_state", { enum: evidenceStates }).notNull().default("needs_clarification"),
  locked: integer("locked", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  uniqueIndex("career_skill_normalized_name_unique").on(table.normalizedName),
]);

export const careerProfileItems = sqliteTable("career_profile_items", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["project", "education", "certification", "award", "publication", "link"] }).notNull(),
  title: text("title").notNull(),
  organization: text("organization"),
  description: text("description").notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  url: text("url"),
  credentialId: text("credential_id"),
  technologies: text("technologies", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  sourceType: text("source_type", { enum: evidenceSourceTypes }).notNull().default("user_entered"),
  sourceLabel: text("source_label"),
  verificationState: text("verification_state", { enum: evidenceStates }).notNull().default("needs_clarification"),
  locked: integer("locked", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const careerStories = sqliteTable("career_stories", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  situation: text("situation").notNull(),
  task: text("task").notNull(),
  action: text("action").notNull(),
  result: text("result").notNull(),
  reflection: text("reflection").notNull(),
  roleFamilies: text("role_families", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  prompts: text("prompts", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  supportingAchievementId: text("supporting_achievement_id").references(() => careerAchievements.id, { onDelete: "set null" }),
  sourceType: text("source_type", { enum: evidenceSourceTypes }).notNull().default("user_entered"),
  sourceLabel: text("source_label"),
  verificationState: text("verification_state", { enum: evidenceStates }).notNull().default("needs_clarification"),
  locked: integer("locked", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const careerAnswers = sqliteTable("career_answers", {
  id: text("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  contexts: text("contexts", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  supportingAchievementId: text("supporting_achievement_id").references(() => careerAchievements.id, { onDelete: "set null" }),
  sourceType: text("source_type", { enum: evidenceSourceTypes }).notNull().default("user_entered"),
  sourceLabel: text("source_label"),
  verificationState: text("verification_state", { enum: evidenceStates }).notNull().default("needs_clarification"),
  locked: integer("locked", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const careerVoiceProfiles = sqliteTable("career_voice_profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tone: text("tone").notNull(),
  principles: text("principles", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  avoid: text("avoid", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  sample: text("sample"),
  sourceType: text("source_type", { enum: evidenceSourceTypes }).notNull().default("user_entered"),
  sourceLabel: text("source_label"),
  verificationState: text("verification_state", { enum: evidenceStates }).notNull().default("needs_clarification"),
  locked: integer("locked", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const notificationPreferences = sqliteTable("notification_preferences", {
  id: text("id").primaryKey(),
  settings: text("settings", { mode: "json" }).$type<import("@/lib/notifications/preferences").NotificationPreferences>().notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const weeklyReviews = sqliteTable("weekly_reviews", {
  id: text("id").primaryKey(),
  weekStart: text("week_start").notNull().unique(),
  snapshot: text("snapshot", { mode: "json" }).$type<import("@/lib/weekly-review/model").WeeklySnapshot>().notNull(),
  edits: text("edits", { mode: "json" }).$type<import("@/lib/weekly-review/storage").ReviewEdits>().notNull(),
  revision: integer("revision").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const analyticsAnnotations = sqliteTable("analytics_annotations", {
  jobId: text("job_id").primaryKey().references(() => jobs.id, { onDelete: "cascade" }),
  valuesJson: text("values_json").notNull(),
  revision: integer("revision").notNull().default(1),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const analyticsExperiments = sqliteTable("analytics_experiments", {
  id: text("id").primaryKey(),
  plan: text("plan").notNull(),
  status: text("status", { enum: ["planned", "running", "completed", "cancelled"] }).notNull().default("planned"),
  notes: text("notes").notNull().default(""),
  result: text("result"),
  revision: integer("revision").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const resumeImports = sqliteTable("resume_imports", {
  id: text("id").primaryKey(),
  fingerprint: text("fingerprint").notNull().unique(),
  name: text("name").notNull(),
  format: text("format", { enum: ["pdf", "docx", "text"] }).notNull(),
  sourceText: text("source_text").notNull(),
  warning: text("warning").notNull().default(""),
  extractorVersion: text("extractor_version").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const resumeImportProposals = sqliteTable("resume_import_proposals", {
  id: text("id").primaryKey(),
  importId: text("import_id").notNull().references(() => resumeImports.id, { onDelete: "cascade" }),
  sourceKey: text("source_key").notNull(),
  kind: text("kind", { enum: ["experience", "achievement", "skill", "education", "project"] }).notNull(),
  sourceQuote: text("source_quote").notNull(),
  fields: text("fields", { mode: "json" }).$type<Record<string, string>>().notNull(),
  state: text("state", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  evidenceId: text("evidence_id"),
  revision: integer("revision").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [uniqueIndex("resume_import_proposal_source_unique").on(table.importId, table.sourceKey)]);
