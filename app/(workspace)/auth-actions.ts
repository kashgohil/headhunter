"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "@/lib/auth/session";
import { requireOwner } from "@/lib/auth/server";

export async function logoutAction() {
  await requireOwner();
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
