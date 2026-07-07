"use server";

import { isAdminSession } from "@/lib/admin";
import { recordAuditEvent } from "@/lib/audit";
import { auth } from "@/lib/auth/server";
import { toClientAuthenticatedSession } from "@/lib/client-session";
import { listClientAssignments } from "@/lib/clients";
import { isEvidencePolicyFailureReason } from "@/lib/evidence-policy";
import { listQuestionsForSurvey, registerEvidence } from "@/lib/questions";
import { runLoggedAction } from "@/lib/observability";
import { portalCopy } from "@/lib/portal-copy";
import { parseSchema } from "@/lib/schemas/common";
import { registerEvidenceSchema } from "@/lib/schemas/declarations";
import { getSurveyBySlug, getSurveyForAdmin } from "@/lib/surveys";
import { formString } from "@/lib/server-actions/form-data";

type EvidenceAccess = {
  actorId?: string;
};

function mapRegisterEvidenceParseError(error: string) {
  return isEvidencePolicyFailureReason(error)
    ? portalCopy.declarationForm.fileInvalid
    : portalCopy.declarationForm.fileRequired;
}

function readRegisterEvidenceInput(formData: FormData) {
  return {
    surveyId: formString(formData, "surveyId"),
    slug: formString(formData, "slug"),
    questionId: formString(formData, "questionId"),
    fileName: formString(formData, "fileName"),
    mimeType: formString(formData, "mimeType"),
    sizeBytes: formData.get("sizeBytes") ?? 0,
  };
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
    readRegisterEvidenceInput(formData),
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
        return { error: portalCopy.declarationForm.fileInvalid };
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
