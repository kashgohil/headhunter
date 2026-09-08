import { createHash } from "node:crypto";
import type Database from "better-sqlite3";

function digest(sessionId: string) {
  return createHash("sha256").update(sessionId).digest("hex");
}

export function registerOwnerSession(
  database: Database.Database,
  sessionId: string,
  expiresAt: Date,
  now = Date.now(),
) {
  database.transaction(() => {
    database.prepare("DELETE FROM owner_sessions WHERE expires_at <= ?").run(now);
    database
      .prepare(
        "INSERT INTO owner_sessions (id, expires_at, created_at) VALUES (?, ?, ?)",
      )
      .run(digest(sessionId), expiresAt.getTime(), now);
  })();
}

export function ownerSessionExists(
  database: Database.Database,
  sessionId: string,
  now = Date.now(),
) {
  return Boolean(
    database
      .prepare("SELECT 1 FROM owner_sessions WHERE id = ? AND expires_at > ?")
      .get(digest(sessionId), now),
  );
}

export function revokeOwnerSession(
  database: Database.Database,
  sessionId: string,
) {
  database.prepare("DELETE FROM owner_sessions WHERE id = ?").run(digest(sessionId));
}
