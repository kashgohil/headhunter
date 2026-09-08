"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function WorkspaceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">
        This operation could not finish
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Reload this view to check the latest saved state before repeating an
        action. Earlier saved work may still be present.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Reload view</Button>
        <Button asChild variant="outline">
          <Link href="/">Command center</Link>
        </Button>
      </div>
    </div>
  );
}
