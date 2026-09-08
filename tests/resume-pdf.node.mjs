import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createResumePdf } from '../lib/resumes/pdf.ts';
import { readResumeFile } from '../lib/resume-import/file-reader.ts';

function snapshot(overrides = {}) {
  return {
    name: 'Internal profile label',
    candidate: {
      name: 'José अनिरुद्ध शर्मा with a deliberately long candidate name',
      email: 'jose@example.com',
      phone: '+91 98765 43210',
      location: 'Pune, India',
      website: `https://example.com/${'long-portfolio-path/'.repeat(8)}`,
    },
    roleFamily: 'Engineering',
    template: 'classic',
    job: { id: 'job', title: 'Engineer', company: 'Fixture' },
    summary: 'Delivered ₹12 लाख in verified value while supporting José and the पुणे team.',
    experiences: [{
      id: 'experience', company: 'Unicode Labs', title: 'Senior Engineer', location: 'पुणे', startDate: '2020-01', endDate: null,
      bullets: Array.from({ length: 80 }, (_, index) => ({ id: `bullet-${index}`, text: `Built workflow ${index + 1} for José with verified value of ₹${index + 1} लाख across the पुणे organization.`, evidenceIds: ['evidence'] })),
    }],
    skills: ['TypeScript', 'हिंदी communication'],
    profileItems: [],
    sectionOrder: ['summary', 'experience', 'projects', 'skills', 'education'],
    ...overrides,
  };
}

describe('Unicode resume PDF export', () => {
  it('embeds selectable Latin, currency and Devanagari text across pages', async () => {
    const bytes = await createResumePdf(snapshot());
    const result = await readResumeFile(Buffer.from(bytes), 'resume.pdf');
    assert.match(result.text, /José/);
    assert.match(result.text, /₹/);
    assert.match(result.text, /लाख/);
    assert.match(result.text, /पुणे/);
    assert.match(result.text, /workflow 80/);
    assert.doesNotMatch(result.text, /Internal profile label/);
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = pdfjs.getDocument({ data: bytes, verbosity: 0 });
    try {
      const document = await task.promise;
      assert.ok(document.numPages > 1);
      assert.ok(document.numPages < 8);
      const last = await (await document.getPage(document.numPages)).getTextContent();
      assert.ok(last.items.filter(item => 'str' in item).map(item => item.str).join(' ').replace(/\d+ \/ \d+/, '').trim().length > 20);
    } finally { await task.destroy(); }
  });

  it('rejects unsupported glyphs without changing the source', async () => {
    await assert.rejects(createResumePdf(snapshot({ summary: 'Keep this emoji unchanged 🧭' })), /cannot represent “🧭”/);
  });
});
