import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";

import { Editor, EvidenceControls, EvidenceState, Provenance, AddPanel } from "@/app/(workspace)/career-profile/evidence-ui";
import { ProfileItemForm } from "@/app/(workspace)/career-profile/extended-profile-forms";
import { ProfileNavigation } from "@/app/(workspace)/career-profile/profile-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCareerProfile } from "@/lib/career-profile/repository";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Projects and credentials · Headhunter" };

const kindLabels = {
  project: "Projects",
  education: "Education",
  certification: "Certifications",
  award: "Awards",
  publication: "Publications",
  link: "Professional links",
} as const;
const kindSingular = {
  project: "project",
  education: "education record",
  certification: "certification",
  award: "award",
  publication: "publication",
  link: "professional link",
} as const;

function monthLabel(value: string | null) {
  if (!value) return null;
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export default async function CareerLibraryPage() {
  const profile = await getCareerProfile();

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-14">
      <header className="mb-8 border-b border-border pb-8">
        <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Projects and credentials</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Keep supporting career records structured, sourced, and ready to reuse when they strengthen an application.</p>
      </header>
      <ProfileNavigation />

      <AddPanel title="Add a profile record" description="Capture a project, qualification, certification, award, publication, or professional link." open={profile.profileItems.length === 0}>
        <ProfileItemForm />
      </AddPanel>

      <div className="mt-12 space-y-12">
        {Object.entries(kindLabels).map(([kind, label]) => {
          const items = profile.profileItems.filter((item) => item.kind === kind);
          return (
            <section key={kind}>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div><h2 className="text-xl font-semibold tracking-[-0.025em]">{label}</h2><p className="mt-1 text-sm text-muted-foreground">{kind === "project" ? "Work that demonstrates scope, methods, and outcomes." : `Verified ${label.toLocaleLowerCase()} available to future application material.`}</p></div>
                <span className="font-mono text-xs text-muted-foreground">{items.length} total</span>
              </div>
              {items.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {items.map((item) => (
                    <Card key={item.id} className={cn("gap-4 py-5", (item.verificationState === "archived" || item.verificationState === "prohibited") && "bg-muted/20")}>
                      <CardHeader className="grid gap-3 px-5 sm:grid-cols-[1fr_auto] sm:px-6">
                        <div>
                          <CardTitle className="text-base leading-6">{item.title}</CardTitle>
                          <p className="mt-1 text-sm text-muted-foreground">{[item.organization, monthLabel(item.startDate), item.endDate ? monthLabel(item.endDate) : null].filter(Boolean).join(" · ") || kindSingular[item.kind]}</p>
                        </div>
                        <EvidenceState item={item} />
                      </CardHeader>
                      <CardContent className="space-y-4 px-5 sm:px-6">
                        <p className="text-sm leading-6">{item.description}</p>
                        {item.technologies.length ? <p className="text-sm"><span className="text-muted-foreground">Topics and tools:</span> {item.technologies.join(", ")}</p> : null}
                        {item.credentialId ? <p className="font-mono text-xs text-muted-foreground">Credential {item.credentialId}</p> : null}
                        {item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium underline decoration-border underline-offset-4 hover:decoration-foreground">Open source <ExternalLink className="size-3.5" /></a> : null}
                        <Provenance item={item} />
                        <div className="border-t border-border pt-4"><EvidenceControls item={item} kind="career_profile_item" /></div>
                        <Editor label={`Edit ${kindSingular[item.kind]}`} locked={item.locked}><ProfileItemForm item={item} /></Editor>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : <Card><CardContent className="py-9 text-center text-sm text-muted-foreground">No {label.toLocaleLowerCase()} added yet.</CardContent></Card>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
