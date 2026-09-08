import { describe, expect, test } from "bun:test";

import { decryptBackup, encryptBackup } from "@/lib/data-transfer/encryption";

describe("hosted backup encryption", () => {
  test("round-trips private Unicode data without plaintext in the envelope", () => {
    const key = "ab".repeat(32);
    const input = { notes: "private résumé notes नमस्ते", count: 2 };
    const encrypted = encryptBackup(input, key);
    expect(JSON.stringify(encrypted)).not.toContain("private résumé notes");
    expect(decryptBackup(encrypted, key)).toEqual(input);
  });

  test("rejects tampering, the wrong key, and readable backup objects", () => {
    const encrypted = encryptBackup({ private: true }, "ab".repeat(32));
    expect(() =>
      decryptBackup(
        { ...encrypted, ciphertext: `${encrypted.ciphertext.slice(0, -1)}A` },
        "ab".repeat(32),
      ),
    ).toThrow("could not be decrypted");
    expect(() => decryptBackup(encrypted, "cd".repeat(32))).toThrow();
    expect(() => decryptBackup({ tables: {} }, "ab".repeat(32))).toThrow(
      "encrypted Headhunter backup",
    );
  });
});
