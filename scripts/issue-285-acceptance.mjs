import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const base = process.env.ACCEPTANCE_URL;
const password = process.env.ACCEPTANCE_PASSWORD;
const sessionSecret = process.env.ACCEPTANCE_SESSION_SECRET;
assert.ok(base && ["localhost", "127.0.0.1", "headhunter.localhost"].includes(new URL(base).hostname), "Use an isolated loopback deployment");
assert.ok(password && sessionSecret, "Provide the synthetic acceptance password and session secret");

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE,
  headless: true,
});
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  reducedMotion: "reduce",
  viewport: { width: 1280, height: 900 },
});
const page = await context.newPage();
page.setDefaultTimeout(20_000);

function expiredToken() {
  const exp = Math.floor(Date.now() / 1000) - 1;
  const payload = Buffer.from(
    JSON.stringify({ exp, iat: exp - 12 * 60 * 60, sid: randomUUID(), sub: "owner", v: 1 }),
  ).toString("base64url");
  const signature = createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

try {
  for (const route of [
    "/search?q=private-term",
    "/sources/research/guessed-private-id",
    "/resumes/guessed-private-id/pdf",
  ]) {
    const response = await context.request.get(`${base}${route}`, {
      maxRedirects: 0,
    });
    assert.equal(response.status(), 303, `${route} must require authentication`);
    assert.match(response.headers().location, /^\/login/);
  }
  await page.goto(`${base}/jobs/guessed-private-id`, { waitUntil: "networkidle" });
  assert.equal(new URL(page.url()).pathname, "/login");
  assert.equal(new URL(page.url()).searchParams.get("next"), "/jobs/guessed-private-id");
  await page.getByRole("heading", { name: "Open your workspace" }).waitFor();

  const unauthenticatedApi = await context.request.post(`${base}/api/data`, {
    data: { operation: "export" },
    headers: { origin: base },
  });
  assert.equal(unauthenticatedApi.status(), 401);

  await page.getByLabel("Password").fill("incorrect synthetic password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByText("That password did not match. Try again.").waitFor();

  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(`${base}/jobs/guessed-private-id`);
  await page.getByRole("heading", { name: "This job could not be found." }).waitFor();

  const sessionCookie = (await context.cookies()).find(
    (cookie) => cookie.name === "headhunter_session",
  );
  assert.ok(sessionCookie?.httpOnly && sessionCookie.secure);
  assert.equal(sessionCookie.sameSite, "Lax");

  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByText("Command center", { exact: true }).first().waitFor();

  const actionName = await page
    .locator('form input[type="hidden"][name^="$ACTION_ID_"]')
    .first()
    .getAttribute("name");
  assert.ok(actionName, "expected a rendered Server Action identifier");
  const direct = await browser.newContext({ ignoreHTTPSErrors: true });
  const directAction = await direct.request.post(base, {
    headers: { origin: base },
    maxRedirects: 0,
    multipart: { [actionName]: "" },
  });
  assert.equal(directAction.status(), 303);
  assert.match(directAction.headers().location, /^\/login/);
  await direct.close();
  const crossOriginAction = await context.request.post(base, {
    headers: { origin: "https://evil.example" },
    maxRedirects: 0,
    multipart: { [actionName]: "" },
  });
  assert.equal(crossOriginAction.status(), 403);

  const exported = await page.evaluate(async () => {
    const response = await fetch("/api/data", {
      body: JSON.stringify({ operation: "export" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    return { body: await response.json(), status: response.status };
  });
  assert.equal(exported.status, 200);
  assert.equal(exported.body.format, "headhunter.encrypted-backup");
  assert.equal(exported.body.algorithm, "aes-256-gcm");
  assert.equal("tables" in exported.body, false);

  const crossOrigin = await context.request.post(`${base}/api/data`, {
    data: { operation: "export" },
    headers: { origin: "https://evil.example" },
  });
  assert.equal(crossOrigin.status(), 403);

  const oldCookie = sessionCookie;
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/login$/);

  const revoked = await browser.newContext({ ignoreHTTPSErrors: true });
  await revoked.addCookies([oldCookie]);
  const revokedResponse = await revoked.request.post(`${base}/api/data`, {
    data: { operation: "export" },
    headers: { origin: base },
  });
  assert.equal(revokedResponse.status(), 401);
  await revoked.close();

  const expired = await browser.newContext({ ignoreHTTPSErrors: true });
  await expired.addCookies([{ ...oldCookie, expires: Math.floor(Date.now() / 1000) + 60, value: expiredToken() }]);
  const expiredResponse = await expired.request.post(`${base}/api/data`, {
    data: { operation: "export" },
    headers: { origin: base },
  });
  assert.equal(expiredResponse.status(), 401);
  await expired.close();

  const mobile = await browser.newPage({
    ignoreHTTPSErrors: true,
    viewport: { width: 375, height: 812 },
  });
  await mobile.goto(`${base}/login`, { waitUntil: "networkidle" });
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await mobile.screenshot({ path: "/tmp/issue285-login.png", fullPage: true });
  await mobile.close();

  const health = await context.request.get(`${base}/api/health`);
  assert.equal(health.status(), 200);
  assert.deepEqual(await health.json(), { status: "ready" });
  process.stdout.write("PASS hosted TLS login, private-route/API/direct-action denial, owner use, encrypted export, origin rejection, logout revocation, expiry, health, and mobile layout\n");
} finally {
  await context.close();
  await browser.close();
}
