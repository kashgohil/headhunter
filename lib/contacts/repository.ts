import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/lib/db";
import {
  contacts,
  contactOpportunities,
  contactInteractions,
  jobs,
  opportunities,
  pipelineStages,
  careerVoiceProfiles,
} from "@/lib/db/schema";

export async function getContacts() {
  await connection();
  const [people, links, interactions, roles, voices] = await Promise.all([
    db.select().from(contacts).orderBy(asc(contacts.name)),
    db
      .select({
        link: contactOpportunities,
        title: jobs.title,
        company: jobs.company,
        stage: opportunities.stage,
        terminal: pipelineStages.isTerminal,
      })
      .from(contactOpportunities)
      .innerJoin(jobs, eq(contactOpportunities.jobId, jobs.id))
      .innerJoin(opportunities, eq(opportunities.jobId, jobs.id))
      .leftJoin(pipelineStages, eq(opportunities.stage, pipelineStages.key)),
    db
      .select()
      .from(contactInteractions)
      .orderBy(desc(contactInteractions.occurredAt)),
    db
      .select({ id: jobs.id, title: jobs.title, company: jobs.company })
      .from(jobs)
      .orderBy(asc(jobs.company)),
    db
      .select()
      .from(careerVoiceProfiles)
      .where(eq(careerVoiceProfiles.verificationState, "verified"))
      .orderBy(desc(careerVoiceProfiles.updatedAt)),
  ]);
  return { people, links, interactions, roles, voice: voices[0] ?? null };
}

export async function getContactFollowups() {
  return db
    .select({
      id: contactOpportunities.id,
      contactId: contacts.id,
      name: contacts.name,
      title: jobs.title,
      company: jobs.company,
      jobId: jobs.id,
      stage: opportunities.stage,
      terminal: pipelineStages.isTerminal,
      referralStatus: contactOpportunities.referralStatus,
      followUpAt: contactOpportunities.followUpAt,
      promisedAction: contactOpportunities.promisedAction,
    })
    .from(contactOpportunities)
    .innerJoin(contacts, eq(contactOpportunities.contactId, contacts.id))
    .innerJoin(jobs, eq(contactOpportunities.jobId, jobs.id))
    .innerJoin(opportunities, eq(opportunities.jobId, jobs.id))
    .leftJoin(pipelineStages, eq(opportunities.stage, pipelineStages.key));
}

export async function getOpportunityContacts(jobId: string) {
  return db.select({ id: contacts.id, name: contacts.name, relationship: contacts.relationship, referralStatus: contactOpportunities.referralStatus }).from(contactOpportunities).innerJoin(contacts, eq(contactOpportunities.contactId, contacts.id)).where(eq(contactOpportunities.jobId, jobId));
}
