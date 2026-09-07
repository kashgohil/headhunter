import "server-only";

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "@/lib/db/schema";

const dataDirectory = path.join(process.cwd(), ".data");
const resolvedPath = path.join(
  dataDirectory,
  process.env.DATABASE_FILE ?? "headhunter.db",
);

fs.mkdirSync(dataDirectory, { recursive: true });

const sqlite = new Database(resolvedPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
