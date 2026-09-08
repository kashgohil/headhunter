import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { sqlite } from "@/lib/db";
import { getSourceRecord, getEvidenceImport, sourceValue } from "@/lib/sources/records";
import { Badge } from "@/components/ui/badge";
export const metadata = { title: "Factual source" };
export default async function SourcePage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  await connection();
  const { kind, id } = await params;
  const source = getSourceRecord(sqlite, kind, id);
  if (!source) notFound();
  const { record, table } = source;
  const importedSource = kind === "evidence" ? getEvidenceImport(sqlite, id) : undefined;
  const title = String(
    record.title ??
      record.question ??
      record.name ??
      record.company_name ??
      record.primary_title ??
      record.result ??
      "Evidence record",
  );
  const state = String(record.verification_state ?? record.source_state ?? "");
  const provenance = String(
    record.source_type ?? record.provenance ?? "User entered",
  ).replaceAll("_", " ");
  const origin =
    kind === "job"
      ? `/jobs/${id}`
      : kind === "strategy"
        ? "/settings/search-strategy"
        : table === "career_answers" || table === "career_voice_profiles"
          ? "/career-profile/library"
          : table === "career_stories"
            ? "/career-profile/stories"
            : "/career-profile";
  const omitted = new Set([
    "id",
    "verification_state",
    "source_state",
    "source_type",
    "provenance",
    "normalized_name",
    "normalized_company_name",
  ]);
  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 lg:py-10">
      <h1 className="break-words text-3xl font-semibold tracking-tight">
        {title}
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">Source: {provenance}</p>
        {state ? (
          <Badge variant="outline">{state.replaceAll("_", " ")}</Badge>
        ) : null}
      </div>
      <p className="mt-5 rounded-lg border bg-muted/30 p-4 text-sm leading-6">
        This is the current source record. Evidence and verification may have
        changed since generation. A linked record does not establish that every
        generated claim is supported. Submitted document snapshots remain
        unchanged.
      </p>
      {record.provenance === "ai_inference" ||
      record.provenance === "inference" ? (
        <p className="mt-3 text-sm text-destructive">
          This entry is an inference, not a verified fact.
        </p>
      ) : null}
      {importedSource ? <section className="mt-5 rounded-lg border p-4"><h2 className="text-sm font-semibold">Original resume excerpt</h2><blockquote className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{importedSource.excerpt}</blockquote><Link href={`/career-profile/import/${importedSource.id}`} className="mt-3 inline-block text-sm underline underline-offset-4">Review {importedSource.name}</Link><p className="mt-2 text-xs text-muted-foreground">This is the imported excerpt. Your approved fact may include corrections made during review.</p></section> : null}
      <dl className="mt-8 divide-y border-y">
        {Object.entries(record)
          .filter(([key]) => !omitted.has(key))
          .map(([key, value]) => (
            <div key={key} className="grid gap-2 py-4 sm:grid-cols-[180px_1fr]">
              <dt className="text-sm font-medium capitalize">
                {key.replaceAll("_", " ")}
              </dt>
              <dd className="min-w-0 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                {key === "source_url" &&
                typeof value === "string" &&
                /^https?:\/\//i.test(value) ? (
                  <a
                    href={value}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {value}
                  </a>
                ) : (
                  sourceValue(value, key)
                )}
              </dd>
            </div>
          ))}
      </dl>
      {kind !== "company" ? (
        <Link href={origin} className="mt-6 inline-block text-sm underline">
          Open original workspace
        </Link>
      ) : (
        <Link
          href={`/search?kind=companies&q=${encodeURIComponent(String(record.company_name))}`}
          className="mt-6 inline-block text-sm underline"
        >
          Related company records
        </Link>
      )}
    </div>
  );
}
