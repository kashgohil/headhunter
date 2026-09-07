export type DuplicateReason = "exact_url" | "same_role" | "similar_description";

export type DuplicateCandidate = {
  id: string;
  title: string;
  company: string;
  sourceUrl: string | null;
  originalDescription: string;
};

export type DuplicateMatch = {
  candidateJobId: string;
  reason: DuplicateReason;
  similarity: number;
};

function normalizedWords(value: string) {
  return new Set(value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
}

function normalizedIdentity(value: string) {
  return [...normalizedWords(value)].join(" ");
}

function normalizedUrl(value: string | null | undefined) {
  if (!value || !URL.canParse(value)) return null;

  const url = new URL(value);
  url.hash = "";
  url.hostname = url.hostname.toLocaleLowerCase();
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString();
}

export function descriptionSimilarity(left: string, right: string) {
  const leftWords = normalizedWords(left);
  const rightWords = normalizedWords(right);
  if (leftWords.size < 12 || rightWords.size < 12) return 0;

  let intersection = 0;
  for (const word of leftWords) {
    if (rightWords.has(word)) intersection += 1;
  }

  return intersection / (leftWords.size + rightWords.size - intersection);
}

export function findDuplicateMatches(
  input: Pick<DuplicateCandidate, "title" | "company" | "sourceUrl" | "originalDescription">,
  candidates: DuplicateCandidate[],
): DuplicateMatch[] {
  const inputUrl = normalizedUrl(input.sourceUrl);
  const inputTitle = normalizedIdentity(input.title);
  const inputCompany = normalizedIdentity(input.company);

  return candidates.flatMap<DuplicateMatch>((candidate): DuplicateMatch[] => {
    if (inputUrl && inputUrl === normalizedUrl(candidate.sourceUrl)) {
      return [{ candidateJobId: candidate.id, reason: "exact_url" as const, similarity: 1 }];
    }

    if (inputTitle === normalizedIdentity(candidate.title) && inputCompany === normalizedIdentity(candidate.company)) {
      return [{ candidateJobId: candidate.id, reason: "same_role" as const, similarity: 1 }];
    }

    const similarity = descriptionSimilarity(input.originalDescription, candidate.originalDescription);
    return similarity >= 0.72
      ? [{ candidateJobId: candidate.id, reason: "similar_description" as const, similarity }]
      : [];
  });
}
