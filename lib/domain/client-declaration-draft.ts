import { assignmentDeadlineExpired } from "@/lib/client-dashboard-metrics";
import {
  getClientAssignmentForUser,
  getClientProfile,
  isClientPortalAcknowledged,
  saveClientAssignmentDraft,
} from "@/lib/domain/clients";
import { portalCopy } from "@/lib/copy/portal-copy";
import type { z } from "zod";
import type { saveClientDeclarationDraftSchema } from "@/lib/schemas/client";

export type SaveClientDeclarationDraftPayload = z.infer<
  typeof saveClientDeclarationDraftSchema
>;

export type PersistClientDeclarationDraftInput = SaveClientDeclarationDraftPayload & {
  userId: string;
  userEmail: string;
};

export type PersistClientDeclarationDraftResult =
  | { success: true; savedAt: string }
  | { success: false; error: string; status?: number };

/** Persists a draft after Zod validation at the action or API boundary. */
export async function persistClientDeclarationDraft(
  input: PersistClientDeclarationDraftInput,
): Promise<PersistClientDeclarationDraftResult> {
  const { assignmentId, answers, stepIndex, userId, userEmail } = input;

  const assignment = await getClientAssignmentForUser(assignmentId, userEmail);

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

  const profile = await getClientProfile(userId);
  if (!isClientPortalAcknowledged(profile)) {
    return {
      success: false,
      error: portalCopy.clientDashboard.acknowledgement.gateNotice,
      status: 403,
    };
  }

  const savedAt = await saveClientAssignmentDraft({
    assignmentId,
    clientEmail: userEmail,
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
