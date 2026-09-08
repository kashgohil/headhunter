import "server-only";

import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

import * as schema from "@/lib/db/schema";
import { prepareStorage, protectSqliteFiles } from "@/lib/storage/config";

const building = process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;
const { database: resolvedPath } = prepareStorage({ building });

export const sqlite = new Database(resolvedPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
protectSqliteFiles(resolvedPath);

export const db = drizzle(sqlite, { schema });

if (!building) {
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
}
