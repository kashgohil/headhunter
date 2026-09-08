import { createResumePdf } from "@/lib/resumes/pdf";
import { getResumeSnapshot } from "@/lib/resumes/repository";
import { authorizeRoute, unauthorizedResponse } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: RouteContext<"/resumes/[id]/pdf">) {
  if (!(await authorizeRoute(request))) return unauthorizedResponse();
  const { id } = await params;
  const snapshot = await getResumeSnapshot(id);
  if (!snapshot) return new Response("Resume not found", { status: 404 });
  const fileName = `${snapshot.job.company}-${snapshot.job.title}-resume`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let bytes: Uint8Array;
  try { bytes = await createResumePdf(snapshot); }
  catch (error) {
    const message = error instanceof Error && error.message.startsWith("PDF export cannot represent") ? error.message : "The PDF could not be generated. Review the candidate header and resume content, then retry.";
    return new Response(message, { status: 422, headers: { "Content-Type": "text/plain;charset=UTF-8", "Cache-Control": "private, no-store" } });
  }
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}.pdf"`,
      "Cache-Control": snapshot ? "private, no-store" : "no-store",
    },
  });
}
