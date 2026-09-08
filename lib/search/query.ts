import type Database from "better-sqlite3";

export const searchKinds = [
  "jobs",
  "companies",
  "contacts",
  "documents",
  "notes",
  "answers",
] as const;
export type SearchKind = (typeof searchKinds)[number];
export type SearchResult = {
  id: string;
  kind: SearchKind;
  title: string;
  content: string;
  href: string;
};
// Fixed SQL projections keep private metadata out of results. User input is always bound.
const projections = [
  `SELECT id, 'documents' kind, 'Imported resume · ' || name title, source_text content, '/career-profile/import/' || id href FROM resume_imports`,
  `SELECT id, 'notes' kind, 'Weekly review · ' || week_start title, coalesce(json_extract(edits, '$.reflection'),'') || ' ' || coalesce(json_extract(edits, '$.interpretation'),'') || ' ' || coalesce(json_extract(edits, '$.nextWeekPlan'),'') || ' ' || coalesce(json_extract(edits, '$.experimentOne'),'') || ' ' || coalesce(json_extract(edits, '$.experimentTwo'),'') content, '/reviews/' || id href FROM weekly_reviews`,
  `SELECT id, 'jobs' kind, title || ' · ' || company title, original_description || ' ' || coalesce(location, '') content, '/jobs/' || id href FROM jobs`,
  `SELECT normalized_company_name id, 'companies' kind, company_name title, group_concat(content, ' ') content, '/search?kind=jobs&q=' || company_name href FROM company_research_entries GROUP BY normalized_company_name`,
  `SELECT company id, 'companies' kind, company title, company content, '/jobs/' || min(id) href FROM jobs WHERE lower(trim(company)) NOT IN (SELECT normalized_company_name FROM company_research_entries) GROUP BY company`,
  `SELECT id, 'contacts' kind, name || ' · ' || company title, context || ' ' || coalesce(email, '') content, '/contacts/' || id href FROM contacts`,
  `SELECT id, 'documents' kind, name title, summary || ' ' || positioning content, '/resumes' href FROM base_resumes`,
  `SELECT r.id, 'documents' kind, j.title || ' · ' || j.company || ' · resume v' || r.version title, CASE WHEN r.snapshot IS NOT NULL THEN coalesce((SELECT group_concat(atom, ' ') FROM json_tree(CASE WHEN json_valid(r.snapshot) THEN r.snapshot ELSE '{}' END) WHERE type = 'text' AND (key IN ('text', 'title', 'company', 'description', 'summary', 'name') OR fullkey LIKE '$.skills[%]')), '') ELSE r.summary_proposed || ' ' || coalesce((SELECT group_concat(proposed_text, ' ') FROM resume_bullet_edits WHERE tailored_resume_id = r.id), '') END content, '/resumes/' || r.id href FROM tailored_resumes r JOIN jobs j ON j.id = r.job_id`,
  `SELECT id, 'documents' kind, name title, content, '/jobs/' || job_id || '#application-workspace-heading' href FROM application_artifacts`,
  `SELECT id, 'documents' kind, coalesce(subject, 'Outreach draft') title, body content, '/jobs/' || job_id || '#application-workspace-heading' href FROM outreach_drafts`,
  `SELECT id, 'notes' kind, company_name || ' · ' || topic title, content, '/sources/company/' || id href FROM company_research_entries`,
  `SELECT n.id, 'notes' kind, j.title || ' · research notes' title, n.content, '/jobs/' || j.id href FROM opportunity_research_notes n JOIN jobs j ON j.id = n.job_id`,
  `SELECT id, 'notes' kind, title, coalesce(detail, '') content, '/jobs/' || job_id || '#application-workspace-heading' href FROM application_events WHERE kind = 'note'`,
  `SELECT id, 'notes' kind, 'Contact interaction' title, summary content, '/contacts/' || contact_id href FROM contact_interactions`,
  `SELECT id, 'documents' kind, 'Contact draft' title, draft content, '/contacts/' || contact_id || '#opportunity-' || job_id href FROM contact_opportunities`,
  `SELECT id, 'notes' kind, title, situation || ' ' || task || ' ' || action || ' ' || result || ' ' || reflection content, '/sources/evidence/' || id href FROM career_stories`,
  `SELECT id, 'notes' kind, label title, coalesce(notes, '') content, '/interviews/' || id href FROM application_interviews`,
  `SELECT interview_id id, 'notes' kind, 'Interview plan and debrief' title, objectives || ' ' || commitments || ' ' || study_plan || ' ' || questions_for_interviewer || ' ' || actual_questions || ' ' || went_well || ' ' || answer_gaps || ' ' || thank_you_draft content, '/interviews/' || interview_id href FROM interview_plans`,
  `SELECT id, 'notes' kind, prompt title, response || ' ' || feedback || ' ' || next_practice content, '/interviews/' || interview_id href FROM interview_practice`,
  `SELECT id, 'answers' kind, question title, answer content, '/sources/answer/' || id href FROM career_answers`,
  `SELECT id, 'answers' kind, question title, answer content, '/jobs/' || job_id || '#application-workspace-heading' href FROM application_answers`,
];
export function searchWorkspace(
  database: Database.Database,
  query: string,
  kind = "all",
  page = 1,
) {
  const q = query.trim().slice(0, 200);
  const filter = searchKinds.includes(kind as SearchKind) ? kind : "all";
  const currentPage =
    Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10000) : 1;
  if (!q) return { results: [] as SearchResult[], total: 0, page: currentPage };
  const tokens = q.split(/\s+/);
  const where = tokens
    .map(() => "instr(lower(title || ' ' || content), lower(?)) > 0")
    .join(" AND ");
  const sql = `WITH records AS (${projections.join(" UNION ALL ")}) SELECT * FROM records WHERE ${where} AND (? = 'all' OR kind = ?)`;
  const args = [...tokens, filter, filter];
  const { total } = database
    .prepare(`SELECT count(*) total FROM (${sql})`)
    .get(...args) as { total: number };
  const results = database
    .prepare(
      `${sql} ORDER BY CASE WHEN lower(title) = lower(?) THEN 0 WHEN instr(lower(title), lower(?)) > 0 THEN 1 ELSE 2 END, kind, title, id LIMIT 25 OFFSET ?`,
    )
    .all(...args, q, q, (currentPage - 1) * 25) as SearchResult[];
  return {
    results: results.map((row) => ({
      ...row,
      href: row.href.startsWith("/search?")
        ? `/search?kind=jobs&q=${encodeURIComponent(row.title)}`
        : row.href,
      content: excerpt(row.content, tokens[0]),
    })),
    total,
    page: currentPage,
  };
}
export function excerpt(content: string, term: string) {
  const clean = content.replace(/\s+/g, " ");
  const start = Math.max(
    0,
    clean.toLowerCase().indexOf(term.toLowerCase()) - 70,
  );
  return `${start ? "…" : ""}${clean.slice(start, start + 240)}${clean.length > start + 240 ? "…" : ""}`;
}
