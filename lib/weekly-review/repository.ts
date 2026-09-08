import "server-only";
import { db, sqlite } from "@/lib/db";
import {
  applicationEvents,
  applicationTasks,
  applicationInterviews,
  applicationSubmissions,
  contactInteractions,
  contacts,
  jobs,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCommandCenter } from "@/lib/command-center/repository";
import { listPipelineStages } from "@/lib/applications/pipeline";
import { buildWeeklySnapshot, reviewWindow } from "./model";
import { createSavedReview } from "./storage";
export async function startWeeklyReview(weekStart: string) {
  reviewWindow(weekStart);
  const existing = sqlite
    .prepare("SELECT id FROM weekly_reviews WHERE week_start = ?")
    .get(weekStart) as { id: string } | undefined;
  if (existing) return existing.id;
  const [overview, stages] = await Promise.all([
    getCommandCenter(),
    listPipelineStages(),
  ]);
  // The underlying SQLite reads are synchronous: capture the facts and insert the snapshot under one transaction.
  return sqlite
    .transaction(() => {
      const input = {
        jobs: db
          .select({
            id: jobs.id,
            title: jobs.title,
            company: jobs.company,
            capturedAt: jobs.capturedAt,
          })
          .from(jobs)
          .all(),
        events: db.select().from(applicationEvents).all(),
        submissions: db
          .select({
            jobId: applicationSubmissions.jobId,
            submittedAt: applicationSubmissions.submittedAt,
          })
          .from(applicationSubmissions)
          .all(),
        interactions: db
          .select({
            id: contactInteractions.id,
            contactId: contactInteractions.contactId,
            name: contacts.name,
            direction: contactInteractions.direction,
            channel: contactInteractions.channel,
            summary: contactInteractions.summary,
            occurredAt: contactInteractions.occurredAt,
          })
          .from(contactInteractions)
          .innerJoin(contacts, eq(contactInteractions.contactId, contacts.id))
          .all(),
        tasks: db.select().from(applicationTasks).all(),
        interviews: db.select().from(applicationInterviews).all(),
        stages,
        risks: overview.alerts,
        weeklyHours: overview.weeklyHours,
      };
      return createSavedReview(
        sqlite,
        buildWeeklySnapshot(input, weekStart, new Date()),
      );
    })
    .immediate();
}
