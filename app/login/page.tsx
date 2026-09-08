import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { accessMode } from "@/lib/auth/config";
import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  if (accessMode() !== "hosted") redirect("/");
  const query = await searchParams;
  const next = query.next && /^\/(?!\/)/.test(query.next) ? query.next : "/";
  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 px-5 py-12">
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader className="space-y-4">
          <span className="grid size-10 place-items-center rounded-lg bg-foreground text-background">
            <LockKeyhole className="size-5" aria-hidden="true" />
          </span>
          <div>
            <CardTitle className="text-2xl tracking-tight">Open your workspace</CardTitle>
            <CardDescription className="mt-2 leading-relaxed">
              Enter the owner password. This private workspace has one account.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form action={loginAction} className="space-y-4">
            <input type="hidden" name="next" value={next} />
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                aria-invalid={query.error ? true : undefined}
                aria-describedby={query.error ? "login-error" : undefined}
              />
              {query.error ? (
                <p id="login-error" className="text-sm text-destructive">
                  That password did not match. Try again.
                </p>
              ) : null}
            </div>
            <Button type="submit" className="w-full">Sign in</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
