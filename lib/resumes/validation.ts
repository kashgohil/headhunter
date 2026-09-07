import { z } from "zod";

import { resumeTemplates } from "@/lib/resumes/types";

const idList = z.array(z.string().uuid()).default([]);

export const baseResumeSchema = z.object({
  name: z.string().trim().min(2, "Give this resume a name.").max(80),
  roleFamily: z.string().trim().min(2, "Add the role family this resume supports.").max(100),
  positioning: z.string().trim().max(240).default(""),
  summary: z.string().trim().max(900).default(""),
  template: z.enum(resumeTemplates),
  experienceIds: idList,
  achievementIds: idList,
  skillIds: idList,
  profileItemIds: idList,
}).refine((value) => value.experienceIds.length > 0, {
  message: "Select at least one experience.",
  path: ["experienceIds"],
});

export const createDraftSchema = z.object({
  baseResumeId: z.string().uuid(),
  jobId: z.string().uuid(),
});

export const reviewEditSchema = z.object({
  editId: z.string().uuid(),
  decision: z.enum(["accepted", "rejected"]),
});

export const editProposalSchema = z.object({
  editId: z.string().uuid(),
  proposedText: z.string().trim().min(10, "Keep enough detail for a useful resume bullet.").max(500),
});

export type BaseResumeInput = z.infer<typeof baseResumeSchema>;
