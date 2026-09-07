import { z } from "zod";
import {
  terminalStageCategories,
  type PipelineStageCategory,
} from "@/lib/applications/types";
const optional = (limit: number) =>
  z
    .string()
    .trim()
    .max(limit)
    .transform((value) => value || null);
export const contactSchema = z.object({
  name: z.string().trim().min(1, "Add a contact name.").max(160),
  company: z.string().trim().max(200),
  email: z
    .union([z.literal(""), z.email()])
    .transform((value) => value || null),
  profileUrl: z
    .union([
      z.literal(""),
      z
        .url()
        .refine(
          (value) => /^https?:\/\//.test(value),
          "Use an HTTP or HTTPS profile URL.",
        ),
    ])
    .transform((value) => value || null),
  relationship: z.enum(["new", "acquaintance", "warm", "close"]),
  context: z.string().trim().max(4000),
});
export const contactLinkSchema = z
  .object({
    jobId: z.string().min(1),
    referralStatus: z.enum([
      "not_requested",
      "requested",
      "introduced",
      "declined",
    ]),
    followUpAt: z
      .union([z.literal(""), z.iso.date()])
      .transform((value) => (value ? new Date(`${value}T12:00:00Z`) : null)),
    promisedAction: z.string().trim().max(500),
    draftKind: z.enum(["outreach", "referral", "follow_up", "thank_you"]),
    draft: z.string().trim().max(8000),
  })
  .refine((value) => !value.followUpAt || Boolean(value.promisedAction), {
    path: ["promisedAction"],
    message: "Describe the promised action for this follow-up.",
  });
export const interactionSchema = z.object({
  jobId: optional(200),
  direction: z.enum(["inbound", "outbound", "note"]),
  channel: z.enum(["email", "message", "call", "meeting", "other"]),
  summary: z.string().trim().min(1, "Record what happened.").max(4000),
  occurredAt: z.iso
    .datetime({ offset: true })
    .transform((value) => new Date(value))
    .refine(
      (value) => value.getTime() <= Date.now() + 60_000,
      "Interactions cannot be in the future.",
    ),
});

export function contactPressure(
  interactions: Array<{ direction: string; occurredAt: Date }>,
  now: Date,
) {
  const recent = interactions.filter(
    (item) =>
      item.direction === "outbound" &&
      item.occurredAt <= now &&
      now.getTime() - item.occurredAt.getTime() < 7 * 86_400_000,
  );
  return recent.length >= 2
    ? `${recent.length} outbound interactions in the last 7 days. Give them time to reply before following up again.`
    : recent.some(
          (item) => now.getTime() - item.occurredAt.getTime() < 3 * 86_400_000,
        )
      ? "You contacted this person in the last 3 days. Consider waiting for a reply."
      : null;
}

export function shouldRemindContact(row: {
  terminal: boolean | null;
  stage: string;
  referralStatus: string;
  followUpAt: Date | null;
}) {
  return (
    Boolean(row.followUpAt) &&
    !row.terminal &&
    !terminalStageCategories.has(row.stage as PipelineStageCategory) &&
    row.referralStatus !== "declined"
  );
}
