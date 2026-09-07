type EvidenceState = "needs_clarification" | "verified" | "archived" | "prohibited";

type Experience = { id: string; verificationState: EvidenceState };
type Achievement = { experienceId: string; verificationState: EvidenceState };
type Skill = { verificationState: EvidenceState };

function isUsable(item: { verificationState: EvidenceState }) {
  return item.verificationState !== "archived" && item.verificationState !== "prohibited";
}

export function calculateCareerProfileReadiness(
  experiences: Experience[],
  achievements: Achievement[],
  skills: Skill[],
) {
  const usableExperienceIds = new Set(experiences.filter(isUsable).map((item) => item.id));
  const hasExperience = usableExperienceIds.size > 0;
  const hasAchievement = achievements.some((item) => isUsable(item) && usableExperienceIds.has(item.experienceId));
  const hasSkills = skills.some(isUsable);

  return {
    hasExperience,
    hasAchievement,
    hasSkills,
    ready: hasExperience && hasAchievement && hasSkills,
  };
}
