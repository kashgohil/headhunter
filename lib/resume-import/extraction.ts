import { createHash } from "node:crypto";
import { emptyFields, type ExtractedProposal, type Fields, type ProposalKind } from "./model.ts";

export const EXTRACTOR_VERSION = "local-sections-v1";
export const MAX_TEXT = 100_000;
export const MAX_PROPOSALS = 150;
const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const datePart = "(?:\\d{4}-\\d{2}|[A-Za-z]{3,9}\\.?\\s+\\d{4}|\\d{4})";
const range = new RegExp(`(${datePart})\\s*(?:–|—|-|to)\\s*(${datePart}|present|current|now)`, "i");
function monthValue(raw: string) {
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) return raw;
  const match = /^([A-Za-z]+)\.?\s+(\d{4})$/.exec(raw);
  const index = match ? months.indexOf(match[1].slice(0, 3).toLowerCase()) : -1;
  return match && index >= 0 ? `${match[2]}-${String(index + 1).padStart(2, "0")}` : "";
}
export function extractProposals(text: string): ExtractedProposal[] {
  if (!text.trim() || text.length > MAX_TEXT) throw new Error("Paste between 1 and 100,000 characters.");
  const proposals: ExtractedProposal[] = [];
  const lines = text.split(/\r?\n/);
  let section = "";
  let context: string[] = [];
  let roleKey = "";
  const add = (kind: ProposalKind, quote: string, fields: Fields, line: number) => {
    if (proposals.length >= MAX_PROPOSALS) return;
    const sourceKey = createHash("sha256").update(`${kind}:${line}:${quote}:${fields.name || ""}`).digest("hex");
    proposals.push({ kind, sourceKey, sourceQuote: quote, fields: { ...emptyFields(kind), ...fields } });
    return sourceKey;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { context = []; continue; }
    const heading = /^(?:professional |technical |work |relevant )?(experience|employment|skills|education|projects|achievements|summary|certifications)\s*:?(.*)$/i.exec(line);
    if (heading && (!heading[2].trim() || heading[1].toLowerCase() === "skills")) {
      section = heading[1].toLowerCase(); context = []; roleKey = "";
      if (!heading[2].trim()) continue;
    }
    if (section === "skills") {
      const content = heading ? heading[2] : line.replace(/^[\s•*-]+/, "");
      for (const skill of content.split(/[,;|•]/).map(s => s.trim()).filter(Boolean)) {
        if (skill.length <= 100) add("skill", lines[i], { name: skill }, i);
      }
      continue;
    }
    const dates = range.exec(line);
    if (["experience", "employment"].includes(section) && dates) {
      const header = line.slice(0, dates.index).replace(/[|,\s–—-]+$/, "");
      const parts = (header ? header.split(/\s+(?:at|@)\s+|\s*[|]\s*/i) : context.slice(-2)).filter(Boolean);
      const quote = [...context.slice(-2), lines[i]].join("\n");
      roleKey = add("experience", quote, { title: parts[0] || "", company: parts[1] || "", startDate: monthValue(dates[1]), endDate: monthValue(dates[2]), isCurrent: /^(present|current|now)$/i.test(dates[2]) ? "true" : "false" }, i) || "";
      context = []; continue;
    }
    if (["experience", "employment", "achievements"].includes(section) && /^[•*\-]\s+/.test(line)) {
      const action = line.replace(/^[•*\-]\s+/, "");
      add("achievement", lines[i], { action, parentKey: roleKey }, i);
      context = []; continue;
    }
    if (["education", "projects"].includes(section)) {
      const chunk = [lines[i]];
      while (i + 1 < lines.length && lines[i + 1].trim() && !/^(?:skills|experience|employment|education|projects|achievements|summary|certifications)\s*:?$/i.test(lines[i + 1].trim())) chunk.push(lines[++i]);
      const parts = chunk[0].split(/\s*\|\s*/);
      add(section === "education" ? "education" : "project", chunk.join("\n"), { title: parts[0].trim(), organization: parts[1]?.trim() || "", description: chunk.join("\n") }, i - chunk.length + 1);
      continue;
    }
    context.push(lines[i]);
  }
  return proposals;
}
