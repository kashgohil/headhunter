import { mkdir, readFile } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { sqlite } from "@/lib/db";
import {
  exportBackup,
  restoreBackup,
  validateBackup,
} from "@/lib/data-transfer/backup";

export const runtime = "nodejs";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
const maximumBytes = 50 * 1024 * 1024;

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json(
      { message: "Open data settings in Headhunter to continue." },
      { status: 403, headers },
    );
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Missing request body.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maximumBytes) {
        await reader.cancel();
        throw new Error("Backup files must be smaller than 50 MB.");
      }
      chunks.push(value);
    }
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const directory = path.join(
      process.cwd(),
      ".data",
      "recovery",
      path.basename(process.env.DATABASE_FILE ?? "headhunter.db"),
    );
    if (input.operation === "recovery") {
      if (
        typeof input.name !== "string" ||
        !/^before-restore-[a-f0-9-]+\.json$/.test(input.name)
      )
        throw new Error("Choose an existing recovery copy.");
      const file = await readFile(path.join(directory, input.name));
      return new Response(file, {
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${input.name}"`,
        },
      });
    }
    if (input.operation === "export") {
      const backup = exportBackup(sqlite);
      return new Response(JSON.stringify(backup, null, 2), {
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="headhunter-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      });
    }
    if (input.operation !== "preview" && input.operation !== "restore")
      throw new Error("Choose export, preview, or restore.");
    const backup = validateBackup(sqlite, input.backup);
    const counts = Object.entries(backup.tables).map(([table, rows]) => ({
      table,
      records: rows.length,
    }));
    if (input.operation === "preview")
      return Response.json(
        { counts, exportedAt: backup.exportedAt },
        { headers },
      );
    if (input.confirmation !== "REPLACE")
      throw new Error("Confirm replacement before restoring.");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const recoveryFile = `before-restore-${crypto.randomUUID()}.json`;
    sqlite
      .transaction(() => {
        // Keep the write lock until replacement: the recovery copy must include every prior write.
        writeFileSync(
          path.join(directory, recoveryFile),
          JSON.stringify(exportBackup(sqlite, { includePrivateIntegrations: true })),
          { flag: "wx", mode: 0o600 },
        );
        restoreBackup(sqlite, backup);
        sqlite
          .prepare(
            "INSERT INTO audit_events (id, action, entity_type, entity_id, occurred_at) VALUES (?, ?, ?, ?, ?)",
          )
          .run(
            crypto.randomUUID(),
            "workspace.restored",
            "workspace",
            recoveryFile,
            Date.now(),
          );
      })
      .immediate();
    return Response.json(
      {
        message:
          "Workspace restored. A recovery copy of the previous workspace was saved.",
        recoveryFile,
      },
      { headers },
    );
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error && !error.message.includes("SQLITE")
            ? error.message
            : "The operation failed. Your workspace has not been replaced. Check the backup and try again.",
      },
      { status: 400, headers },
    );
  }
}
