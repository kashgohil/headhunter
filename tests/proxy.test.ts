import { afterEach, describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";

import proxy from "@/proxy";
import { createOwnerSession, SESSION_COOKIE } from "@/lib/auth/session";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe("request access boundary", () => {
  test("keeps local access on loopback", () => {
    process.env.HEADHUNTER_ACCESS_MODE = "local";
    expect(proxy(new NextRequest("http://localhost:3050/jobs")).status).toBe(200);
    expect(proxy(new NextRequest("http://192.168.1.9:3050/jobs")).status).toBe(403);
  });

  test("redirects hosted reads without a valid owner session", () => {
    process.env.HEADHUNTER_ACCESS_MODE = "hosted";
    process.env.APP_ORIGIN = "https://jobs.example.com";
    process.env.HEADHUNTER_SESSION_SECRET = "s".repeat(32);
    const response = proxy(new NextRequest("https://jobs.example.com/jobs/private-id"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/login?next=");
  });

  test("denies forged sessions, cross-origin writes, and noncanonical hosts", () => {
    process.env.HEADHUNTER_ACCESS_MODE = "hosted";
    process.env.APP_ORIGIN = "https://jobs.example.com";
    process.env.HEADHUNTER_SESSION_SECRET = "s".repeat(32);
    const forged = new NextRequest("https://jobs.example.com/api/data", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE}=forged`, origin: "https://jobs.example.com" },
    });
    expect(proxy(forged).status).toBe(401);
    const valid = createOwnerSession("s".repeat(32)).token;
    const crossOrigin = new NextRequest("https://jobs.example.com/api/data", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE}=${valid}`, origin: "https://evil.example" },
    });
    expect(proxy(crossOrigin).status).toBe(403);
    const wrongHost = new NextRequest("https://alias.example.com/jobs", {
      headers: { cookie: `${SESSION_COOKIE}=${valid}` },
    });
    expect(proxy(wrongHost).status).toBe(403);
  });

  test("allows an authenticated owner and leaves health public", () => {
    process.env.HEADHUNTER_ACCESS_MODE = "hosted";
    process.env.APP_ORIGIN = "https://jobs.example.com";
    process.env.HEADHUNTER_SESSION_SECRET = "s".repeat(32);
    const valid = createOwnerSession("s".repeat(32)).token;
    const request = new NextRequest("https://jobs.example.com/jobs/private-id", {
      headers: { cookie: `${SESSION_COOKIE}=${valid}` },
    });
    expect(proxy(request).status).toBe(200);
    expect(proxy(new NextRequest("https://jobs.example.com/api/health")).status).toBe(200);
    expect(proxy(new NextRequest("http://127.0.0.1:3050/api/health")).status).toBe(200);
  });

  test("accepts the canonical HTTPS origin through the loopback reverse proxy", () => {
    process.env.HEADHUNTER_ACCESS_MODE = "hosted";
    process.env.APP_ORIGIN = "https://jobs.example.com";
    process.env.HEADHUNTER_SESSION_SECRET = "s".repeat(32);
    const request = new NextRequest("http://jobs.example.com/jobs", {
      headers: {
        host: "jobs.example.com",
        "x-forwarded-proto": "https",
      },
    });
    expect(proxy(request).status).toBe(303);
    expect(proxy(request).headers.get("location")).toContain("/login");
  });
});
