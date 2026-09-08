import { describe, expect, test } from "bun:test";
import { accessMode, configuredOrigin, isLoopbackHostname } from "@/lib/auth/config";
import { hashOwnerPassword, verifyOwnerPassword } from "@/lib/auth/password";
import {
  createOwnerSession,
  SESSION_DURATION_SECONDS,
  verifyOwnerSession,
} from "@/lib/auth/session";

describe("hosted access primitives", () => {
  test("requires explicit production mode and a canonical HTTPS origin", () => {
    expect(() => accessMode({ NODE_ENV: "production" })).toThrow();
    expect(accessMode({ NODE_ENV: "development" })).toBe("local");
    expect(accessMode({ HEADHUNTER_ACCESS_MODE: "hosted" })).toBe("hosted");
    expect(() => configuredOrigin({ APP_ORIGIN: "http://example.com" })).toThrow();
    expect(configuredOrigin({ APP_ORIGIN: "https://jobs.example.com" })).toBe(
      "https://jobs.example.com",
    );
  });

  test("limits local mode to loopback hostnames", () => {
    expect(isLoopbackHostname("localhost")).toBe(true);
    expect(isLoopbackHostname("127.0.0.1")).toBe(true);
    expect(isLoopbackHostname("[::1]")).toBe(true);
    expect(isLoopbackHostname("192.168.1.5")).toBe(false);
    expect(isLoopbackHostname("headhunter.example.com")).toBe(false);
  });

  test("signs fixed-duration owner sessions and rejects tampering or expiry", () => {
    const secret = "a".repeat(32);
    const now = Date.UTC(2026, 8, 8, 12);
    const session = createOwnerSession(secret, now);
    expect(session.expiresAt.getTime()).toBe(now + SESSION_DURATION_SECONDS * 1000);
    expect(verifyOwnerSession(session.token, secret, now)?.sub).toBe("owner");
    expect(verifyOwnerSession(`${session.token}x`, secret, now)).toBeNull();
    expect(
      verifyOwnerSession(session.token, secret, session.expiresAt.getTime()),
    ).toBeNull();
  });

  test("hashes the owner password with scrypt and compares in constant time", async () => {
    const encoded = await hashOwnerPassword("a long private passphrase");
    expect(encoded).not.toContain("a long private passphrase");
    expect(await verifyOwnerPassword("a long private passphrase", encoded)).toBe(true);
    expect(await verifyOwnerPassword("wrong password", encoded)).toBe(false);
  });
});
