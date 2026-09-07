import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/lib/db";
import {
  applicationInterviews,
  interviewPlans,
  interviewPractice,
  jobs,
  careerStories,
  careerAchievements,
  careerExperiences,
} from "@/lib/db/schema";
import { getOpportunityResearch } from "@/lib/research/repository";
import type { Evidence } from "./preparation";

export async function listInterviews() {
  await connection();
  return db
    .select({
      round: applicationInterviews,
      title: jobs.title,
      company: jobs.company,
    })
    .from(applicationInterviews)
    .innerJoin(jobs, eq(applicationInterviews.jobId, jobs.id))
    .orderBy(asc(applicationInterviews.scheduledAt));
}
export async function getInterview(id: string) {
  await connection();
  const round = await db
    .select()
    .from(applicationInterviews)
    .where(eq(applicationInterviews.id, id))
    .get();
  if (!round) return null;
  const [job, plan, sessions, stories, achievements, experiences, research] =
    await Promise.all([
      db.select().from(jobs).where(eq(jobs.id, round.jobId)).get(),
      db
        .select()
        .from(interviewPlans)
        .where(eq(interviewPlans.interviewId, id))
        .get(),
      db
        .select()
        .from(interviewPractice)
        .where(eq(interviewPractice.interviewId, id))
        .orderBy(desc(interviewPractice.createdAt)),
      db
        .select()
        .from(careerStories)
        .where(eq(careerStories.verificationState, "verified")),
      db.select().from(careerAchievements),
      db.select().from(careerExperiences),
      getOpportunityResearch(round.jobId),
    ]);
  if (!job) return null;
  const usableAchievements = new Set(
    achievements
      .filter(
        (achievement) =>
          achievement.verificationState === "verified" &&
          experiences.some(
            (experience) =>
              experience.id === achievement.experienceId &&
              experience.verificationState === "verified",
          ),
      )
      .map((item) => item.id),
  );
  const evidence: Evidence[] = [
    ...stories.map((story) => ({
      id: story.id,
      label: story.title,
      text: [story.situation, story.task, story.action, story.result].join(
        "\n",
      ),
      href: `/career-profile/stories#evidence-${story.id}`,
      verificationState: story.verificationState,
      usable:
        !story.supportingAchievementId ||
        usableAchievements.has(story.supportingAchievementId),
    })),
    ...achievements.map((achievement) => ({
      id: achievement.id,
      label: achievement.result,
      text: [achievement.problem, achievement.action, achievement.result].join(
        "\n",
      ),
      href: `/career-profile#evidence-${achievement.id}`,
      verificationState: achievement.verificationState,
      usable: usableAchievements.has(achievement.id),
    })),
  ];
  return { round, job, plan, sessions, evidence, research };
}
