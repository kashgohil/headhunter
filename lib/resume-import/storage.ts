import { createHash, randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { EXTRACTOR_VERSION, extractProposals, MAX_TEXT, MAX_PROPOSALS } from "./extraction.ts";
import { emptyFields, kinds, parseFields, validateApproval, type Fields, type Proposal, type ProposalKind } from "./model.ts";

export type ImportRecord = { id: string; name: string; format: string; source_text: string; warning: string; created_at: number };
type Row = { id: string; import_id: string; source_key: string; kind: ProposalKind; source_quote: string; fields: string; state: Proposal["state"]; evidence_id: string | null; revision: number };
const normalized = (s: string) => s.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
function audit(db: Database.Database, action: string, id: string, entityType = "resume_import") {
  db.prepare("INSERT INTO audit_events (id,action,entity_type,entity_id,occurred_at) VALUES (?,?,?,?,?)").run(randomUUID(), action, entityType, id, Date.now());
}
export function listImports(db: Database.Database) {
  return db.prepare("SELECT i.id,i.name,i.format,i.warning,i.created_at, count(p.id) AS total, sum(CASE WHEN p.state='pending' THEN 1 ELSE 0 END) AS pending FROM resume_imports i LEFT JOIN resume_import_proposals p ON p.import_id=i.id GROUP BY i.id ORDER BY i.created_at DESC LIMIT 100").all() as (Omit<ImportRecord, "source_text"> & { total: number; pending: number })[];
}
export function getImport(db: Database.Database, id: string) {
  const record = db.prepare("SELECT * FROM resume_imports WHERE id=?").get(id) as ImportRecord | undefined;
  if (!record) return null;
  const rows = db.prepare("SELECT * FROM resume_import_proposals WHERE import_id=? ORDER BY created_at,rowid").all(id) as Row[];
  const proposals: Proposal[] = rows.map(r => ({ id: r.id, importId: r.import_id, sourceKey: r.source_key, kind: r.kind, sourceQuote: r.source_quote, fields: JSON.parse(r.fields), state: r.state, evidenceId: r.evidence_id, revision: r.revision }));
  return { ...record, proposals };
}
function insertExtracted(db: Database.Database, id: string, text: string) {
  const count = (db.prepare("SELECT count(*) as n FROM resume_import_proposals WHERE import_id=?").get(id) as { n: number }).n;
  let added = 0;
  for (const proposal of extractProposals(text)) {
    if (count + added >= MAX_PROPOSALS) break;
    const now = Date.now();
    added += db.prepare("INSERT OR IGNORE INTO resume_import_proposals (id,import_id,source_key,kind,source_quote,fields,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").run(randomUUID(), id, proposal.sourceKey, proposal.kind, proposal.sourceQuote, JSON.stringify(proposal.fields), now, now).changes;
  }
  return added;
}
export function createImport(db: Database.Database, input: { name: string; format: "pdf" | "docx" | "text"; text: string; fingerprint?: string; warning?: string }) {
  if (!input.text.trim() || input.text.length > MAX_TEXT) throw new Error("Use between 1 and 100,000 characters of recovered text.");
  const fingerprint = createHash("sha256").update(input.fingerprint || input.text).digest("hex");
  return db.transaction(() => {
    const existing = db.prepare("SELECT id FROM resume_imports WHERE fingerprint=?").get(fingerprint) as { id: string } | undefined;
    if (existing) return existing.id;
    const id = randomUUID();
    db.prepare("INSERT INTO resume_imports (id,fingerprint,name,format,source_text,warning,extractor_version,created_at) VALUES (?,?,?,?,?,?,?,?)").run(id, fingerprint, input.name.slice(0, 180), input.format, input.text, input.warning || "", EXTRACTOR_VERSION, Date.now());
    const added = insertExtracted(db, id, input.text);
    if (added >= MAX_PROPOSALS) db.prepare("UPDATE resume_imports SET warning=? WHERE id=?").run([input.warning, "Only the first 150 proposals are shown. Review the source for omitted facts."].filter(Boolean).join(" "), id);
    audit(db, "resume_import.created", id);
    return id;
  })();
}
export function retryExtraction(db: Database.Database, id: string) {
  return db.transaction(() => {
    const record = getImport(db, id);
    if (!record) throw new Error("Import not found.");
    const added = insertExtracted(db, id, record.source_text);
    audit(db, "resume_import.retried", id);
    return added;
  })();
}
export function addProposal(db: Database.Database, importId: string, kind: ProposalKind, quote: string) {
  if (!kinds.includes(kind) || !quote.trim() || quote.length > 4000) throw new Error("Choose a fact type and up to 4,000 characters from the source.");
  return db.transaction(() => {
    const record = getImport(db, importId);
    if (!record || !record.source_text.includes(quote)) throw new Error("The excerpt must appear exactly in the recovered source.");
    if (record.proposals.length >= MAX_PROPOSALS) throw new Error("This import has reached 150 proposals.");
    const key = createHash("sha256").update(`manual:${kind}:${quote}`).digest("hex");
    const existing = record.proposals.find(p => p.sourceKey === key);
    if (existing) return existing.id;
    const id = randomUUID(); const now = Date.now();
    db.prepare("INSERT INTO resume_import_proposals (id,import_id,source_key,kind,source_quote,fields,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").run(id, importId, key, kind, quote, JSON.stringify(emptyFields(kind)), now, now);
    audit(db, "resume_import.proposal_added", id, "resume_import_proposal");
    return id;
  })();
}
const tables = { experience: "career_experiences", achievement: "career_achievements", skill: "career_skills", education: "career_profile_items", project: "career_profile_items" };
export type Match = { id: string; label: string; state: string; locked: boolean };
export function findMatches(db: Database.Database, kind: ProposalKind, f: Fields): Match[] {
  const rows = db.prepare(`SELECT * FROM ${tables[kind]}`).all() as Record<string, string | number | null>[];
  return rows.filter(r => {
    if (kind === "skill") return normalized(String(r.name)) === normalized(f.name || "");
    if (kind === "experience") {
      const sameCompany = normalized(String(r.company)) === normalized(f.company || "");
      const overlap = f.startDate && r.start_date && f.startDate <= String(r.end_date || "9999-12") && String(r.start_date) <= (f.endDate || "9999-12");
      return sameCompany && (normalized(String(r.title)) === normalized(f.title || "") || Boolean(overlap));
    }
    if (kind === "achievement") return normalized(String(r.action)) === normalized(f.action || "");
    return r.kind === kind && normalized(String(r.title)) === normalized(f.title || "");
  }).map(r => ({ id: String(r.id), label: kind === "experience" ? `${r.title} · ${r.company} · ${r.start_date}–${r.end_date || (r.is_current ? "Present" : "Unknown")}` : String(r.name || r.title || r.action), state: String(r.verification_state), locked: Boolean(r.locked) }));
}
function insertEvidence(db: Database.Database, kind: ProposalKind, f: Fields, source: string) {
  const id = randomUUID(); const now = Date.now();
  const optional = (s: string) => s || null;
  const list = (s: string) => JSON.stringify([...new Set((s || "").split(/[,\n]/).map(v => v.trim()).filter(Boolean))]);
  let values: Record<string, string | number | null> = { id, source_type: "imported", source_label: source, verification_state: "verified", locked: 0, created_at: now, updated_at: now };
  if (kind === "experience") values = { ...values, title: f.title, company: f.company, start_date: f.startDate, end_date: f.isCurrent === "true" ? null : optional(f.endDate), is_current: Number(f.isCurrent === "true"), location: optional(f.location), summary: optional(f.summary), technologies: list(f.technologies) };
  else if (kind === "skill") values = { ...values, name: f.name, normalized_name: normalized(f.name), context: optional(f.context), recency: f.recency, proficiency: f.proficiency };
  else if (kind === "achievement") {
    const parent = db.prepare("SELECT verification_state FROM career_experiences WHERE id=?").get(f.experienceId) as { verification_state: string } | undefined;
    if (!parent || ["archived", "prohibited"].includes(parent.verification_state)) throw new Error("Choose a usable career experience before approving this achievement.");
    values = { ...values, experience_id: f.experienceId, problem: f.problem, action: f.action, result: f.result, measurable_outcome: optional(f.measurableOutcome), tools: list(f.tools) };
  } else values = { ...values, kind, title: f.title, organization: optional(f.organization), description: f.description, start_date: optional(f.startDate), end_date: optional(f.endDate) };
  const columns = Object.keys(values);
  db.prepare(`INSERT INTO ${tables[kind]} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`).run(...Object.values(values));
  audit(db, `${kind === "education" || kind === "project" ? "career_profile_item" : `career_${kind}`}.created`, id, kind === "education" || kind === "project" ? "career_profile_item" : `career_${kind}`);
  return id;
}
export function reviewProposal(db: Database.Database, id: string, revision: number, action: "save" | "approve" | "reject", input: unknown, acknowledgeMatch = false) {
  return db.transaction(() => {
    const row = db.prepare("SELECT * FROM resume_import_proposals WHERE id=?").get(id) as Row | undefined;
    if (!row) throw new Error("Proposal not found.");
    if (action === "approve" && row.state === "approved") return row.evidence_id;
    if (row.state !== "pending") throw new Error("This proposal has already been reviewed.");
    if (row.revision !== revision) throw new Error("This proposal changed in another tab. Your input is retained; reload to review the saved version.");
    if (!["save", "approve", "reject"].includes(action)) throw new Error("Choose a review action.");
    const fields = action === "reject" ? JSON.parse(row.fields) : parseFields(row.kind, input);
    let evidenceId: string | null = null;
    if (action === "approve") {
      validateApproval(row.kind, fields);
      const matches = findMatches(db, row.kind, fields);
      if (matches.length && (row.kind === "skill" || !acknowledgeMatch)) throw new Error(row.kind === "skill" ? "This skill already exists. Review the existing record or reject this proposal." : "A possible duplicate or conflicting fact exists. Save the draft to inspect matches, then acknowledge before creating a separate record.");
      const record = db.prepare("SELECT name FROM resume_imports WHERE id=?").get(row.import_id) as { name: string };
      evidenceId = insertEvidence(db, row.kind, fields, `${record.name.slice(0, 120)} · import ${row.import_id}`);
    }
    db.prepare("UPDATE resume_import_proposals SET fields=?,state=?,evidence_id=?,revision=revision+1,updated_at=? WHERE id=?").run(JSON.stringify(fields), action === "approve" ? "approved" : action === "reject" ? "rejected" : "pending", evidenceId, Date.now(), id);
    audit(db, `resume_import.${action === "save" ? "edited" : action === "approve" ? "approved" : "rejected"}`, id, "resume_import_proposal");
    return evidenceId;
  })();
}
export function deleteImport(db: Database.Database, id: string) {
  db.transaction(() => { db.prepare("DELETE FROM resume_imports WHERE id=?").run(id); audit(db, "resume_import.deleted", id); })();
}
