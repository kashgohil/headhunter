import { createResumePdf } from "@/lib/resumes/pdf";
import { getResumeSnapshot } from "@/lib/resumes/repository";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: RouteContext<"/resumes/[id]/pdf">) {
  const { id } = await params;
  const snapshot = await getResumeSnapshot(id);
  if (!snapshot) return new Response("Resume not found", { status: 404 });
  const fileName = `${snapshot.job.company}-${snapshot.job.title}-resume`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const bytes = await createResumePdf(snapshot);
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}.pdf"`,
      "Cache-Control": snapshot ? "private, no-store" : "no-store",
    },
  });
}
