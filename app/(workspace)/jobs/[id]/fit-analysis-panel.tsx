import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleHelp,
  Scale,
  XCircle,
} from "lucide-react";

import {
  AnalyzeFitButton,
  FitOverrideForm,
  FitWeightsForm,
} from "@/app/(workspace)/jobs/[id]/fit-analysis-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/accordion";
import type { FitAnalysis } from "@/lib/fit-analysis/repository";
import {
  dimensionKeys,
  type FitWeights,
  type GapClassification,
  type Recommendation,
} from "@/lib/fit-analysis/types";

const recommendationLabels: Record<Recommendation, string> = {
  apply_now: "Apply now",
  research_first: "Research first",
  seek_referral_first: "Seek referral first",
  stretch: "Stretch opportunity",
  monitor: "Monitor / defer",
  skip: "Skip",
};
const dimensionLabels: Record<keyof FitWeights, string> = {
  qualifications: "Qualifications",
  experience: "Experience & skills",
  seniority: "Seniority",
  location_comp: "Location & compensation",
  preferences: "Preferences",
  freshness: "Freshness",
  referral_access: "Referral access",
  prep_effort: "Preparation effort",
};
const gapLabels: Record<GapClassification, string> = {
  hard_blocker: "Hard blocker",
  material_gap: "Material gap",
  addressable: "Addressable",
  transferable: "Transferable",
  missing_evidence: "Missing evidence",
  optional: "Optional",
  unknown: "Unknown",
};

function scoreTone(score: number | null) {
  if (score === null) return "bg-muted-foreground/35";
  if (score >= 75) return "bg-signal";
  if (score >= 55) return "bg-foreground/60";
  return "bg-destructive/75";
}

export function FitAnalysisPanel({
  jobId,
  analysis,
  evidenceReferences,
}: {
  jobId: string;
  analysis: FitAnalysis | null;
  evidenceReferences: { id: string; label: string; href: string }[];
}) {
  if (!analysis) {
    return (
      <Card className="mt-8 overflow-hidden bg-foreground text-background">
        <CardContent className="flex flex-col gap-6 px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <Scale className="size-5 text-background/70" />
              <h2 className="text-lg font-semibold tracking-tight">
                Decide with evidence, not instinct
              </h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-background/65">
              Compare this role with your search strategy and career profile.
              You’ll get separate dimension scores, classified gaps, and a
              recommendation you can inspect or override.
            </p>
          </div>
          <AnalyzeFitButton jobId={jobId} />
        </CardContent>
      </Card>
    );
  }

  const effectiveRecommendation =
    analysis.overriddenRecommendation ?? analysis.recommendation;
  const isOverridden = analysis.overriddenRecommendation !== null;
  const referenceById = new Map(
    evidenceReferences.map((item) => [item.id, item]),
  );
  const referencedEvidence = analysis.evidenceIds.map(
    (id) => referenceById.get(id) ?? { id, label: "Source unavailable" },
  );
  const knownDimensions = dimensionKeys.filter(
    (key) => analysis.dimensions[key].score !== null,
  ).length;

  return (
    <section className="mt-8" aria-labelledby="fit-heading">
      <Card className="overflow-hidden py-0">
        <div className="grid bg-foreground text-background lg:grid-cols-[230px_1fr]">
          <div className="flex flex-col justify-between border-b border-background/15 p-7 lg:border-b-0 lg:border-r">
            <div>
              <p className="text-sm font-medium text-background/65">
                Evidence-weighted fit
              </p>
              <p className="mt-2 font-mono text-6xl font-semibold tracking-[-0.08em]">
                {analysis.score}
              </p>
              <p className="mt-1 text-xs text-background/55">
                out of 100 · {knownDimensions}/8 known
              </p>
            </div>
            <p className="mt-8 font-mono text-xs text-background/55">
              Analysis v{analysis.version}
            </p>
          </div>
          <div className="p-7 lg:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="fit-heading"
                    className="text-2xl font-semibold tracking-[-0.035em]"
                  >
                    {recommendationLabels[effectiveRecommendation]}
                  </h2>
                  <Badge
                    variant="signal"
                    className="border-background/20 bg-background/10 text-background"
                  >
                    {isOverridden ? "User decision" : "Recommendation"}
                  </Badge>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-background/65">
                  {isOverridden
                    ? analysis.overrideReason
                    : "Calculated from the latest saved job details, search strategy, and usable career evidence."}
                </p>
              </div>
              <AnalyzeFitButton jobId={jobId} weights={analysis.weights} />
            </div>
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-background/55">
                  <CheckCircle2 className="size-3.5" />
                  Reasons for
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-5 text-background/85">
                  {analysis.reasonsFor.length > 0 ? (
                    analysis.reasonsFor.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))
                  ) : (
                    <li>No strong positive signal is established yet.</li>
                  )}
                </ul>
              </div>
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-background/55">
                  <XCircle className="size-3.5" />
                  Reasons against
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-5 text-background/85">
                  {analysis.reasonsAgainst.length > 0 ? (
                    analysis.reasonsAgainst.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))
                  ) : (
                    <li>No material negative signal is established.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="px-0 py-0">
          <div className="grid lg:grid-cols-[1fr_340px]">
            <div className="border-b border-border p-6 lg:border-b-0 lg:border-r lg:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold">Dimension ledger</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Scores stay separate so a high match cannot hide a blocker.
                  </p>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  WEIGHT
                </span>
              </div>
              <div className="mt-6 divide-y divide-border">
                {dimensionKeys.map((key) => {
                  const item = analysis.dimensions[key];
                  return (
                    <div
                      key={key}
                      className="grid gap-3 py-4 first:pt-0 sm:grid-cols-[170px_1fr_58px] sm:items-center"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {dimensionLabels[key]}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          {analysis.weights[key]} wt.
                        </p>
                      </div>
                      <div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${scoreTone(item.score)}`}
                            style={{ width: `${item.score ?? 0}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                          {item.summary}
                        </p>
                        {item.signals.length > 0 ? (
                          <p className="mt-1 text-xs leading-5 text-foreground/75">
                            {item.signals.join(" ")}
                          </p>
                        ) : null}
                      </div>
                      <p className="font-mono text-lg font-semibold sm:text-right">
                        {item.score ?? "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
            <aside className="p-6 lg:p-8">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Gap register</h3>
                <span className="font-mono text-xs text-muted-foreground">
                  {analysis.gaps.length.toString().padStart(2, "0")}
                </span>
              </div>
              {analysis.gaps.length > 0 ? (
                <div className="mt-5 space-y-4">
                  {analysis.gaps.slice(0, 8).map((gap, index) => (
                    <div
                      key={`${gap.label}-${index}`}
                      className="border-l-2 border-border pl-3"
                    >
                      <Badge
                        variant={
                          gap.classification === "hard_blocker"
                            ? "default"
                            : "outline"
                        }
                        className="mb-2"
                      >
                        {gapLabels[gap.classification]}
                      </Badge>
                      <p className="text-sm font-medium leading-5">
                        {gap.label}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {gap.detail}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-md border border-dashed border-border p-4 text-sm leading-6 text-muted-foreground">
                  No explicit gaps were found in the structured data.
                </div>
              )}
            </aside>
          </div>

          <div className="border-t border-border bg-muted/25 px-6 py-5 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-xs leading-5 text-muted-foreground">
                <CircleHelp className="mr-1.5 inline size-3.5 align-[-2px]" />
                Referral access remains unknown until contacts are available.
                Unknown dimensions are excluded and known weights are
                normalized.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/settings/search-strategy">
                    Search strategy <ArrowUpRight />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/career-profile">
                    Career evidence <ArrowUpRight />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs">
              <Link href={`/sources/job/${jobId}`} className="underline">
                Inspect job source
              </Link>
              {analysis.searchStrategyVersionId ? (
                <Link
                  href={`/sources/strategy/${analysis.searchStrategyVersionId}`}
                  className="underline"
                >
                  Inspect strategy version used
                </Link>
              ) : (
                <span>No strategy linked</span>
              )}
            </div>
            {referencedEvidence.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <span className="text-xs font-medium text-muted-foreground">
                  Evidence used
                </span>
                {referencedEvidence.map((item) => (
                  <Button key={item.id} asChild variant="outline" size="sm">
                    <Link href={`/sources/evidence/${item.id}`}>
                      {item.label} <ArrowUpRight />
                    </Link>
                  </Button>
                ))}
              </div>
            ) : null}
          </div>

          <Disclosure
            className="border-t border-border px-6 lg:px-8"
            triggerClassName="py-5 text-sm font-semibold"
            contentClassName="border-t border-border py-6"
            title={
              <>
                Tune weights and create a new version{" "}
                <span className="ml-2 font-normal text-muted-foreground">
                  Current analysis remains preserved
                </span>
              </>
            }
          >
            <FitWeightsForm jobId={jobId} weights={analysis.weights} />
          </Disclosure>
          <Disclosure
            className="border-t border-border px-6 lg:px-8"
            triggerClassName="py-5 text-sm font-semibold"
            contentClassName="border-t border-border py-6"
            title={
              <>
                Override the recommendation{" "}
                <span className="ml-2 font-normal text-muted-foreground">
                  Keep your judgment explicit
                </span>
              </>
            }
          >
            <FitOverrideForm
              jobId={jobId}
              recommendation={effectiveRecommendation}
              reason={analysis.overrideReason}
            />
          </Disclosure>
        </CardContent>
      </Card>
    </section>
  );
}
