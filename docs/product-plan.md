# Headhunter Product Plan

**Status:** Living product specification
**Owner:** Kash
**Last updated:** 2026-09-07
**Rezee project:** Headhunter (`8f0c0524-fc24-4fdf-a3e4-ecd5b9c01dc4`)
**Rezee document:** DOC-18

## Purpose

This is the canonical product reference for Headhunter. Use it to decide what belongs in the product, how features should behave, and what to build next. When implementation and this document disagree, make the decision explicit and update this document.

Headhunter is a private, personal job-search operating system. It helps one job seeker find worthwhile roles, create strong and truthful applications, keep opportunities moving, prepare for interviews, and learn which actions produce interviews and offers.

Its core loop is:

```text
Build verified career evidence
  -> capture jobs
  -> evaluate and prioritize
  -> prepare a tailored application
  -> apply and follow up
  -> prepare and interview
  -> record outcomes
  -> learn what works
```

## Product assumptions

The first version serves one primary user. It does not need recruiter, agency, or team workflows. Target roles, locations, compensation, work authorization, preferred companies, and application volume must be captured during onboarding rather than assumed.

The product may help with every stage of a search, but consequential external actions always remain under user control.

## Goals

- Direct limited time toward roles with the best fit, desirability, urgency, and access.
- Reduce the time needed to understand a role and prepare a good application.
- Generate tailored material using only approved personal evidence.
- Make the next action for every active opportunity obvious.
- Preserve exactly what was submitted and what the job description said at the time.
- Prevent missed follow-ups, deadlines, and interview tasks.
- Learn from real results and recommend focused improvements.
- Improve qualified interviews and offers, not raw application count.

## Initial non-goals

- Fully autonomous job applications or unsupervised external messages.
- High-volume “easy apply” automation.
- A recruiter-facing or multi-user applicant-tracking system.
- Scraping every job board or promising complete job discovery.
- Guaranteeing ATS ranking, interviews, compensation, or offers.
- Inventing skills, dates, employers, responsibilities, metrics, or relationships.
- Replacing professional legal, immigration, or compensation advice.
- Building a broad professional network or general CRM.

## Product principles

### Truth before polish

AI may select, organize, shorten, and reframe verified information. It may not create unsupported claims. Missing evidence must be visible, not filled with plausible fiction.

### Human approval at consequential boundaries

Creating a private draft is different from representing the user. Finalizing an external document, submitting an application, sending a message, or changing a verified fact requires approval.

### Explain important recommendations

Fit scores, priorities, warnings, and edits must expose their reasoning, evidence, uncertainty, and relevant job requirement. The user can correct or override them.

### Capture once, reuse safely

Career history, achievements, stories, preferences, and common answers should be structured once. Reuse must still respect the current job and context.

### Preserve history

Submitted documents, answers, job descriptions, and stage changes are historical records. Later edits create new versions and never rewrite what happened.

### Optimize outcomes, not activity

The dashboard emphasizes decisions, next actions, conversion quality, and learning. It must not encourage low-quality volume through vanity metrics.

### Earn automation

Begin with assistance and review. Automate only after the workflow is trustworthy and actions remain observable, reversible where possible, and user-approved where external.

### Private by default

Resumes, compensation, authorization, contacts, messages, and interview notes are sensitive. Storage, integrations, logs, and exports must reflect that.

## Success measures

The north-star measure is **qualified interview opportunities per unit of focused job-search effort**.

Supporting measures include:

- Application-to-response, recruiter-screen, interview, final-round, and offer conversion.
- Time from posting to application and time spent in each pipeline stage.
- Preparation time per application.
- Missed deadline and follow-up rate.
- Conversion by role, source, seniority, company type, referral, resume strategy, fit band, location, and application timing.
- Percentage of active opportunities with a clear next action.
- Percentage of external AI claims linked to verified evidence.
- Percentage of submissions with complete immutable snapshots.

Insights must show sample sizes and label weak signals. The product should not make causal claims from ordinary correlations.

## Core workflows

### First run

1. Define target roles, locations, work arrangement, compensation, company preferences, and constraints.
2. Import existing resumes and enter professional links.
3. Review extracted facts and build the verified evidence bank.
4. Create one or more base resume profiles.
5. Add a real job, evaluate it, and create the first tailored application.

Onboarding is progressive: the user should get value without completing a perfect profile.

### Daily loop

1. Review recommended actions and new jobs.
2. Qualify promising roles.
3. Apply, research, seek a referral, defer, or skip.
4. Prepare and approve application material.
5. Record submission and schedule the next action.
6. Handle responses, follow-ups, and interviews.

### Weekly loop

1. Review pipeline health and stalled opportunities.
2. Examine outcome signals by source, role, and strategy.
3. Repair weak or missing evidence.
4. Select one or two experiments.
5. Set a realistic plan based on available time.

## Feature specification

### 1. Search strategy and onboarding

Capture what makes a job viable and desirable:

- Target titles and role families, with priority and adjacent roles.
- Desired seniority and acceptable neighboring levels.
- Preferred and excluded industries, company stages, and sizes.
- Locations, remote/hybrid/on-site preferences, relocation, and time-zone limits.
- Work authorization and sponsorship needs.
- Compensation target, minimum, currency, and flexibility.
- Hard blockers separately from soft preferences.
- Weekly time budget and desired quality/volume balance.

Strategy changes should be versioned so later analytics can explain which rules were active. Every ranking must identify the strategy inputs that influenced it.

### 2. Career profile and evidence bank

This is the source of truth for resumes, answers, outreach, matching, and interview stories.

Store:

- Employment history, responsibilities, dates, and technologies.
- Projects, education, certifications, awards, publications, and links.
- Skills with context, recency, proficiency, and supporting evidence.
- Achievements as problem/context, personal action, tools, measurable result, source, and relevant role families.
- Interview stories using situation, task, action, result, and reflection.
- Reusable screening answers and an approved writing-voice profile.

Each fact records its source and state: imported, AI-extracted, user-entered, verified, needs clarification, archived, or prohibited from external use. The user can approve, edit, reject, archive, and lock individual facts.

The system must flag conflicting dates, duplicates, stale claims, and unsupported metrics. Every externally usable generated claim must link to evidence. Updating evidence never changes past submissions.

### 3. Job inbox and capture

Support adding a job by URL, pasted description, or manual entry. Browser sharing, email alerts, and selected job-board imports come later.

Extract and allow correction of:

- Company, title, location, employment type, and work arrangement.
- Compensation, seniority, posting date, deadline, and source.
- Responsibilities, required and preferred qualifications, skills, and technologies.
- Authorization, clearance, education, or experience requirements.
- Recruiter details and potential red flags.

Preserve the original description, URL, capture time, and extraction confidence. Detect duplicates using URL, company/title, and description similarity, but never destroy or merge records automatically. Pasted descriptions must work even when a URL cannot be fetched.

### 4. Explainable fit and prioritization

Fit is a decision aid, not a fake ATS prediction. Analyze separate dimensions:

- Core and preferred qualification match.
- Relevant experience and demonstrated skills.
- Seniority, responsibility, and domain alignment.
- Location, work arrangement, authorization, and compensation.
- Personal preferences and company desirability.
- Posting freshness and urgency.
- Referral or network access.
- Estimated effort to prepare a strong application.

Classify gaps as hard blockers, material gaps, addressable positioning gaps, transferable experience, evidence missing from the resume, optional gaps, or unknowns.

Recommend: **apply now**, **research first**, **seek referral first**, **stretch opportunity**, **monitor/defer**, or **skip**. Show reasons for and against the recommendation. Users can change weights, supply missing evidence, and override conclusions. Re-analysis is versioned.

### 5. Opportunity and company research

Store reusable company information separately from application-specific notes:

- Product, business model, customers, market, and company stage.
- Role and team context.
- Relevant recent developments.
- Culture, compensation, and interview-process notes.
- Contacts, unanswered questions, source URLs, access dates, and confidence.

AI summaries distinguish sourced facts, user notes, and inference. Stale or inaccessible sources remain visible.

### 6. Curated resume studio

Maintain structured base resumes for different role families or positioning strategies. For a selected job, the system can:

- Choose the most relevant experience, projects, skills, and achievements.
- Draft a role-specific summary.
- Rewrite bullets for clarity, specificity, relevance, and outcomes.
- Identify weak, repeated, missing, or unsupported content.
- Add supported job terminology without keyword stuffing.
- Control section order, length, density, and template.
- Validate selectable text, conventional headings, and readable parsing order.

Template selection for MVP is a lightweight picker: a small fixed set of predesigned templates (e.g. Classic, Modern, Compact, Minimal) applied to a resume, no user-created or editable templates. A browsable, extensible template library (import/define custom templates) is deferred until the fixed set proves insufficient.

Every AI edit shows original text, proposed text, reason, requirement addressed, evidence, confidence, and risk. Users can accept, reject, edit, regenerate, and lock at bullet or section level. Rejected edits should not silently return.

Provide a faithful preview and PDF export; add DOCX after formatting fidelity is proven. Documents are versioned, and the version submitted to an employer becomes immutable and remains linked to the application.

### 7. Application workspace

Each pursued job has one working surface containing:

- Job snapshot, fit analysis, priority, research, contacts, tasks, notes, and timeline.
- Tailored resume, cover letter, portfolio selection, and attachments.
- “Why this role?”, “Why this company?”, summary, salary, authorization, and screening answers.
- Recruiter outreach, referral request, and follow-up drafts.
- A pre-submission checklist showing incomplete or inconsistent items.

Maintain a reusable answer library with approved source text, applicable contexts, evidence, length variants, sensitive-data warnings, and last use. Job-specific edits must not overwrite the canonical answer.

On submission, record method, source, time, referral, confirmation identifier, and immutable snapshots of the job, documents, and answers. Manual submission is sufficient for the MVP.

### 8. Pipeline and application tracking

Default stages:

```text
Inbox -> Researching -> Preparing -> Ready to apply -> Applied
      -> Recruiter screen -> Interviewing -> Offer -> Accepted
```

Alternate or terminal states are `Skipped`, `Rejected`, `Withdrawn`, `Ghosted`, and `Archived`. Custom stages remain mapped to standard categories for analytics.

Provide kanban, table, timeline, upcoming-action, and archive views. Track source, priority, interest, stage history, application date, materials, contacts, referral, last interaction, next action, interview rounds, compensation, outcome reason, tasks, and attachments.

Every stage change is timestamped. Moving to Applied requires submission details and snapshots, or an explicit waiver. Every active application has a next action or is deliberately marked waiting.

### 9. Contacts, referrals, and follow-up

Provide lightweight relationship management rather than a general CRM:

- Contacts linked to companies and opportunities.
- Relationship context and strength without exaggeration.
- Interaction history and referral status.
- Follow-up reminders based on stage, time, and promised actions.
- Editable referral requests, outreach, thank-you notes, and follow-ups in the user's voice.
- Warnings against over-contacting and suggestions that stop in incompatible terminal states.

Email and calendar integrations are later additions with least-privilege permissions and visible sync health. No message is sent without review and confirmation.

### 10. Interview preparation and debrief

For each interview process:

- Record rounds, type, time, interviewers, objectives, and commitments.
- Build a role/company briefing specific to the current round.
- Generate likely behavioral, role-specific, and technical questions with uncertainty labels.
- Match questions to verified evidence and stories, and expose missing answers.
- Create a focused study plan and questions for each interviewer type.
- Produce a concise pre-interview cheat sheet.
- Support mock sessions, notes or transcripts, self-review, and structured feedback.
- Prompt for a post-round debrief, thank-you, stage update, and next action.

Speculative practice content and private debrief notes never become verified career facts or external content without approval.

### 11. Command center

The home screen answers:

- What is the most valuable thing to do today?
- Which applications need action?
- What is upcoming or at risk?
- Is the search improving?

Show a ranked daily action list, promising new roles, deadlines, interviews, stalled applications, weekly goals, recent stage changes, pipeline summary, and data-quality warnings. Recommendations consider urgency, expected value, available time, and effort—not only fit.

Every alert is actionable, dismissible, or snoozable and links to its source. Empty states explain the next useful setup action. With little outcome data, emphasize workflow rather than fabricated insight.

### 12. Analytics and improvement engine

Calculate the funnel from recorded stage events. Segment it by role family, seniority, industry, company size, source, referral, resume strategy, fit dimensions, location, compensation, posting age, preparation effort, and application timing.

Show count, rate, sample size, and time window together. Label correlations and uncertainty. Let the user inspect the underlying applications.

Support controlled experiments containing a hypothesis, one main changed variable, target segment, start/end dates, and success measure. Examples include applying earlier, seeking referrals first, or using a different resume position. Do not recommend many simultaneous changes.

### 13. Weekly review

Create an editable weekly snapshot containing:

- Captures, applications, follow-ups, responses, interviews, and outcomes.
- New, progressed, stalled, and closed opportunities.
- Missed actions and pipeline risks.
- Strong and weak signals with sample-size caveats.
- Data-quality gaps.
- One or two proposed experiments.
- A realistic next-week action plan.

Facts, interpretations, and recommendations must be visibly distinct. A review should take roughly ten minutes and remain available historically.

### 14. Search, notifications, and auditability

- Global search across jobs, companies, contacts, documents, notes, and answers.
- Configurable in-app notifications; email or push delivery later.
- Controls by event type, quiet hours, and urgency.
- Factual-source viewer for generated content.
- Audit log for generation, approvals, submission, external sends, and stage changes.
- Clear retry and partial-failure states for imports, exports, integrations, and AI.

## Core screens

1. **Command center** — daily priorities, risks, deadlines, and funnel summary.
2. **Job inbox** — newly captured and unqualified jobs.
3. **Opportunity explorer** — search, comparison, filters, and prioritization.
4. **Opportunity workspace** — complete context and actions for one role.
5. **Pipeline** — kanban/table tracking and upcoming actions.
6. **Resume studio** — base profiles, tailoring, review, versioning, and export.
7. **Career profile** — history, evidence, skills, stories, and verification.
8. **Contacts** — relationships, referrals, interactions, and reminders.
9. **Interview room** — preparation, rounds, mock sessions, and debriefs.
10. **Insights** — funnel, segments, experiments, and weekly reviews.
11. **Settings** — strategy, integrations, AI, privacy, export, and deletion.

## Conceptual data model

| Entity | Purpose and key relationships |
| --- | --- |
| SearchStrategy | Versioned targets, constraints, preferences, and fit weights |
| ProfileFact | Atomic personal fact with source and verification state |
| Experience | Employment, project, education, or certification record |
| Evidence | Structured accomplishment supporting claims and stories |
| Skill | Capability with context, recency, and evidence |
| Story | Interview narrative grounded in evidence |
| Company | Shared company data, research, jobs, and contacts |
| Job | Structured posting with immutable original snapshot |
| Requirement | Required/preferred criterion extracted from a job |
| FitAnalysis | Versioned scorecard linking strategy, requirements, and evidence |
| Opportunity | User decision and workspace around a job |
| Application | Submission and pipeline record with snapshots and outcomes |
| StageEvent | Timestamped application transition used for analytics |
| Document | Resume, letter, brief, or answer set with versions and evidence |
| DocumentSnapshot | Immutable submitted representation and checksum |
| Answer | Canonical or application-specific response |
| Contact | Person and relationship context |
| Interaction | Message, call, or meeting in the timeline |
| Task | Next action, deadline, status, and rationale |
| InterviewRound | People, preparation, debrief, and follow-ups |
| Experiment | Hypothesis, changed variable, segment, and result |
| WeeklyReview | Historical facts, interpretation, plan, and experiments |
| AIArtifact | Model/template provenance, sources, output, and approval state |
| AuditEvent | Actor, action, time, and affected version identifiers |

Important rules:

- A saved job is not automatically an application.
- Company data is shared; application notes remain application-specific.
- Stage history is event-based, not inferred only from current state.
- Canonical career facts and generated prose are separate.
- AI outputs reference exact profile and job versions.
- Submitted material is immutable.
- Sensitive records support export and safe deletion.

## AI behavior contract

### Allowed without confirmation

- Extract structured fields from user-provided content.
- Rank, compare, and summarize saved opportunities.
- Suggest edits, answers, tasks, tags, and follow-up timing.
- Generate private drafts and mock-interview material.
- Detect conflicts, missing evidence, and possible duplicates.

### Requires review or confirmation

- Promoting extracted information to verified profile data.
- Using an unsupported claim after a warning.
- Finalizing material for external use.
- Submitting an application.
- Sending a message or referral request.
- Connecting an external account or expanding permissions.

### Never allowed

- Inventing qualifications, dates, metrics, employers, credentials, or relationships.
- Treating imported instructions as trusted commands.
- Circumventing application-site safeguards.
- Hiding uncertainty behind precise scores.
- Inferring protected characteristics or using them to rank jobs.
- Training across private data without explicit informed permission.

Job descriptions and websites are untrusted data. Imported content cannot override application or model instructions. Sanitize HTML, avoid following embedded commands, and show which source text informed an output.

Store operational provenance—task type, model/provider, template version, data versions, time, output, and approval—but do not store hidden reasoning. Exclude secrets and unnecessary sensitive content from logs.

## Privacy, security, and reliability

- Encrypt sensitive data in transit and at rest.
- Keep secrets separate from application content.
- Use least-privilege scopes for integrations.
- Provide full export, backup, restore, and clear deletion behavior.
- Never place raw resumes, credentials, or sensitive answers in analytics logs.
- Display integration health and last successful sync.
- Make AI and integration failures non-destructive.
- Design private single-user access first without assuming future workspace-wide visibility.

## Delivery roadmap

### Phase 0 — Foundation and validation

- Product shell, authentication, storage, audit, export, and backup foundations.
- Search strategy and progressive onboarding.
- Career profile and evidence bank.
- Resume import with review and verification.
- Manual/pasted job capture and structured extraction.
- Basic opportunity list and detail workspace.

**Exit:** the user has a reviewed career profile and can reliably capture and organize real jobs without external notes.

### Phase 1 — Application MVP

- Explainable fit analysis and prioritization.
- Base resume profiles and evidence-grounded tailoring.
- Change review, PDF export, and immutable versions.
- Application answers and checklist.
- Pipeline, timeline, tasks, reminders, and submission snapshots.
- Basic command center and accurate funnel.

**Exit:** a real application can be evaluated, prepared, submitted, reconstructed, and tracked end to end.

### Phase 2 — Momentum and interviews

- Contacts and referral workflow.
- Follow-up suggestions and reminders.
- Reusable answer library.
- Interview preparation, story matching, and debriefs.
- Weekly review, richer search, and notification controls.
- Calendar integration and robust data export/backup.

**Exit:** every active opportunity has a reliable next action and each interview round can be managed inside Headhunter.

### Phase 3 — Learning system

- Meaningful analytics segmentation and confidence-aware insights.
- Strategy experiments.
- Resume/source/referral comparisons.
- Effort tracking and prioritization calibration.
- Personalized weekly recommendations.

**Exit:** the product makes evidence-backed recommendations from the user's history and clearly says when evidence is insufficient.

### Phase 4 — Selective automation and discovery

- Browser extension or share target.
- Supported job-feed and email-alert imports.
- Duplicate and expiry monitoring.
- Email integration and approved-send flow.
- Assisted form filling with field-level review.
- More advanced job recommendations.

**Exit:** automation saves meaningful time, exposes its actions, and preserves approval at submission and communication boundaries.

## MVP priority

### Must have

- Search strategy and verified evidence bank.
- Job capture with original description snapshot.
- Explainable fit and prioritization.
- Tailored resume generation, review, PDF, and immutable submitted version.
- Application workspace, pipeline history, next actions, and reminders.
- Command center and basic funnel.
- Private export/backup.

### Should have soon after

- Reusable answers.
- Contacts, referrals, and follow-up drafts.
- Interview preparation and debriefs.
- Weekly review and deeper analytics.
- Calendar integration.

### Defer until validated

- Broad automated discovery.
- Browser extension.
- Email sending and form assistance.
- Audio/video mock interviews.
- Advanced experiments.
- Multi-user or coaching collaboration.
- Browsable/extensible resume template library (custom, user-defined templates).

## Major risks

| Risk | Mitigation |
| --- | --- |
| AI fabricates experience | Verified evidence, claim citations, locks, warnings, and approval gates |
| Fit score creates false confidence | Separate dimensions, visible blockers/unknowns, weights, and overrides |
| Setup becomes exhausting | Resume import, progressive profiling, quick capture, and useful partial states |
| Tracking creates more work | Next-action focus and automatic event capture where safe |
| Insights overfit small samples | Counts, confidence labels, thresholds, and controlled experiments |
| Imports or integrations fail | Source snapshots, sync health, retries, exports, and non-destructive errors |
| Automation encourages spam | Expected-value prioritization and approval boundaries |
| Sensitive data leaks | Private defaults, encryption, least privilege, and redacted logs |
| Sources of truth drift | Canonical structured profile, versioning, and immutable submissions |

## Decisions already made

1. Headhunter is single-user and private-first initially.
2. Qualified outcomes matter more than application volume.
3. The evidence bank is the source of truth for personal claims.
4. AI-generated external material always remains reviewable.
5. Applications and outbound messages are not sent without approval.
6. Fit is explainable and multi-dimensional, not a magic ATS percentage.
7. Submitted artifacts and captured job descriptions are immutable snapshots.
8. Broad discovery and automatic application are later-stage features.
9. This file is the canonical product behavior and scope reference.

## Open questions

1. Which role families and seniority levels should be optimized first?
2. Which countries, job sources, and work-authorization rules matter?
3. What is the weekly time budget and preferred application volume?
4. Should storage be local-first, hosted-private, or hybrid?
5. Which AI providers and cost/latency/privacy constraints are acceptable?
6. Which formats are essential beyond a parser-friendly PDF?
7. Should email and calendar integrations begin read-only?
8. How should preparation effort be measured without burdensome tracking?
9. What historical applications can be imported?
10. What counts as a qualified interview: recruiter screen, hiring-manager screen, or later?

## MVP definition of done

The MVP is complete when the user can:

1. Import and verify career history.
2. Save a job from a URL or pasted content.
3. Understand an explainable fit assessment and decide what to do.
4. Generate, review, and export a truthful tailored resume.
5. Record an application with exact job, document, and answer snapshots.
6. Track it through the major stages with a clear next action.
7. See overdue items, upcoming interviews, and an accurate basic funnel.
8. Export or back up personal data.

Anything not needed to complete that loop belongs after the MVP unless it resolves a verified usability or trust problem.

## Using this plan

For every implementation initiative:

1. Identify the product goal and roadmap phase it supports.
2. Link it to the relevant requirements above.
3. Define a user-visible outcome and acceptance criteria.
4. Check the AI contract, snapshot rules, and privacy boundaries.
5. Decide how success will be observed.
6. Update this plan when a product decision changes.

Technical architecture, database schemas, API contracts, and detailed interface specifications should live in separate documents that link back here.
