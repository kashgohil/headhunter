import type { ResumeSnapshot } from "@/lib/db/schema";

export function ResumePreview({ snapshot, resumeId, revision }: { snapshot: ResumeSnapshot; resumeId: string; revision: number }) {
  const title = `PDF preview for ${snapshot.candidate?.name || "candidate with unavailable identity"}`;
  return <iframe key={revision} title={title} src={`/resumes/${resumeId}/pdf?revision=${revision}#toolbar=0&navpanes=0&view=FitH`} className="aspect-[8.5/11] w-full rounded-sm border-0 bg-white shadow-[0_14px_45px_rgba(25,24,22,0.12)]"/>;
}
