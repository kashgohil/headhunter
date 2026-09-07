export const dimensionKeys = [
  "qualifications",
  "experience",
  "seniority",
  "location_comp",
  "preferences",
  "freshness",
  "referral_access",
  "prep_effort",
] as const;

export type DimensionKey = (typeof dimensionKeys)[number];
export type Recommendation = "apply_now" | "research_first" | "seek_referral_first" | "stretch" | "monitor" | "skip";
export type GapClassification = "hard_blocker" | "material_gap" | "addressable" | "transferable" | "missing_evidence" | "optional" | "unknown";

export type FitDimension = {
  score: number | null;
  summary: string;
  signals: string[];
};

export type FitGap = {
  classification: GapClassification;
  label: string;
  detail: string;
};

export type FitWeights = Record<DimensionKey, number>;

export type FitAnalysisResult = {
  score: number;
  recommendation: Recommendation;
  dimensions: Record<DimensionKey, FitDimension>;
  gaps: FitGap[];
  reasonsFor: string[];
  reasonsAgainst: string[];
  weights: FitWeights;
  evidenceIds: string[];
};

export const defaultFitWeights: FitWeights = {
  qualifications: 20,
  experience: 20,
  seniority: 12,
  location_comp: 15,
  preferences: 12,
  freshness: 8,
  referral_access: 5,
  prep_effort: 8,
};
