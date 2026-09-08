# Resume import (ISSUE-283)

## Processing and data handling

The first importer runs locally on the application's Node server. PDF text is read with [Mozilla PDF.js](https://github.com/mozilla/pdf.js); DOCX document paragraphs are read using [yauzl](https://github.com/thejoshwolfe/yauzl) and [xmldom](https://github.com/xmldom/xmldom). No model provider, credentials, external document conversion, OCR, or network request is involved. Deterministic extraction proposes facts from recognizable sections and date ranges; users review and correct each fact. Unrecognized content remains available in the source viewer and can be selected manually.

Uploads are limited to 5 MiB, PDF documents to 50 pages, DOCX document XML to 4 MiB, and recovered text to 100,000 characters. Files are processed in memory; original bytes are not retained. The database retains filename, format, a SHA-256 source identity, recovered text, extraction warnings, immutable source excerpts, editable proposals, review state and approved evidence links. These private records participate in ordinary same-schema backups. No resume text or parser exception is written to application logs. Deleting an import will remove its proposals and recovered text without deleting approved career evidence; approved evidence retains its source label.

Import and extraction never verify career facts. Explicit approval creates a new verified record with imported provenance, transactionally with the proposal decision and audit event. Dates and skill proficiency that the source does not establish remain blank; if required by the evidence model, the user must supply them before approval. Rejected proposals never reappear on retry. Extraction retry adds only absent source proposals and never overwrites edits. Approval uses revision checks, and repeated approval returns the same linked record.

Duplicates/conflicts are checked against current evidence at approval time. Existing evidence, including locked, archived, or prohibited facts, is never overwritten. Likely matches are shown for review; skills with an existing normalized name cannot be imported again. Other possible matches require explicit acknowledgment before creating a separate fact. Approving an achievement requires linking an existing usable experience (or approving its proposed experience first).

This feature retains the application's trusted-local-access boundary. Hosted access and tokens remain ISSUE-285; identity and Unicode PDF export remain ISSUE-286.

## Using the importer

Open **Career profile → Import a resume**, upload a PDF/DOCX, or choose **Paste text**. The review keeps each source excerpt beside its editable fields. Approve employment before an achievement that belongs to it. Use **Save draft** before leaving an unfinished proposal; unsaved typing is not an autosaved draft. Approved and rejected decisions are final for that proposal. Further corrections to approved facts happen in the evidence bank.

Section extraction is deliberately conservative: it recognizes English headings, common month/year date ranges, employment bullets, and skill lists. It does not infer missing months, skill proficiency, achievement results, or credentials. Multi-column PDFs and unusual document layouts may have imperfect reading order. Inspect the recovered source, correct proposals, and use **Add a missed fact** with an exact source excerpt for anything omitted. Up to 150 proposals are created per import; reaching the limit is disclosed. Retry works on saved text, preserving drafts and decisions. Re-uploading the identical file reopens its existing review.

A failed database save leaves the selected file/pasted input available and offers recovered text. A partly readable PDF retains recovered pages with a warning; image-only and encrypted files require an unencrypted export or pasted text. The original file stays the user's responsibility because only extracted text is stored. The PDF reader requires Node 22.13+ or a supported Node 24 release; validation used Node 24.13.0.

See [ISSUE-283 validation](issue-283-validation.md) for coverage and replay instructions.
