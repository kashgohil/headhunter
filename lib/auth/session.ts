import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "headhunter_session";
export const SESSION_DURATION_SECONDS = 12 * 60 * 60;

type OwnerSession = {
  exp: number;
  iat: number;
  sid: string;
  sub: "owner";
  v: 1;
};

function encode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function validateSessionSecret(secret: string | undefined) {
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("HEADHUNTER_SESSION_SECRET must contain at least 32 bytes.");
  }
  return secret;
}

export function createOwnerSession(
  secret: string,
  now = Date.now(),
): { expiresAt: Date; token: string } {
  validateSessionSecret(secret);
  const issuedAt = Math.floor(now / 1000);
  const session: OwnerSession = {
    exp: issuedAt + SESSION_DURATION_SECONDS,
    iat: issuedAt,
    sid: randomUUID(),
    sub: "owner",
    v: 1,
  };
  const payload = encode(JSON.stringify(session));
  return {
    expiresAt: new Date(session.exp * 1000),
    token: `${payload}.${signature(payload, secret)}`,
  };
}

export function verifyOwnerSession(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): OwnerSession | null {
  if (!token) return null;
  validateSessionSecret(secret);
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) return null;
  const expected = Buffer.from(signature(payload, secret));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return null;
  }
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      value?.v !== 1 ||
      value?.sub !== "owner" ||
      typeof value.sid !== "string" ||
      typeof value.iat !== "number" ||
      typeof value.exp !== "number" ||
      value.iat > Math.floor(now / 1000) + 60 ||
      value.exp <= Math.floor(now / 1000) ||
      value.exp - value.iat !== SESSION_DURATION_SECONDS
    ) {
      return null;
    }
    return value as OwnerSession;
  } catch {
    return null;
  }
}
