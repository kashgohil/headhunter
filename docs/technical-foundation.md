# Headhunter Technical Foundation

**Status:** Accepted for Phase 0/1
**Last updated:** 2026-09-07

This document translates the Phase 0 requirements in the [product plan](./product-plan.md) into the first implementation boundary.

## Current decisions

- **Runtime:** Next.js App Router on the Node.js runtime.
- **Storage:** local-first SQLite with Drizzle migrations. Database access stays behind a server-only data-access layer so a hosted database can replace it later. `DATABASE_FILE` may override the filename inside the private `.data` directory.
- **Access:** single-user local development. Authentication is required before any hosted deployment and every Server Action must gain an authorization check at that boundary.
- **UI:** Tailwind CSS utilities and theme-adapted shadcn/ui components, with Geist Sans and Geist Mono supplied through `next/font`.
- **Motion:** Motion is used only for purposeful state feedback. Frequent navigation remains instant and reduced-motion preferences are respected.
- **Analysis:** job extraction remains provider-backed; fit analysis is currently deterministic and local so every saved result remains traceable to its job, strategy version, evidence references, and weights.

## First vertical slice

The first user-visible loop is:

```text
Import, paste, or enter a job -> validate and preserve its source -> extract structured fields
                              -> flag possible duplicates -> create an Inbox opportunity
                              -> review and correct metadata without rewriting the source
```

### Acceptance criteria

- A job can be captured from a public URL, a pasted description, or minimal manual entry.
- URL imports reject private-network destinations, limit redirects, time, content type, and response size, and retain pasted entry as the fallback.
- Title, company, location, seniority, work arrangement, employment type, compensation, dates, qualifications, skills, and technologies are extracted when available and remain correctable.
- Extraction confidence and source-fetch time remain visible after correction.
- The original description is stored without trimming or rewriting.
- Capturing a job atomically creates its Inbox opportunity and audit event.
- Exact-URL, same-role, and high-similarity duplicate candidates are recorded and shown without automatic merging or deletion.
- The inbox lists captured jobs newest first.
- The detail page visibly distinguishes editable structured metadata from the preserved source.
- Empty, validation, loading, and missing-record states are understandable.
- The application passes lint, tests, type checking, and a production build.

## Second vertical slice

The next user-visible loop is:

```text
Define search strategy -> validate practical constraints -> save immutable version
                       -> expose the active version to future fit analysis
```

### Acceptance criteria

- A strategy captures target and adjacent roles, seniority, industries, company stages and sizes, locations, work arrangements, relocation and time-zone limits, work authorization, sponsorship needs, compensation and flexibility, weekly time budget, and search pace.
- Hard blockers remain distinct from soft preferences.
- Flexible list input is normalized and duplicate entries are removed.
- Compensation and time-budget constraints are validated before persistence.
- Every save creates a new immutable strategy version and matching audit event.
- The latest version is visibly identified and available through the server-only data-access layer.

## Security boundary

The application is not safe to expose publicly yet. Before hosting it, add authentication, authorize every data read and Server Action, define encrypted backup/export behavior, and document secret handling. Raw job descriptions and future resume data must never enter analytics logs.

## Third vertical slice

The career-profile evidence bank supports manually entered, reviewable records across the complete profile taxonomy:

```text
Add experience -> link a structured achievement -> add contextual skills
               -> add projects, education, credentials, awards, publications, and links
               -> prepare interview stories, reusable answers, and writing voice
               -> review, verify, restrict, or lock each item
               -> surface evidence-health warnings
               -> unlock first-resume readiness without requiring full verification
```

### Acceptance criteria

- Experiences preserve role, company, dates, location, scope, structured responsibilities, technologies, and an optional source note.
- Achievements stay linked to an experience and separate problem, personal action, result, measurable outcome, tools, and relevant role families.
- Skills capture context, recency, proficiency, and optional supporting evidence.
- Projects, education, certifications, awards, publications, and professional links retain their relevant organization, dates, URL, credential, description, topics, and source.
- Interview stories preserve situation, task, personal action, result, reflection, useful prompts, role families, and optional supporting achievement.
- Reusable screening answers and writing-voice guidance remain reviewable evidence records rather than automatic outbound content.
- Provenance is stored separately from verification state so an imported fact is never treated as verified by implication.
- Every item starts in review and can be edited, verified, archived, prohibited from external use, and locked individually.
- Locked items reject content and state changes at the data-access boundary until explicitly unlocked.
- One usable experience, one achievement linked to a usable experience, and one usable skill unlock first-resume readiness even when those items still need review.
- Archived and externally prohibited evidence never contributes to readiness.
- Potential duplicate records, conflicting experience dates, stale skills, and metrics without source notes are visible in evidence health.
- Every create, edit, and evidence-state change produces an audit event.

Resume import and AI extraction can populate these same records later without bypassing their review state or provenance.

## Fourth vertical slice

Explainable fit turns a captured job into an inspectable decision aid:

```text
Select a job -> compare structured role data with strategy and career evidence
             -> score independent dimensions and classify gaps
             -> recommend a next move with reasons for and against
             -> reweight into a new version or record a human override
```

### Acceptance criteria

- Qualifications, experience and skills, seniority, location and compensation, preferences, freshness, referral access, and preparation effort remain separate dimensions.
- Unknown dimensions show as unknown and are excluded when the weighted total is normalized; referral access defaults to unknown until contacts exist.
- Gaps distinguish hard blockers, material gaps, addressable positioning, transferable evidence, missing evidence, optional requirements, and unknown data.
- The recommendation supports apply now, research first, seek referral first, stretch, monitor/defer, and skip.
- Each result exposes reasons for and against the recommendation, the exact weights, linked evidence records, the strategy version, and an immutable analysis version.
- Reweighting creates a new analysis version. A human override preserves both the calculated recommendation and the user’s reason.
- The latest effective recommendation and score are visible in the job inbox.
- The analyzer is deterministic and covered independently from persistence and presentation.

## Command center (ISSUE-249)

The home route summarizes recorded application work and links every reminder to its source. Alerts cover deadlines, scheduled interviews, next actions, open tasks, applications with no recorded activity for 14 days, missing next actions, uncertain job extraction, missing milestone history, and roles marked with high priority or interest. Empty states link to search strategy and job capture.

Ranking puts overdue work first, followed by work due within 24 hours, within seven days, and later or undated work. Within those groups, the action type, user priority, and interest determine order. The existing weekly search budget provides capacity context; preparation effort and time spent are not measured in this basic version. Date-only reminders become overdue after their UTC calendar date; interview timestamps retain their exact time and are labelled UTC.

Dismissal and 24-hour snooze preferences persist in SQLite and can be restored. Keys include the source and relevant action/date, so changing a next action or rescheduling an interview creates a fresh reminder. Completed tasks, cancelled/completed rounds, and terminal applications are excluded from active work.

The all-time funnel counts distinct applications with recorded milestone events, mapping custom stages to their standard category. Submission snapshots also establish Applied. Repeated transitions count once; skipped milestones are not inferred, and missing current-stage history produces a data check. Each count expands to its underlying applications. Recent stage changes and captures use a trailing seven-day window. No improvement trend or conversion claim is inferred from these counts.
