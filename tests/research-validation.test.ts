import { describe, expect, test } from "bun:test";

import { normalizeCompanyName } from "@/lib/research/normalization";
import { companyResearchSchema, opportunityResearchSchema } from "@/lib/research/validation";

describe("opportunity and company research", () => {
  test("normalizes company names for reuse across captured roles", () => {
    expect(normalizeCompanyName("  Example   Company  ")).toBe("example company");
  });

  test("keeps provenance and source health as separate fields", () => {
    const entry = companyResearchSchema.parse({
      topic: "product",
      content: "The company sells workflow software to finance teams.",
      provenance: "sourced_fact",
      sourceUrl: "https://example.com/about",
      sourceState: "stale",
      accessedAt: "2026-08-01",
    });

    expect(entry.provenance).toBe("sourced_fact");
    expect(entry.sourceState).toBe("stale");
  });

  test("requires a URL for sourced facts", () => {
    const result = companyResearchSchema.safeParse({
      topic: "culture",
      content: "The team documents decisions asynchronously.",
      provenance: "sourced_fact",
      sourceUrl: "",
      sourceState: "unlinked",
      accessedAt: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.sourceUrl).toBeDefined();
  });

  test("allows clearly labelled notes and inferences without a source", () => {
    const note = companyResearchSchema.parse({
      topic: "interview_process",
      content: "Ask whether the exercise is evaluated asynchronously.",
      provenance: "user_note",
      sourceUrl: "",
      sourceState: "unlinked",
      accessedAt: "",
    });
    const inference = companyResearchSchema.parse({
      topic: "team",
      content: "The reporting line may sit under product operations.",
      provenance: "inference",
      sourceUrl: "",
      sourceState: "unlinked",
      accessedAt: "",
    });

    expect(note.sourceUrl).toBeNull();
    expect(inference.provenance).toBe("inference");
  });

  test("keeps opportunity notes within the bounded working area", () => {
    expect(opportunityResearchSchema.parse({ content: "Confirm the hiring manager's priorities." }).content).toContain("hiring manager");
    expect(opportunityResearchSchema.safeParse({ content: "x".repeat(12_001) }).success).toBe(false);
  });
});
