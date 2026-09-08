import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { exportBackup, restoreBackup, validateBackup } from '../lib/data-transfer/backup.ts';

function database() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec('CREATE TABLE parent (id TEXT PRIMARY KEY NOT NULL, snapshot TEXT NOT NULL); CREATE TABLE child (id TEXT PRIMARY KEY NOT NULL, parent_id TEXT NOT NULL REFERENCES parent(id) ON DELETE RESTRICT)');
  db.prepare('INSERT INTO parent VALUES (?, ?)').run('original', '{"immutable":"snapshot"}');
  db.prepare('INSERT INTO child VALUES (?, ?)').run('child', 'original');
  return db;
}
describe('workspace backup', () => {
  it('round-trips the complete migrated application schema', () => {
    const db = new Database(':memory:');
    try {
      const journal = JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8'));
      for (const entry of journal.entries) db.exec(readFileSync(new URL(`../drizzle/${entry.tag}.sql`, import.meta.url), 'utf8'));
      db.pragma('foreign_keys = ON');
      db.prepare('INSERT INTO jobs (id, title, company, original_description, captured_at) VALUES (?, ?, ?, ?, ?)').run('test', 'Engineer', 'Test', 'Immutable original', Date.now());
      db.prepare('INSERT INTO opportunities (id, job_id, created_at) VALUES (?, ?, ?)').run('test', 'test', Date.now());
      db.prepare("INSERT INTO calendar_connections (id,provider,encrypted_credentials,created_at,updated_at) VALUES ('google','google','encrypted-secret',?,?)").run(Date.now(), Date.now());
      const backup = exportBackup(db);
      assert.deepEqual(backup.tables.calendar_connections, []);
      assert.equal(exportBackup(db, { includePrivateIntegrations: true }).tables.calendar_connections[0].encrypted_credentials, 'encrypted-secret');
      restoreBackup(db, backup);
      assert.deepEqual(exportBackup(db).tables, backup.tables);
      assert.throws(() => db.prepare("UPDATE jobs SET original_description = 'changed'").run(), /immutable/);
    } finally { db.close(); }
  });
  it('round-trips all records and snapshots despite foreign-key table order', () => {
    const db = database();
    try {
      const backup = exportBackup(db);
      db.prepare('UPDATE parent SET snapshot = ?').run('changed');
      restoreBackup(db, JSON.parse(JSON.stringify(backup)));
      assert.deepEqual(db.prepare('SELECT snapshot FROM parent').get(), { snapshot: '{"immutable":"snapshot"}' });
      assert.deepEqual(db.pragma('foreign_key_check'), []);
      assert.deepEqual(exportBackup(db).tables, backup.tables);
    } finally { db.close(); }
  });
  it('rejects damage and incompatible schemas without deleting data', () => {
    const db = database();
    try {
      const backup = exportBackup(db);
      backup.tables.parent[0].snapshot = 'corrupted';
      assert.throws(() => restoreBackup(db, backup), /checksum/);
      assert.throws(() => validateBackup(db, { ...backup, schema: 'unknown' }), /schema/);
      assert.equal(db.prepare('SELECT count(*) AS n FROM parent').get().n, 1);
    } finally { db.close(); }
  });
  it('broken references roll back replacement', () => {
    const db = database();
    const corrupt = database();
    try {
      corrupt.pragma('foreign_keys = OFF');
      corrupt.prepare("UPDATE child SET parent_id = 'missing'").run();
      assert.throws(() => restoreBackup(db, exportBackup(corrupt)));
      assert.deepEqual(db.prepare('SELECT parent_id FROM child').get(), { parent_id: 'original' });
      assert.deepEqual(db.pragma('foreign_key_check'), []);
    } finally { db.close(); corrupt.close(); }
  });
});
