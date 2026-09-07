import { describe, expect, test } from "bun:test";
import { contactPressure, contactSchema, shouldRemindContact } from "@/lib/contacts/validation";
import { prepareQuestions, practiceFeedback } from "@/lib/interviews/preparation";
import { debriefSchema, practiceSchema } from "@/lib/interviews/validation";
const now = new Date("2026-09-08T12:00:00Z");
describe("relationships", () => {
  test("closed opportunities and declined referrals suppress reminders", () => {
    const row = { followUpAt: now, stage: "applied", terminal: false, referralStatus: "requested" };
    expect(shouldRemindContact(row)).toBe(true);
    expect(shouldRemindContact({ ...row, stage: "rejected", terminal: null })).toBe(false);
    expect(shouldRemindContact({ ...row, terminal: true })).toBe(false);
    expect(shouldRemindContact({ ...row, referralStatus: "declined" })).toBe(false);
    expect(shouldRemindContact({ ...row, followUpAt: null })).toBe(false);
  });
  test("over-contacting warnings use outbound history, not private notes or future events", () => {
    expect(contactPressure([{ direction: "note", occurredAt: now }, { direction: "inbound", occurredAt: now }], now)).toBeNull();
    expect(contactPressure([{ direction: "outbound", occurredAt: now }], now)).toContain("3 days");
    expect(contactPressure([{ direction: "outbound", occurredAt: now }, { direction: "outbound", occurredAt: now }], now)).toContain("2 outbound");
  });
  test("rejects executable profile URLs", () => {
    expect(contactSchema.safeParse({ name: "Sam", company: "Acme", email: "", profileUrl: "javascript:alert(1)", relationship: "new", context: "" }).success).toBe(false);
  });
});
describe("interview preparation", () => {
  test("never matches unverified or unusable evidence", () => {
    const evidence = [{ id: "good", label: "System design project", text: "Designed a system", href: "/career-profile", verificationState: "verified", usable: true }, { id: "prohibited", label: "System design project", text: "Designed a system", href: "/career-profile", verificationState: "prohibited", usable: true }, { id: "archived-parent", label: "System design project", text: "Designed a system", href: "/career-profile", verificationState: "verified", usable: false }];
    const questions = prepareQuestions("technical", { title: "System engineer", skills: ["TypeScript"] }, evidence);
    expect(questions.some((item) => item.question.includes("TypeScript"))).toBe(true);
    expect(questions.flatMap((item) => item.matches).every((item) => item.id === "good")).toBe(true);
    expect(prepareQuestions("technical", { title: "Engineer", skills: [] }, []).every((item) => item.matches.length === 0)).toBe(true);
  });
  test("practice scores are bounded and a debrief requires a next action", () => {
    expect(practiceSchema.safeParse({ prompt: "Question", response: "Notes", clarity: 6, relevance: 3, evidence: 3, feedback: "", nextPractice: "Shorten response" }).success).toBe(false);
    expect(debriefSchema.safeParse({ actualQuestions: "", wentWell: "", answerGaps: "", thankYouDraft: "", nextAction: "", nextActionDueAt: "" }).success).toBe(false);
    expect(practiceFeedback({ clarity: 5, relevance: 5, evidence: 1 }).join(" ")).toContain("verified");
  });
});
