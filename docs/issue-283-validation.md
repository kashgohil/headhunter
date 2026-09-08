# ISSUE-283 validation

Validated on 8 September 2026 with Node 24.13.0, Bun 1.3.14, Next.js 16.3.4, and an isolated SQLite database. The checked implementation uses local deterministic extraction; no model or external document processor receives resume content.

## Automated coverage

- 95 Bun domain tests and 30 Node/SQLite tests pass.
- The resume tests cover PDF, DOCX, pasted text, Unicode, encrypted/image-only/damaged/oversized inputs, partially readable PDFs, all supported proposal kinds, proposal limits, corrections, selective approval and rejection, retry identity, stale revisions, duplicates and overlapping employment, immutable source excerpts, transactional audit rollback, provenance, search, deletion, and same-schema backup/restore.
- ESLint and `tsc --noEmit` pass.
- `next build --webpack` passes as an optimized production build.

## Production browser replay

The repeatable Chromium replay runs against a production server and an isolated `issue283-*` database. It verifies:

1. A database failure after text recovery leaves the source in the form and exposes the recovered-text fallback.
2. Import creates proposals without career evidence; individual confirmation creates evidence only for approved facts.
3. Corrected achievement context survives save and reload. Rejected proposals remain rejected, and retry adds zero reviewed proposals.
4. Approved facts link to their immutable resume excerpts.
5. Imported experience, achievement, skill, and education records can create a base resume, tailored draft, valid PDF, and immutable submitted snapshot.
6. Identical DOCX bytes reopen the same review, encrypted PDF feedback is actionable, and the completed review has no horizontal overflow at 375 px.

Run the replay with a production server whose database matches `ACCEPTANCE_DATABASE`:

```sh
ACCEPTANCE_DATABASE=/absolute/path/.data/issue283-acceptance.db \
ACCEPTANCE_URL=http://127.0.0.1:3057 \
PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core/index.mjs \
CHROMIUM_EXECUTABLE=/absolute/path/to/chromium \
node scripts/issue-283-acceptance.mjs
```

The runner refuses databases whose basename does not begin with `issue283-` and refuses non-loopback URLs. Its fixture records are synthetic and include a timestamp so repeated runs exercise duplicate/conflict behavior without touching a normal workspace database.

## Deliberate limits

OCR, bulk migration, automatic verification, and AI extraction remain outside this issue. Multi-column PDFs and unusual DOCX layouts may have imperfect reading order. The review retains recovered source text so omitted facts can be added from an exact excerpt, and unknown dates, proficiency, credentials, metrics, and results remain blank until a user verifies them.
