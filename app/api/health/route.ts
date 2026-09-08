import { access, constants } from "node:fs/promises";

import { sqlite } from "@/lib/db";
import { storagePaths } from "@/lib/storage/config";

export async function GET() {
  let ready = false;
  try {
    sqlite.prepare("SELECT 1").get();
    await access(storagePaths().directory, constants.R_OK | constants.W_OK);
    ready = true;
  } catch {}
  return Response.json(
    { status: ready ? "ready" : "unavailable" },
    {
      status: ready ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
