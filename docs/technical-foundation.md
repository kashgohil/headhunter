# Headhunter Technical Foundation

**Status:** Accepted for Phase 0
**Last updated:** 2026-09-07

This document translates the Phase 0 requirements in the [product plan](./product-plan.md) into the first implementation boundary.

## Current decisions

- **Runtime:** Next.js App Router on the Node.js runtime.
- **Storage:** local-first SQLite with Drizzle migrations. Database access stays behind a server-only data-access layer so a hosted database can replace it later. `DATABASE_FILE` may override the filename inside the private `.data` directory.
- **Access:** single-user local development. Authentication is required before any hosted deployment and every Server Action must gain an authorization check at that boundary.
- **UI:** Tailwind CSS utilities and theme-adapted shadcn/ui components, with Inter supplied through `next/font`.
- **Motion:** Motion is used only for purposeful state feedback. Frequent navigation remains instant and reduced-motion preferences are respected.
- **AI:** extraction and analysis are outside the first slice. When added, providers sit behind an interface and every artifact records source versions, provenance, confidence, and approval state.

## First vertical slice

The first user-visible loop is:

```text
Paste a job -> validate it -> store its original text -> create an Inbox opportunity
            -> record an audit event -> view it in the inbox -> open its detail
```

### Acceptance criteria

- A job can be captured with a title, company, and pasted description.
- Location and source URL are optional and correctable before capture.
- The original description is stored without trimming or rewriting.
- Capturing a job atomically creates its Inbox opportunity and audit event.
- The inbox lists captured jobs newest first.
- The detail page visibly distinguishes user-entered metadata from the preserved source.
- Empty, validation, loading, and missing-record states are understandable.
- The application passes lint, tests, type checking, and a production build.

## Security boundary

The application is not safe to expose publicly yet. Before hosting it, add authentication, authorize every data read and Server Action, define encrypted backup/export behavior, and document secret handling. Raw job descriptions and future resume data must never enter analytics logs.
