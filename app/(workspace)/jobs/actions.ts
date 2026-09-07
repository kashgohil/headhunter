"use server";

import { redirect } from "next/navigation";

import { createJob } from "@/lib/jobs/repository";
import { createJobSchema } from "@/lib/jobs/validation";

export type CaptureJobState = {
  errors?: Partial<Record<"title" | "company" | "location" | "sourceUrl" | "originalDescription", string[]>>;
  message?: string;
};

export async function captureJob(_previousState: CaptureJobState, formData: FormData): Promise<CaptureJobState> {
  // Authentication belongs here before this app is exposed beyond local use.
  const parsed = createJobSchema.safeParse({
    title: formData.get("title"),
    company: formData.get("company"),
    location: formData.get("location"),
    sourceUrl: formData.get("sourceUrl"),
    originalDescription: formData.get("originalDescription"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "Check the highlighted fields and try again.",
    };
  }

  const jobId = await createJob(parsed.data);
  redirect(`/jobs/${jobId}`);
}
