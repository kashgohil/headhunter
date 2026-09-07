"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { jobExtractionProvider } from "@/lib/jobs/extraction";
import { createImportedJob, createJob, updateJobMetadata } from "@/lib/jobs/repository";
import { fetchJobSource, SourceFetchError } from "@/lib/jobs/source-fetcher";
import { createJobSchema, jobMetadataSchema, urlImportSchema } from "@/lib/jobs/validation";

type CaptureJobField = "sourceType" | "title" | "company" | "location" | "sourceUrl" | "originalDescription";

export type CaptureJobState = {
  errors?: Partial<Record<CaptureJobField, string[]>>;
  message?: string;
};

export type ImportJobState = {
  errors?: Partial<Record<"sourceUrl", string[]>>;
  message?: string;
};

type JobMetadataField = keyof typeof jobMetadataSchema.shape;

export type JobMetadataState = {
  errors?: Partial<Record<JobMetadataField, string[]>>;
  message?: string;
};

export async function captureJob(_previousState: CaptureJobState, formData: FormData): Promise<CaptureJobState> {
  // Authentication belongs here before this app is exposed beyond local use.
  const parsed = createJobSchema.safeParse({
    sourceType: formData.get("sourceType"),
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

export async function captureJobFromUrl(
  _previousState: ImportJobState,
  formData: FormData,
): Promise<ImportJobState> {
  // Authentication and rate limiting belong here before hosted use.
  const parsed = urlImportSchema.safeParse({ sourceUrl: formData.get("sourceUrl") });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, message: "Enter a valid job URL." };
  }

  let jobId: string;
  try {
    const source = await fetchJobSource(parsed.data.sourceUrl);
    const extraction = await jobExtractionProvider.extract({
      body: source.body,
      contentType: source.contentType,
      sourceUrl: source.url,
    });

    if (!extraction.title || !extraction.company || !extraction.originalDescription) {
      return { message: "We could not identify the role and company on that page. Paste the description instead." };
    }

    jobId = await createImportedJob(extraction, source.url, source.fetchedAt);
  } catch (error) {
    return {
      message: error instanceof SourceFetchError
        ? error.message
        : "That job could not be imported. Paste the description instead.",
    };
  }

  redirect(`/jobs/${jobId}`);
}

export async function updateJobMetadataAction(
  jobId: string,
  _previousState: JobMetadataState,
  formData: FormData,
): Promise<JobMetadataState> {
  // Authentication and ownership checks belong here before hosted use.
  const parsed = jobMetadataSchema.safeParse({
    title: formData.get("title"),
    company: formData.get("company"),
    location: formData.get("location"),
    employmentType: formData.get("employmentType"),
    workArrangement: formData.get("workArrangement"),
    seniority: formData.get("seniority"),
    minimumCompensation: formData.get("minimumCompensation"),
    maximumCompensation: formData.get("maximumCompensation"),
    compensationCurrency: formData.get("compensationCurrency"),
    postedAt: formData.get("postedAt"),
    applicationDeadline: formData.get("applicationDeadline"),
    responsibilities: formData.get("responsibilities"),
    requiredQualifications: formData.get("requiredQualifications"),
    preferredQualifications: formData.get("preferredQualifications"),
    skills: formData.get("skills"),
    technologies: formData.get("technologies"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: "Check the highlighted fields and try again.",
    };
  }

  const updated = await updateJobMetadata(jobId, parsed.data);
  if (!updated) return { message: "This job no longer exists." };

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  return { message: "Structured details saved." };
}
