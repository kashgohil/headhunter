import { describe, expect, test } from "bun:test";

import { descriptionSimilarity, findDuplicateMatches } from "@/lib/jobs/duplicates";

const candidate = {
  id: "existing-job",
  title: "Senior Product Designer",
  company: "Example Co",
  sourceUrl: "https://example.com/jobs/123/",
  originalDescription: "Design product flows with research partners and engineers. Lead workshops, maintain systems, test prototypes, and communicate decisions to stakeholders across the company.",
};

describe("job duplicate detection", () => {
  test("normalizes source URLs before comparing", () => {
    const matches = findDuplicateMatches({
      ...candidate,
      sourceUrl: "https://EXAMPLE.com/jobs/123#description",
    }, [candidate]);

    expect(matches).toEqual([{ candidateJobId: "existing-job", reason: "exact_url", similarity: 1 }]);
  });

  test("detects the same company and role without merging", () => {
    const matches = findDuplicateMatches({
      ...candidate,
      sourceUrl: null,
      title: " senior product designer ",
      company: "Example Co.",
      originalDescription: "Different source text",
    }, [candidate]);

    expect(matches[0]?.reason).toBe("same_role");
    expect(matches[0]?.candidateJobId).toBe(candidate.id);
  });

  test("ignores short descriptions and scores substantial overlap", () => {
    expect(descriptionSimilarity("short description", "short description")).toBe(0);
    expect(descriptionSimilarity(candidate.originalDescription, `${candidate.originalDescription} Extra detail.`)).toBeGreaterThan(0.72);
  });
});
