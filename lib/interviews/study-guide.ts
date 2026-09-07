import type { interviewKinds } from "./preparation";

export function buildStudyGuide(kind: typeof interviewKinds[number], skills: string[]) {
  const focus = skills.length ? skills.slice(0, 3).join(", ") : "the role’s core responsibilities";
  const guidance = {
    recruiter: { steps: ["Review the role, your motivation, and practical constraints.", "Rehearse a concise career introduction with one verified example."], questions: ["What does the rest of the interview process involve?", "Which responsibilities are most important in this hire?"] },
    behavioral: { steps: ["Choose verified examples of conflict, learning, and ownership.", "Rehearse each example as situation, personal action, result, and reflection."], questions: ["How does the team handle disagreement?", "What behaviors help someone succeed here?"] },
    technical: { steps: [`Review the trade-offs and limitations of ${focus}.`, "Walk through one system you built; explain alternatives, failure modes, and testing.", "Practice a question with no matched evidence and identify what you still need to learn."], questions: ["Which technical constraints most affect the team’s decisions?", "How do you balance delivery, reliability, and maintenance?"] },
    hiring_manager: { steps: ["Map two verified accomplishments to the role’s responsibilities.", "Prepare examples of prioritization, ownership, and working with stakeholders."], questions: ["What would meaningful progress look like in the first three months?", "What is the team’s most important unsolved problem?"] },
    panel: { steps: ["Review each interviewer’s recorded role and choose relevant examples.", "Practice explaining one decision to both technical and non-technical audiences."], questions: ["How do your functions work together on difficult decisions?", "Where would this role have the most cross-team impact?"] },
    other: { steps: ["Confirm the round’s format and objectives.", "Review the original role and rehearse two verified examples."], questions: ["What would you most like to learn about my experience today?", "What should I understand about the team’s current priorities?"] },
  };
  return guidance[kind];
}
