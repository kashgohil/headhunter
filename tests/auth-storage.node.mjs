import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";

import {
  ownerSessionExists,
  registerOwnerSession,
  revokeOwnerSession,
} from "../lib/auth/storage.ts";

describe("owner session persistence", () => {
  it("stores only a digest and enforces expiry and logout", () => {
    const database = new Database(":memory:");
    database.exec(
      "CREATE TABLE owner_sessions (id TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL)",
    );
    const now = Date.UTC(2026, 8, 9, 0);
    try {
      registerOwnerSession(database, "private-session-id", new Date(now + 60_000), now);
      assert.equal(ownerSessionExists(database, "private-session-id", now), true);
      assert.equal(ownerSessionExists(database, "private-session-id", now + 60_000), false);
      assert.equal(
        database.prepare("SELECT id FROM owner_sessions").get().id.includes("private-session-id"),
        false,
      );
      revokeOwnerSession(database, "private-session-id");
      assert.equal(ownerSessionExists(database, "private-session-id", now), false);
    } finally {
      database.close();
    }
  });
});
