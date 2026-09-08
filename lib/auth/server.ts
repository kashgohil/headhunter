import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { accessMode, isLoopbackHostname } from "@/lib/auth/config";
import {
  SESSION_COOKIE,
  validateSessionSecret,
  verifyOwnerSession,
} from "@/lib/auth/session";

function hostname(value: string | null) {
  if (!value) return "";
  try {
    return new URL(`http://${value}`).hostname;
  } catch {
    return "";
  }
}

export async function hasOwnerAccess() {
  const mode = accessMode();
  if (mode === "local") {
    return isLoopbackHostname(hostname((await headers()).get("host")));
  }
  const secret = validateSessionSecret(process.env.HEADHUNTER_SESSION_SECRET);
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifyOwnerSession(token, secret) !== null;
}

export async function requireOwner() {
  if (!(await hasOwnerAccess())) redirect("/login");
  return { id: "owner" as const };
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
  return verifyOwnerSession(cookie, secret) !== null;
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
