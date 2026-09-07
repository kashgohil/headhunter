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
- **AI:** extraction and analysis are outside the first slice. When added, providers sit behind an interface and every artifact records source versions, provenance, confidence, and approval state.

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
