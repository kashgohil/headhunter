const windowMilliseconds = 15 * 60 * 1000;
const maximumAttempts = 5;
const attempts = new Map<string, { count: number; windowStartedAt: number }>();

export function beginLoginAttempt(key: string, now = Date.now()) {
  const existing = attempts.get(key);
  if (!existing || now - existing.windowStartedAt >= windowMilliseconds) {
    attempts.set(key, { count: 1, windowStartedAt: now });
    return true;
  }
  if (existing.count >= maximumAttempts) return false;
  existing.count += 1;
  return true;
}

export function clearLoginAttempts(key: string) {
  attempts.delete(key);
}

export function loginAttemptKey(forwardedFor: string | null, fallback: string | null) {
  const address = forwardedFor
    ?.split(",")
    .at(-1)
    ?.trim()
    .slice(0, 128);
  return address || fallback?.slice(0, 128) || "unknown";
}

export function resetLoginAttemptsForTests() {
  attempts.clear();
}
