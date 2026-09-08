import path from "node:path";
import PDFDocument from "pdfkit";
import type { ResumeSnapshot } from "@/lib/db/schema";

const fontRoot = path.join(process.cwd(), "node_modules", "@fontsource", "noto-sans-devanagari", "files");
const FONT_PATHS = {
  latin: {
    regular: path.join(fontRoot, "noto-sans-devanagari-latin-400-normal.woff"),
    bold: path.join(fontRoot, "noto-sans-devanagari-latin-700-normal.woff"),
  },
  latinExt: {
    regular: path.join(fontRoot, "noto-sans-devanagari-latin-ext-400-normal.woff"),
    bold: path.join(fontRoot, "noto-sans-devanagari-latin-ext-700-normal.woff"),
  },
  devanagari: {
    regular: path.join(fontRoot, "noto-sans-devanagari-devanagari-400-normal.woff"),
    bold: path.join(fontRoot, "noto-sans-devanagari-devanagari-700-normal.woff"),
  },
} as const;
const FONT_NAMES = {
  latin: { regular: "NotoLatin", bold: "NotoLatinBold" },
  latinExt: { regular: "NotoLatinExt", bold: "NotoLatinExtBold" },
  devanagari: { regular: "NotoDevanagari", bold: "NotoDevanagariBold" },
} as const;
type FontFamily = keyof typeof FONT_NAMES;
type TextStyle = { size: number; bold?: boolean; color?: string; align?: "left" | "center"; indent?: number; gapAfter?: number; link?: string };
const graphemes = new Intl.Segmenter("und", { granularity: "grapheme" });

function familyFor(value: string): FontFamily {
  if (/[ऀ-ॿ᳐-᳹₨₹⃰◌꠰-꠹꣠-ꣿ]/u.test(value)) return "devanagari";
  if (/[Ā-˿ᴀ-ỿ₠-⃀Ⱡ-Ɀ꜠-ꟿ]/u.test(value)) return "latinExt";
  return "latin";
}

function isSupported(character: string) {
  const point = character.codePointAt(0) ?? 0;
  return point === 9 || point === 10 || point === 13 ||
    (point >= 0x20 && point <= 0xff) || (point >= 0x100 && point <= 0x2ff) ||
    (point >= 0x900 && point <= 0x97f) || (point >= 0x1cd0 && point <= 0x1cf9) ||
    (point >= 0x1d00 && point <= 0x1eff) || (point >= 0x2000 && point <= 0x206f) ||
    (point >= 0x20a0 && point <= 0x20c0) || (point >= 0x2100 && point <= 0x214f) ||
    (point >= 0x2190 && point <= 0x2215) || (point >= 0x2c60 && point <= 0x2c7f) ||
    (point >= 0xa720 && point <= 0xa7ff) || (point >= 0xa830 && point <= 0xa839) ||
    (point >= 0xa8e0 && point <= 0xa8ff) || point === 0xfeff || point === 0xfffd;
}

function assertSupported(snapshot: ResumeSnapshot) {
  for (const character of JSON.stringify(snapshot)) {
    if (!isSupported(character)) throw new Error(`PDF export cannot represent “${character}” with the embedded resume fonts. Keep the source unchanged and choose supported Latin or Devanagari text.`);
  }
}

function runs(value: string) {
  const result: Array<{ text: string; family: FontFamily }> = [];
  for (const item of graphemes.segment(value.normalize("NFC"))) {
    const family = familyFor(item.segment);
    const last = result.at(-1);
    if (last?.family === family) last.text += item.segment;
    else result.push({ text: item.segment, family });
  }
  return result;
}

function registerFonts(doc: PDFKit.PDFDocument) {
  for (const family of Object.keys(FONT_NAMES) as FontFamily[]) {
    doc.registerFont(FONT_NAMES[family].regular, FONT_PATHS[family].regular);
    doc.registerFont(FONT_NAMES[family].bold, FONT_PATHS[family].bold);
  }
}

function selectFont(doc: PDFKit.PDFDocument, family: FontFamily, bold = false) {
  const names = FONT_NAMES[family];
  return doc.font(bold ? names.bold : names.regular);
}

function textWidth(doc: PDFKit.PDFDocument, value: string, size: number, bold = false) {
  doc.fontSize(size);
  return runs(value).reduce((width, fragment) => width + selectFont(doc, fragment.family, bold).widthOfString(fragment.text, { features: [] }), 0);
}

function wrapText(doc: PDFKit.PDFDocument, value: string, width: number, size: number, bold = false) {
  const tokens = value.split(/(\s+)/u).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const token of tokens) {
    const candidate = line + token;
    if (line.trim() && textWidth(doc, candidate, size, bold) > width) {
      lines.push(line.trimEnd());
      line = token.trimStart();
    } else line = candidate;
    while (line && textWidth(doc, line, size, bold) > width) {
      const clusters = [...graphemes.segment(line)].map((item) => item.segment);
      let fitting = "";
      while (clusters.length && textWidth(doc, fitting + clusters[0], size, bold) <= width) fitting += clusters.shift();
      if (!fitting) fitting = clusters.shift() ?? "";
      lines.push(fitting.trimEnd());
      line = clusters.join("").trimStart();
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines.length ? lines : [""];
}

function writeText(doc: PDFKit.PDFDocument, value: string, style: TextStyle) {
  const left = doc.page.margins.left + (style.indent ?? 0);
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right - (style.indent ?? 0);
  const lines = wrapText(doc, value, width, style.size, style.bold);
  const lineHeight = style.size * 1.35;
  let y = doc.y;
  for (const line of lines) {
    if (y + lineHeight * 1.65 > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    const lineWidth = textWidth(doc, line, style.size, style.bold);
    let x = style.align === "center" ? left + Math.max(0, (width - lineWidth) / 2) : left;
    doc.fillColor(style.color ?? "#171717").fontSize(style.size).markContent("Span", { actual: line });
    for (const fragment of runs(line)) {
      selectFont(doc, fragment.family, style.bold).text(fragment.text, x, y, { lineBreak: false, features: [], link: style.link, underline: Boolean(style.link) });
      x += selectFont(doc, fragment.family, style.bold).widthOfString(fragment.text, { features: [] });
    }
    doc.endMarkedContent();
    y += lineHeight;
  }
  doc.x = doc.page.margins.left;
  doc.y = y + (style.gapAfter ?? 4);
}

function heading(doc: PDFKit.PDFDocument, value: string, modern: boolean) {
  doc.moveDown(0.45);
  writeText(doc, value.toLocaleUpperCase(), { size: 9, bold: true, color: modern ? "#47389e" : "#262626", gapAfter: 5 });
  if (!modern) doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor("#b8b8b8").lineWidth(0.5).stroke().moveDown(0.45);
}

function renderResume(doc: PDFKit.PDFDocument, snapshot: ResumeSnapshot) {
  const compact = snapshot.template === "compact";
  const modern = snapshot.template === "modern";
  const candidate = snapshot.candidate;
  writeText(doc, candidate?.name || "Candidate identity unavailable", { size: compact ? 20 : 24, bold: true, align: snapshot.template === "classic" ? "center" : "left", gapAfter: 3 });
  const contact = [candidate?.email, candidate?.phone, candidate?.location].filter(Boolean).join(" · ");
  if (contact) writeText(doc, contact, { size: 8.5, align: snapshot.template === "classic" ? "center" : "left", color: "#555555", gapAfter: 2 });
  if (candidate?.website) writeText(doc, candidate.website, { size: 8.5, align: snapshot.template === "classic" ? "center" : "left", color: "#47389e", gapAfter: compact ? 8 : 13, link: candidate.website });
  else doc.moveDown(compact ? 0.7 : 1.1);

  const body = (value: string, options: Partial<TextStyle> = {}) => writeText(doc, value, { size: compact ? 8 : 9.5, gapAfter: compact ? 3 : 5, ...options });
  for (const section of snapshot.sectionOrder) {
    if (section === "summary" && snapshot.summary) { heading(doc, "Profile", modern); body(snapshot.summary, { gapAfter: compact ? 7 : 10 }); }
    if (section === "experience" && snapshot.experiences.length) {
      heading(doc, "Experience", modern);
      for (const experience of snapshot.experiences) {
        body(`${experience.title} | ${experience.company}`, { size: compact ? 9 : 10, bold: true, gapAfter: 2 });
        body(`${experience.startDate} – ${experience.endDate || "Present"}${experience.location ? ` | ${experience.location}` : ""}`, { size: 8, color: "#666666", gapAfter: 4 });
        for (const bullet of experience.bullets) body(`• ${bullet.text}`, { indent: 8, gapAfter: 3 });
        doc.moveDown(0.3);
      }
    }
    if (section === "projects") {
      const records = snapshot.profileItems.filter((item) => item.kind !== "education");
      if (records.length) { heading(doc, "Selected work", modern); for (const record of records) { body(`${record.title}${record.organization ? ` | ${record.organization}` : ""}`, { bold: true, gapAfter: 2 }); body(record.description, { gapAfter: 5 }); } }
    }
    if (section === "skills" && snapshot.skills.length) { heading(doc, "Skills", modern); body(snapshot.skills.join(" · "), { gapAfter: compact ? 7 : 10 }); }
    if (section === "education") {
      const records = snapshot.profileItems.filter((item) => item.kind === "education");
      if (records.length) { heading(doc, "Education", modern); for (const record of records) body(`${record.title}${record.organization ? ` | ${record.organization}` : ""}`, { bold: true, gapAfter: 4 }); }
    }
  }
}

export async function createResumePdf(snapshot: ResumeSnapshot) {
  assertSupported(snapshot);
  const doc = new PDFDocument({ size: "LETTER", margin: snapshot.template === "compact" ? 42 : 54, bufferPages: true, tagged: true, lang: "en", info: { Title: `${snapshot.candidate?.name || "Candidate"} resume`, Author: snapshot.candidate?.name || "" } });
  registerFonts(doc);
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
  const completed = new Promise<Uint8Array>((resolve, reject) => { doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks)))); doc.on("error", reject); });
  renderResume(doc, snapshot);
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index++) {
    doc.switchToPage(index);
    const label = `${index + 1} / ${range.count}`;
    doc.font(FONT_NAMES.latin.regular).fontSize(7).fillColor("#777777");
    doc.text(label, doc.page.width - doc.page.margins.right - doc.widthOfString(label), doc.page.height - 30, { lineBreak: false });
  }
  doc.end();
  return completed;
}
