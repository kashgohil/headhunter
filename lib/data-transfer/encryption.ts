import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const format = "headhunter.encrypted-backup";
const associatedData = Buffer.from(`${format}.v1`, "utf8");

export type EncryptedBackup = {
  algorithm: "aes-256-gcm";
  ciphertext: string;
  format: typeof format;
  iv: string;
  tag: string;
  version: 1;
};

export function backupKey(value = process.env.HEADHUNTER_BACKUP_KEY) {
  if (!value) throw new Error("Hosted backup encryption is not configured.");
  const key = /^[a-f0-9]{64}$/i.test(value)
    ? Buffer.from(value, "hex")
    : Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new Error("HEADHUNTER_BACKUP_KEY must encode exactly 32 bytes.");
  }
  return key;
}

export function encryptBackup(value: unknown, keyValue?: string): EncryptedBackup {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", backupKey(keyValue), iv);
  cipher.setAAD(associatedData);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return {
    algorithm: "aes-256-gcm",
    ciphertext: ciphertext.toString("base64url"),
    format,
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    version: 1,
  };
}

export function decryptBackup(value: unknown, keyValue?: string): unknown {
  if (
    !value ||
    typeof value !== "object" ||
    (value as Partial<EncryptedBackup>).format !== format ||
    (value as Partial<EncryptedBackup>).version !== 1 ||
    (value as Partial<EncryptedBackup>).algorithm !== "aes-256-gcm" ||
    typeof (value as Partial<EncryptedBackup>).iv !== "string" ||
    typeof (value as Partial<EncryptedBackup>).tag !== "string" ||
    typeof (value as Partial<EncryptedBackup>).ciphertext !== "string"
  ) {
    throw new Error("Choose an encrypted Headhunter backup.");
  }
  try {
    const envelope = value as EncryptedBackup;
    const iv = Buffer.from(envelope.iv, "base64url");
    const tag = Buffer.from(envelope.tag, "base64url");
    if (iv.length !== 12 || tag.length !== 16) throw new Error();
    const decipher = createDecipheriv("aes-256-gcm", backupKey(keyValue), iv);
    decipher.setAAD(associatedData);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(plaintext);
  } catch {
    throw new Error(
      "This backup could not be decrypted with the configured backup key.",
    );
  }
}
