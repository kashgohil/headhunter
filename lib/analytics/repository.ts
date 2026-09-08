import "server-only";
import { db, sqlite } from "@/lib/db";
import {
  jobs,
  applicationEvents,
  applicationSubmissions,
  pipelineStages,
  fitAnalyses,
} from "@/lib/db/schema";
import { attributeApplications } from "./attribution";
import type { AnalyticsInput } from "./segments";
import { listAnnotations } from "./storage";
export function getAnalyticsInput(now = new Date()): AnalyticsInput {
  return sqlite.transaction(() => {
    const applications = db.select().from(jobs).all();
    const events = db.select().from(applicationEvents).all();
    const submissions = db.select().from(applicationSubmissions).all();
    const stages = db.select().from(pipelineStages).all();
    const fits = db.select().from(fitAnalyses).all();
    const annotations = new Map(
      listAnnotations(sqlite).map((item) => [item.jobId, item]),
    );
    return attributeApplications(
      { applications, events, submissions, stages, fits, annotations },
      now,
    );
  })();
}
