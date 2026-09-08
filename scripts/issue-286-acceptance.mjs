import assert from 'node:assert/strict';
import path from 'node:path';
import Database from 'better-sqlite3';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');

const databasePath = process.env.ACCEPTANCE_DATABASE;
const base = process.env.ACCEPTANCE_URL;
assert.ok(databasePath && path.basename(databasePath).startsWith('issue286-'), 'Provide an isolated issue286-* database');
assert.ok(base && ['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Provide an isolated local server URL');
const db = new Database(databasePath, { fileMustExist: true });
db.pragma('foreign_keys=ON');
const nonce = Date.now().toString();
const id = (kind, index = '') => `${kind === 'experience' ? '10000000' : kind === 'achievement' ? '20000000' : kind === 'skill' ? '30000000' : kind === 'job' ? '40000000' : '50000000'}-0000-4000-8000-${(nonce.slice(-8) + String(index).padStart(4, '0')).slice(-12)}`;
const experienceId = id('experience');
const skillId = id('skill');
const jobId = id('job');
const now = Date.now();
db.prepare('INSERT INTO career_experiences (id,company,title,location,start_date,is_current,summary,responsibilities,technologies,verification_state,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(experienceId, 'Unicode Labs', 'Senior Engineer', 'पुणे', '2020-01', 1, 'Built multilingual systems.', '[]', '["TypeScript"]', 'verified', now, now);
const insertAchievement = db.prepare('INSERT INTO career_achievements (id,experience_id,problem,action,result,measurable_outcome,tools,role_families,verification_state,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
const achievementIds = Array.from({ length: 28 }, (_, index) => {
  const achievementId = id('achievement', index);
  insertAchievement.run(achievementId, experienceId, 'Teams needed a reliable multilingual workflow.', `Built verified workflow ${index + 1} for José and the पुणे team`, `improved delivery for workflow ${index + 1}`, `Created ₹${index + 1} लाख in verified value`, '["TypeScript"]', '["Engineering"]', 'verified', now + index, now + index);
  return achievementId;
});
db.prepare('INSERT INTO career_skills (id,name,normalized_name,context,recency,proficiency,verification_state,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').run(skillId, 'TypeScript', `typescript-${nonce}`, 'Built multilingual workflow systems.', 'current', 'advanced', 'verified', now, now);
db.prepare('INSERT INTO jobs (id,title,company,original_description,required_qualifications,responsibilities,skills,technologies,captured_at) VALUES (?,?,?,?,?,?,?,?,?)').run(jobId, 'Senior Engineer', `Fixture ${nonce}`, 'Build reliable TypeScript workflows.', '["Build reliable TypeScript workflows"]', '["Improve delivery"]', '["TypeScript"]', '["TypeScript"]', now);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
page.setDefaultTimeout(20000);
const go = route => page.goto(base + route, { waitUntil: 'networkidle' });
const choose = async (name, value) => { await page.getByRole('combobox', { name, exact: true }).click(); await page.getByRole('option', { name: value, exact: true }).click(); };
try {
  await go('/resumes');
  await page.locator('summary').filter({ hasText: 'Create base resume' }).click();
  await page.getByLabel('Profile name', { exact: true }).fill(`Internal engineering ${nonce}`);
  await page.getByLabel('Role family', { exact: true }).fill('Engineering');
  await page.getByLabel('Full name', { exact: true }).fill('José 🧭 शर्मा');
  await page.getByLabel('Email', { exact: true }).fill('jose@example.com');
  await page.getByLabel('Phone', { exact: true }).fill('+91 98765 43210');
  await page.getByLabel('Location', { exact: true }).fill('पुणे, India');
  await page.getByLabel('Website or profile URL', { exact: true }).fill(`https://example.com/${'long-portfolio-path/'.repeat(8)}`);
  await page.locator(`button[role="checkbox"][value="${experienceId}"]`).check();
  for (const achievementId of achievementIds) await page.locator(`button[role="checkbox"][value="${achievementId}"]`).check();
  await page.locator(`button[role="checkbox"][value="${skillId}"]`).check();
  await page.getByRole('button', { name: 'Save base resume', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Base resume saved.' }).waitFor();
  await choose('Base resume', `Internal engineering ${nonce}`);
  await choose('Target job', `Senior Engineer · Fixture ${nonce}`);
  await page.getByRole('button', { name: 'Generate review draft', exact: true }).click();
  await page.waitForURL(/\/resumes\/[^/]+$/);
  const resumeId = page.url().split('/').pop();
  assert.ok(resumeId);
  assert.match(await page.locator('iframe[title^="PDF preview"]').getAttribute('src'), new RegExp(`/resumes/${resumeId}/pdf\\?revision=`));
  let response = await page.request.get(`${base}/resumes/${resumeId}/pdf`);
  assert.equal(response.status(), 422);
  assert.match(await response.text(), /cannot represent “🧭”/);
  await page.getByRole('button', { name: 'PDF', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'could not be exported' }).waitFor();

  await page.getByLabel('Full name', { exact: true }).fill('José अनिरुद्ध शर्मा with a deliberately long candidate name');
  await page.getByRole('button', { name: 'Save candidate header', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Candidate header saved.' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Retry PDF', exact: true }).count(), 0);
  assert.equal(db.prepare("SELECT count(*) n FROM audit_events WHERE entity_id=? AND action='resume_identity.updated'").get(resumeId).n, 1);
  await page.getByRole('button', { name: 'Accept', exact: true }).first().click();
  await page.getByRole('button', { name: 'Accept section', exact: true }).click();
  response = await page.request.get(`${base}/resumes/${resumeId}/pdf`);
  assert.equal(response.status(), 200);
  const bytes = new Uint8Array(await response.body());
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = pdfjs.getDocument({ data: bytes, verbosity: 0 });
  const pdf = await task.promise;
  let extracted = '';
  let lastPageText = '';
  try {
    assert.ok(pdf.numPages > 1);
    for (let index = 1; index <= pdf.numPages; index++) {
      const content = await (await pdf.getPage(index)).getTextContent();
      const pageText = content.items.filter(item => 'str' in item).map(item => item.str).join(' ');
      extracted += pageText + '\n';
      lastPageText = pageText;
    }
  } finally { await task.destroy(); }
  assert.match(extracted, /José/);
  assert.match(extracted, /₹/);
  assert.match(extracted, /लाख/);
  assert.match(extracted, /पुणे/);
  assert.match(extracted, /workflow 28/);
  assert.match(lastPageText, /workflow 28|TypeScript/);
  assert.doesNotMatch(extracted, new RegExp(`Internal engineering ${nonce}`));

  await page.getByRole('button', { name: 'Mark submitted', exact: true }).click();
  await page.getByRole('button', { name: 'Immutable snapshot', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Save candidate header', exact: true }).count(), 0);
  const stored = db.prepare('SELECT snapshot FROM tailored_resumes WHERE id=?').get(resumeId);
  assert.equal(JSON.parse(stored.snapshot).candidate.name, 'José अनिरुद्ध शर्मा with a deliberately long candidate name');
  db.prepare("UPDATE tailored_resumes SET candidate_name='Mutated after submission' WHERE id=?").run(resumeId);
  db.prepare("UPDATE career_achievements SET measurable_outcome='Mutated after submission' WHERE id=?").run(achievementIds[0]);
  const frozen = await page.request.get(`${base}/resumes/${resumeId}/pdf`);
  assert.equal(frozen.status(), 200);
  const frozenTask = pdfjs.getDocument({ data: new Uint8Array(await frozen.body()), verbosity: 0 });
  const frozenPdf = await frozenTask.promise;
  try {
    const firstPage = await (await frozenPdf.getPage(1)).getTextContent();
    const firstText = firstPage.items.filter(item => 'str' in item).map(item => item.str).join(' ');
    assert.match(firstText, /José/);
    assert.doesNotMatch(firstText, /Mutated after submission/);
  } finally { await frozenTask.destroy(); }
  const backupResponse = await page.request.post(`${base}/api/data`, { headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json' }, data: { operation: 'export' } });
  assert.equal(backupResponse.status(), 200);
  const backup = await backupResponse.json();
  assert.equal(backup.tables.tailored_resumes.find(row => row.id === resumeId).candidate_email, 'jose@example.com');
  await page.setViewportSize({ width: 375, height: 812 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: process.env.ACCEPTANCE_SCREENSHOT || '/tmp/issue286-mobile.png', fullPage: true });
  console.log('PASS identity separation/correction, explicit unsupported-glyph error, exact PDF preview route, embedded selectable Unicode, long header/URL, multipage layout, immutable snapshot, audit, backup and mobile layout');
} catch (error) {
  console.error(await page.locator('main').innerText().catch(() => 'No page content'));
  throw error;
} finally { await browser.close(); db.close(); }
