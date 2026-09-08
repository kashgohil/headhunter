import { readFileSync } from 'node:fs';
import path from 'node:path';
import { restoreBackup } from '../lib/data-transfer/backup.ts';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
const databasePath = process.env.ACCEPTANCE_DATABASE;
assert.ok(databasePath && path.basename(databasePath).startsWith('issue282-'), 'Provide an isolated issue282-* database');
const base = process.env.ACCEPTANCE_URL;
assert.ok(base && ['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Provide the isolated local acceptance server URL');
const db = new Database(databasePath, { fileMustExist: true });
restoreBackup(db, JSON.parse(readFileSync(new URL('../docs/validation/issue-282/workspace.json', import.meta.url), 'utf8')));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true});
const page=await browser.newPage({viewport:{width:375,height:667},reducedMotion:'reduce'});page.setDefaultTimeout(15000);
const go=async p=>page.goto(base+p,{waitUntil:'networkidle'});
try{
await go('/settings/data');
const serverBackup = await page.evaluate(async () => (await fetch('/api/data', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'export'})})).json());
assert.equal(serverBackup.tables.jobs.length, 1);
assert.equal(serverBackup.tables.jobs[0].id, '2a652c0e-bd50-4a38-a304-d2bed6ec77fe');
await go('/jobs/2a652c0e-bd50-4a38-a304-d2bed6ec77fe');
await page.getByRole('tab',{name:/Answers/}).click();await page.getByLabel('Question',{exact:true}).fill('UNSAVED-282');await page.getByLabel('Answer',{exact:true}).fill('Keep this unsaved answer.');
await page.getByRole('tab',{name:'Plan',exact:true}).click();await page.getByRole('tab',{name:/Answers/}).click();assert.equal(await page.getByLabel('Question',{exact:true}).inputValue(),'UNSAVED-282');assert.equal(await page.getByLabel('Answer',{exact:true}).inputValue(),'Keep this unsaved answer.');assert.equal(await page.getByRole('tabpanel').count(),1);
await page.getByRole('tab',{name:'Outreach',exact:true}).click();await page.getByLabel('Message',{exact:true}).fill('UNSAVED OUTREACH');await page.getByRole('tab',{name:'Plan',exact:true}).click();await page.getByRole('tab',{name:'Outreach',exact:true}).click();assert.equal(await page.getByLabel('Message',{exact:true}).inputValue(),'UNSAVED OUTREACH');
await page.getByRole('tab',{name:'Plan',exact:true}).click();await page.getByLabel('Round',{exact:true}).fill('UTC acceptance round');await page.getByLabel('Scheduled at (UTC)',{exact:true}).fill('2026-09-10T15:30');await page.getByRole('button',{name:'Add round',exact:true}).click();await page.getByText('Interview round scheduled.',{exact:true}).waitFor();assert.equal(new Date(db.prepare("select scheduled_at from application_interviews where label='UTC acceptance round'").get().scheduled_at).toISOString(),'2026-09-10T15:30:00.000Z');
await page.getByRole('button',{name:/Recruiter screen.*Change/s}).click();await page.getByRole('combobox',{name:'Move to',exact:true}).click();await page.getByRole('option',{name:'Interviewing',exact:true}).click();await page.getByRole('button',{name:'Update stage',exact:true}).click();await page.getByText('Stage updated.',{exact:true}).waitFor();await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);await page.screenshot({path:'/tmp/issue282-mobile.png',fullPage:true});
await go('/resumes');await page.getByRole('combobox',{name:'Base resume',exact:true}).focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');assert.equal(await page.getByRole('listbox').count(),0);assert.equal(await page.getByRole('combobox',{name:'Target job',exact:true}).count(),1);
await go('/career-profile');await page.locator('summary').filter({hasText:'Add experience'}).click();await page.getByLabel('Started',{exact:true}).filter({visible:true}).click();assert.equal(await page.getByRole('button',{name:'Previous year',exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'Next year',exact:true}).count(),1);await page.keyboard.press('Escape');
await go('/jobs/new');
await page.getByLabel('Company',{exact:true}).fill('Fixture recovery');
await page.getByLabel('Original job description',{exact:true}).fill('Synthetic source to retain when validation fails.');
await page.getByRole('button',{name:'Save job',exact:true}).click();
await page.getByText('Add the role title.',{exact:true}).waitFor();
assert.equal(await page.getByLabel('Company',{exact:true}).inputValue(),'Fixture recovery');
assert.equal(await page.getByLabel('Original job description',{exact:true}).inputValue(),'Synthetic source to retain when validation fails.');
await page.getByLabel('Role title',{exact:true}).fill('Recovery role');
db.exec("CREATE TRIGGER issue282_capture_failure BEFORE INSERT ON jobs WHEN NEW.company = 'Fixture recovery' BEGIN SELECT RAISE(ABORT, 'fixture failure'); END");
try {
  await page.getByRole('button',{name:'Save job',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'The job could not be saved.'}).waitFor();
  assert.equal(await page.getByLabel('Original job description',{exact:true}).inputValue(),'Synthetic source to retain when validation fails.');
  assert.equal(db.prepare("select count(*) as n from jobs where company='Fixture recovery'").get().n,0);
} finally { db.exec('DROP TRIGGER IF EXISTS issue282_capture_failure'); }
await page.getByRole('button',{name:'Save job',exact:true}).click();
await page.waitForURL(/\/jobs\/(?!new$)[^/]+$/);
assert.equal(db.prepare("select count(*) as n from jobs where company='Fixture recovery'").get().n,1);
console.log('PASS validation and storage-failure input retention, rollback, successful capture retry');
console.log('PASS unsaved answer/outreach retention, one visible tab panel, UTC persisted timestamp, small-viewport stage save, keyboard dismissal/select labels/year navigation');
}finally{await browser.close();db.close();}
