import type { CareerProfile } from "@/lib/career-profile/repository";
import type { JobDetail } from "@/lib/jobs/repository";
import type { SearchStrategy } from "@/lib/search-strategy/repository";
import {
  defaultFitWeights,
  dimensionKeys,
  type FitAnalysisResult,
  type FitDimension,
  type FitGap,
  type FitWeights,
  type Recommendation,
} from "@/lib/fit-analysis/types";

type AnalyzeInput = {
  job: JobDetail;
  strategy: SearchStrategy | null;
  profile: CareerProfile;
  weights?: FitWeights;
  now?: Date;
};

const stopWords = new Set(["a", "an", "and", "are", "as", "at", "be", "for", "from", "in", "of", "on", "or", "the", "to", "with", "years", "year", "experience", "strong"]);

function tokens(value: string) {
  return new Set(value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").split(/\s+/).filter((word) => word.length > 1 && !stopWords.has(word)));
}

function overlap(left: string, right: string) {
  const a = tokens(left);
  const b = tokens(right);
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / Math.min(a.size, b.size);
}

function bestMatch(needle: string, haystacks: { id: string; text: string }[]) {
  let best = { id: "", score: 0 };
  for (const candidate of haystacks) {
    const score = overlap(needle, candidate.text);
    if (score > best.score) best = { id: candidate.id, score };
  }
  return best;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function dimension(score: number | null, summary: string, signals: string[] = []): FitDimension {
  return { score: score === null ? null : clamp(score), summary, signals };
}

function usable(state: string) {
  return state !== "archived" && state !== "prohibited";
}

function titleLevel(value: string | null) {
  const normalized = value?.toLowerCase() ?? "";
  if (/\b(chief|vp|vice president|head)\b/.test(normalized)) return 6;
  if (/\b(principal|staff)\b/.test(normalized)) return 5;
  if (/\bsenior\b|\bsr\.?\b/.test(normalized)) return 4;
  if (/\b(mid|intermediate)\b/.test(normalized)) return 3;
  if (/\b(junior|jr\.?|entry)\b/.test(normalized)) return 2;
  if (/\b(intern|graduate)\b/.test(normalized)) return 1;
  return null;
}

function labelCount(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function analyzeFit({ job, strategy, profile, weights = defaultFitWeights, now = new Date() }: AnalyzeInput): FitAnalysisResult {
  const evidence = [
    ...profile.experiences.filter((item) => usable(item.verificationState)).map((item) => ({ id: item.id, text: [item.title, item.summary, ...item.responsibilities, ...item.technologies].filter(Boolean).join(" ") })),
    ...profile.achievements.filter((item) => usable(item.verificationState)).map((item) => ({ id: item.id, text: [item.problem, item.action, item.result, item.measurableOutcome, ...item.tools, ...item.roleFamilies].filter(Boolean).join(" ") })),
    ...profile.skills.filter((item) => usable(item.verificationState)).map((item) => ({ id: item.id, text: [item.name, item.context].filter(Boolean).join(" ") })),
    ...profile.profileItems.filter((item) => usable(item.verificationState)).map((item) => ({ id: item.id, text: [item.title, item.description, ...item.technologies].join(" ") })),
  ];
  const evidenceIds = new Set<string>();
  const gaps: FitGap[] = [];

  const required = job.requiredQualifications;
  const preferred = job.preferredQualifications;
  const requiredMatches = required.map((requirement) => ({ requirement, ...bestMatch(requirement, evidence) }));
  const preferredMatches = preferred.map((requirement) => ({ requirement, ...bestMatch(requirement, evidence) }));
  for (const match of [...requiredMatches, ...preferredMatches]) if (match.score >= 0.45 && match.id) evidenceIds.add(match.id);
  const strongRequired = requiredMatches.filter((match) => match.score >= 0.65);
  const partialRequired = requiredMatches.filter((match) => match.score >= 0.3 && match.score < 0.65);
  const requiredRatio = (strongRequired.length + partialRequired.length * 0.55) / Math.max(required.length, 1);
  const preferredRatio = preferredMatches.filter((match) => match.score >= 0.45).length / Math.max(preferred.length, 1);
  const qualificationScore = required.length === 0 && preferred.length === 0
    ? null
    : required.length === 0
      ? preferredRatio * 100
      : preferred.length === 0
        ? requiredRatio * 100
        : requiredRatio * 80 + preferredRatio * 20;

  for (const match of requiredMatches.filter((item) => item.score < 0.3)) {
    gaps.push({
      classification: evidence.length === 0 ? "missing_evidence" : "material_gap",
      label: match.requirement,
      detail: evidence.length === 0 ? "No usable profile evidence supports this requirement yet." : "No close supporting evidence was found in the career profile.",
    });
  }
  for (const match of partialRequired) {
    gaps.push({ classification: "transferable", label: match.requirement, detail: "Related experience exists, but the match is indirect and needs positioning." });
  }
  for (const match of preferredMatches.filter((item) => item.score < 0.3)) {
    gaps.push({ classification: "optional", label: match.requirement, detail: "This preferred qualification is not supported by current evidence." });
  }

  const requestedSkills = [...new Set([...job.skills, ...job.technologies])];
  const experienceTargets = [...new Set([...requestedSkills, ...job.responsibilities])];
  const skillMatches = experienceTargets.map((skill) => ({ skill, ...bestMatch(skill, evidence) }));
  for (const match of skillMatches) if (match.score >= 0.45 && match.id) evidenceIds.add(match.id);
  const demonstratedSkills = skillMatches.filter((match) => match.score >= 0.65);
  const experienceScore = experienceTargets.length > 0
    ? ((demonstratedSkills.length + skillMatches.filter((match) => match.score >= 0.3 && match.score < 0.65).length * 0.5) / experienceTargets.length) * 100
    : null;

  const jobLevel = titleLevel(`${job.seniority ?? ""} ${job.title}`);
  const profileLevels = profile.experiences
    .filter((item) => usable(item.verificationState))
    .map((item) => titleLevel(item.title))
    .filter((level): level is NonNullable<ReturnType<typeof titleLevel>> => level !== null);
  const profileLevel = profileLevels.length > 0 ? Math.max(...profileLevels) : null;
  let seniorityScore: number | null = null;
  if (jobLevel !== null && profileLevel !== null) {
    const distance = jobLevel - profileLevel;
    seniorityScore = distance <= 0 ? 92 : distance === 1 ? 68 : 32;
    if (distance === 1) gaps.push({ classification: "addressable", label: "Seniority positioning", detail: "The role is one level above the strongest explicit title in the profile." });
    if (distance > 1) gaps.push({ classification: "material_gap", label: "Seniority gap", detail: "The stated role level is materially above the strongest explicit title in the profile." });
  }

  let locationCompScore: number | null = null;
  const locationSignals: string[] = [];
  if (strategy) {
    const arrangements = strategy.workArrangements.map((item) => item.toLowerCase().replace(/[- ]/g, "_"));
    const arrangementKnown = job.workArrangement !== "unknown";
    const arrangementMatch = !arrangementKnown || arrangements.some((item) => item.includes(job.workArrangement) || job.workArrangement.includes(item));
    const locationKnown = Boolean(job.location);
    const locationMatch = !locationKnown || strategy.locations.some((item) => overlap(item, job.location ?? "") >= 0.5);
    const compensationKnown = job.maximumCompensation !== null && job.compensationCurrency !== null;
    const sameCurrency = job.compensationCurrency?.toUpperCase() === strategy.currency.toUpperCase();
    const compensationComparable = compensationKnown && sameCurrency;
    const compensationMatch = !compensationComparable || (job.maximumCompensation ?? 0) >= strategy.minimumCompensation;
    const practicalScores = [
      ...(arrangementKnown ? [arrangementMatch ? 100 : 0] : []),
      ...(locationKnown ? [locationMatch ? 100 : 0] : []),
      ...(compensationComparable ? [compensationMatch ? 100 : 0] : []),
    ];
    locationCompScore = practicalScores.length > 0 ? practicalScores.reduce((sum, value) => sum + value, 0) / practicalScores.length : null;
    if (arrangementKnown) locationSignals.push(arrangementMatch ? "Work arrangement matches the strategy." : "Work arrangement falls outside the strategy.");
    if (locationKnown) locationSignals.push(locationMatch ? "Location appears in the target market." : "Location is outside the saved targets.");
    if (compensationComparable) locationSignals.push(compensationMatch ? "Published compensation clears the minimum." : "Published maximum is below the saved minimum.");
    if (compensationKnown && !sameCurrency) locationSignals.push("Published compensation uses a different currency and was not compared.");
    if (!arrangementMatch) gaps.push({ classification: "hard_blocker", label: "Work arrangement", detail: `${job.workArrangement.replace("_", "-")} is outside the saved acceptable arrangements.` });
    if (compensationComparable && !compensationMatch) gaps.push({ classification: strategy.compensationFlexible ? "material_gap" : "hard_blocker", label: "Compensation", detail: "The published maximum is below the saved minimum compensation." });
    if (!locationMatch) gaps.push({ classification: "material_gap", label: "Location", detail: "The job location does not match a saved target location." });
    if (practicalScores.length === 0) gaps.push({ classification: "unknown", label: "Practical constraints", detail: "Add location, work arrangement, or comparable compensation to assess practical fit." });
  }

  let preferenceScore: number | null = null;
  const preferenceSignals: string[] = [];
  if (strategy) {
    const targetTitles = [strategy.primaryTitle, ...strategy.adjacentTitles];
    const titleMatch = Math.max(...targetTitles.map((title) => overlap(title, job.title)));
    const softMatches = strategy.softPreferences.filter((preference) => overlap(preference, `${job.title} ${job.company} ${job.originalDescription}`) >= 0.45);
    preferenceScore = strategy.softPreferences.length === 0
      ? titleMatch * 100
      : titleMatch * 75 + (softMatches.length / strategy.softPreferences.length) * 25;
    preferenceSignals.push(titleMatch >= 0.6 ? "Role title aligns with the target role family." : "Role title is adjacent to, or outside, the saved target.");
    if (softMatches.length > 0) preferenceSignals.push(`${labelCount(softMatches.length, "soft preference")} visible in the job.`);
    const blockerMatches = strategy.hardBlockers.filter((blocker) => overlap(blocker, job.originalDescription) >= 0.6);
    for (const blocker of blockerMatches) gaps.push({ classification: "hard_blocker", label: blocker, detail: "The posting appears to contain a saved hard blocker." });
  }

  const referenceDate = job.postedAt ?? job.capturedAt;
  const ageDays = Math.max(0, Math.floor((now.getTime() - referenceDate.getTime()) / 86_400_000));
  const freshnessScore = job.postedAt ? (ageDays <= 7 ? 100 : ageDays <= 14 ? 82 : ageDays <= 30 ? 62 : ageDays <= 60 ? 38 : 18) : null;
  if (!job.postedAt) gaps.push({ classification: "unknown", label: "Posting date", detail: "Freshness uses the capture date because the posting date is unknown." });

  const unresolvedRequired = requiredMatches.filter((match) => match.score < 0.65).length;
  const prepEffortScore = clamp(100 - unresolvedRequired * 16 - Math.max(0, requestedSkills.length - demonstratedSkills.length) * 8);
  if (prepEffortScore < 55) gaps.push({ classification: "addressable", label: "Application preparation", detail: "A strong application will need substantial evidence selection and positioning." });

  const dimensions = {
    qualifications: dimension(qualificationScore, required.length + preferred.length === 0 ? "No structured qualifications are available to score." : `${strongRequired.length} of ${required.length} core requirements have strong evidence.`, requiredMatches.filter((item) => item.score >= 0.65).slice(0, 3).map((item) => item.requirement)),
    experience: dimension(experienceScore, experienceTargets.length === 0 ? "The job has no structured skills or responsibilities to compare." : `${demonstratedSkills.length} of ${experienceTargets.length} skills and responsibilities are directly demonstrated.`, demonstratedSkills.slice(0, 3).map((item) => item.skill)),
    seniority: dimension(seniorityScore, jobLevel === null ? "The job’s seniority is not explicit." : profileLevel === null ? "Add titled experience to compare seniority." : seniorityScore! >= 80 ? "Profile titles support the stated role level." : "The role level may require deliberate positioning."),
    location_comp: dimension(locationCompScore, strategy ? "Compared with saved location, work arrangement, and compensation constraints." : "Save a search strategy to score practical constraints.", locationSignals),
    preferences: dimension(preferenceScore, strategy ? "Compared with target titles and saved preferences." : "Save a search strategy to score personal preferences.", preferenceSignals),
    freshness: dimension(freshnessScore, job.postedAt ? `Posted ${ageDays} days ago.` : `Captured ${ageDays} days ago; original posting date is unknown.`),
    referral_access: dimension(null, "Unknown until contacts and network data are available in Phase 2."),
    prep_effort: dimension(prepEffortScore, prepEffortScore >= 75 ? "Current evidence should support a focused application with light preparation." : "Several requirements need evidence or clearer positioning."),
  } satisfies FitAnalysisResult["dimensions"];

  let weightedScore = 0;
  let activeWeight = 0;
  for (const key of dimensionKeys) {
    if (dimensions[key].score === null || weights[key] === 0) continue;
    weightedScore += dimensions[key].score * weights[key];
    activeWeight += weights[key];
  }
  const score = activeWeight === 0 ? 0 : clamp(weightedScore / activeWeight);
  const hardBlockers = gaps.filter((gap) => gap.classification === "hard_blocker");
  const unknownDimensions = dimensionKeys.filter((key) => dimensions[key].score === null && key !== "referral_access");
  let recommendation: Recommendation;
  if (hardBlockers.length > 0) recommendation = "skip";
  else if (freshnessScore !== null && freshnessScore <= 25) recommendation = "monitor";
  else if (unknownDimensions.length >= 3) recommendation = "research_first";
  else if (score >= 75) recommendation = "apply_now";
  else if (score >= 58) recommendation = "stretch";
  else recommendation = "research_first";

  const rankedDimensions = dimensionKeys.filter((key) => dimensions[key].score !== null).sort((a, b) => (dimensions[b].score ?? 0) - (dimensions[a].score ?? 0));
  const reasonsFor = rankedDimensions.filter((key) => (dimensions[key].score ?? 0) >= 65).slice(0, 3).map((key) => dimensions[key].summary);
  const reasonsAgainst = [
    ...hardBlockers.map((gap) => gap.detail),
    ...rankedDimensions.filter((key) => (dimensions[key].score ?? 100) < 55).slice(0, 3).map((key) => dimensions[key].summary),
  ].slice(0, 4);

  return { score, recommendation, dimensions, gaps, reasonsFor, reasonsAgainst, weights, evidenceIds: [...evidenceIds] };
}
