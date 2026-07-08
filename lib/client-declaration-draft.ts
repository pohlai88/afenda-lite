import { assignmentDeadlineExpired } from "@/lib/client-dashboard-metrics";
import {
  getClientAssignmentForUser,
  getClientProfile,
  isClientPortalAcknowledged,
  saveClientAssignmentDraft,
} from "@/lib/clients";
import { portalCopy } from "@/lib/portal-copy";
import type { SurveyAnswers } from "@/lib/question-models";
import { parseSchema } from "@/lib/schemas/common";
import { saveClientDeclarationDraftSchema } from "@/lib/schemas/client";

export type PersistClientDeclarationDraftInput = {
  assignmentId: string;
  answers: SurveyAnswers;
  stepIndex: number;
  userId: string;
  userEmail: string;
};

export type PersistClientDeclarationDraftResult =
  | { success: true; savedAt: string }
  | { success: false; error: string; status?: number };

export async function persistClientDeclarationDraft(
  input: PersistClientDeclarationDraftInput,
): Promise<PersistClientDeclarationDraftResult> {
  const parsed = parseSchema(saveClientDeclarationDraftSchema, {
    assignmentId: input.assignmentId,
    answers: input.answers,
    stepIndex: input.stepIndex,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: portalCopy.clientDashboard.assignmentNotFound,
      status: 400,
    };
  }

  const { assignmentId, answers, stepIndex } = parsed.data;

  const assignment = await getClientAssignmentForUser(
    assignmentId,
    input.userEmail,
  );

  if (!assignment || assignment.status === "submitted") {
    return {
      success: false,
      error: portalCopy.clientDashboard.assignmentNotFound,
      status: 404,
    };
  }

  const expiredReason = assignmentDeadlineExpired(assignment);
  if (expiredReason === "assignment") {
    return {
      success: false,
      error: portalCopy.clientDashboard.deadlineExpiredAssignment,
      status: 403,
    };
  }
  if (expiredReason === "declaration") {
    return {
      success: false,
      error: portalCopy.clientDashboard.deadlineExpiredDeclaration,
      status: 403,
    };
  }

  const profile = await getClientProfile(input.userId);
  if (!isClientPortalAcknowledged(profile)) {
    return {
      success: false,
      error: portalCopy.clientDashboard.acknowledgement.gateNotice,
      status: 403,
    };
  }

  const savedAt = await saveClientAssignmentDraft({
    assignmentId,
    clientEmail: input.userEmail,
    answers,
    stepIndex,
  });

  if (!savedAt) {
    return {
      success: false,
      error: portalCopy.declarationForm.wizard.draftSaveError,
      status: 500,
    };
  }

  return { success: true, savedAt: savedAt.toISOString() };
}
