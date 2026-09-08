import type Database from "better-sqlite3";
const tables: Record<string, string[]> = {
  evidence: [
    "career_experiences",
    "career_achievements",
    "career_skills",
    "career_profile_items",
    "career_stories",
    "career_answers",
    "career_voice_profiles",
  ],
  answer: ["career_answers"],
  company: ["company_research_entries"],
  job: ["jobs"],
  strategy: ["search_strategy_versions"],
};
export function getSourceRecord(
  database: Database.Database,
  kind: string,
  id: string,
) {
  if (!Object.hasOwn(tables, kind)) return null;
  for (const table of tables[kind]) {
    const record = database
      .prepare(`SELECT * FROM ${table} WHERE id = ?`)
      .get(id) as Record<string, string | number | null> | undefined;
    if (record) return { table, record };
  }
  return null;
}
const jsonFields = new Set([
  "responsibilities",
  "technologies",
  "required_qualifications",
  "preferred_qualifications",
  "skills",
  "tools",
  "role_families",
  "prompts",
  "contexts",
  "principles",
  "avoid",
  "adjacent_titles",
  "seniority_levels",
  "preferred_industries",
  "excluded_industries",
  "company_stages",
  "company_sizes",
  "work_arrangements",
  "locations",
  "hard_blockers",
  "soft_preferences",
]);

export function sourceValue(
  value: string | number | null,
  key: string,
): string {
  if (value === null || value === "") return "Not recorded";
  if (typeof value === "number" && key.endsWith("_at"))
    return new Date(value).toISOString();
  if (
    typeof value === "string" &&
    jsonFields.has(key) &&
    (value.startsWith("[") || value.startsWith("{"))
  ) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map(String).join("\n") || "None recorded"
        : JSON.stringify(parsed, null, 2);
    } catch {
      /* Preserve non-JSON source text. */
    }
  }
  return String(value);
}

export function getEvidenceImport(database: Database.Database, evidenceId: string) {
  return database.prepare("SELECT i.id,i.name,p.source_quote AS excerpt FROM resume_import_proposals p JOIN resume_imports i ON i.id=p.import_id WHERE p.evidence_id=? AND p.state='approved' LIMIT 1").get(evidenceId) as { id: string; name: string; excerpt: string } | undefined;
}
