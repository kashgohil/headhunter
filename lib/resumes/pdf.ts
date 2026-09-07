import type { ResumeSnapshot } from "@/lib/db/schema";

type PdfLine = { text: string; size: number; bold?: boolean; gapAfter?: number; indent?: number; color?: [number, number, number] };

function safeText(value: string) {
  return value.normalize("NFKD").replace(/[^\x20-\x7E]/g, "-").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(value: string, width: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > width && line) { lines.push(line); line = word; } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

function documentLines(snapshot: ResumeSnapshot): PdfLine[] {
  const compact = snapshot.template === "compact";
  const lines: PdfLine[] = [
    { text: snapshot.name, size: compact ? 20 : 24, bold: true, gapAfter: 3 },
    { text: snapshot.roleFamily, size: 10, color: [0.35, 0.35, 0.35], gapAfter: compact ? 10 : 16 },
  ];
  const heading = (text: string) => lines.push({ text: text.toUpperCase(), size: 9, bold: true, gapAfter: 5, color: snapshot.template === "modern" ? [0.28, 0.22, 0.62] : [0.15, 0.15, 0.15] });
  const body = (text: string, options: Partial<PdfLine> = {}) => wrap(text, compact ? 105 : 88).forEach((part, index, all) => lines.push({ text: part, size: compact ? 8 : 9.5, ...options, gapAfter: index === all.length - 1 ? options.gapAfter : 1 }));

  for (const section of snapshot.sectionOrder) {
    if (section === "summary" && snapshot.summary) { heading("Profile"); body(snapshot.summary, { gapAfter: compact ? 8 : 12 }); }
    if (section === "experience" && snapshot.experiences.length) {
      heading("Experience");
      for (const experience of snapshot.experiences) {
        lines.push({ text: `${experience.title} | ${experience.company}`, size: compact ? 9 : 10, bold: true, gapAfter: 2 });
        lines.push({ text: `${experience.startDate} - ${experience.endDate || "Present"}${experience.location ? ` | ${experience.location}` : ""}`, size: 8, color: [0.4, 0.4, 0.4], gapAfter: 4 });
        for (const bullet of experience.bullets) body(`- ${bullet.text}`, { indent: 8, gapAfter: 3 });
        lines.push({ text: "", size: 4, gapAfter: compact ? 2 : 5 });
      }
    }
    if (section === "projects") {
      const records = snapshot.profileItems.filter((item) => item.kind !== "education");
      if (records.length) { heading("Selected work"); for (const record of records) { lines.push({ text: `${record.title}${record.organization ? ` | ${record.organization}` : ""}`, size: 9, bold: true, gapAfter: 2 }); body(record.description, { gapAfter: 5 }); } }
    }
    if (section === "skills" && snapshot.skills.length) { heading("Skills"); body(snapshot.skills.join(" | "), { gapAfter: compact ? 8 : 12 }); }
    if (section === "education") {
      const records = snapshot.profileItems.filter((item) => item.kind === "education");
      if (records.length) { heading("Education"); for (const record of records) body(`${record.title}${record.organization ? ` | ${record.organization}` : ""}`, { gapAfter: 4 }); }
    }
  }
  return lines;
}

function pageStreams(snapshot: ResumeSnapshot) {
  const streams: string[] = [];
  const margin = snapshot.template === "compact" ? 42 : 54;
  let y = 742;
  let stream = "";
  const startPage = () => {
    stream = snapshot.template === "modern" ? "0.28 0.22 0.62 rg 34 36 7 720 re f\n" : "";
    y = 742;
  };
  startPage();
  for (const line of documentLines(snapshot)) {
    const leading = line.size * 1.35 + (line.gapAfter ?? 0);
    if (y - leading < 46) { streams.push(stream); startPage(); }
    const color = line.color ?? [0.08, 0.08, 0.08];
    stream += `BT /${line.bold ? "F2" : "F1"} ${line.size} Tf ${color.join(" ")} rg ${margin + (line.indent ?? 0)} ${y.toFixed(2)} Td (${safeText(line.text)}) Tj ET\n`;
    y -= leading;
  }
  streams.push(stream);
  return streams;
}

export function createResumePdf(snapshot: ResumeSnapshot) {
  const streams = pageStreams(snapshot);
  const pageObjectIds = streams.map((_, index) => 5 + index * 2);
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${streams.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  streams.forEach((stream, index) => {
    const pageId = 5 + index * 2;
    const contentId = pageId + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.push(`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}endstream`);
  });

  let pdf = "%PDF-1.4\n%HHRS\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(new TextEncoder().encode(pdf).length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
