import type {
  ResumeRisk,
  ResumeSuggestion,
  TailoringAchievement,
  TailoringEvidence,
  TailoringJob,
  TailoringSkill,
} from "@/lib/resumes/types";

const stopWords = new Set(["and", "the", "with", "for", "from", "that", "this", "your", "our", "are", "will", "have", "has", "into", "using", "you"]);

function words(value: string) {
  return new Set(value.toLowerCase().match(/[a-z0-9+#.-]{3,}/g)?.filter((word) => !stopWords.has(word)) ?? []);
}

function overlapScore(left: string, right: string) {
  const leftWords = words(left);
  const rightWords = words(right);
  let score = 0;
  for (const word of leftWords) if (rightWords.has(word)) score += 1;
  return score;
}

function originalBullet(achievement: TailoringAchievement) {
  const outcome = achievement.measurableOutcome || achievement.result;
  return `${achievement.action.replace(/[.\s]+$/, "")}; ${outcome.replace(/^./, (letter) => letter.toLowerCase()).replace(/[.\s]+$/, "")}.`;
}

function proposedBullet(achievement: TailoringAchievement, regeneration = 0) {
  const action = achievement.action.replace(/[.\s]+$/, "");
  const result = achievement.result.replace(/[.\s]+$/, "");
  const metric = achievement.measurableOutcome?.replace(/[.\s]+$/, "");
  if (regeneration % 2 === 1) return `${action}, resulting in ${metric || result}.`;
  return `${action} to ${result.replace(/^./, (letter) => letter.toLowerCase())}${metric && metric.toLowerCase() !== result.toLowerCase() ? ` — ${metric}` : ""}.`;
}

function evidenceRisk(item: TailoringEvidenceLike): ResumeRisk {
  return item.verificationState === "verified" ? "low" : "high";
}

type TailoringEvidenceLike = Pick<TailoringAchievement, "verificationState">;

export function pickRequirement(achievement: TailoringAchievement, job: TailoringJob) {
  const requirements = [...job.requiredQualifications, ...job.responsibilities, ...job.preferredQualifications];
  const evidence = [achievement.action, achievement.result, achievement.measurableOutcome ?? "", ...achievement.tools].join(" ");
  return requirements
    .map((requirement) => ({ requirement, score: overlapScore(evidence, requirement) }))
    .sort((a, b) => b.score - a.score)[0]?.requirement || `Contribute as a ${job.title}`;
}

export function rankAchievements(achievements: TailoringAchievement[], job: TailoringJob) {
  const jobText = [job.title, ...job.requiredQualifications, ...job.preferredQualifications, ...job.responsibilities, ...job.skills, ...job.technologies].join(" ");
  return [...achievements].sort((a, b) => {
    const score = (item: TailoringAchievement) => overlapScore([item.action, item.result, item.measurableOutcome ?? "", ...item.tools].join(" "), jobText);
    return score(b) - score(a);
  });
}

export function createBulletSuggestions(achievements: TailoringAchievement[], job: TailoringJob): ResumeSuggestion[] {
  return rankAchievements(achievements.filter((item) => item.verificationState !== "archived" && item.verificationState !== "prohibited"), job)
    .map((achievement) => ({
      experienceId: achievement.experienceId,
      achievementId: achievement.id,
      originalText: originalBullet(achievement),
      proposedText: proposedBullet(achievement),
      reason: "Lead with the action and connect it directly to the evidenced outcome.",
      requirementAddressed: pickRequirement(achievement, job),
      evidenceIds: [achievement.id, achievement.experienceId],
      confidence: achievement.verificationState === "verified" ? "high" : "medium",
      risk: evidenceRisk(achievement),
    }));
}

export function regenerateBullet(achievement: TailoringAchievement, regeneration: number) {
  return proposedBullet(achievement, regeneration);
}

export function createSummary(
  roleFamily: string,
  positioning: string,
  experiences: Array<TailoringEvidence & { title: string; company: string }>,
  skills: TailoringSkill[],
  job: TailoringJob,
) {
  const usableExperiences = experiences.filter((item) => item.verificationState !== "archived" && item.verificationState !== "prohibited");
  const usableSkills = skills.filter((item) => item.verificationState !== "archived" && item.verificationState !== "prohibited");
  const jobTerms = new Set([...job.skills, ...job.technologies].map((term) => term.toLowerCase()));
  const relevantSkills = usableSkills.filter((skill) => jobTerms.has(skill.name.toLowerCase())).slice(0, 4);
  const fallbackSkills = usableSkills.slice(0, 4);
  const selectedSkills = relevantSkills.length > 0 ? relevantSkills : fallbackSkills;
  const latest = usableExperiences[0];
  const lead = positioning || `${roleFamily} professional`;
  const context = latest ? ` with experience as ${latest.title} at ${latest.company}` : "";
  const skillText = selectedSkills.length ? ` Skilled in ${selectedSkills.map((skill) => skill.name).join(", ")}.` : "";
  return {
    text: `${lead}${context}, aligned to ${job.title} opportunities.${skillText}`,
    evidenceIds: [...(latest ? [latest.id] : []), ...selectedSkills.map((skill) => skill.id)],
    confidence: usableExperiences.every((item) => item.verificationState === "verified") && selectedSkills.every((item) => item.verificationState === "verified") ? "high" as const : "medium" as const,
    risk: usableExperiences.every((item) => item.verificationState === "verified") && selectedSkills.every((item) => item.verificationState === "verified") ? "low" as const : "high" as const,
  };
}
