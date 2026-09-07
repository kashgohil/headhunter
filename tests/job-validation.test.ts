import { describe, expect, test } from "bun:test";

import { createJobSchema } from "@/lib/jobs/validation";

describe("job capture validation", () => {
  test("preserves the original description byte-for-byte", () => {
    const originalDescription = "  Responsibilities\n\n• Ship careful work.  \n";
    const result = createJobSchema.parse({
      title: " Product Designer ",
      company: " Example Co ",
      location: "",
      sourceUrl: "",
      originalDescription,
    });

    expect(result.title).toBe("Product Designer");
    expect(result.company).toBe("Example Co");
    expect(result.originalDescription).toBe(originalDescription);
  });

  test("rejects an incomplete source URL", () => {
    const result = createJobSchema.safeParse({
      title: "Engineer",
      company: "Example Co",
      sourceUrl: "example dot com",
      originalDescription: "A real job description",
    });

    expect(result.success).toBe(false);
  });

  test("rejects a non-web source URL", () => {
    const result = createJobSchema.safeParse({
      title: "Engineer",
      company: "Example Co",
      sourceUrl: "javascript:alert(1)",
      originalDescription: "A real job description",
    });

    expect(result.success).toBe(false);
  });
});
