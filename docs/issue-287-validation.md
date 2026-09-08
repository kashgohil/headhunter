# ISSUE-287 validation

Validated on 8 September 2026 with Node 24.13.0, Bun 1.3.14, Next.js 16.3.4, Chromium, PDF.js, and an isolated SQLite database. All candidate, employer, and achievement records were synthetic.

## Result

Tailored bullet generation now presents the recorded action, result, and distinct metric as separate sentences. It does not insert `to`, `resulting in`, or another causal relationship that the evidence did not state. Regeneration uses explicit `Recorded outcome` and `Recorded measure` labels, providing a distinct deterministic version while retaining the same facts.

The regression fixtures produce:

| Outcome shape | Recorded evidence | Proposed bullet |
| --- | --- | --- |
| Full sentence | `The team could track requests in one place.` | `Built a TypeScript and React workflow tool backed by SQLite. The team could track requests in one place.` |
| Verb phrase | `improved activation` | `Led platform strategy. Improved activation.` |
| Metric | `increased product adoption` plus `18% increase in activation` | `Simplified onboarding. Increased product adoption. 18% increase in activation.` |

Regenerated text now replaces the visible review textarea when the server saves it. Bulk experience review also advances the tailored resume revision, so the PDF preview and download reflect accepted proposals. Submitted resumes continue to render their stored snapshot even if current edit rows or source evidence change later.

## Automated coverage

- The tailoring regression verifies the three outcome shapes, exact proposed text, distinct regeneration, evidence links, and absence of causal joiners.
- The isolated Chromium replay verifies the original/proposed comparison, visible regeneration, a saved manual edit, bulk acceptance, selectable PDF text, submission, and snapshot immutability after direct mutation of the live edit row.
- The full suite passes with 99 Bun tests and 33 Node/SQLite tests. ESLint and `tsc --noEmit` pass.
- `next build --webpack` completes the optimized production build. The default Turbopack build was also attempted twice; both runs stopped in this environment when the CSS worker was denied permission to bind a local port (`Operation not permitted`), before application compilation reported a source error.

## Browser replay

Run the acceptance script against an isolated local server whose configured database matches `ACCEPTANCE_DATABASE`:

```sh
ACCEPTANCE_DATABASE=/absolute/path/.data/issue287-acceptance.db \
ACCEPTANCE_URL=http://localhost:3051 \
PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core/index.mjs \
CHROMIUM_EXECUTABLE=/absolute/path/to/chromium \
node scripts/issue-287-acceptance.mjs
```

The runner refuses databases whose basename does not begin with `issue287-` and refuses non-loopback URLs. Its passing result is:

```text
PASS full-sentence, verb-phrase and metric proposals; original/proposed comparison; regeneration; manual edit; PDF text; immutable snapshot
```
