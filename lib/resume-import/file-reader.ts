import { DOMParser } from "@xmldom/xmldom";
import { fromBufferPromise } from "yauzl";
import { MAX_TEXT } from "./extraction.ts";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_XML_BYTES = 4 * 1024 * 1024;
const WORD_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
export type RecoveredText = { text: string; warning: string };
export function validateResumeFile(name: string, size: number, mime: string) {
  if (!size || size > MAX_FILE_BYTES) throw new Error("Choose a nonempty PDF or DOCX file up to 5 MB.");
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext !== "pdf" && ext !== "docx") throw new Error("Choose a text-based PDF or DOCX resume, or paste its text.");
  const expected = ext === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (mime && ![expected, "application/octet-stream"].includes(mime)) throw new Error("The file type does not match its extension. Choose a PDF or DOCX resume.");
  return ext;
}
function boundText(text: string, warning = ""): RecoveredText {
  if (!text.trim()) throw new Error("No readable text was found. This may be a scanned or image-only resume. Paste the text instead; OCR is not available.");
  return { text: text.slice(0, MAX_TEXT), warning: [warning, text.length > MAX_TEXT ? "Only the first 100,000 characters were recovered. Review the source for missing content." : ""].filter(Boolean).join(" ") };
}
async function readDocx(bytes: Buffer): Promise<RecoveredText> {
  const zip = await fromBufferPromise(bytes, { lazyEntries: true, validateEntrySizes: true });
  try {
    let entries = 0; let xml: string | undefined;
    for await (const entry of zip.eachEntry()) {
      if (++entries > 2000) throw new Error("The DOCX archive contains too many entries. Paste its text instead.");
      if (entry.fileName !== "word/document.xml") continue;
      if (xml !== undefined) throw new Error("The DOCX contains duplicate document data. Paste its text instead.");
      if (entry.isEncrypted()) throw new Error("The DOCX is encrypted. Export an unencrypted copy or paste its text.");
      if (entry.uncompressedSize > MAX_XML_BYTES) throw new Error("The DOCX expands beyond the supported size. Paste a shorter resume instead.");
      const stream = await zip.openReadStreamPromise(entry);
      const chunks: Buffer[] = []; let size = 0;
      try {
        for await (const chunk of stream) {
          size += chunk.length;
          if (size > MAX_XML_BYTES) throw new Error("The DOCX expands beyond the supported size. Paste a shorter resume instead.");
          chunks.push(Buffer.from(chunk));
        }
      } finally { stream.destroy(); }
      xml = Buffer.concat(chunks).toString("utf8");
    }
    if (!xml) throw new Error("This file does not contain a readable DOCX document. Paste the text instead.");
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("This DOCX contains unsupported XML declarations. Paste its text instead.");
    const document = new DOMParser({ onError: () => { throw new Error("Unreadable document XML."); } }).parseFromString(xml, "text/xml");
    const paragraphs = Array.from(document.getElementsByTagNameNS(WORD_NAMESPACE, "p"));
    const lines = paragraphs.map(p => {
      // Read only actual Word text, never hyperlinks, external relationships or embedded objects.
      const texts = Array.from(p.getElementsByTagNameNS(WORD_NAMESPACE, "t"));
      return texts.map(t => t.textContent || "").join("");
    });
    return boundText(lines.join("\n"));
  } finally { zip.close(); }
}
async function readPdf(bytes: Buffer): Promise<RecoveredText> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0, useSystemFonts: false, disableFontFace: true, useWorkerFetch: false });
  let text = "";
  try {
    const document = await task.promise;
    if (document.numPages > 50) throw new Error("Use a PDF with 50 pages or fewer, or paste the relevant text.");
    let blankPages = 0;
    for (let i = 1; i <= document.numPages; i++) {
      try {
        const page = await document.getPage(i);
        const content = await page.getTextContent();
        let line = ""; const lines: string[] = [];
        for (const item of content.items) {
          if (!("str" in item)) continue;
          line += item.str + (item.hasEOL ? "" : " ");
          if (item.hasEOL) { lines.push(line.trimEnd()); line = ""; }
        }
        if (line) lines.push(line.trimEnd());
        const pageText = lines.join("\n");
        if (!pageText.trim()) blankPages++;
        text += (text ? "\n\n" : "") + pageText;
        page.cleanup();
        if (text.length > MAX_TEXT) return boundText(text);
      } catch {
        if (!text.trim()) throw new Error("The PDF text could not be read. Try an unencrypted PDF or paste the resume text.");
        return boundText(text, `Reading stopped on page ${i}. Earlier pages are preserved; review for missing content.`);
      }
    }
    return boundText(text, blankPages ? `${blankPages} page(s) contained no readable text. Image content was not extracted.` : "");
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException") throw new Error("The PDF is encrypted. Export an unencrypted copy or paste its text.");
    throw error;
  } finally { await task.destroy(); }
}
export async function readResumeFile(bytes: Buffer, name: string, mime = ""): Promise<RecoveredText & { format: "pdf" | "docx" }> {
  const format = validateResumeFile(name, bytes.length, mime);
  if (format === "pdf" && !bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("This is not a readable PDF. It may be encrypted or damaged; paste its text instead.");
  if (format === "docx" && !bytes.subarray(0, 2).equals(Buffer.from("PK"))) throw new Error("This is not a readable DOCX. It may be encrypted or damaged; paste its text instead.");
  try { return { ...await (format === "pdf" ? readPdf(bytes) : readDocx(bytes)), format }; }
  catch (error) {
    // Only known, authored messages leave the parser boundary. Parser details may contain private source text.
    const message = error instanceof Error ? error.message : "";
    const known = /^(Choose |Use a PDF|No readable text|The DOCX |This DOCX |This file does not |The PDF is encrypted|The PDF text could not)/.test(message);
    throw new Error(known ? message : "The file could not be read. Try an unencrypted copy or paste its text.");
  }
}
