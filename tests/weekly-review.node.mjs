import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import {
  createSavedReview,
  getSavedReview,
  saveReviewEdits,
} from "../lib/weekly-review/storage.ts";
import { exportBackup, restoreBackup } from "../lib/data-transfer/backup.ts";
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
  return db;
}
const snapshot = {
  version: 1,
  weekStart: "2026-08-31",
  weekEnd: "2026-09-07",
  generatedAt: "2026-09-08T00:00:00Z",
  weeklyHours: 3,
  metrics: [
    {
      key: "captures",
      label: "New opportunities",
      definition: "Captured jobs",
      items: [
        {
          id: "original",
          label: "Original company · title",
          href: "/jobs/original",
        },
      ],
    },
  ],
  missedTasks: [],
  progressed: [],
  closed: [],
  risks: [],
  signals: [],
  caveats: [],
  suggestedPlan: "Prepare one role",
  suggestedHours: 1,
  suggestedExperiment: "One change",
};
const edits = {
  reflection: "Useful week",
  interpretation: "Small sample",
  experimentOne: "Hypothesis",
  experimentTwo: "",
  nextWeekPlan: "Work on one role",
  availableHours: 3,
  plannedHours: 2,
  status: "reviewed",
};
describe("weekly review persistence", () => {
  it("creates a week once and preserves facts across edits, reopen and backup restore", () => {
    const db = database();
    try {
      const id = createSavedReview(db, snapshot);
      assert.equal(createSavedReview(db, { ...snapshot, metrics: [] }), id);
      assert.equal(saveReviewEdits(db, id, 1, edits), 2);
      assert.deepEqual(getSavedReview(db, id).snapshot, snapshot);
      const backup = exportBackup(db);
      db.prepare("DELETE FROM weekly_reviews").run();
      restoreBackup(db, backup);
      assert.equal(getSavedReview(db, id).reflection, "Useful week");
      assert.deepEqual(getSavedReview(db, id).snapshot, snapshot);
      assert.throws(
        () =>
          db
            .prepare("UPDATE weekly_reviews SET snapshot='{}' WHERE id=?")
            .run(id),
        /immutable/,
      );
      assert.throws(
        () =>
          db
            .prepare(
              "UPDATE weekly_reviews SET week_start='2026-08-24' WHERE id=?",
            )
            .run(id),
        /immutable/,
      );
    } finally {
      db.close();
    }
  });
  it("rejects stale revisions and preserves winning notes", () => {
    const db = database();
    try {
      const id = createSavedReview(db, snapshot);
      saveReviewEdits(db, id, 1, edits);
      assert.throws(
        () => saveReviewEdits(db, id, 1, { ...edits, reflection: "Stale" }),
        /another tab/,
      );
      assert.equal(getSavedReview(db, id).reflection, "Useful week");
      assert.equal(getSavedReview(db, id).revision, 2);
    } finally {
      db.close();
    }
  });
  it("rolls back review edits and creation if auditing fails", () => {
    const db = database();
    try {
      const id = createSavedReview(db, snapshot);
      db.exec(
        "CREATE TRIGGER reject_audit BEFORE INSERT ON audit_events BEGIN SELECT RAISE(ABORT,'audit failed'); END",
      );
      assert.throws(() => saveReviewEdits(db, id, 1, edits), /audit failed/);
      assert.equal(getSavedReview(db, id).revision, 1);
      assert.equal(getSavedReview(db, id).reflection, "");
      assert.throws(
        () => createSavedReview(db, { ...snapshot, weekStart: "2026-08-24" }),
        /audit failed/,
      );
      assert.equal(
        db.prepare("SELECT count(*) n FROM weekly_reviews").get().n,
        1,
      );
    } finally {
      db.close();
    }
  });
  it("rejects oversubscribed plans without modifying records", () => {
    const db = database();
    try {
      const id = createSavedReview(db, snapshot);
      assert.throws(
        () => saveReviewEdits(db, id, 1, { ...edits, plannedHours: 4 }),
        /exceed/,
      );
      assert.equal(getSavedReview(db, id).revision, 1);
    } finally {
      db.close();
    }
  });
});
