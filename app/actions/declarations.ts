"use server";

import { isAdminSession } from "@/modules/identity/admin";
import { recordAuditEvent } from "@/modules/platform/audit";
import { auth } from "@/modules/identity/auth/server";
import { toClientAuthenticatedSession } from "@/modules/identity/client-session";
import { listClientAssignments } from "@/modules/declarations/domain/clients";
import { isEvidencePolicyFailureReason } from "@/modules/declarations/domain/evidence-policy";
import { listQuestionsForSurvey, registerEvidence } from "@/modules/declarations/domain/questions";
import { runLoggedAction } from "@/modules/platform/observability";
import { portalCopy } from "@/modules/platform/copy/portal-copy";
import { parseSchema } from "@/modules/platform/schemas/common";
import { registerEvidenceSchema } from "@/modules/declarations/schemas/declarations";
import { getSurveyBySlug, getSurveyForAdmin } from "@/modules/declarations/domain/surveys";
import { readRegisterEvidenceFromFormData } from "@/modules/declarations/server-actions/register-evidence-form";

type EvidenceAccess = {
  actorId?: string;
};

function mapRegisterEvidenceParseError(error: string) {
  if (isEvidencePolicyFailureReason(error)) {
    return portalCopy.declarationForm.filePolicyError(error);
  }
  return portalCopy.declarationForm.fileRequired;
}

async function resolveEvidenceAccess(input: {
  surveyId: string;
  slug: string;
}): Promise<{ error: string } | EvidenceAccess> {
  const { data: session } = await auth.getSession();

  if (isAdminSession(session)) {
    const survey = await getSurveyForAdmin(input.surveyId);
    if (!survey) {
      return { error: portalCopy.errors.declarationNotFound };
    }

    return { actorId: session?.user?.id };
  }

  const clientSession = toClientAuthenticatedSession(session);
  if (clientSession) {
    const assignments = await listClientAssignments(clientSession.user.email);
    const hasPendingAssignment = assignments.some(
      (assignment) =>
        assignment.surveyId === input.surveyId &&
        assignment.surveySlug === input.slug &&
        assignment.status !== "submitted",
    );

    if (!hasPendingAssignment) {
      return { error: portalCopy.clientDashboard.assignmentNotFound };
    }

    return { actorId: clientSession.user.id };
  }

  if (!input.slug) {
    return { error: portalCopy.errors.declarationNotFound };
  }

  const publicSurvey = await getSurveyBySlug(input.slug);
  if (!publicSurvey || publicSurvey.id !== input.surveyId) {
    return { error: portalCopy.errors.declarationNotFound };
  }

  return {};
}

export async function registerEvidenceAction(formData: FormData) {
  const parsed = parseSchema(
    registerEvidenceSchema,
    readRegisterEvidenceFromFormData(formData),
  );

  if (!parsed.success) {
    return { error: mapRegisterEvidenceParseError(parsed.error) };
  }

  const { surveyId, slug, questionId, fileName, mimeType, sizeBytes } =
    parsed.data;

  const access = await resolveEvidenceAccess({ surveyId, slug });
  if ("error" in access) {
    return { error: access.error };
  }

  return runLoggedAction(
    "registerEvidenceAction",
    access.actorId,
    async () => {
      const questions = await listQuestionsForSurvey(surveyId);
      const question = questions.find((item) => item.id === questionId);
      if (!question || question.type !== "file") {
        return { error: portalCopy.declarationForm.fileQuestionInvalid };
      }

      const record = await registerEvidence({
        surveyId,
        questionId,
        fileName,
        mimeType,
        sizeBytes,
      });

      await recordAuditEvent({
        actorId: access.actorId,
        eventType: "evidence.registered",
        resourceType: "evidence",
        resourceId: record.id,
        metadata: { surveyId, questionId, slug: slug || null },
      });

      return {
        success: true,
        evidenceId: record.id,
        fileName: record.fileName,
      };
    },
  );
}
