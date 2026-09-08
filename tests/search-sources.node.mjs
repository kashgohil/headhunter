import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { searchWorkspace } from "../lib/search/query.ts";
import { getSourceRecord, sourceValue } from "../lib/sources/records.ts";
function database() {
  const db = new Database(":memory:");
  const journal = JSON.parse(
    readFileSync(
      new URL("../drizzle/meta/_journal.json", import.meta.url),
      "utf8",
    ),
  );
  for (const entry of journal.entries)
    db.exec(
      readFileSync(
        new URL(`../drizzle/${entry.tag}.sql`, import.meta.url),
        "utf8",
      ),
    );
  db.pragma("foreign_keys = ON");
  db.prepare(
    "INSERT INTO jobs (id,title,company,original_description,captured_at) VALUES (?,?,?,?,?)",
  ).run("job", "Platform engineer", "Acme", "Needle 100% reliable systems", 1);
  db.prepare(
    "INSERT INTO contacts (id,name,company,context,created_at,updated_at) VALUES (?,?,?,?,?,?)",
  ).run("contact", "Sam", "Acme", "Needle referral", 1, 1);
  db.prepare(
    "INSERT INTO application_artifacts (id,job_id,kind,name,content,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
  ).run("doc", "job", "cover_letter", "Letter", "Needle document", 1, 1);
  db.prepare(
    "INSERT INTO opportunity_research_notes (id,job_id,content,created_at,updated_at) VALUES (?,?,?,?,?)",
  ).run("note", "job", "Needle private note", 1, 1);
  db.prepare(
    "INSERT INTO career_answers (id,question,answer,created_at,updated_at) VALUES (?,?,?,?,?)",
  ).run("answer", "Why Acme?", "Needle canonical answer", 1, 1);
  db.prepare(
    "INSERT INTO company_research_entries (id,company_name,normalized_company_name,topic,content,provenance,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
  ).run(
    "company",
    "Acme",
    "acme",
    "team",
    "Needle company research",
    "inference",
    1,
    1,
  );
  return db;
}
describe("global search and factual sources", () => {
  it("finds all six kinds with working destinations and literal queries", () => {
    const db = database();
    try {
      const results = searchWorkspace(db, "needle");
      assert.deepEqual(
        [...new Set(results.results.map((r) => r.kind))].sort(),
        ["answers", "companies", "contacts", "documents", "jobs", "notes"],
      );
      assert.ok(results.results.every((r) => r.href.startsWith("/")));
      assert.equal(searchWorkspace(db, "Needle reliable", "jobs").total, 1);
      assert.equal(searchWorkspace(db, "100%").total, 1);
      assert.equal(searchWorkspace(db, "%").total, 1);
      assert.equal(searchWorkspace(db, "' OR 1=1 --").total, 0);
      assert.equal(searchWorkspace(db, "").total, 0);
      assert.equal(
        searchWorkspace(db, "needle", "answers").results[0].href,
        "/sources/answer/answer",
      );
    } finally {
      db.close();
    }
  });
  it("paginates deterministically and immediately reflects edits and deletes", () => {
    const db = database();
    try {
      for (let n = 0; n < 30; n++)
        db.prepare(
          "INSERT INTO contacts (id,name,context,created_at,updated_at) VALUES (?,?,?,?,?)",
        ).run(`c${n}`, `Person ${n}`, "Needle", 1, 1);
      const first = searchWorkspace(db, "needle", "contacts");
      const second = searchWorkspace(db, "needle", "contacts", 2);
      assert.equal(first.total, 31);
      assert.equal(first.results.length, 25);
      assert.equal(second.results.length, 6);
      assert.equal(
        new Set([...first.results, ...second.results].map((r) => r.id)).size,
        31,
      );
      db.prepare(
        "UPDATE contacts SET context='Changed' WHERE id='contact'",
      ).run();
      assert.equal(searchWorkspace(db, "needle", "contacts").total, 30);
      db.prepare("DELETE FROM contacts WHERE id='c0'").run();
      assert.equal(searchWorkspace(db, "needle", "contacts").total, 29);
      assert.equal(searchWorkspace(db, "needle", "contacts", NaN).page, 1);
    } finally {
      db.close();
    }
  });
  it("searches readable submitted snapshots without exposing serialized fields or newer draft text", () => {
    const db = database();
    try {
      db.prepare(
        "INSERT INTO base_resumes (id,name,role_family,created_at,updated_at) VALUES ('base','Base','Engineering',1,1)",
      ).run();
      const snapshot = JSON.stringify({
        summary: "Frozenneedle summary",
        skills: ["SnapshotSkill"],
        experiences: [
          {
            id: "private-evidence-id",
            company: "Acme",
            title: "Engineer",
            bullets: [
              {
                text: "Frozen accomplishment",
                evidenceIds: ["private-evidence-id"],
              },
            ],
          },
        ],
      });
      db.prepare(
        "INSERT INTO tailored_resumes (id,job_id,base_resume_id,version,template,summary_proposed,summary_reason,summary_requirement,summary_confidence,summary_risk,section_order,snapshot,created_at,updated_at) VALUES ('resume','job','base',1,'classic','NewerDraftneedle','Reason','Requirement','high','low','[]',?,1,1)",
      ).run(snapshot);
      assert.equal(searchWorkspace(db, "SnapshotSkill").total, 1);
      assert.equal(searchWorkspace(db, "NewerDraftneedle").total, 0);
      const result = searchWorkspace(db, "Frozenneedle").results[0];
      assert.ok(result.content.includes("Frozen accomplishment"));
      assert.ok(!result.content.includes("private-evidence-id"));
      assert.ok(!result.content.includes("evidenceIds"));
    } finally {
      db.close();
    }
  });
  it("keeps provenance explicit and handles removed and invalid sources", () => {
    const db = database();
    try {
      assert.equal(
        sourceValue('["literal original"]', "original_description"),
        '["literal original"]',
      );
      assert.equal(
        sourceValue('["TypeScript","React"]', "technologies"),
        "TypeScript\nReact",
      );
      assert.equal(
        getSourceRecord(db, "company", "company").record.provenance,
        "inference",
      );
      assert.equal(
        getSourceRecord(db, "evidence", "answer").record.verification_state,
        "needs_clarification",
      );
      assert.equal(
        getSourceRecord(db, "job", "job").record.original_description,
        "Needle 100% reliable systems",
      );
      assert.equal(getSourceRecord(db, "evidence", "missing"), null);
      assert.equal(getSourceRecord(db, "__proto__", "job"), null);
      assert.equal(getSourceRecord(db, "jobs; DROP TABLE jobs", "job"), null);
    } finally {
      db.close();
    }
  });
});
