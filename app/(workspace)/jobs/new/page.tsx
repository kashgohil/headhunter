import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";

import { CaptureJobForm } from "@/app/(workspace)/jobs/new/capture-job-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewJobPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-14">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-8 text-muted-foreground"><Link href="/jobs"><ArrowLeft /> Back to inbox</Link></Button>

      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="signal" className="mb-4">Original source</Badge>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Capture a job</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">Add only what you know. Extraction and fit analysis come after the source is safely stored.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="size-3.5" /> Stored on this device</div>
      </div>

      <Card>
        <CardHeader className="border-b border-border pb-6"><CardTitle>Role details</CardTitle><CardDescription>Required fields are kept intentionally minimal.</CardDescription></CardHeader>
        <CardContent><CaptureJobForm /></CardContent>
      </Card>
    </div>
  );
}
