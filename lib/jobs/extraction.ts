type JsonRecord = Record<string, unknown>;

export type ExtractedJob = {
  title: string;
  company: string;
  location: string | null;
  originalDescription: string;
  employmentType: string | null;
  workArrangement: "remote" | "hybrid" | "on_site" | "unknown";
  seniority: string | null;
  minimumCompensation: number | null;
  maximumCompensation: number | null;
  compensationCurrency: string | null;
  postedAt: Date | null;
  applicationDeadline: Date | null;
  responsibilities: string[];
  requiredQualifications: string[];
  preferredQualifications: string[];
  skills: string[];
  technologies: string[];
  extractionConfidence: "low" | "medium" | "high";
};

export type JobExtractionSource = {
  body: string;
  contentType: string;
  sourceUrl?: string;
  titleHint?: string;
  companyHint?: string;
  locationHint?: string | null;
};

export interface JobExtractionProvider {
  extract(source: JobExtractionSource): Promise<ExtractedJob>;
}

const htmlEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeHtml(value: string) {
  return value.replace(/&(#x?[\da-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#")) {
      const radix = code[1]?.toLocaleLowerCase() === "x" ? 16 : 10;
      const number = Number.parseInt(code.slice(radix === 16 ? 2 : 1), radix);
      return Number.isFinite(number) ? String.fromCodePoint(number) : entity;
    }
    return htmlEntities[code.toLocaleLowerCase()] ?? entity;
  });
}

export function htmlToText(html: string) {
  return decodeHtml(html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " "))
    .replace(/\r/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function findJobPosting(value: unknown): JsonRecord | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findJobPosting(item);
      if (match) return match;
    }
    return null;
  }

  const record = asRecord(value);
  if (!record) return null;
  const type = record["@type"];
  if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))) return record;

  for (const nested of Object.values(record)) {
    const match = findJobPosting(nested);
    if (match) return match;
  }
  return null;
}

function extractJobPosting(html: string) {
  const scripts = html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    try {
      const posting = findJobPosting(JSON.parse(decodeHtml(match[1]).trim()));
      if (posting) return posting;
    } catch {
      // Malformed structured data should not prevent a readable page from importing.
    }
  }
  return null;
}

function metaContent(html: string, key: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const property = tag.match(/(?:property|name)=["']([^"']+)["']/i)?.[1];
    const content = tag.match(/content=["']([^"']*)["']/i)?.[1];
    if (property?.toLocaleLowerCase() === key.toLocaleLowerCase() && content) return decodeHtml(content).trim();
  }
  return null;
}

function fallbackPageIdentity(html: string) {
  const rawTitle = metaContent(html, "og:title")
    ?? html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    ?? "";
  const pageTitle = htmlToText(rawTitle);
  const parts = pageTitle.split(/\s(?:\||–|—)\s|\sat\s/i).map((part) => part.trim()).filter(Boolean);
  return {
    title: parts[0] ?? "",
    company: metaContent(html, "og:site_name") ?? parts[1] ?? "",
  };
}

function stringValue(value: unknown) {
  if (typeof value === "string") return htmlToText(value).trim() || null;
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").join(", ") || null;
  return null;
}

function dateValue(value: unknown) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return null;
  return new Date(value);
}

function locationValue(posting: JsonRecord | null) {
  if (!posting) return null;
  const locations = Array.isArray(posting.jobLocation) ? posting.jobLocation : [posting.jobLocation];
  const location = asRecord(locations[0]);
  const address = asRecord(location?.address);
  return [address?.addressLocality, address?.addressRegion, address?.addressCountry]
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(", ") || null;
}

function organizationValue(posting: JsonRecord | null) {
  const organization = asRecord(posting?.hiringOrganization);
  return stringValue(organization?.name);
}

function compensationValue(posting: JsonRecord | null) {
  const salary = asRecord(posting?.baseSalary);
  const value = asRecord(salary?.value);
  const directValue = typeof salary?.value === "number" ? salary.value : null;
  const minimum = typeof value?.minValue === "number" ? value.minValue : directValue;
  const maximum = typeof value?.maxValue === "number" ? value.maxValue : directValue;
  const currency = stringValue(salary?.currency)?.toUpperCase() ?? null;
  return { minimum, maximum, currency };
}

function inferredCompensation(text: string) {
  const match = text.match(/([$₹£€])\s*([\d,.]+)\s*([km]?)\s*(?:-|–|—|to)\s*([$₹£€])?\s*([\d,.]+)\s*([km]?)/i);
  if (!match) return { minimum: null, maximum: null, currency: null };

  const amount = (value: string, suffix: string) => {
    const parsed = Number(value.replace(/,/g, ""));
    if (!Number.isFinite(parsed)) return null;
    if (suffix.toLocaleLowerCase() === "k") return Math.round(parsed * 1_000);
    if (suffix.toLocaleLowerCase() === "m") return Math.round(parsed * 1_000_000);
    return Math.round(parsed);
  };
  const currency = { "$": "USD", "₹": "INR", "£": "GBP", "€": "EUR" }[match[1]] ?? null;
  return {
    minimum: amount(match[2], match[3]),
    maximum: amount(match[5], match[6]),
    currency,
  };
}

function inferEmploymentType(text: string, posting: JsonRecord | null) {
  const structured = stringValue(posting?.employmentType);
  if (structured) return structured.replaceAll("_", " ").toLocaleLowerCase().replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());

  const source = text.slice(0, 8_000).toLocaleLowerCase();
  if (/\bfull[ -]?time\b/.test(source)) return "Full-time";
  if (/\bpart[ -]?time\b/.test(source)) return "Part-time";
  if (/\b(contract|contractor|freelance)\b/.test(source)) return "Contract";
  if (/\bintern(ship)?\b/.test(source)) return "Internship";
  return null;
}

function inferWorkArrangement(text: string, posting: JsonRecord | null): ExtractedJob["workArrangement"] {
  const source = `${stringValue(posting?.jobLocationType) ?? ""} ${text.slice(0, 8_000)}`.toLocaleLowerCase();
  if (/\bhybrid\b/.test(source)) return "hybrid";
  if (/\b(remote|telecommute|work from home)\b/.test(source)) return "remote";
  if (/\b(on[ -]?site|in office|office-based)\b/.test(source)) return "on_site";
  return "unknown";
}

function inferSeniority(title: string, text: string) {
  const source = `${title} ${text.slice(0, 2_000)}`.toLocaleLowerCase();
  const matches: Array<[RegExp, string]> = [
    [/\b(principal|distinguished)\b/, "Principal"],
    [/\bstaff\b/, "Staff"],
    [/\b(senior|sr\.?|lead)\b/, "Senior"],
    [/\b(mid[ -]?level|intermediate)\b/, "Mid-level"],
    [/\b(junior|jr\.?|entry[ -]?level|graduate)\b/, "Entry-level"],
  ];
  return matches.find(([pattern]) => pattern.test(source))?.[1] ?? null;
}

function sectionLines(text: string, headings: RegExp[]) {
  const lines = text.split("\n").map((line) => line.replace(/^[•*\-–—\d.)\s]+/, "").trim());
  const headingIndex = lines.findIndex((line) => headings.some((heading) => heading.test(line)));
  if (headingIndex < 0) return [];

  const result: string[] = [];
  for (const line of lines.slice(headingIndex + 1)) {
    if (!line) continue;
    if (result.length > 0 && line.length < 60 && /^(about|benefits|preferred|requirements|responsibilities|qualifications|what|who|why)\b/i.test(line)) break;
    result.push(line);
    if (result.length === 12) break;
  }
  return result;
}

const technologyNames = [
  "AWS", "Azure", "Docker", "Figma", "GCP", "Git", "GraphQL", "Java", "JavaScript",
  "Kubernetes", "Next.js", "Node.js", "PostgreSQL", "Python", "React", "Ruby", "SQL",
  "Swift", "TypeScript", "Vue",
];

function mentionedTechnologies(text: string) {
  return technologyNames.filter((name) => new RegExp(`(^|[^a-z0-9])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i").test(text));
}

function inferSkills(text: string) {
  const skillNames = ["Communication", "Leadership", "Mentoring", "Product strategy", "Research", "Stakeholder management", "Systems thinking"];
  return skillNames.filter((name) => text.toLocaleLowerCase().includes(name.toLocaleLowerCase()));
}

export class LocalJobExtractionProvider implements JobExtractionProvider {
  async extract(source: JobExtractionSource): Promise<ExtractedJob> {
    const isHtml = source.contentType.startsWith("text/html");
    const posting = isHtml ? extractJobPosting(source.body) : null;
    const fallbackIdentity = isHtml ? fallbackPageIdentity(source.body) : { title: "", company: "" };
    const postingDescription = stringValue(posting?.description);
    const text = postingDescription ?? (isHtml ? htmlToText(source.body) : source.body.trim());
    const title = stringValue(posting?.title) ?? source.titleHint ?? fallbackIdentity.title;
    const sourceHost = source.sourceUrl && URL.canParse(source.sourceUrl)
      ? new URL(source.sourceUrl).hostname.replace(/^www\./, "")
      : "";
    const company = organizationValue(posting) ?? source.companyHint ?? (fallbackIdentity.company || sourceHost);
    const structuredCompensation = compensationValue(posting);
    const heuristicCompensation = inferredCompensation(text);
    const compensation = {
      minimum: structuredCompensation.minimum ?? heuristicCompensation.minimum,
      maximum: structuredCompensation.maximum ?? heuristicCompensation.maximum,
      currency: structuredCompensation.currency ?? heuristicCompensation.currency,
    };
    const requiredQualifications = sectionLines(text, [/^(requirements|required qualifications|what you(?:'|’)ll need)$/i]);
    const preferredQualifications = sectionLines(text, [/^(preferred qualifications|nice to have|bonus points)$/i]);
    const responsibilities = sectionLines(text, [/^(responsibilities|what you(?:'|’)ll do|the role)$/i]);
    const technologies = mentionedTechnologies(text);
    const structuredFieldCount = [title, company, locationValue(posting), stringValue(posting?.employmentType), postingDescription]
      .filter(Boolean).length;

    return {
      title,
      company,
      location: locationValue(posting) ?? source.locationHint ?? null,
      originalDescription: text,
      employmentType: inferEmploymentType(text, posting),
      workArrangement: inferWorkArrangement(text, posting),
      seniority: inferSeniority(title, text),
      minimumCompensation: compensation.minimum,
      maximumCompensation: compensation.maximum,
      compensationCurrency: compensation.currency,
      postedAt: dateValue(posting?.datePosted),
      applicationDeadline: dateValue(posting?.validThrough),
      responsibilities,
      requiredQualifications,
      preferredQualifications,
      skills: inferSkills(text),
      technologies,
      extractionConfidence: posting && structuredFieldCount >= 4 ? "high" : structuredFieldCount >= 2 ? "medium" : "low",
    };
  }
}

export const jobExtractionProvider: JobExtractionProvider = new LocalJobExtractionProvider();
