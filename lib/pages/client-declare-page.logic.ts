import { assignmentDeadlineExpired } from "@/lib/client-dashboard-metrics";
import type { ClientAssignment, ClientProfile } from "@/lib/domain/clients";
import { isClientPortalAcknowledged } from "@/lib/domain/clients";
import type { SurveyQuestion } from "@/lib/question-models";

/** ISO-8601 instant or null — safe across server/client boundaries. */
export type IsoDateString = string;

function toIsoDateString(value: Date | string | null | undefined): IsoDateString | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  return value.toISOString();
}

/**
 * Workspace props shape retained for rebuild.
 * All dates are ISO strings so the contract stays JSON-serializable.
 */
export type ClientDeclareWorkspaceProps =
  | { kind: "receipt"; title: string; confirmationCode: string }
  | { kind: "empty-questions"; title: string }
  | {
      kind: "expired";
      title: string;
      deadline: {
        status: "pending";
        dueDate: IsoDateString | null;
        submitBefore: IsoDateString | null;
      };
    }
  | {
      kind: "form";
      title: string;
      description?: string;
      deadline: {
        status: "pending";
        dueDate: IsoDateString | null;
        submitBefore: IsoDateString | null;
      };
      form: {
        assignmentId: string;
        surveyId: string;
        slug: string;
        questions: SurveyQuestion[];
        initialAnswers?: unknown;
        initialStepIndex?: number;
        initialEvidenceNames?: Record<string, string>;
        initialDraftSavedAt?: IsoDateString | null;
      };
    };

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
    dueDate: toIsoDateString(assignment.dueDate),
    submitBefore: toIsoDateString(assignment.submitBefore),
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
      initialDraftSavedAt: toIsoDateString(assignment.draftSavedAt),
    },
  };
}
