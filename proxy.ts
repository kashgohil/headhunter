import { NextRequest, NextResponse } from "next/server";

import {
  accessMode,
  configuredOrigin,
  isLoopbackHostname,
} from "@/lib/auth/config";
import {
  SESSION_COOKIE,
  validateSessionSecret,
  verifyOwnerSession,
} from "@/lib/auth/session";

const publicPaths = new Set(["/login", "/api/health"]);
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

function deny(request: NextRequest, status = 401) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { message: status === 403 ? "Request origin denied." : "Authentication required." },
      { status },
    );
  }
  if (status === 403) return new NextResponse("Forbidden", { status });
  const login = new URL("/login", request.url);
  if (request.method === "GET") {
    login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  }
  return NextResponse.redirect(login, 303);
}

function withSecurityHeaders(response: NextResponse, hosted: boolean) {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (hosted) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
  return response;
}

export default function proxy(request: NextRequest) {
  let mode: "hosted" | "local";
  try {
    mode = accessMode();
  } catch {
    return new NextResponse("Access mode is not configured.", { status: 503 });
  }

  if (mode === "local" && !isLoopbackHostname(request.nextUrl.hostname)) {
    return deny(request, 403);
  }

  if (
    request.nextUrl.pathname === "/api/health" &&
    isLoopbackHostname(request.nextUrl.hostname)
  ) {
    return withSecurityHeaders(NextResponse.next(), mode === "hosted");
  }

  let expectedOrigin = request.nextUrl.origin;
  if (mode === "hosted") {
    try {
      expectedOrigin = configuredOrigin();
    } catch {
      return new NextResponse("Hosted access is not configured.", { status: 503 });
    }
    const expected = new URL(expectedOrigin);
    const forwardedProtocol = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim();
    const protocol = forwardedProtocol ?? request.nextUrl.protocol.replace(":", "");
    if (
      (request.headers.get("host") ?? request.nextUrl.host) !== expected.host ||
      protocol !== expected.protocol.replace(":", "")
    ) {
      return deny(request, 403);
    }
  }

  if (!safeMethods.has(request.method)) {
    const origin = request.headers.get("origin");
    if (origin !== expectedOrigin) return deny(request, 403);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let authenticated = mode === "local";
  if (mode === "hosted") {
    try {
      authenticated =
        verifyOwnerSession(
          token,
          validateSessionSecret(process.env.HEADHUNTER_SESSION_SECRET),
        ) !== null;
    } catch {
      return new NextResponse("Hosted access is not configured.", { status: 503 });
    }
  }

  if (request.nextUrl.pathname === "/login" && authenticated) {
    return withSecurityHeaders(NextResponse.redirect(new URL("/", request.url), 303), mode === "hosted");
  }
  if (!publicPaths.has(request.nextUrl.pathname) && !authenticated) {
    return withSecurityHeaders(deny(request), mode === "hosted");
  }
  return withSecurityHeaders(NextResponse.next(), mode === "hosted");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
