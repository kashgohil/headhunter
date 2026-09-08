import assert from 'node:assert/strict';
import path from 'node:path';
import Database from 'better-sqlite3';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const databasePath = process.env.ACCEPTANCE_DATABASE;
const base = process.env.ACCEPTANCE_URL;

assert.ok(databasePath && path.basename(databasePath).startsWith('issue287-'), 'Provide an isolated issue287-* database');
assert.ok(base && ['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Provide an isolated local server URL');

const db = new Database(databasePath, { fileMustExist: true });
db.pragma('foreign_keys=ON');
const nonce = Date.now().toString();
const id = (prefix, index = 0) => `${prefix}0000000-0000-4000-8000-${(nonce.slice(-8) + String(index).padStart(4, '0')).slice(-12)}`;
const experienceId = id('1');
const jobId = id('4');
const now = Date.now();
const fixtures = [
  {
    id: id('2', 1),
    action: 'Built a TypeScript and React workflow tool backed by SQLite.',
    result: 'The team could track requests in one place.',
    metric: null,
    proposal: 'Built a TypeScript and React workflow tool backed by SQLite. The team could track requests in one place.',
  },
  {
    id: id('2', 2),
    action: 'Led platform strategy',
    result: 'improved activation',
    metric: null,
    proposal: 'Led platform strategy. Improved activation.',
  },
  {
    id: id('2', 3),
    action: 'Simplified onboarding',
    result: 'increased product adoption',
    metric: '18% increase in activation',
    proposal: 'Simplified onboarding. Increased product adoption. 18% increase in activation.',
  },
];

db.prepare('INSERT INTO career_experiences (id,company,title,location,start_date,is_current,summary,responsibilities,technologies,verification_state,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
  .run(experienceId, 'Grammar Labs', 'Product Engineer', 'Remote', '2024-01', 1, 'Built workflow products.', '[]', '["TypeScript","React","SQLite"]', 'verified', now, now);
const insertAchievement = db.prepare('INSERT INTO career_achievements (id,experience_id,problem,action,result,measurable_outcome,tools,role_families,verification_state,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
for (const [index, fixture] of fixtures.entries()) {
  insertAchievement.run(fixture.id, experienceId, 'Teams needed a clearer workflow.', fixture.action, fixture.result, fixture.metric, '["TypeScript"]', '["Engineering"]', 'verified', now + index, now + index);
}
db.prepare('INSERT INTO jobs (id,title,company,original_description,required_qualifications,responsibilities,skills,technologies,captured_at) VALUES (?,?,?,?,?,?,?,?,?)')
  .run(jobId, 'Senior Product Engineer', `Fixture ${nonce}`, 'Build workflow products.', '["Build workflow products"]', '["Improve activation"]', '["TypeScript"]', '["React","SQLite"]', now);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
page.setDefaultTimeout(20000);
const go = route => page.goto(base + route, { waitUntil: 'networkidle' });
const choose = async (name, value) => {
  await page.getByRole('combobox', { name, exact: true }).click();
  await page.getByRole('option', { name: value, exact: true }).click();
};
const experienceSection = page.locator('section[aria-labelledby="experience-review-heading"]');
const proposalFor = async text => {
  const proposals = experienceSection.locator('textarea[name="proposedText"]');
  await page.waitForFunction(
    expected => [...document.querySelectorAll('section[aria-labelledby="experience-review-heading"] textarea[name="proposedText"]')]
      .some(element => element.value === expected),
    text,
  );
  for (let index = 0; index < await proposals.count(); index++) {
    if (await proposals.nth(index).inputValue() === text) return proposals.nth(index);
  }
  assert.fail(`Proposal not found: ${text}`);
};

try {
  await go('/resumes');
  await page.locator('summary').filter({ hasText: 'Create base resume' }).click();
  await page.getByLabel('Profile name', { exact: true }).fill(`Grammar acceptance ${nonce}`);
  await page.getByLabel('Role family', { exact: true }).fill('Engineering');
  await page.getByLabel('Full name', { exact: true }).fill('Avery Candidate');
  await page.getByLabel('Email', { exact: true }).fill('avery@example.com');
  await page.locator(`button[role="checkbox"][value="${experienceId}"]`).click();
  for (const fixture of fixtures) await page.locator(`button[role="checkbox"][value="${fixture.id}"]`).click();
  await page.getByRole('button', { name: 'Save base resume', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Base resume saved.' }).waitFor();
  await choose('Base resume', `Grammar acceptance ${nonce}`);
  await choose('Target job', `Senior Product Engineer · Fixture ${nonce}`);
  await page.getByRole('button', { name: 'Generate review draft', exact: true }).click();
  await page.waitForURL(/\/resumes\/[^/]+$/);
  const resumeId = page.url().split('/').pop();
  assert.ok(resumeId);

  for (const fixture of fixtures) await proposalFor(fixture.proposal);
  const fullSentence = await proposalFor(fixtures[0].proposal);
  const fullSentenceCard = fullSentence.locator('xpath=ancestor::div[@data-slot="card"][1]');
  const comparison = await fullSentenceCard.innerText();
  assert.match(comparison, /Original[\s\S]*Built a TypeScript and React workflow tool backed by SQLite; the team could track requests in one place\./i);
  assert.equal(await fullSentence.inputValue(), fixtures[0].proposal);
  for (const fixture of fixtures) assert.doesNotMatch(fixture.proposal, /\b(?:to|resulting in)\b/i);

  await fullSentenceCard.getByRole('button', { name: 'Regenerate bullet', exact: true }).click();
  const regenerated = 'Built a TypeScript and React workflow tool backed by SQLite. Recorded outcome: The team could track requests in one place.';
  await proposalFor(regenerated);
  assert.doesNotMatch(regenerated, /\b(?:to|resulting in)\b/i);

  const manual = 'Built a TypeScript and React workflow tool backed by SQLite. Team members can track requests in one place.';
  const regeneratedProposal = await proposalFor(regenerated);
  const regeneratedCard = regeneratedProposal.locator('xpath=ancestor::div[@data-slot="card"][1]');
  await regeneratedProposal.fill(manual);
  await regeneratedCard.getByRole('button', { name: 'Save edit', exact: true }).click();
  await proposalFor(manual);
  await page.getByRole('button', { name: 'Accept', exact: true }).first().click();
  await page.getByRole('button', { name: 'Accept section', exact: true }).click();
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll('button')].find(element => element.textContent?.includes('Mark submitted'));
    return button && !button.disabled;
  });

  const revision = db.prepare('SELECT updated_at FROM tailored_resumes WHERE id=?').get(resumeId).updated_at;
  const response = await page.request.get(`${base}/resumes/${resumeId}/pdf?revision=${revision}`);
  assert.equal(response.status(), 200);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = pdfjs.getDocument({ data: new Uint8Array(await response.body()), verbosity: 0 });
  const pdf = await task.promise;
  let extracted = '';
  try {
    for (let index = 1; index <= pdf.numPages; index++) {
      const content = await (await pdf.getPage(index)).getTextContent();
      extracted += content.items.filter(item => 'str' in item).map(item => item.str).join(' ') + '\n';
    }
  } finally { await task.destroy(); }
  assert.match(extracted, /Team members can track requests in one place/);
  assert.match(extracted, /Led platform strategy\. Improved activation/);
  assert.match(extracted, /18% increase in activation/);

  await page.getByRole('button', { name: 'Mark submitted', exact: true }).click();
  await page.getByRole('button', { name: 'Immutable snapshot', exact: true }).waitFor();
  const stored = JSON.parse(db.prepare('SELECT snapshot FROM tailored_resumes WHERE id=?').get(resumeId).snapshot);
  assert.ok(stored.experiences[0].bullets.some(bullet => bullet.text === manual));
  db.prepare('UPDATE resume_bullet_edits SET proposed_text=? WHERE tailored_resume_id=?').run('Mutated after submission.', resumeId);
  const frozen = await page.request.get(`${base}/resumes/${resumeId}/pdf?revision=frozen`);
  const frozenTask = pdfjs.getDocument({ data: new Uint8Array(await frozen.body()), verbosity: 0 });
  const frozenPdf = await frozenTask.promise;
  let frozenText = '';
  try {
    for (let index = 1; index <= frozenPdf.numPages; index++) {
      const content = await (await frozenPdf.getPage(index)).getTextContent();
      frozenText += content.items.filter(item => 'str' in item).map(item => item.str).join(' ');
    }
  } finally { await frozenTask.destroy(); }
  assert.match(frozenText, /Team members can track requests in one place/);
  assert.doesNotMatch(frozenText, /Mutated after submission/);
  console.log('PASS full-sentence, verb-phrase and metric proposals; original/proposed comparison; regeneration; manual edit; PDF text; immutable snapshot');
} catch (error) {
  console.error(await page.locator('main').innerText().catch(() => 'No page content'));
  throw error;
} finally {
  await browser.close();
  db.close();
}
