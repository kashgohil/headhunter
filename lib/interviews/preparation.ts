export const interviewKinds = [
  "recruiter",
  "behavioral",
  "technical",
  "hiring_manager",
  "panel",
  "other",
] as const;
export type Evidence = {
  id: string;
  label: string;
  text: string;
  href: string;
  verificationState: string;
  usable: boolean;
};
const words = (value: string) =>
  new Set(value.toLowerCase().match(/[a-z0-9+#]{3,}/g) ?? []);

export function prepareQuestions(
  kind: (typeof interviewKinds)[number],
  job: { title: string; skills: string[] },
  evidence: Evidence[],
) {
  const common = [
    "Tell me about a project where your personal contribution changed the outcome.",
    "Describe a difficult trade-off and how you decided what to do.",
  ];
  const byKind = {
    recruiter: [
      "Why are you interested in this role, and what are you looking for next?",
      "Which experience is most relevant to this opportunity?",
    ],
    behavioral: [
      "Tell me about a disagreement with a teammate and how you resolved it.",
      "Describe a mistake, its impact, and what you changed afterward.",
    ],
    technical: [
      "Walk through the design of a system you built and the trade-offs you made.",
      ...job.skills
        .slice(0, 3)
        .map(
          (skill) =>
            `How have you used ${skill}, and what limitations or trade-offs did you encounter?`,
        ),
    ],
    hiring_manager: [
      "How would you identify the team's most important problems in your first month?",
      "How do you prioritize when several stakeholders need your help?",
    ],
    panel: [
      "How do you communicate technical decisions to different audiences?",
      "Describe a cross-functional project and how you handled competing priorities.",
    ],
    other: ["What would you like us to know about your relevant experience?"],
  };
  const usable = evidence.filter(
    (item) => item.verificationState === "verified" && item.usable,
  );
  return [...byKind[kind], ...common].map((question) => {
    const terms = words(`${question} ${job.title}`);
    const matches = usable
      .map((item) => ({
        ...item,
        overlap: [...words(`${item.label} ${item.text}`)].filter((word) =>
          terms.has(word),
        ).length,
      }))
      .filter((item) => item.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap || a.id.localeCompare(b.id))
      .slice(0, 2);
    return { question, matches };
  });
}

export function practiceFeedback(scores: {
  clarity: number;
  relevance: number;
  evidence: number;
}) {
  const suggestions = [];
  if (scores.clarity <= 3)
    suggestions.push(
      "Lead with the result, then explain your personal action in a short sequence.",
    );
  if (scores.relevance <= 3)
    suggestions.push(
      "Connect the example to one responsibility in the job description.",
    );
  if (scores.evidence <= 3)
    suggestions.push(
      "Use a verified example; remove numbers or claims you cannot substantiate.",
    );
  return suggestions.length
    ? suggestions
    : [
        "Repeat the answer aloud and check that the detail stays concise and grounded.",
      ];
}
