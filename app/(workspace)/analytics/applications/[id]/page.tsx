import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { sqlite } from "@/lib/db";
import { getAnalyticsInput } from "@/lib/analytics/repository";
import { listAnnotations } from "@/lib/analytics/storage";
import { segmentLabels, segmentKeys } from "@/lib/analytics/segments";
import { AnnotationForm } from "../../forms";
export default async function ApplicationAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const job = getAnalyticsInput().applications.find((item) => item.id === id);
  if (!job) notFound();
  const annotation = listAnnotations(sqlite).find((item) => item.jobId === id);
  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
      <Link href="/analytics" className="text-sm text-primary">
        Back to analytics
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">
        {job.title}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {job.company} ·{" "}
        {job.appliedAt
          ? `Applied ${job.appliedAt.toISOString().slice(0, 10)} UTC`
          : "No recorded application"}
      </p>
      <Link
        href={`/jobs/${id}#application-workspace-heading`}
        className="mt-4 inline-block text-sm text-primary"
      >
        Open application and source history
      </Link>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {job.provenance}
      </p>
      <dl className="my-8 grid gap-x-8 sm:grid-cols-2">
        {segmentKeys.map((key) => (
          <div key={key} className="border-t py-3">
            <dt className="text-xs text-muted-foreground">
              {segmentLabels[key]}
            </dt>
            <dd className="mt-1 break-words text-sm">{job.segments[key]}</dd>
          </div>
        ))}
      </dl>
      <section className="rounded-lg border bg-card p-5 sm:p-7">
        <h2 className="mb-6 text-xl font-semibold">Application annotations</h2>
        <AnnotationForm jobId={id} annotation={annotation} />
      </section>
    </div>
  );
}
