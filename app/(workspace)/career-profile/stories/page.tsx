import type { Metadata } from "next";

import { AddPanel, Editor, EvidenceControls, EvidenceState, Provenance } from "@/app/(workspace)/career-profile/evidence-ui";
import { AnswerForm, StoryForm, VoiceProfileForm } from "@/app/(workspace)/career-profile/extended-profile-forms";
import { ProfileNavigation } from "@/app/(workspace)/career-profile/profile-navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCareerProfile } from "@/lib/career-profile/repository";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Stories and answers · Headhunter" };

export default async function StoriesAndAnswersPage() {
  const profile = await getCareerProfile();
  const activeAchievements = profile.achievements.filter((item) => item.verificationState !== "archived" && item.verificationState !== "prohibited");
  const achievementById = new Map(profile.achievements.map((item) => [item.id, item]));

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-14">
      <ProfileNavigation />

      <header className="mb-8 border-b border-border pb-8">
        <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Stories and answers</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Prepare truthful stories and reusable answers once, then adapt them to each interview and application without losing their evidence.</p>
      </header>

      <div className="space-y-3">
        <AddPanel title="Add interview story" description="Structure a story as situation, task, personal action, result, and reflection." open={profile.stories.length === 0}>
          <StoryForm achievements={activeAchievements} />
        </AddPanel>
        <AddPanel title="Add reusable answer" description="Save a grounded base answer for recurring application and screening questions." open={profile.stories.length > 0 && profile.answers.length === 0}>
          <AnswerForm achievements={activeAchievements} />
        </AddPanel>
        <AddPanel title="Add writing voice" description="Define how generated drafts should sound and what they should avoid." open={profile.answers.length > 0 && profile.voiceProfiles.length === 0}>
          <VoiceProfileForm />
        </AddPanel>
      </div>

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><h2 className="text-xl font-semibold tracking-[-0.025em]">Interview stories</h2><p className="mt-1 text-sm text-muted-foreground">Adaptable examples for behavioral and competency questions.</p></div>
          <span className="font-mono text-xs text-muted-foreground">{profile.stories.length} total</span>
        </div>
        {profile.stories.length ? (
          <div className="space-y-3">
            {profile.stories.map((story) => {
              const achievement = story.supportingAchievementId ? achievementById.get(story.supportingAchievementId) : null;
              return (
                <Card key={story.id} className={cn("gap-4 py-5", (story.verificationState === "archived" || story.verificationState === "prohibited") && "bg-muted/20")}>
                  <CardHeader className="grid gap-3 px-5 sm:grid-cols-[1fr_auto] sm:px-6">
                    <div><CardTitle className="text-lg">{story.title}</CardTitle>{story.prompts.length ? <p className="mt-1 text-sm text-muted-foreground">Useful for {story.prompts.join(", ")}</p> : null}</div>
                    <EvidenceState item={story} />
                  </CardHeader>
                  <CardContent className="space-y-4 px-5 sm:px-6">
                    <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-5">
                      {[["Situation", story.situation], ["Task", story.task], ["Action", story.action], ["Result", story.result], ["Reflection", story.reflection]].map(([label, value]) => (
                        <div key={label} className="bg-card p-4"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1.5 text-sm leading-6">{value}</p></div>
                      ))}
                    </div>
                    {achievement ? <p className="text-sm"><span className="text-muted-foreground">Supporting achievement:</span> {achievement.result}</p> : null}
                    <Provenance item={story} />
                    <div className="border-t border-border pt-4"><EvidenceControls item={story} kind="career_story" /></div>
                    <Editor label="Edit interview story" locked={story.locked}><StoryForm story={story} achievements={activeAchievements} /></Editor>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Your interview stories will appear here.</CardContent></Card>}
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><h2 className="text-xl font-semibold tracking-[-0.025em]">Reusable answers</h2><p className="mt-1 text-sm text-muted-foreground">Starting points for common screening questions, never automatic submissions.</p></div>
          <span className="font-mono text-xs text-muted-foreground">{profile.answers.length} total</span>
        </div>
        {profile.answers.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {profile.answers.map((answer) => {
              const achievement = answer.supportingAchievementId ? achievementById.get(answer.supportingAchievementId) : null;
              return (
                <Card key={answer.id} className={cn("gap-4 py-5", (answer.verificationState === "archived" || answer.verificationState === "prohibited") && "bg-muted/20")}>
                  <CardHeader className="grid gap-3 px-5 sm:grid-cols-[1fr_auto] sm:px-6"><CardTitle className="text-base leading-6">{answer.question}</CardTitle><EvidenceState item={answer} /></CardHeader>
                  <CardContent className="space-y-4 px-5 sm:px-6">
                    <p className="whitespace-pre-wrap text-sm leading-6">{answer.answer}</p>
                    {answer.contexts.length ? <p className="text-sm"><span className="text-muted-foreground">Useful in:</span> {answer.contexts.join(", ")}</p> : null}
                    {achievement ? <p className="text-sm"><span className="text-muted-foreground">Supporting achievement:</span> {achievement.result}</p> : null}
                    <Provenance item={answer} />
                    <div className="border-t border-border pt-4"><EvidenceControls item={answer} kind="career_answer" /></div>
                    <Editor label="Edit reusable answer" locked={answer.locked}><AnswerForm answer={answer} achievements={activeAchievements} /></Editor>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Reusable screening answers will appear here.</CardContent></Card>}
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><h2 className="text-xl font-semibold tracking-[-0.025em]">Writing voice</h2><p className="mt-1 text-sm text-muted-foreground">Approved guidance for tone, structure, and language in future drafts.</p></div>
          <span className="font-mono text-xs text-muted-foreground">{profile.voiceProfiles.length} total</span>
        </div>
        {profile.voiceProfiles.length ? (
          <div className="space-y-3">
            {profile.voiceProfiles.map((voice) => (
              <Card key={voice.id} className={cn("gap-4 py-5", (voice.verificationState === "archived" || voice.verificationState === "prohibited") && "bg-muted/20")}>
                <CardHeader className="grid gap-3 px-5 sm:grid-cols-[1fr_auto] sm:px-6"><div><CardTitle>{voice.name}</CardTitle><p className="mt-1 text-sm leading-6 text-muted-foreground">{voice.tone}</p></div><EvidenceState item={voice} /></CardHeader>
                <CardContent className="space-y-4 px-5 sm:px-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-md border border-border bg-muted/20 p-4"><p className="text-sm font-medium">Use</p><ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">{voice.principles.map((principle) => <li key={principle}>— {principle}</li>)}</ul></div>
                    <div className="rounded-md border border-border bg-muted/20 p-4"><p className="text-sm font-medium">Avoid</p>{voice.avoid.length ? <ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">{voice.avoid.map((item) => <li key={item}>— {item}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">Nothing specified yet.</p>}</div>
                  </div>
                  {voice.sample ? <div><p className="text-sm font-medium">Representative sample</p><blockquote className="mt-2 border-l-2 border-primary/40 pl-4 text-sm leading-6 text-muted-foreground">{voice.sample}</blockquote></div> : null}
                  <Provenance item={voice} />
                  <div className="border-t border-border pt-4"><EvidenceControls item={voice} kind="career_voice" /></div>
                  <Editor label="Edit writing voice" locked={voice.locked}><VoiceProfileForm profile={voice} /></Editor>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Your approved writing guidance will appear here.</CardContent></Card>}
      </section>
    </div>
  );
}
