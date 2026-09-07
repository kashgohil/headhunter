type EvidenceState = "needs_clarification" | "verified" | "archived" | "prohibited";

type Experience = {
  id: string;
  company: string;
  title: string;
  startDate: string;
  endDate: string | null;
  verificationState: EvidenceState;
};
type Achievement = {
  id: string;
  result: string;
  measurableOutcome: string | null;
  sourceLabel: string | null;
  verificationState: EvidenceState;
};
type Skill = { id: string; name: string; recency: "current" | "recent" | "past"; verificationState: EvidenceState };
type ProfileItem = { id: string; kind: string; title: string; organization: string | null; verificationState: EvidenceState };

export type EvidenceHealthWarning = {
  id: string;
  kind: "duplicate" | "date_conflict" | "stale" | "unsupported_metric";
  message: string;
};

function usable(item: { verificationState: EvidenceState }) {
  return item.verificationState !== "archived" && item.verificationState !== "prohibited";
}

function normalized(value: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

export function calculateEvidenceHealth(
  experiences: Experience[],
  achievements: Achievement[],
  skills: Skill[],
  profileItems: ProfileItem[],
) {
  const warnings: EvidenceHealthWarning[] = [];
  const activeExperiences = experiences.filter(usable);

  for (let index = 0; index < activeExperiences.length; index += 1) {
    const left = activeExperiences[index];
    for (const right of activeExperiences.slice(index + 1)) {
      if (normalized(left.company) !== normalized(right.company) || normalized(left.title) !== normalized(right.title)) continue;
      const datesMatch = left.startDate === right.startDate && left.endDate === right.endDate;
      warnings.push({
        id: `experience-${left.id}-${right.id}`,
        kind: datesMatch ? "duplicate" : "date_conflict",
        message: datesMatch
          ? `${left.title} at ${left.company} appears more than once.`
          : `${left.title} at ${left.company} has conflicting date ranges.`,
      });
    }
  }

  const activeItems = profileItems.filter(usable);
  for (let index = 0; index < activeItems.length; index += 1) {
    const left = activeItems[index];
    const duplicate = activeItems.slice(index + 1).find((right) =>
      left.kind === right.kind && normalized(left.title) === normalized(right.title) && normalized(left.organization) === normalized(right.organization)
    );
    if (duplicate) warnings.push({ id: `item-${left.id}-${duplicate.id}`, kind: "duplicate", message: `${left.title} appears more than once in your ${left.kind} records.` });
  }

  for (const skill of skills.filter(usable)) {
    if (skill.recency === "past") warnings.push({ id: `skill-${skill.id}`, kind: "stale", message: `${skill.name} is marked as used only in the past; confirm it is still appropriate for external use.` });
  }

  for (const achievement of achievements.filter(usable)) {
    const hasMetric = Boolean(achievement.measurableOutcome) || /\b\d+(?:[.,]\d+)?%?\b/.test(achievement.result);
    if (hasMetric && !achievement.sourceLabel) {
      warnings.push({ id: `achievement-${achievement.id}`, kind: "unsupported_metric", message: `An achievement contains a metric without a source note: “${achievement.result.slice(0, 90)}”.` });
    }
  }

  return warnings;
}
