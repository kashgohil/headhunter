# ISSUE-286 validation

Validated on 8 September 2026 with Node 24.13.0, Bun 1.3.14, Next.js 16.3.4, Chromium, PDF.js, and macOS PDFKit rendering. All records and employer names were synthetic; nothing was submitted externally.

## Result

The internal base-profile label is no longer used as the employer-facing heading. A base profile now records a candidate name plus optional email, phone, location, and HTTP(S) website. Those defaults are copied into a tailored draft, where the user can correct and review the header. Submission freezes the reviewed identity in the existing immutable snapshot.

PDF export uses [PDFKit](https://pdfkit.org/docs/text.html) with embedded, subsetted Noto Sans Devanagari fonts from the OFL-licensed [Noto Devanagari project](https://github.com/notofonts/devanagari). Text is normalized only to Unicode NFC for shaping; it is not transliterated or replaced. The generator selects Latin, Latin Extended, and Devanagari font runs on a shared measured baseline. Unsupported scripts or symbols produce an explicit 422 export error while leaving the saved source unchanged.

The in-product preview embeds the same no-store PDF route as the download and includes the document revision in its URL. It therefore uses the same fonts, line wrapping, links, section order, and page boundaries as export. Correcting a failed header refreshes the preview and clears the download control's earlier retry state.

## Automated coverage

- Unit validation preserves `José शर्मा`, rejects malformed email addresses, and restricts candidate links to HTTP(S).
- Node PDF tests render and extract `José`, `₹`, `लाख`, and `पुणे`; exclude the internal profile label; verify embedded fonts, a long candidate name and URL, substantive multipage output, and explicit failure for an unsupported glyph.
- SQLite tests round-trip Unicode base and tailored identity through a same-schema backup.
- The full project test suite, ESLint, `tsc --noEmit`, and `next build --webpack` pass. The production trace contains all required font files.

## Production browser replay

The isolated Chromium replay creates verified Unicode evidence, a base profile with a distinct internal name, and a tailored resume with 28 reviewed bullets. It verifies an unsupported glyph fails visibly, corrects the candidate header, confirms the preview targets the exact export route, extracts selectable text from every PDF page, checks the final page has real content, submits the document, mutates live source records, and proves the frozen snapshot and subsequent export remain unchanged. It also checks the identity audit event, backup fields, long header/URL behavior, and 375 px workspace layout.

Run it against an isolated production server whose configured database matches `ACCEPTANCE_DATABASE`:

```sh
ACCEPTANCE_DATABASE=/absolute/path/.data/issue286-acceptance.db \
ACCEPTANCE_URL=http://localhost:3058 \
PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core/index.mjs \
CHROMIUM_EXECUTABLE=/absolute/path/to/chromium \
node scripts/issue-286-acceptance.mjs
```

The runner refuses databases whose basename does not begin with `issue286-` and refuses non-loopback URLs. Use `localhost` when the production server advertises that host so same-origin backup protection sees the same origin.

## Scope boundary

This release deliberately guarantees Latin, Latin Extended, Devanagari, and the INR symbol. Other scripts and emoji fail explicitly because silently substituting a fallback glyph would corrupt candidate facts. Adding broader script families should pair each new embedded font with visual rendering and text-extraction fixtures. DOCX export and automatic submission remain outside this issue.
