import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import {
  createExperiment,
  updateExperiment,
  listExperiments,
  saveAnnotation,
  listAnnotations,
  experimentSchema,
} from "../lib/analytics/storage.ts";
import { exportBackup, restoreBackup } from "../lib/data-transfer/backup.ts";
function database() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys=ON");
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
  return db;
}
const plan = {
  title: "Referral test",
  hypothesis: "Referral first improves interviews",
  variable: "referral",
  baseline: "no referral recorded",
  treatment: "referral recorded",
  targetDimension: "all",
  targetValue: "",
  controls: "Keep roles and resume strategy constant",
  startDate: "2026-01-01",
  endDate: "2099-12-31",
  outcome: "interviewing",
  observationDays: 14,
};
describe("experiment persistence", () => {
  it("validates single-variable plans and real dates", () => {
    for (const change of [
      { endDate: "2026-02-30" },
      { startDate: "2100-01-01" },
      { treatment: " NO referral   recorded " },
      { targetDimension: "referral", targetValue: "yes" },
      { targetDimension: "location", targetValue: "" },
      { observationDays: 0 },
      { variable: ["source", "referral"] },
      { baseline: "Not recorded" },
    ])
      assert.equal(
        experimentSchema.safeParse({ ...plan, ...change }).success,
        false,
      );
  });
  it("allows one running experiment, rejects stale saves and premature completion", () => {
    const db = database();
    try {
      const id = createExperiment(db, plan);
      const other = createExperiment(db, plan);
      assert.equal(updateExperiment(db, id, 1, "running", "Started"), 2);
      assert.throws(
        () => updateExperiment(db, other, 1, "running", ""),
        /running experiment/,
      );
      assert.throws(
        () => updateExperiment(db, id, 1, "running", "Stale"),
        /another tab/,
      );
      assert.throws(
        () =>
          updateExperiment(db, id, 2, "completed", "Too soon", {
            readyToComplete: true,
          }),
        /observation period/,
      );
      assert.equal(
        listExperiments(db).find((e) => e.id === id).notes,
        "Started",
      );
      updateExperiment(db, id, 2, "cancelled", "Stopped");
      assert.throws(
        () => updateExperiment(db, id, 3, "running", ""),
        /cannot move/,
      );
      updateExperiment(db, other, 1, "running", "");
    } finally {
      db.close();
    }
  });
  it("freezes definitions and completed results, preserves notes and backups", () => {
    const db = database();
    try {
      const id = createExperiment(db, { ...plan, endDate: "2026-01-02" });
      db.prepare(
        "UPDATE analytics_experiments SET status='running' WHERE id=?",
      ).run(id);
      const result = {
        readyToComplete: true,
        arms: [],
        generatedAt: "2026-02-01T00:00:00Z",
      };
      updateExperiment(db, id, 1, "completed", "Uncertain", result);
      updateExperiment(db, id, 2, "completed", "Updated notes", {
        ...result,
        arms: ["changed"],
      });
      assert.deepEqual(listExperiments(db)[0].result, result);
      assert.throws(
        () =>
          db
            .prepare("UPDATE analytics_experiments SET plan='{}' WHERE id=?")
            .run(id),
        /immutable/,
      );
      assert.throws(
        () =>
          db
            .prepare("UPDATE analytics_experiments SET result='{}' WHERE id=?")
            .run(id),
        /immutable/,
      );
      const backup = exportBackup(db);
      db.exec("DELETE FROM analytics_experiments");
      restoreBackup(db, backup);
      assert.equal(listExperiments(db)[0].notes, "Updated notes");
      assert.deepEqual(listExperiments(db)[0].result, result);
    } finally {
      db.close();
    }
  });
  it("audits transactionally and rolls back creation and updates when audit fails", () => {
    const db = database();
    try {
      const id = createExperiment(db, plan);
      db.exec(
        "CREATE TRIGGER reject_audit BEFORE INSERT ON audit_events BEGIN SELECT RAISE(ABORT,'audit failed'); END",
      );
      assert.throws(() => createExperiment(db, plan), /audit failed/);
      assert.throws(
        () => updateExperiment(db, id, 1, "running", "lost"),
        /audit failed/,
      );
      assert.equal(listExperiments(db).length, 1);
      assert.equal(listExperiments(db)[0].revision, 1);
    } finally {
      db.close();
    }
  });
  it("saves annotation gaps and zero effort, rejects stale edits and invalid job references", () => {
    const db = database();
    try {
      db.prepare(
        "INSERT INTO jobs (id,title,company,original_description,captured_at) VALUES ('a','Role','Company','description',0)",
      ).run();
      const annotation = {
        roleFamily: "Engineering",
        industry: "",
        companySize: "",
        resumeStrategy: "",
        preparationMinutes: 0,
      };
      assert.equal(saveAnnotation(db, "a", 0, annotation), 1);
      assert.equal(listAnnotations(db)[0].preparationMinutes, 0);
      assert.throws(
        () =>
          saveAnnotation(db, "a", 0, { ...annotation, roleFamily: "Stale" }),
        /another tab/,
      );
      assert.throws(
        () => saveAnnotation(db, "missing", 0, annotation),
        /FOREIGN KEY/,
      );
      assert.throws(() =>
        saveAnnotation(db, "a", 1, { ...annotation, preparationMinutes: -1 }),
      );
      saveAnnotation(db, "a", 1, { ...annotation, preparationMinutes: "" });
      assert.equal(listAnnotations(db)[0].preparationMinutes, null);
      const backup = exportBackup(db);
      db.exec("DELETE FROM analytics_annotations");
      restoreBackup(db, backup);
      assert.equal(listAnnotations(db)[0].roleFamily, "Engineering");
    } finally {
      db.close();
    }
  });
});
