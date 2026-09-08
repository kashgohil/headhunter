import { scrypt as scryptCallback, randomBytes } from "node:crypto";
import { promisify } from "node:util";

const password = process.argv[2]
  ? ""
  : (await Bun.stdin.text()).replace(/\r?\n$/, "");
if (!password || password.length < 14) {
  process.stderr.write(
    "Pipe a password of at least 14 characters on standard input; command-line arguments are refused.\n",
  );
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
