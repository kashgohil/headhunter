import { createHash } from "node:crypto";
import { sqlite } from "@/lib/db";
import { createImport } from "@/lib/resume-import/storage";
import { MAX_TEXT } from "@/lib/resume-import/extraction";
import { MAX_FILE_BYTES, readResumeFile } from "@/lib/resume-import/file-reader";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ message: "Open resume import in Headhunter to continue." }, { status: 403, headers });
  const chunks: Uint8Array[] = []; let size = 0;
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ message: "Choose a file or paste your resume text." }, { status: 400, headers });
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > MAX_FILE_BYTES) { await reader.cancel(); return Response.json({ message: "Resume files must be 5 MB or smaller." }, { status: 413, headers }); }
      chunks.push(value);
    }
  } catch { return Response.json({ message: "The upload was interrupted. Your file or text is still selected; retry." }, { status: 400, headers }); }
  const bytes = Buffer.concat(chunks);
  let name: string;
  try { name = decodeURIComponent(request.headers.get("x-resume-name") || "Pasted resume").replace(/[\r\n]/g, " ").slice(0, 180); }
  catch { return Response.json({ message: "Choose a file with a readable filename." }, { status: 400, headers }); }
  let recovered: { text: string; warning: string; format: "pdf" | "docx" | "text" };
  if (request.headers.get("content-type") === "text/plain;charset=UTF-8") {
    const text = bytes.toString("utf8");
    if (!text.trim() || text.length > MAX_TEXT) return Response.json({ message: "Paste between 1 and 100,000 characters." }, { status: 400, headers });
    recovered = { text, warning: "", format: "text" };
  } else {
    try { recovered = await readResumeFile(bytes, name, request.headers.get("content-type") || ""); }
    catch (error) { return Response.json({ message: error instanceof Error ? error.message : "Could not read this file. Paste its text instead." }, { status: 400, headers }); }
  }
  try {
    const id = createImport(sqlite, { name, ...recovered, fingerprint: createHash("sha256").update(bytes).digest("hex") });
    return Response.json({ id }, { headers });
  } catch { return Response.json({ message: "The import could not be saved. Keep this file or text and retry; existing review progress is preserved.", recoveredText: recovered.text }, { status: 500, headers }); }
}
