import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";

import { CaptureJobForm } from "@/app/(workspace)/jobs/new/capture-job-form";
import { UrlCaptureForm } from "@/app/(workspace)/jobs/new/url-capture-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewJobPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-14">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-8 text-muted-foreground"><Link href="/jobs"><ArrowLeft /> Back to inbox</Link></Button>

      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Capture a job</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">Add only what you know. Extraction and fit analysis come after the source is safely stored.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="size-3.5" /> Stored on this device</div>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader className="border-b border-border pb-6"><CardTitle>Import from a job link</CardTitle><CardDescription>Best for public job pages with accessible source content.</CardDescription></CardHeader>
          <CardContent><UrlCaptureForm /></CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b border-border pb-6"><CardTitle>Paste or enter manually</CardTitle><CardDescription>Use this when a site blocks import or you only have partial details.</CardDescription></CardHeader>
          <CardContent><CaptureJobForm /></CardContent>
        </Card>
      </div>
    </div>
  );
}
