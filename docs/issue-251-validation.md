# ISSUE-251 validation

The weekly review workflow is implemented at `/reviews`, with saved review pages at `/reviews/[id]`.

## Checks

- `bun run test`: 89 domain tests and 12 SQLite tests pass, including 11 new weekly-review cases. Week/year boundaries, literal source snapshots, custom stages, deduplication, attendance uncertainty, missed due dates, capacity, incomplete reviews, idempotent creation, stale revisions, backup restore, immutability, and audit rollback are covered.
- `bun run lint` and `bunx tsc --noEmit` pass.
- `DATABASE_FILE=issue251-check-20260908.db bun run build --webpack` passes. Uses the known working build path from ISSUE-252.
- Isolated Chromium checks cover create, edit, complete, reload, history, capacity feedback, retained validation input, repeated reopen, notes search, audit records, and two competing browser tabs. Mobile history and detail pages have no horizontal overflow at 375px.
- Calendar open/Escape and rejected invalid/unfinished weeks are verified, including a reduced-motion browser context.

## Interface and motion review

Reviewed using the frontend-design, Emil design-engineering, React best-practices, and animation-review guidance. The screen reuses the application theme, Geist typography, shadcn primitives, and Tailwind utilities. No custom motion was introduced for review navigation, expanding source lists, editing, or save feedback.

| Before | After | Why |
| --- | --- | --- |
| No weekly review surface | Facts, captured current risks, interpretations, and editable plans occupy separate sections | Recorded data stays distinguishable from proposed explanations and actions. |
| No review conflict handling | A stale revision returns an inline error and retains unsaved text | Prevents silent overwrites without blocking normal editing. |
| Existing date-picker interaction | Reused with its accessible label, keyboard dismissal, and reduced-motion rendering checked | No additional animation delays were added to weekly work. |

Motion verdict: **Approve** for this change; no new motion regressions found.

## Deliberate boundaries

Weeks must be complete before the first snapshot is created. Subsequent source corrections belong in reflections; they do not rewrite saved facts. Current risks are labelled as captured at review creation, not reconstructed at week end. Source links open live records and may become unavailable after deletion or restore. Contact logs cannot distinguish first outbound contact from follow-ups. Experiment ideas are editable proposals, not controlled experiment records or causal conclusions. Plans remain private notes and do not automatically schedule tasks or send messages.
