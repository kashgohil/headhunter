"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BackupControls({
  recoveryFiles = [],
}: {
  recoveryFiles?: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [backup, setBackup] = useState<unknown>(null);
  const [preview, setPreview] = useState<{
    exportedAt: string;
    counts: Array<{ table: string; records: number }>;
  } | null>(null);
  const [confirmation, setConfirmation] = useState("");
  async function run(
    operation: "export" | "preview" | "restore" | "recovery",
    selected: unknown = backup,
  ) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation,
          backup: selected,
          name: operation === "recovery" ? selected : undefined,
          confirmation,
        }),
      });
      if (!response.ok) throw new Error((await response.json()).message);
      if (operation === "export" || operation === "recovery") {
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement("a");
        link.href = url;
        link.download =
          operation === "recovery"
            ? String(selected)
            : `headhunter-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage("Backup downloaded.");
      } else if (operation === "preview") setPreview(await response.json());
      else {
        const result = await response.json();
        setMessage(result.message);
        setPreview(null);
        setBackup(null);
        setConfirmation("");
        router.refresh();
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not complete the operation. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-semibold tracking-tight">
          Export your workspace
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Download all records, original job descriptions, resume and
          application snapshots, reminders, and history in one portable JSON
          file. It contains private data in readable form; store it somewhere
          you trust. Referenced external files are not included.
        </p>
        <Button className="mt-4" disabled={busy} onClick={() => run("export")}>
          Download backup
        </Button>
      </section>
      <section className="border-t pt-8">
        <h2 className="text-xl font-semibold tracking-tight">
          Restore a backup
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Preview a backup before replacing this workspace. A recovery copy is
          saved before replacement. The file must come from the same database
          version.
        </p>
        <label htmlFor="backup-file" className="mt-4 block text-sm font-medium">
          Backup file · up to 50 MB
        </label>
        <Input
          id="backup-file"
          type="file"
          accept=".json,application/json"
          disabled={busy}
          className="mt-2 max-w-lg"
          onChange={async (event) => {
            setPreview(null);
            setBackup(null);
            setConfirmation("");
            setMessage("");
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.size > 50 * 1024 * 1024) {
              setMessage("Choose a file smaller than 50 MB.");
              return;
            }
            setBusy(true);
            try {
              const parsed: unknown = JSON.parse(await file.text());
              setBackup(parsed);
              await run("preview", parsed);
            } catch {
              setMessage("This file is not valid JSON.");
              setBusy(false);
            }
          }}
        />
        {preview ? (
          <div className="mt-5 rounded-lg border p-5">
            <h3 className="font-medium">
              Backup from {new Date(preview.exportedAt).toLocaleString()}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {preview.counts.reduce((sum, item) => sum + item.records, 0)}{" "}
              records across {preview.counts.length} tables.
            </p>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer">
                Inspect record counts
              </summary>
              <dl className="mt-3 grid max-w-xl grid-cols-2 gap-2">
                {preview.counts.map((item) => (
                  <div key={item.table} className="contents">
                    <dt className="break-words text-muted-foreground">
                      {item.table.replaceAll("_", " ")}
                    </dt>
                    <dd className="font-mono">{item.records}</dd>
                  </div>
                ))}
              </dl>
            </details>
            <label
              htmlFor="restore-confirmation"
              className="mt-5 block text-sm font-medium"
            >
              Type REPLACE to replace the current workspace
            </label>
            <Input
              id="restore-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="mt-2 max-w-xs"
              autoComplete="off"
            />
            <Button
              className="mt-3"
              variant="destructive"
              disabled={busy || confirmation !== "REPLACE"}
              onClick={() => run("restore")}
            >
              Replace workspace
            </Button>
          </div>
        ) : null}
      </section>
      {recoveryFiles.length ? (
        <section className="border-t pt-6">
          <h2 className="text-lg font-semibold">Recovery copies</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Download a workspace saved before a restore, then preview it above
            to recover those records.
          </p>
          <ul className="mt-3 space-y-2">
            {recoveryFiles.map((name) => (
              <li key={name}>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => run("recovery", name)}
                  className="max-w-full text-xs"
                >
                  <span className="truncate">Download {name}</span>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {busy ? (
        <p role="status" className="text-sm text-muted-foreground">
          Working…
        </p>
      ) : null}
      {message ? (
        <p role="status" className="break-words text-sm">
          {message}
        </p>
      ) : null}
    </div>
  );
}
