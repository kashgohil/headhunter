import fs from "node:fs";
import path from "node:path";

import { accessMode } from "@/lib/auth/config";

type StorageOptions = {
  building?: boolean;
  environment?: Record<string, string | undefined>;
  workingDirectory?: string;
};

export function storagePaths(options: StorageOptions = {}) {
  const environment = options.environment ?? process.env;
  const workingDirectory = options.workingDirectory ?? process.cwd();
  const configuredDirectory = environment.HEADHUNTER_DATA_DIR;
  const directory = configuredDirectory
    ? path.resolve(configuredDirectory)
    : path.join(workingDirectory, ".data");
  const databaseName = environment.DATABASE_FILE ?? "headhunter.db";
  if (path.basename(databaseName) !== databaseName || !databaseName.endsWith(".db")) {
    throw new Error("DATABASE_FILE must be a .db filename without a path.");
  }
  if (!options.building && accessMode(environment) === "hosted") {
    if (!configuredDirectory || !path.isAbsolute(configuredDirectory)) {
      throw new Error("Hosted mode requires an absolute HEADHUNTER_DATA_DIR.");
    }
    if (environment.HEADHUNTER_PERSISTENT_STORAGE !== "true") {
      throw new Error("Hosted mode requires persistent storage attestation.");
    }
    if (environment.HEADHUNTER_STORAGE_ENCRYPTED !== "true") {
      throw new Error("Hosted mode requires encrypted storage attestation.");
    }
  }
  return {
    database: path.join(directory, databaseName),
    directory,
    recovery: path.join(directory, "recovery", databaseName),
  };
}

export function prepareStorage(options: StorageOptions = {}) {
  const paths = storagePaths(options);
  fs.mkdirSync(paths.directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(paths.directory, 0o700);
  fs.accessSync(paths.directory, fs.constants.R_OK | fs.constants.W_OK);
  return paths;
}

export function protectSqliteFiles(database: string) {
  for (const name of [database, `${database}-wal`, `${database}-shm`]) {
    if (fs.existsSync(name)) fs.chmodSync(name, 0o600);
  }
}
