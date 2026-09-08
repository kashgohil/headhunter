import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import type { CalendarCredentials } from "@/lib/calendar/types";

function credentialKey(value = process.env.CALENDAR_TOKEN_KEY) {
  if (!value) throw new Error("Calendar credential encryption is not configured.");
  const key = /^[a-f0-9]{64}$/i.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("CALENDAR_TOKEN_KEY must encode exactly 32 bytes.");
  return key;
}

function decodeBase64Url(value: string, field: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error(`Stored calendar credential ${field} is invalid.`);
  const decoded = Buffer.from(value, "base64url");
  if (!decoded.length || decoded.toString("base64url") !== value) {
    throw new Error(`Stored calendar credential ${field} is invalid.`);
  }
  return decoded;
}

export function encryptCalendarCredentials(credentials: CalendarCredentials, keyValue?: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", credentialKey(keyValue), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(credentials), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptCalendarCredentials(value: string, keyValue?: string): CalendarCredentials {
  const [version, ivValue, tagValue, ciphertextValue, extra] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !ciphertextValue || extra) throw new Error("Stored calendar credentials are invalid.");
  const decipher = createDecipheriv("aes-256-gcm", credentialKey(keyValue), decodeBase64Url(ivValue, "IV"));
  decipher.setAuthTag(decodeBase64Url(tagValue, "authentication tag"));
  const plaintext = Buffer.concat([decipher.update(decodeBase64Url(ciphertextValue, "ciphertext")), decipher.final()]).toString("utf8");
  const parsed = JSON.parse(plaintext) as Partial<CalendarCredentials>;
  if (typeof parsed.accessToken !== "string" || typeof parsed.refreshToken !== "string" || typeof parsed.expiresAt !== "number") {
    throw new Error("Stored calendar credentials are invalid.");
  }
  return parsed as CalendarCredentials;
}
