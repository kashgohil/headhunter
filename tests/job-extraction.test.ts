import { describe, expect, test } from "bun:test";

import { htmlToText, LocalJobExtractionProvider } from "@/lib/jobs/extraction";

const posting = {
  "@context": "https://schema.org",
  "@type": "JobPosting",
  title: "Senior Product Designer",
  hiringOrganization: { "@type": "Organization", name: "Example Co" },
  jobLocationType: "TELECOMMUTE",
  employmentType: "FULL_TIME",
  datePosted: "2026-09-01",
  validThrough: "2026-10-01",
  jobLocation: {
    address: { addressLocality: "Bengaluru", addressCountry: "IN" },
  },
  baseSalary: {
    currency: "USD",
    value: { minValue: 150000, maxValue: 180000 },
  },
  description: "<p>Work with React and Figma.</p><h2>Requirements</h2><ul><li>Five years of experience</li></ul>",
};

describe("local job extraction", () => {
  test("extracts structured JobPosting data and readable source text", async () => {
    const provider = new LocalJobExtractionProvider();
    const result = await provider.extract({
      contentType: "text/html",
      body: `<html><script type="application/ld+json">${JSON.stringify(posting)}</script></html>`,
    });

    expect(result.title).toBe("Senior Product Designer");
    expect(result.company).toBe("Example Co");
    expect(result.location).toBe("Bengaluru, IN");
    expect(result.workArrangement).toBe("remote");
    expect(result.employmentType).toBe("Full Time");
    expect(result.minimumCompensation).toBe(150000);
    expect(result.technologies).toEqual(["Figma", "React"]);
    expect(result.extractionConfidence).toBe("high");
    expect(result.originalDescription).toContain("Five years of experience");
  });

  test("removes scripts and decodes entities from HTML", () => {
    expect(htmlToText("<p>Design &amp; research</p><script>ignore()</script><p>Ship</p>"))
      .toBe("Design & research\nShip");
  });

  test("uses readable page metadata and text heuristics as a fallback", async () => {
    const provider = new LocalJobExtractionProvider();
    const result = await provider.extract({
      contentType: "text/html",
      body: "<html><head><title>Product Designer | Acme</title></head><body><p>Full-time hybrid role paying $140k–$170k. Work in Figma.</p></body></html>",
    });

    expect(result.title).toBe("Product Designer");
    expect(result.company).toBe("Acme");
    expect(result.workArrangement).toBe("hybrid");
    expect(result.employmentType).toBe("Full-time");
    expect(result.minimumCompensation).toBe(140000);
    expect(result.maximumCompensation).toBe(170000);
  });
});
