import { accessSync, chmodSync, constants, mkdirSync, openSync, closeSync, unlinkSync } from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

function fail(message) {
  process.stderr.write(`Hosted startup refused: ${message}\n`);
  process.exit(1);
}

if (process.env.HEADHUNTER_ACCESS_MODE !== "hosted") fail("HEADHUNTER_ACCESS_MODE must be hosted.");
try {
  const origin = new URL(process.env.APP_ORIGIN);
  if (origin.protocol !== "https:" || origin.pathname !== "/" || origin.search || origin.hash || origin.username || origin.password) throw new Error();
} catch {
  fail("APP_ORIGIN must be an HTTPS origin without credentials or a path.");
}
if (Buffer.byteLength(process.env.HEADHUNTER_SESSION_SECRET ?? "") < 32) fail("the session secret must contain at least 32 bytes.");
if (!process.env.HEADHUNTER_OWNER_PASSWORD_HASH?.startsWith("scrypt$32768$8$1$")) fail("the owner password hash is missing or unsupported.");
const backupKey = process.env.HEADHUNTER_BACKUP_KEY ?? "";
const decodedBackupKey = /^[a-f0-9]{64}$/i.test(backupKey)
  ? Buffer.from(backupKey, "hex")
  : Buffer.from(backupKey, "base64");
if (decodedBackupKey.length !== 32) fail("the backup key must encode exactly 32 bytes.");
if (process.env.HEADHUNTER_PERSISTENT_STORAGE !== "true") fail("persistent storage is not attested.");
if (process.env.HEADHUNTER_STORAGE_ENCRYPTED !== "true") fail("encrypted storage is not attested.");

const directory = process.env.HEADHUNTER_DATA_DIR;
if (!directory || !path.isAbsolute(directory) || directory === "/") fail("HEADHUNTER_DATA_DIR must be an absolute non-root path.");
mkdirSync(directory, { recursive: true, mode: 0o700 });
chmodSync(directory, 0o700);
accessSync(directory, constants.R_OK | constants.W_OK);
const probe = path.join(directory, `.startup-${process.pid}`);
try {
  const handle = openSync(probe, "wx", 0o600);
  closeSync(handle);
  unlinkSync(probe);
} catch {
  fail("the persistent data directory is not writable.");
}

const migration = spawnSync("node", ["node_modules/drizzle-kit/bin.cjs", "migrate"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});
if (migration.status !== 0) fail("database migration failed; the server was not started.");

const server = spawn("node", ["node_modules/next/dist/bin/next", "start", "-p", "3050"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}
server.on("exit", (code) => process.exit(code ?? 1));
