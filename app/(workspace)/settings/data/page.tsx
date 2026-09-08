import Link from "next/link";
import { readdir } from "node:fs/promises";
import { connection } from "next/server";
import { sqlite } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { BackupControls } from "./backup-controls";
import { accessMode } from "@/lib/auth/config";
import { storagePaths } from "@/lib/storage/config";

export default async function DataSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; kind?: string }>;
}) {
  await connection();
  const hosted = accessMode() === "hosted";
  const query = await searchParams;
  const recoveryFiles = await readdir(
    storagePaths().recovery,
  )
    .then((files) =>
      files
        .filter((name) =>
          hosted
            ? /^before-restore-[a-f0-9-]+\.hhbackup$/.test(name)
            : /^before-restore-[a-f0-9-]+\.json$/.test(name),
        )
        .slice(-50),
    )
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    });
  const page = Math.max(
    1,
    Math.min(100000, Number.parseInt(query.page ?? "1") || 1),
  );
  const kind =
    query.kind === "stage"
      ? "stage"
      : query.kind === "audit"
        ? "audit"
        : query.kind === "outbound"
          ? "outbound"
          : "all";
  const rows = sqlite
    .prepare(
      `SELECT * FROM (
    SELECT id, action AS title, entity_type AS kind, entity_id AS source, occurred_at AS at, NULL AS detail, 'audit' AS stream FROM audit_events
    UNION ALL
    SELECT id, title, 'application' AS kind, job_id AS source, occurred_at AS at, detail, 'stage' AS stream FROM application_events WHERE kind = 'stage'
    UNION ALL
    SELECT id, 'Outbound ' || channel || ' recorded', 'contact', contact_id, occurred_at, summary, 'outbound' FROM contact_interactions WHERE direction = 'outbound'
  ) WHERE (? = 'all' OR stream = ?) ORDER BY at DESC, id DESC LIMIT 51 OFFSET ?`,
    )
    .all(kind, kind, (page - 1) * 50) as Array<{
    id: string;
    title: string;
    kind: string;
    source: string;
    at: number;
    detail: string | null;
    stream: string;
  }>;
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-8 border-b pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Your data & history
        </h1>
        <p className="mt-3 text-muted-foreground">
          Keep a recoverable copy of your search and inspect the decisions
          behind it.
        </p>
      </header>
      <BackupControls encrypted={hosted} recoveryFiles={recoveryFiles} />
      <section className="mt-10 border-t pt-8">
        <h2 className="text-xl font-semibold tracking-tight">Audit history</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Recorded generation, review, submission, stage events, and manually
          logged outbound interactions. All times shown in UTC.
        </p>
        <nav aria-label="Audit filters" className="my-4 flex flex-wrap gap-2">
          {["all", "audit", "stage", "outbound"].map((value) => (
            <Button
              key={value}
              asChild
              size="sm"
              variant={kind === value ? "default" : "outline"}
            >
              <Link href={`/settings/data?kind=${value}`}>
                {value === "all"
                  ? "All events"
                  : value === "audit"
                    ? "Audit records"
                    : value === "stage"
                      ? "Stage changes"
                      : "Recorded outbound"}
              </Link>
            </Button>
          ))}
        </nav>
        <ol className="divide-y rounded-lg border bg-card px-5">
          {rows.slice(0, 50).map((row) => (
            <li key={`${row.stream}:${row.id}`} className="py-4">
              <p className="text-sm font-medium">
                {row.title.replaceAll("_", " ").replaceAll(".", " · ")}
              </p>
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {row.kind} · {row.source}
              </p>
              {row.detail ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {row.detail}
                </p>
              ) : null}
              {row.kind === "application" || row.kind === "job" ? (
                <Link
                  className="mt-2 block text-sm text-primary"
                  href={`/jobs/${row.source}`}
                >
                  Open source
                </Link>
              ) : null}
              <time className="mt-2 block font-mono text-xs text-muted-foreground">
                {new Date(row.at).toISOString().replace("T", " ").slice(0, 19)}{" "}
                UTC
              </time>
            </li>
          ))}
        </ol>
        {!rows.length ? (
          <p className="py-6 text-sm text-muted-foreground">
            No events in this view.
          </p>
        ) : null}
        <div className="mt-4 flex gap-3">
          {page > 1 ? (
            <Button asChild variant="outline">
              <Link href={`/settings/data?kind=${kind}&page=${page - 1}`}>
                Newer events
              </Link>
            </Button>
          ) : null}
          {rows.length > 50 ? (
            <Button asChild variant="outline">
              <Link href={`/settings/data?kind=${kind}&page=${page + 1}`}>
                Older events
              </Link>
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
