import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import { exportBackup, restoreBackup } from '../lib/data-transfer/backup.ts';

function database() {
  const db = new Database(':memory:');
  const journal = JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8'));
  for (const entry of journal.entries) db.exec(readFileSync(new URL(`../drizzle/${entry.tag}.sql`, import.meta.url), 'utf8'));
  db.pragma('foreign_keys=ON');
  return db;
}

describe('resume candidate identity persistence', () => {
  it('round-trips Unicode base and tailored identity through same-schema backup', () => {
    const db = database();
    try {
      db.prepare('INSERT INTO jobs (id,title,company,original_description,captured_at) VALUES (?,?,?,?,?)').run('job', 'Engineer', 'Fixture', 'Role', 1);
      const identity = ['José शर्मा', 'jose@example.com', '+91 98765 43210', 'पुणे, India', 'https://example.com/portfolio'];
      db.prepare('INSERT INTO base_resumes (id,name,candidate_name,candidate_email,candidate_phone,candidate_location,candidate_website,role_family,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run('base', 'Internal engineering label', ...identity, 'Engineering', 1, 1);
      db.prepare('INSERT INTO tailored_resumes (id,job_id,base_resume_id,version,template,candidate_name,candidate_email,candidate_phone,candidate_location,candidate_website,summary_proposed,summary_reason,summary_requirement,summary_confidence,summary_risk,section_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('resume', 'job', 'base', 1, 'classic', ...identity, 'Summary', 'Reason', 'Requirement', 'high', 'low', '[]', 1, 1);
      const backup = exportBackup(db);
      db.prepare("UPDATE tailored_resumes SET candidate_name='Changed'").run();
      restoreBackup(db, backup);
      assert.deepEqual(Object.values(db.prepare('SELECT candidate_name,candidate_email,candidate_phone,candidate_location,candidate_website FROM tailored_resumes').get()), identity);
      assert.equal(db.prepare('SELECT name FROM base_resumes').get().name, 'Internal engineering label');
    } finally { db.close(); }
  });
});
