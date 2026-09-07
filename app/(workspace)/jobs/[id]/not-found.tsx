import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function JobNotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div>
        <p className="font-mono text-xs text-muted-foreground">Error 404</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">This job could not be found.</h1>
        <Button asChild variant="outline" className="mt-6"><Link href="/jobs">Return to inbox</Link></Button>
      </div>
    </div>
  );
}
