# ISSUE-250 validation

The remaining analytics and improvement-engine scope is implemented at `/analytics`, with per-application annotations at `/analytics/applications/[id]` and saved experiments at `/analytics/experiments/[id]`.

## Delivered behavior

- All requested dimensions are available: role family, seniority, industry, company size, source, referral, resume strategy, location, compensation, posting age, actual preparation effort, application weekday in UTC, and each fit dimension.
- Segments partition the existing first-application cohort. Counts, rates, sample sizes, windows, uncertainty, and underlying application links remain visible. Missing values have their own group. Repeated stage transitions and custom-stage mappings retain the basic funnel semantics.
- Attribution uses the first submission snapshot when it matches the initial application date. Later submissions never rewrite that attribution. Fit uses the latest analysis recorded at or before applying. Missing original snapshots use explicitly labelled current job metadata, without inventing source/referral history.
- Users can annotate role family, industry, company size, resume strategy, and actual preparation minutes. Zero minutes differs from unknown. These annotations do not mutate submitted material.
- Immutable experiment plans specify a hypothesis, one changed variable, baseline and changed values, an independent target segment, held-constant conditions, inclusive UTC application dates, a success milestone, and a 7–90-day observation period.
- Only one experiment can be running. Results match recorded segment values, exclude applications still in the observation period, and count only outcomes within the same per-application duration. Completion is blocked until the window and full observation period end; completed results are frozen, while execution notes remain editable.
- Annotation/experiment changes use revision checks and transactional audit records. Failed saves retain input. Backups include both new tables. Database triggers protect experiment plans and completed results.

## Checks

- `bun run test`: 94 domain tests and 17 Node/SQLite tests pass. Ten new cases cover segment partitioning, unknown data, custom stages, equal observation horizons, target/date matching, historical submission/fit attribution, plan validation, single-running enforcement, stale revisions, premature completion, snapshot immutability, audit rollback, annotations, and backup restoration.
- `bun run lint` and `bunx tsc --noEmit` pass.
- `DATABASE_FILE=issue250-check-20260908.db bun run build --webpack` passes.
- Isolated Chromium checks cover empty/populated analytics, segment filtering, source navigation, annotation save/reload, invalid-plan input retention, experiment creation/start/cancellation/completion, stale-tab rejection, premature completion, frozen results after source-history changes, note editing/reload, missing-record 404s, and browser errors. Analytics, annotation, and experiment pages have no document-level horizontal overflow at 375px; the comparison table scrolls within its container.
- Reduced-motion keyboard opening/Escape dismissal of the shadcn select is verified. Desktop and mobile screenshots were inspected.

## Interface and animation review

Reviewed with frontend-design, Emil design-engineering, React/Next.js guidance, and `review-animations/SKILL.md` plus its standards. The change uses the existing Geist typography, theme, shadcn primitives, and Tailwind utilities. Navigation, source disclosure, forms, and save feedback introduce no animation.

| Before | After | Why |
| --- | --- | --- |
| Basic funnel only | Segment comparisons and explicit one-variable experiment plans | Extends the existing workspace without decorative transitions. |
| No editable analytics metadata | Labelled annotations with retained input and stale-tab errors | Keeps data gaps explicit and prevents silent overwrites. |
| A wrapping notes label included saved textarea content after reload | Explicit label/control association | Keeps the accessible name stable when saved notes are present. |
| Existing static shadcn selects | Reused with keyboard and reduced-motion checks | Frequent analysis controls respond immediately. |

Motion verdict: **Approve**. No new motion regressions found.

## Interpretation boundaries

Comparisons are descriptive correlations, not causal estimates or significance tests. The 20-application warning is a caution threshold, not a statistical confidence guarantee. Unknown outcomes are absence of a recorded milestone, not proof of employer rejection. Qualification of interviews remains separate from the screen/interview milestone labels.

Role family, industry, company size, resume strategy overrides, and actual effort are user-reported and may be retrospective. Resume strategy otherwise uses the submitted base-profile name. Compensation groups preserve posted ranges and currencies without assuming pay periods. Application timing means weekday in UTC; posting age is measured separately. Fit scores are historical model estimates, not actual effort measurements.

Users execute and assign their own groups through recorded attributes. The app does not randomize applications or verify that all other variables stayed constant. Live results reflect current annotations and corrected history, including while a plan is not running; completion freezes the evaluated data. To revise a plan, cancel it and create a new one. No application, outreach, or external action is automated by an experiment.
