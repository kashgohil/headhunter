import { createHash } from "node:crypto";
import type Database from "better-sqlite3";

type Row = Record<string, string | number | null>;
export type Backup = {
  format: "headhunter";
  version: 1;
  exportedAt: string;
  schema: string;
  tables: Record<string, Row[]>;
  checksum: string;
};
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const privateIntegrationTables = new Set([
  "calendar_connections",
  "calendar_oauth_states",
  "external_calendars",
  "external_calendar_events",
  "calendar_event_links",
]);
const neverExportedTables = new Set(["owner_sessions"]);

function definitions(database: Database.Database) {
  return database
    .prepare(
      "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations' ORDER BY name",
    )
    .all() as Array<{ name: string; sql: string }>;
}

export function exportBackup(database: Database.Database, options: { includePrivateIntegrations?: boolean } = {}): Backup {
  return database.transaction(() => {
    const schema = definitions(database);
    const tables = Object.fromEntries(
      schema.map(({ name }) => [
        name,
        neverExportedTables.has(name) ||
        (privateIntegrationTables.has(name) && !options.includePrivateIntegrations)
          ? []
          : database.prepare(`SELECT * FROM ${quote(name)}`).all() as Row[],
      ]),
    );
    const content = {
      format: "headhunter" as const,
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      schema: digest(schema),
      tables,
    };
    return { ...content, checksum: digest(content) };
  })();
}

export function validateBackup(
  database: Database.Database,
  input: unknown,
): Backup {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Choose a Headhunter backup file.");
  const backup = input as Backup;
  if (
    backup.format !== "headhunter" ||
    backup.version !== 1 ||
    !Number.isFinite(Date.parse(backup.exportedAt))
  )
    throw new Error("Unsupported backup format or version.");
  const schema = definitions(database);
  if (backup.schema !== digest(schema))
    throw new Error(
      "This backup uses a different database schema. Restore it with the matching Headhunter version.",
    );
  if (
    !backup.tables ||
    typeof backup.tables !== "object" ||
    Array.isArray(backup.tables) ||
    Object.keys(backup.tables).sort().join("\n") !==
      schema.map(({ name }) => name).join("\n")
  )
    throw new Error("The backup has missing or unexpected tables.");
  const { format, version, exportedAt, tables } = backup;
  if (
    digest({ format, version, exportedAt, schema: backup.schema, tables }) !==
    backup.checksum
  )
    throw new Error(
      "The backup checksum does not match. The file may be damaged.",
    );
  for (const { name } of schema) {
    const columns = database
      .prepare(`PRAGMA table_info(${quote(name)})`)
      .all() as Array<{ name: string; type: string; notnull: number }>;
    if (!Array.isArray(tables[name]))
      throw new Error(`Invalid records in ${name}.`);
    for (const row of tables[name]) {
      if (
        !row ||
        typeof row !== "object" ||
        Array.isArray(row) ||
        Object.keys(row).sort().join("\n") !==
          columns
            .map((column) => column.name)
            .sort()
            .join("\n")
      )
        throw new Error(`Invalid columns in ${name}.`);
      for (const column of columns) {
        const value = row[column.name];
        if (value === null && !column.notnull) continue;
        if (column.type === "TEXT" && typeof value === "string") continue;
        if (
          (column.type === "INTEGER" || column.type === "REAL") &&
          typeof value === "number" &&
          Number.isFinite(value) &&
          (column.type !== "INTEGER" || Number.isSafeInteger(value))
        )
          continue;
        throw new Error(`Invalid value in ${name}.${column.name}.`);
      }
    }
  }
  return backup;
}

export function restoreBackup(database: Database.Database, input: unknown) {
  const backup = validateBackup(database, input);
  database.transaction(() => {
    database.pragma("defer_foreign_keys = ON");
    const schema = definitions(database);
    for (const { name } of [...schema].reverse())
      database.prepare(`DELETE FROM ${quote(name)}`).run();
    for (const { name } of schema) {
      const rows = backup.tables[name];
      if (!rows.length) continue;
      const columns = Object.keys(rows[0]);
      const insert = database.prepare(
        `INSERT INTO ${quote(name)} (${columns.map(quote).join(",")}) VALUES (${columns.map(() => "?").join(",")})`,
      );
      for (const row of rows)
        insert.run(...columns.map((column) => row[column]));
    }
    if ((database.pragma("foreign_key_check") as unknown[]).length)
      throw new Error(
        "The backup has broken references. Your current workspace was kept.",
      );
  })();
}
