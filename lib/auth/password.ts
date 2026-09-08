import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
const keyLength = 32;
const parameters = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function derive(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, parameters, (error, value) => {
      if (error) reject(error);
      else resolve(value);
    });
  });
}

export async function hashOwnerPassword(password: string) {
  if (password.length < 14) throw new Error("Use at least 14 characters.");
  const salt = randomBytes(16);
  const derived = await derive(password, salt);
  return `scrypt$${parameters.N}$${parameters.r}$${parameters.p}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyOwnerPassword(password: string, encoded: string | undefined) {
  if (!encoded || password.length > 1024) return false;
  const [algorithm, n, r, p, saltValue, hashValue, extra] = encoded.split("$");
  if (algorithm !== "scrypt" || extra) return false;
  const parsed = { N: Number(n), r: Number(r), p: Number(p) };
  if (
    parsed.N !== parameters.N ||
    parsed.r !== parameters.r ||
    parsed.p !== parameters.p
  ) return false;
  try {
    const salt = Buffer.from(saltValue, "base64url");
    const expected = Buffer.from(hashValue, "base64url");
    if (salt.length !== 16 || expected.length !== keyLength) return false;
    const actual = await derive(password, salt);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
