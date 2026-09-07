export type TransitionContext = {
  destination: { category: string; isTerminal: boolean };
  nextAction: string | null;
  waiting: boolean;
  hasSubmission: boolean;
  submissionWaiverReason: string | null;
};

export function getStageTransitionError(context: TransitionContext) {
  if (!context.destination.isTerminal && !context.nextAction && !context.waiting) {
    return "Add a next action or mark this application as waiting before moving it.";
  }
  if (context.destination.category === "applied" && !context.hasSubmission && !context.submissionWaiverReason) {
    return "Record a submission snapshot or explain why you are moving to Applied without one.";
  }
  return null;
}
