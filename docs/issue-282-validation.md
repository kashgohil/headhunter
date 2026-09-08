# ISSUE-282 acceptance validation

Date: 2026-09-08. Starting revision: `c46ccb6`.

**Result: synthetic workflow exercised; real-input acceptance remains open.** The pass found and fixed bounded defects in timestamps, form recovery, tab draft retention, accessibility, and stage-control layout. It does not establish that the product is ready for real applications: resume import remains ISSUE-283 and candidate identity/Unicode export is tracked in ISSUE-286. No approved real resume/job description was supplied.

## Isolation and evidence

Browser work used a detached checkout at `/tmp/headhunter-issue282`, its own `.data/issue282-acceptance.db`, and ports 3054 (webpack development) and 3055 (production). The existing checkout's application records and running server were not used. All contacts, employer names, career facts, and submissions below are synthetic. No application or message was sent.

Checked-in evidence:

- [Synthetic populated workspace](validation/issue-282/workspace.json), exported through `/api/data`. It contains the reviewed resume, submission snapshot, corrected job, contact, interview, fit, strategy, and audit records. It intentionally preserves pre-fix historical timestamps; the fix does not rewrite stored history.
- [Exported PDF](validation/issue-282/resume.pdf) and [PDFKit rendering](validation/issue-282/resume.png). One page, selectable text, readable reading order, no clipping with this short English fixture. This is the actual pre-fix document, including the wording defect described below.
- [Repeatable regression runner](../scripts/issue-282-acceptance.mjs). Restores the synthetic workspace and exercises the fixed browser boundaries. This is not a claim that every step below is automated.

## Inputs and manual route

Strategy: Senior Software Engineer; senior; remote; India; authorized in India; remote-only relocation preference; minimum INR 1,000,000, target INR 1,500,000; six hours/week; balanced pace. All required strategy fields must be supplied, including relocation and both compensation amounts.

Career evidence is entered at `/career-profile`, not imported:

1. Experience: Senior Software Engineer at Fixture Labs, January 2026–present; TypeScript, React, SQLite; source explicitly marked as an ISSUE-282 synthetic resume.
2. Achievement linked to that experience: manual handoffs made requests difficult to track; built a TypeScript/React workflow tool backed by SQLite; the team could track requests in one place. No fabricated numerical metric.
3. Skill: TypeScript, current working knowledge, used on that workflow.
4. Explicitly verify each of the three records. Readiness changes from 0/3 to 3/3; new records begin in review.

Paste a role at Fixture Hiring with title Senior Software Engineer, India/remote, TypeScript/React/SQLite, internal workflow responsibilities, and salary INR 1,200,000–1,800,000. The exact original description is retained in the fixture's job record. Correct location, seniority, and skills before analysis. Extraction is incomplete and still requires human review: the interview briefing correctly reported that structured qualifications were missing.

Create base profile `Fixture engineering`, role family `Software engineering`, select the three evidence records, and generate a draft for that job. Accept the summary and experience section, export PDF, and explicitly mark the resume submitted before recording the simulated application.

## Acceptance observations

| Boundary | Observed result |
| --- | --- |
| Empty workspace | Strategy, career profile, resume studio, contact list, and review history expose their empty/manual setup paths. |
| Capture and corrections | Pasted job saved, creates an Inbox opportunity; source text survives metadata correction. |
| Explainable fit | Versioned score 99, five of eight dimensions known; unknown qualifications/freshness/referral visible, strategy and evidence links present. This is a fixture score, not a quality assessment of real matching. |
| Resume review | Draft links evidence and review decisions; export works; application submission refuses a resume that has not been finalized. |
| Answers and checklist | Job-specific answer saved; six review items recorded as a simulation, including the employer-form item. No employer form was actually visited. |
| Submission | Confirmation `FIXTURE-282-NOT-SENT`; immutable job/document/answer snapshot saved. Later live job title correction leaves the serialized snapshot byte-for-byte unchanged. |
| Pipeline | Applied → Recruiter screen → Interviewing exercised. Saved next action remains visible. Stage popover rechecked at 375×667 after height fix. |
| Contacts/reminders | Fixture Recruiter linked to the same opportunity; introduced status, past-due promised follow-up, and private draft controls inspected. Command center surfaces follow-up, interview, and next action. |
| Interview preparation | Scheduled round opens its briefing and verified achievement suggestions. Missing requirements and story evidence are stated. New UTC round persists exactly `2026-09-10T15:30:00.000Z`. |
| Search | Same company, job, resume/snapshot, answer, and interview notes appear for `Fixture`. |
| Funnel/segments | One applied application; recruiter-screen milestone appears after transition; source segment matches the simulated submission; small-sample warning remains visible. |
| Weekly review | Previous completed week contains zero fixture events because they occurred this week; current risks include the fixture reminders separately. Current-week historical review cannot yet be created. Storage tests independently cover populated completed-week snapshots. |
| Audit | Fixture export includes evidence verification, generation/review, submission, stage and other workflow events. Source edits leave submission history intact. |
| Backup/restore | Populated export → restore preserves all non-audit tables exactly. Restore adds its audit event. Corrupt checksum and missing replacement confirmation are rejected. |
| Mobile | No document-level horizontal overflow at 375×812 for command center, job, resume, pipeline table/board, analytics, search, notifications, contacts, interviews, and data settings. No uncaught browser errors during that route pass. |
| Recovery | Blocked loopback URL retains its input. Pasted capture now retains fields after validation or injected SQLite failure; failed transaction creates no job; retry creates exactly one. |
| Keyboard | Named resume selectors open/dismiss with Enter/Escape; month picker year buttons have names; stage popover dismisses; inactive application panels are hidden from accessibility navigation. |

## Fixed defects

| Before | After | Why |
| --- | --- | --- |
| Switching application tabs unmounted answer/outreach forms and erased input | Panels remain mounted and inactive panels use Tailwind `hidden` | Preserve local drafts while switching working surfaces; no tab transition was added. |
| React reset pasted capture fields after returned validation errors; storage errors escaped to the route boundary | Prevent automatic reset, show action errors, retain fields on storage failure | Recover without losing the original description. Successful capture still navigates to the saved job. |
| Naive datetime strings were parsed in the server timezone | Labels explicitly say UTC; schema normalizes offset-free input to UTC and validates real ISO dates | Same entered time persists independently of hosting timezone. Existing records are not silently corrected. |
| Stage popover save button could fall outside a short viewport | Bound height to Radix available space and scroll inside | Stage changes remain reachable on small screens. |
| Resume/application select labels lacked control associations; month arrows lacked accessible names | Associate labels and name Previous/Next year | Controls can be selected by accessible name. |
| Resume review nested a `main` inside workspace `main` | Inner review container is a `div` | Preserve one main landmark. |

No new animation was added. Existing capture validation feedback remains its 160ms opacity/transform transition, with translation suppressed for reduced motion. New tab retention and recovery messaging use instant state updates. This was a bounded interaction check, not a full certification of existing application motion or screen-reader accessibility.

## Remaining gaps and limits

- **High — ISSUE-286:** resume PDF uses the internal profile label as the candidate heading; the model lacks a separate identity/contact header. `safeText` replaces non-ASCII after normalization. English fixture export passes, but general Unicode fidelity does not. Resolve before using exported resumes as real applications.
- **Medium — deterministic wording:** the fixture proposal reads “Built … to the team could track requests in one place.” Review/keep-original is available, but automatic joining of arbitrary outcome phrases is not reliably grammatical. Follow-up ISSUE-287.
- **Resume import — ISSUE-283:** no PDF/DOCX import or fact-review flow; manual setup is the validated path.
- **Not established:** persistence of unsaved edits across full navigation/reload, complete screen-reader coverage, long/multipage/non-Latin PDF fidelity, and a real employer input pass. Tab-switch retention is not durable draft storage.
- **Time window limit:** this week's fixture events cannot appear as facts in last week's review. A future completed-week pass is still needed for these exact records; no timestamps were backdated to manufacture that result.
- **Deliberate deferrals:** calendar/account integration (284), hosted authentication/data protection (285), OCR, DOCX export, automatic sending, and background delivery are outside this acceptance implementation.

## Verification and replay

`bun run test`: 112 tests (95 domain + 17 SQLite); lint, TypeScript, and isolated webpack production build pass. Timestamp schema tests also pass with `TZ=America/Los_Angeles`. The regression runner passes on the isolated development and production servers including the final injected capture failure and retry.

To replay, use a separate checkout containing these changes, install/link dependencies, and start it with `DATABASE_FILE=issue282-acceptance.db ./node_modules/.bin/next dev --webpack -p 3054` on an unused port. Visit it once to initialize migrations. Use Node, not Bun, for the native SQLite browser runner. Provide an installed Playwright Core module and Chromium executable:

```sh
ACCEPTANCE_DATABASE=/absolute/isolated/checkout/.data/issue282-acceptance.db \
ACCEPTANCE_URL=http://localhost:3054 \
PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core/index.mjs \
CHROMIUM_EXECUTABLE=/absolute/path/to/chromium \
node scripts/issue-282-acceptance.mjs
```

The runner **replaces the named acceptance database with the checked-in synthetic fixture**. It requires an `issue282-*` filename and loopback server URL, verifies the expected fixture job before browser mutations, injects/removes a test-only capture failure, and saves a mobile screenshot in `/tmp/issue282-mobile.png`. Use that isolated server only. Full manual replay begins with the empty setup and inputs above; the regression runner starts from the populated checkpoint.
