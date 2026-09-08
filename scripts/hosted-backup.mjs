import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

import { exportBackup, validateBackup } from "../lib/data-transfer/backup.ts";
import { decryptBackup, encryptBackup } from "../lib/data-transfer/encryption.ts";

const [operation, target] = process.argv.slice(2);
if (!target || (operation !== "create" && operation !== "verify")) {
  throw new Error("Usage: node scripts/hosted-backup.mjs create <directory> | verify <file>");
}

const directory = process.env.HEADHUNTER_DATA_DIR
  ? path.resolve(process.env.HEADHUNTER_DATA_DIR)
  : path.join(process.cwd(), ".data");
const databaseName = process.env.DATABASE_FILE ?? "headhunter.db";
if (path.basename(databaseName) !== databaseName || !databaseName.endsWith(".db")) {
  throw new Error("DATABASE_FILE must be a .db filename without a path.");
}
const sqlite = new Database(path.join(directory, databaseName), {
  fileMustExist: true,
  readonly: operation === "verify",
});
sqlite.pragma("foreign_keys = ON");

if (operation === "create") {
  const outputDirectory = path.resolve(target);
  mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
  chmodSync(outputDirectory, 0o700);
  const stamp = new Date().toISOString().replaceAll(":", "-");
  const file = path.join(outputDirectory, `headhunter-${stamp}.hhbackup`);
  const backup = exportBackup(sqlite, { includePrivateIntegrations: true });
  writeFileSync(file, JSON.stringify(encryptBackup(backup)), {
    flag: "wx",
    mode: 0o600,
  });
  validateBackup(sqlite, decryptBackup(JSON.parse(readFileSync(file, "utf8"))));
  process.stdout.write(`${file}\n`);
} else {
  const file = path.resolve(target);
  validateBackup(sqlite, decryptBackup(JSON.parse(readFileSync(file, "utf8"))));
  process.stdout.write("Backup decrypted and passed schema, checksum, and record validation.\n");
}
sqlite.close();
