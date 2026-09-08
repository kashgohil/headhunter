"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { accessMode } from "@/lib/auth/config";
import { verifyOwnerPassword } from "@/lib/auth/password";
import { registerOwnerSession } from "@/lib/auth/storage";
import { sqlite } from "@/lib/db";
import {
  createOwnerSession,
  SESSION_COOKIE,
  SESSION_DURATION_SECONDS,
  validateSessionSecret,
} from "@/lib/auth/session";

export async function loginAction(formData: FormData) {
  if (accessMode() !== "hosted") redirect("/");
  const password = formData.get("password");
  const next = formData.get("next");
  const destination =
    typeof next === "string" && /^\/(?!\/)/.test(next) ? next : "/";
  if (
    typeof password !== "string" ||
    !(await verifyOwnerPassword(password, process.env.HEADHUNTER_OWNER_PASSWORD_HASH))
  ) {
    const login = new URLSearchParams({ error: "1" });
    if (destination !== "/") login.set("next", destination);
    redirect(`/login?${login}`);
  }
  const session = createOwnerSession(
    validateSessionSecret(process.env.HEADHUNTER_SESSION_SECRET),
  );
  registerOwnerSession(sqlite, session.sessionId, session.expiresAt);
  (await cookies()).set(SESSION_COOKIE, session.token, {
    expires: session.expiresAt,
    httpOnly: true,
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: true,
  });
  redirect(destination);
}
