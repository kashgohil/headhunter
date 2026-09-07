import Link from "next/link";
import { notFound } from "next/navigation";
import { getInterview } from "@/lib/interviews/repository";
import { buildStudyGuide } from "@/lib/interviews/study-guide";
import {
  practiceFeedback,
  prepareQuestions,
} from "@/lib/interviews/preparation";
import { ActionForm, FormSelect } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PlanFields } from "../plan-fields";
import {
  saveDebriefAction,
  savePracticeAction,
  saveRoundAction,
} from "../actions";

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getInterview(id);
  if (!data) notFound();
  const { round, plan, job } = data;
  const questions = prepareQuestions(plan?.kind ?? "other", job, data.evidence);
  const guide = buildStudyGuide(plan?.kind ?? "other", job.skills);
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <Link href="/interviews" className="text-sm text-muted-foreground">
        ← Interviews
      </Link>
      <header className="mt-5 border-b pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            {round.label}
          </h1>
          <Badge variant="outline">{round.status}</Badge>
        </div>
        <p className="mt-3 text-muted-foreground">
          {job.company} · {job.title}
        </p>
        <time className="mt-3 block font-mono text-sm">
          {round.scheduledAt.toISOString().slice(0, 16).replace("T", " ")} UTC
        </time>
        <Link
          href={`/jobs/${job.id}#application-workspace-heading`}
          className="mt-3 block text-sm text-primary"
        >
          Open application and pipeline stage
        </Link>
      </header>
      <nav
        aria-label="Interview workspace"
        className="my-6 flex flex-wrap gap-4 text-sm text-primary"
      >
        <a href="#briefing">Briefing</a>
        <a href="#practice">Practice</a>
        <a href="#cheat-sheet">Cheat sheet</a>
        <a href="#debrief">Debrief</a>
      </nav>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-8">
          <section
            id="briefing"
            className="scroll-mt-16 rounded-lg border bg-card p-5"
          >
            <h2 className="text-xl font-semibold">Round briefing</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
              {plan?.objectives || "Set objectives for this round in the plan."}
            </p>
            <h3 className="mt-5 text-sm font-semibold">
              Recorded role requirements
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {job.requiredQualifications
                .slice(0, 6)
                .map((qualification, index) => (
                  <li key={index}>{qualification}</li>
                ))}
            </ul>
            {!job.requiredQualifications.length ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No structured requirements recorded.{" "}
                <Link href={`/jobs/${job.id}`} className="text-primary">
                  Review the original job description
                </Link>
                .
              </p>
            ) : null}
            <h3 className="mt-5 text-sm font-semibold">Company research</h3>
            <ul className="mt-2 space-y-3">
              {data.research.companyEntries.slice(0, 5).map((entry) => (
                <li key={entry.id}>
                  <p className="text-sm leading-6">{entry.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.provenance.replaceAll("_", " ")}
                    {entry.sourceState ? ` · ${entry.sourceState}` : ""}
                  </p>
                  {entry.sourceUrl ? (
                    <a
                      href={entry.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary"
                    >
                      Research source
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
            {!data.research.companyEntries.length ? (
              <Link
                href={`/jobs/${job.id}`}
                className="mt-2 block text-sm text-primary"
              >
                Add research to the opportunity
              </Link>
            ) : null}
          </section>
          <section id="practice" className="scroll-mt-16">
            <h2 className="text-xl font-semibold">Practice questions</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Suggested practice, not predictions about this employer. Evidence
              matches use shared terms and need your review.
            </p>
            <ol className="mt-5 space-y-4">
              {questions.map((question) => (
                <li
                  key={question.question}
                  className="rounded-lg border bg-card p-5"
                >
                  <h3 className="text-sm font-semibold">{question.question}</h3>
                  {question.matches.length ? (
                    <ul className="mt-3 space-y-2">
                      {question.matches.map((match) => (
                        <li key={match.id}>
                          <Link
                            href={match.href}
                            className="text-sm text-primary"
                          >
                            {match.label}
                          </Link>
                          <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                            {match.text}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      No verified evidence match.{" "}
                      <Link
                        href="/career-profile/stories"
                        className="text-primary"
                      >
                        Add or verify a relevant story
                      </Link>
                      .
                    </p>
                  )}
                </li>
              ))}
            </ol>
            <details className="mt-5 rounded-lg border bg-card p-5">
              <summary className="cursor-pointer font-semibold">
                Record a mock session
              </summary>
              <p className="my-4 text-sm text-muted-foreground">
                Answer aloud, then paste notes or a transcript. Scores are your
                self-review, not an automated assessment.
              </p>
              <ActionForm
                action={savePracticeAction.bind(null, id)}
                label="Save practice session"
              >
                <FormSelect
                  name="prompt"
                  label="Practice question"
                  options={questions.map((question) => ({
                    value: question.question,
                    label: question.question,
                  }))}
                />
                <div>
                  <label htmlFor="response" className="text-sm font-medium">
                    Answer notes / transcript
                  </label>
                  <Textarea
                    id="response"
                    name="response"
                    className="mt-2 min-h-40"
                    required
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {["clarity", "relevance", "evidence"].map((name) => (
                    <FormSelect
                      key={name}
                      name={name}
                      label={`${name} · self-rating`}
                      defaultValue="3"
                      options={[1, 2, 3, 4, 5].map((value) => ({
                        value: String(value),
                        label: `${value} / 5`,
                      }))}
                    />
                  ))}
                </div>
                <div>
                  <label htmlFor="feedback" className="text-sm font-medium">
                    Reflection and feedback
                  </label>
                  <Textarea id="feedback" name="feedback" className="mt-2" />
                </div>
                <div>
                  <label htmlFor="nextPractice" className="text-sm font-medium">
                    One thing to practice next
                  </label>
                  <Input
                    id="nextPractice"
                    name="nextPractice"
                    required
                    className="mt-2"
                  />
                </div>
              </ActionForm>
            </details>
            {data.sessions.map((session) => (
              <details key={session.id} className="mt-4 rounded-lg border p-5">
                <summary className="cursor-pointer text-sm font-medium">
                  Practice · {session.createdAt.toISOString().slice(0, 10)} ·{" "}
                  {session.prompt}
                </summary>
                <p className="mt-3 whitespace-pre-wrap text-sm">
                  {session.response}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Self-ratings: clarity {session.clarity}/5 · relevance{" "}
                  {session.relevance}/5 · evidence {session.evidence}/5
                </p>
                <p className="mt-2 text-sm">{session.feedback}</p>
                <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground">
                  {practiceFeedback(session).map((feedback) => (
                    <li key={feedback}>{feedback}</li>
                  ))}
                </ul>
                <p className="mt-3 text-sm">
                  Next practice: {session.nextPractice}
                </p>
              </details>
            ))}
          </section>
          <section
            id="debrief"
            className="scroll-mt-16 rounded-lg border bg-card p-5"
          >
            <h2 className="text-xl font-semibold">Post-round debrief</h2>
            <p className="my-4 text-sm leading-6 text-muted-foreground">
              Private reflections stay separate from verified career facts.
              Saving completes the round and updates the next action for an
              active opportunity; review its pipeline stage separately.
            </p>
            <ActionForm
              action={saveDebriefAction.bind(null, id)}
              label="Save debrief"
            >
              {[
                { name: "actualQuestions", label: "Questions actually asked" },
                { name: "wentWell", label: "What went well?" },
                { name: "answerGaps", label: "Gaps and lessons" },
                { name: "thankYouDraft", label: "Private thank-you draft" },
                { name: "nextAction", label: "Next action" },
              ].map((field) => (
                <div key={field.name}>
                  <label htmlFor={field.name} className="text-sm font-medium">
                    {field.label}
                  </label>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    defaultValue={
                      plan?.[
                        field.name as
                          | "actualQuestions"
                          | "wentWell"
                          | "answerGaps"
                          | "thankYouDraft"
                          | "nextAction"
                      ] ?? ""
                    }
                    className="mt-2"
                    required={field.name === "nextAction"}
                  />
                </div>
              ))}
              <div>
                <label
                  htmlFor="nextActionDueAt"
                  className="text-sm font-medium"
                >
                  Next action due (UTC)
                </label>
                <Input
                  id="nextActionDueAt"
                  name="nextActionDueAt"
                  type="date"
                  className="mt-2"
                />
              </div>
            </ActionForm>
          </section>
        </div>
        <aside className="space-y-6">
          <section
            id="cheat-sheet"
            className="scroll-mt-16 rounded-lg border bg-card p-5"
          >
            <h2 className="text-lg font-semibold">Before you join</h2>
            <dl className="mt-4 space-y-4 text-sm">
              {[
                { label: "People", value: plan?.interviewers },
                { label: "Objectives", value: plan?.objectives },
                { label: "Logistics & commitments", value: plan?.commitments },
                { label: "Study plan", value: plan?.studyPlan || `Suggested:\n${guide.steps.join("\n")}` },
                {
                  label: "Questions to ask",
                  value: plan?.questionsForInterviewer || `Suggested:\n${guide.questions.join("\n")}`,
                },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="font-medium">{item.label}</dt>
                  <dd className="mt-1 whitespace-pre-wrap leading-6 text-muted-foreground">
                    {item.value || "Not recorded yet."}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Suggested preparation: review the original role, rehearse two
              verified examples, and choose two questions that clarify the
              team’s needs.
            </p>
          </section>
          <details className="rounded-lg border bg-card p-5">
            <summary className="cursor-pointer font-semibold">
              Edit round & preparation plan
            </summary>
            <div className="mt-5">
              <ActionForm action={saveRoundAction.bind(null, id)}>
                <PlanFields round={round} plan={plan} />
              </ActionForm>
            </div>
          </details>
        </aside>
      </div>
    </div>
  );
}
