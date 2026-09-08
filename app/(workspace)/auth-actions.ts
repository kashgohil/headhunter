"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "@/lib/auth/session";
import { revokeOwnerSession } from "@/lib/auth/storage";
import { requireOwner } from "@/lib/auth/server";
import { sqlite } from "@/lib/db";

export async function logoutAction() {
  const owner = await requireOwner();
  if (owner.sessionId) revokeOwnerSession(sqlite, owner.sessionId);
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
