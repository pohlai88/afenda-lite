import type { ClientDeclareWorkspaceProps } from "@/components/client/client-declare-workspace";
import { assignmentDeadlineExpired } from "@/lib/client-dashboard-metrics";
import type { ClientAssignment, ClientProfile } from "@/lib/domain/clients";
import { isClientPortalAcknowledged } from "@/lib/domain/clients";
import type { SurveyQuestion } from "@/lib/question-models";

export type ClientDeclarePageGate =
  | "not-found"
  | "redirect-home"
  | "continue";

export function resolveClientDeclarePageGate(
  assignment: ClientAssignment | null,
  profile: ClientProfile | null,
): ClientDeclarePageGate {
  if (!assignment || !assignment.surveySlug) {
    return "not-found";
  }

  if (
    assignment.status !== "submitted" &&
    !isClientPortalAcknowledged(profile)
  ) {
    return "redirect-home";
  }

  return "continue";
}

export function resolveClientDeclareWorkspaceProps(input: {
  assignment: ClientAssignment & { surveySlug: string };
  questions: SurveyQuestion[];
  declarationEyebrow: string;
  initialEvidenceNames?: Record<string, string>;
}): ClientDeclareWorkspaceProps {
  const { assignment, questions, declarationEyebrow, initialEvidenceNames } =
    input;
  const title = assignment.surveyTitle ?? declarationEyebrow;
  const deadline = {
    status: "pending" as const,
    dueDate: assignment.dueDate,
    submitBefore: assignment.submitBefore,
  };
  const draftAnswers = assignment.draftAnswers ?? undefined;

  if (assignment.status === "submitted" && assignment.confirmationCode) {
    return {
      kind: "receipt",
      title,
      confirmationCode: assignment.confirmationCode,
    };
  }

  if (questions.length === 0) {
    return { kind: "empty-questions", title };
  }

  if (assignmentDeadlineExpired(assignment)) {
    return { kind: "expired", title, deadline };
  }

  return {
    kind: "form",
    title,
    description: assignment.surveyQuestion ?? undefined,
    deadline,
    form: {
      assignmentId: assignment.id,
      surveyId: assignment.surveyId,
      slug: assignment.surveySlug,
      questions,
      initialAnswers: draftAnswers,
      initialStepIndex: assignment.draftStepIndex ?? undefined,
      initialEvidenceNames,
      initialDraftSavedAt: assignment.draftSavedAt ?? undefined,
    },
  };
}
