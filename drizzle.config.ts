import path from "node:path";
import { defineConfig } from "drizzle-kit";

const directory = process.env.HEADHUNTER_DATA_DIR
  ? path.resolve(process.env.HEADHUNTER_DATA_DIR)
  : path.join(process.cwd(), ".data");
const databaseName = process.env.DATABASE_FILE ?? "headhunter.db";
if (path.basename(databaseName) !== databaseName || !databaseName.endsWith(".db")) {
  throw new Error("DATABASE_FILE must be a .db filename without a path.");
}

export default defineConfig({
  dialect: "sqlite",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: path.join(directory, databaseName) },
});
