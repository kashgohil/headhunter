import type { Metadata } from "next";
import {
  Archive,
  AlertTriangle,
  Ban,
  Check,
  ChevronDown,
  Circle,
  Lock,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Unlock,
} from "lucide-react";

import { changeEvidenceControl } from "@/app/(workspace)/career-profile/actions";
import {
  AchievementForm,
  ExperienceForm,
  SkillForm,
} from "@/app/(workspace)/career-profile/career-profile-forms";
import { ProfileNavigation } from "@/app/(workspace)/career-profile/profile-navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCareerProfile,
  type CareerAchievement,
  type CareerExperience,
  type CareerSkill,
} from "@/lib/career-profile/repository";
import { calculateEvidenceHealth } from "@/lib/career-profile/health";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Career profile · Headhunter" };

const stateLabels = {
  needs_clarification: "Needs review",
  verified: "Verified",
  archived: "Archived",
  prohibited: "External use prohibited",
} as const;

const sourceLabels = {
  user_entered: "Entered by you",
  imported: "Imported",
  ai_extracted: "AI extracted",
} as const;

type EvidenceKind = "career_experience" | "career_achievement" | "career_skill";
type EvidenceItem = CareerExperience | CareerAchievement | CareerSkill;

function monthLabel(value: string | null) {
  if (!value) return "Present";
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function EvidenceState({ item }: { item: EvidenceItem }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={item.verificationState === "verified" ? "signal" : "outline"} className={cn(
        item.verificationState === "prohibited" && "border-destructive/30 text-destructive",
        item.verificationState === "archived" && "text-muted-foreground",
      )}>
        {item.verificationState === "verified" ? <ShieldCheck /> : null}
        {stateLabels[item.verificationState]}
      </Badge>
      {item.locked ? <Badge variant="secondary"><Lock /> Locked</Badge> : null}
    </div>
  );
}

function EvidenceControls({ item, kind }: { item: EvidenceItem; kind: EvidenceKind }) {
  return (
    <form action={changeEvidenceControl} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="entityType" value={kind} />
      <input type="hidden" name="entityId" value={item.id} />
      {item.locked ? (
        <Button type="submit" name="locked" value="false" variant="outline" size="sm"><Unlock /> Unlock to change</Button>
      ) : (
        <>
          {item.verificationState !== "verified" ? (
            <Button type="submit" name="verificationState" value="verified" variant="outline" size="sm"><Check /> Verify</Button>
          ) : (
            <Button type="submit" name="verificationState" value="needs_clarification" variant="outline" size="sm">Mark for review</Button>
          )}
          <Button type="submit" name="locked" value="true" variant="ghost" size="sm"><Lock /> Lock</Button>
          {item.verificationState !== "archived" ? (
            <Button type="submit" name="verificationState" value="archived" variant="ghost" size="sm"><Archive /> Archive</Button>
          ) : null}
          {item.verificationState !== "prohibited" ? (
            <Button type="submit" name="verificationState" value="prohibited" variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Ban /> Reject from external use</Button>
          ) : null}
        </>
      )}
    </form>
  );
}

function Provenance({ item }: { item: EvidenceItem }) {
  return (
    <p className="text-xs leading-5 text-muted-foreground">
      {sourceLabels[item.sourceType]}{item.sourceLabel ? ` · ${item.sourceLabel}` : " · No source note"}
    </p>
  );
}

function Editor({ label, locked, children }: { label: string; locked: boolean; children: React.ReactNode }) {
  if (locked) return <p className="text-xs text-muted-foreground">Unlock this item before editing it.</p>;

  return (
    <details className="group rounded-md border border-border bg-background">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30">
        <span className="flex items-center gap-2"><Pencil className="size-3.5" /> {label}</span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="border-t border-border p-4 sm:p-5">{children}</div>
    </details>
  );
}

function ReadinessPanel({ readiness }: { readiness: Awaited<ReturnType<typeof getCareerProfile>>["readiness"] }) {
  const steps = [
    ["Experience", readiness.hasExperience],
    ["Achievement", readiness.hasAchievement],
    ["Basic skills", readiness.hasSkills],
  ] as const;
  const completed = steps.filter(([, ready]) => ready).length;

  return (
    <Card className={cn("overflow-hidden", readiness.ready && "border-signal/40")}>
      <CardContent className="grid gap-6 p-6 sm:grid-cols-[10rem_1fr] sm:items-center lg:grid-cols-[12rem_1fr] lg:p-8">
        <div>
          <div className="flex items-end gap-1 font-mono tracking-[-0.06em]">
            <span className="text-5xl font-semibold">{completed}</span>
            <span className="pb-1 text-lg text-muted-foreground">/ 3</span>
          </div>
          <p className="mt-2 text-sm font-medium">First-resume readiness</p>
        </div>
        <div>
          <div className="grid gap-2 sm:grid-cols-3">
            {steps.map(([label, ready]) => (
              <div key={label} className={cn("flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm", ready ? "border-signal/30 bg-signal/8 text-signal-foreground" : "bg-muted/35 text-muted-foreground")}>
                {ready ? <Check className="size-4" /> : <Circle className="size-4" />}
                {label}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {readiness.ready
              ? "You have enough structured evidence to create a first tailored resume. Verification can continue progressively."
              : "Add one experience, one achievement linked to it, and at least one skill. Full verification is not required to continue."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function AddPanel({ title, description, open, children }: { title: string; description: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="group rounded-lg border border-border bg-card shadow-[0_1px_2px_rgba(28,25,20,0.04)]">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-lg px-5 py-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 sm:px-6">
        <span>
          <span className="flex items-center gap-2 font-semibold tracking-tight"><Plus className="size-4" /> {title}</span>
          <span className="mt-1 block text-sm leading-5 text-muted-foreground">{description}</span>
        </span>
        <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="border-t border-border p-5 sm:p-6">{children}</div>
    </details>
  );
}

export default async function CareerProfilePage() {
  const profile = await getCareerProfile();
  const activeExperiences = profile.experiences.filter((item) => item.verificationState !== "archived" && item.verificationState !== "prohibited");
  const activeAchievements = profile.achievements.filter((item) => item.verificationState !== "archived" && item.verificationState !== "prohibited");
  const experienceById = new Map(profile.experiences.map((item) => [item.id, item]));
  const healthWarnings = calculateEvidenceHealth(profile.experiences, profile.achievements, profile.skills, profile.profileItems);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-14">
      <header className="mb-8 grid gap-5 border-b border-border pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Career profile</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Keep the evidence behind every resume claim in one private, reviewable source of truth.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="size-4" />
          New entries start in review and remain editable until you lock them.
        </div>
      </header>

      <ProfileNavigation />

      <ReadinessPanel readiness={profile.readiness} />

      <Card className={cn("mt-4 gap-4 py-5", healthWarnings.length && "border-amber-600/30")}>
        <CardHeader className="grid gap-3 px-5 sm:grid-cols-[1fr_auto] sm:px-6">
          <div>
            <CardTitle>Evidence health</CardTitle>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Potential conflicts, duplicates, stale claims, and unsupported metrics are surfaced for review.</p>
          </div>
          <Badge variant={healthWarnings.length ? "outline" : "signal"} className={cn(healthWarnings.length && "border-amber-600/30 text-amber-800")}>
            {healthWarnings.length ? <AlertTriangle /> : <Check />}
            {healthWarnings.length ? `${healthWarnings.length} to review` : "No issues found"}
          </Badge>
        </CardHeader>
        {healthWarnings.length ? (
          <CardContent className="px-5 sm:px-6">
            <ul className="divide-y divide-border rounded-md border border-border bg-muted/20 px-4">
              {healthWarnings.map((warning) => (
                <li key={warning.id} className="flex gap-3 py-3 text-sm leading-6">
                  <AlertTriangle className="mt-1 size-4 shrink-0 text-amber-700" />
                  {warning.message}
                </li>
              ))}
            </ul>
          </CardContent>
        ) : null}
      </Card>

      <section className="mt-10">
        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-[-0.025em]">Build your evidence bank</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Start with what you know. You can verify and lock each item when it is accurate.</p>
        </div>
        <div className="space-y-3">
          <AddPanel title="Add experience" description="Record a role, its scope, dates, and working context." open={profile.experiences.length === 0}>
            <ExperienceForm />
          </AddPanel>
          <AddPanel title="Add achievement" description="Capture reusable evidence as problem, personal action, and result." open={profile.experiences.length > 0 && profile.achievements.length === 0}>
            {activeExperiences.length ? <AchievementForm experiences={activeExperiences} /> : <p className="text-sm text-muted-foreground">Add an active experience before linking an achievement.</p>}
          </AddPanel>
          <AddPanel title="Add skill" description="Include proficiency, recency, context, and supporting evidence when available." open={profile.achievements.length > 0 && profile.skills.length === 0}>
            <SkillForm achievements={activeAchievements} />
          </AddPanel>
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.025em]">Experience</h2>
            <p className="mt-1 text-sm text-muted-foreground">Employment history and the context behind your work.</p>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{profile.experiences.length} total</span>
        </div>
        {profile.experiences.length ? (
          <div className="space-y-3">
            {profile.experiences.map((item) => (
              <Card key={item.id} className={cn("gap-4 py-5", (item.verificationState === "archived" || item.verificationState === "prohibited") && "bg-muted/20")}>
                <CardHeader className="grid gap-4 px-5 sm:grid-cols-[1fr_auto] sm:px-6">
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{item.company} · {monthLabel(item.startDate)}–{item.isCurrent ? "Present" : monthLabel(item.endDate)}{item.location ? ` · ${item.location}` : ""}</p>
                  </div>
                  <EvidenceState item={item} />
                </CardHeader>
                <CardContent className="space-y-4 px-5 sm:px-6">
                  {item.summary ? <p className="max-w-3xl text-sm leading-6">{item.summary}</p> : null}
                  {item.responsibilities.length ? <div><p className="text-sm font-medium">Responsibilities</p><ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">{item.responsibilities.map((responsibility) => <li key={responsibility}>— {responsibility}</li>)}</ul></div> : null}
                  {item.technologies.length ? <p className="text-sm"><span className="text-muted-foreground">Technologies:</span> {item.technologies.join(", ")}</p> : null}
                  <Provenance item={item} />
                  <div className="flex flex-col gap-3 border-t border-border pt-4 lg:flex-row lg:items-center lg:justify-between">
                    <EvidenceControls item={item} kind="career_experience" />
                  </div>
                  <Editor label="Edit experience" locked={item.locked}><ExperienceForm experience={item} /></Editor>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Your experience history will appear here.</CardContent></Card>}
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.025em]">Achievements</h2>
            <p className="mt-1 text-sm text-muted-foreground">Specific proof you can reuse without inventing or overstating claims.</p>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{profile.achievements.length} total</span>
        </div>
        {profile.achievements.length ? (
          <div className="space-y-3">
            {profile.achievements.map((item) => {
              const experience = experienceById.get(item.experienceId);
              return (
                <Card key={item.id} className={cn("gap-4 py-5", (item.verificationState === "archived" || item.verificationState === "prohibited") && "bg-muted/20")}>
                  <CardHeader className="grid gap-4 px-5 sm:grid-cols-[1fr_auto] sm:px-6">
                    <div>
                      <CardTitle className="text-base leading-6">{item.result}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">{experience ? `${experience.title} · ${experience.company}` : "Experience unavailable"}</p>
                    </div>
                    <EvidenceState item={item} />
                  </CardHeader>
                  <CardContent className="space-y-4 px-5 sm:px-6">
                    <div className="grid gap-4 rounded-md border border-border bg-muted/25 p-4 lg:grid-cols-3">
                      <div><p className="text-xs font-medium text-muted-foreground">Problem</p><p className="mt-1 text-sm leading-6">{item.problem}</p></div>
                      <div><p className="text-xs font-medium text-muted-foreground">Action</p><p className="mt-1 text-sm leading-6">{item.action}</p></div>
                      <div><p className="text-xs font-medium text-muted-foreground">Result</p><p className="mt-1 text-sm leading-6">{item.result}</p></div>
                    </div>
                    {item.measurableOutcome ? <p className="text-sm"><span className="text-muted-foreground">Measured outcome:</span> {item.measurableOutcome}</p> : null}
                    <Provenance item={item} />
                    <div className="border-t border-border pt-4"><EvidenceControls item={item} kind="career_achievement" /></div>
                    <Editor label="Edit achievement" locked={item.locked}><AchievementForm achievement={item} experiences={activeExperiences} /></Editor>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Achievements linked to your experience will appear here.</CardContent></Card>}
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.025em]">Skills</h2>
            <p className="mt-1 text-sm text-muted-foreground">Capabilities with enough context to judge where and how you used them.</p>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{profile.skills.length} total</span>
        </div>
        {profile.skills.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {profile.skills.map((item) => (
              <Card key={item.id} className={cn("gap-4 py-5", (item.verificationState === "archived" || item.verificationState === "prohibited") && "bg-muted/20")}>
                <CardHeader className="grid gap-3 px-5 sm:grid-cols-[1fr_auto] sm:px-6">
                  <div>
                    <CardTitle>{item.name}</CardTitle>
                    <p className="mt-1 text-sm capitalize text-muted-foreground">{item.proficiency} · {item.recency}</p>
                  </div>
                  <EvidenceState item={item} />
                </CardHeader>
                <CardContent className="space-y-4 px-5 sm:px-6">
                  {item.context ? <p className="text-sm leading-6">{item.context}</p> : null}
                  <Provenance item={item} />
                  <div className="border-t border-border pt-4"><EvidenceControls item={item} kind="career_skill" /></div>
                  <Editor label="Edit skill" locked={item.locked}><SkillForm skill={item} achievements={activeAchievements} /></Editor>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Skills will appear here with recency and proficiency context.</CardContent></Card>}
      </section>
    </div>
  );
}
