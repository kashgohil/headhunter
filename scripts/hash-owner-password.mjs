import { scrypt as scryptCallback, randomBytes } from "node:crypto";
import { promisify } from "node:util";

const password = process.argv[2];
if (!password || password.length < 14) {
  process.stderr.write("Usage: bun scripts/hash-owner-password.mjs '<14+ character password>'\n");
  process.exit(1);
}
const salt = randomBytes(16);
const derived = await promisify(scryptCallback)(password, salt, 32, {
  N: 32768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
});
process.stdout.write(
  `scrypt$32768$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}\n`,
);
