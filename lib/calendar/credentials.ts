import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import type { CalendarCredentials } from "@/lib/calendar/types";

function credentialKey(value = process.env.CALENDAR_TOKEN_KEY) {
  if (!value) throw new Error("Calendar credential encryption is not configured.");
  const key = /^[a-f0-9]{64}$/i.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("CALENDAR_TOKEN_KEY must encode exactly 32 bytes.");
  return key;
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
  const decipher = createDecipheriv("aes-256-gcm", credentialKey(keyValue), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]).toString("utf8");
  const parsed = JSON.parse(plaintext) as Partial<CalendarCredentials>;
  if (typeof parsed.accessToken !== "string" || typeof parsed.refreshToken !== "string" || typeof parsed.expiresAt !== "number") {
    throw new Error("Stored calendar credentials are invalid.");
  }
  return parsed as CalendarCredentials;
}
