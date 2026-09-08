import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { accessMode, configuredOrigin, isLoopbackHostname } from "@/lib/auth/config";
import {
  SESSION_COOKIE,
  validateSessionSecret,
  verifyOwnerSession,
} from "@/lib/auth/session";
import { sqlite } from "@/lib/db";
import { ownerSessionExists } from "@/lib/auth/storage";

function hostname(value: string | null) {
  if (!value) return "";
  try {
    return new URL(`http://${value}`).hostname;
  } catch {
    return "";
  }
}

export async function hasOwnerAccess() {
  if (process.env.NEXT_PHASE === "phase-production-build") return true;
  const mode = accessMode();
  if (mode === "local") {
    return isLoopbackHostname(hostname((await headers()).get("host")));
  }
  const secret = validateSessionSecret(process.env.HEADHUNTER_SESSION_SECRET);
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = verifyOwnerSession(token, secret);
  return session !== null && ownerSessionExists(sqlite, session.sid);
}

export async function requireOwner() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return { id: "owner" as const, sessionId: null };
  }
  if (accessMode() === "local") {
    if (!(await hasOwnerAccess())) redirect("/login");
    return { id: "owner" as const, sessionId: null };
  }
  const secret = validateSessionSecret(process.env.HEADHUNTER_SESSION_SECRET);
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = verifyOwnerSession(token, secret);
  if (!session || !ownerSessionExists(sqlite, session.sid)) redirect("/login");
  return { id: "owner" as const, sessionId: session.sid };
}

export async function authorizeRoute(request: Request) {
  const mode = accessMode();
  if (mode === "local") return isLoopbackHostname(new URL(request.url).hostname);
  const secret = validateSessionSecret(process.env.HEADHUNTER_SESSION_SECRET);
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  const session = verifyOwnerSession(cookie, secret);
  return session !== null && ownerSessionExists(sqlite, session.sid);
}

export function unauthorizedResponse() {
  return Response.json(
    { message: "Sign in as the workspace owner to continue." },
    {
      status: 401,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export function hasTrustedMutationOrigin(request: Request) {
  const expected =
    accessMode() === "hosted" ? configuredOrigin() : new URL(request.url).origin;
  return request.headers.get("origin") === expected;
}
