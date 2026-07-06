"use server";

import { auth } from "@/lib/auth/server";
import { isAdminSession } from "@/lib/admin";
import { recordAuditEvent } from "@/lib/audit";
import { listQuestionsForSurvey, registerEvidence } from "@/lib/questions";
import { runLoggedAction } from "@/lib/observability";
import { getSurveyBySlug, getSurveyForAdmin } from "@/lib/surveys";
import { portalCopy } from "@/lib/portal-copy";
import { parseSchema } from "@/lib/schemas/common";
import { registerEvidenceSchema } from "@/lib/schemas/declarations";

const POLICY_FAILURES = new Set(["size", "mime", "extension"]);

export async function registerEvidenceAction(formData: FormData) {
  return runLoggedAction("registerEvidenceAction", undefined, async () => {
    const parsed = parseSchema(registerEvidenceSchema, {
      surveyId: String(formData.get("surveyId") ?? "").trim(),
      slug: String(formData.get("slug") ?? "").trim(),
      questionId: String(formData.get("questionId") ?? "").trim(),
      fileName: String(formData.get("fileName") ?? "").trim(),
      mimeType: String(formData.get("mimeType") ?? "").trim(),
      sizeBytes: formData.get("sizeBytes") ?? 0,
    });

    if (!parsed.success) {
      return {
        error: POLICY_FAILURES.has(parsed.error)
          ? portalCopy.declarationForm.fileInvalid
          : portalCopy.declarationForm.fileRequired,
      };
    }

    const { surveyId, slug, questionId, fileName, mimeType, sizeBytes } =
      parsed.data;

    const { data: session } = await auth.getSession();
    const isOrgUser = isAdminSession(session);

    if (!isOrgUser) {
      if (!slug) {
        return { error: portalCopy.errors.declarationNotFound };
      }

      const publicSurvey = await getSurveyBySlug(slug);
      if (!publicSurvey || publicSurvey.id !== surveyId) {
        return { error: portalCopy.errors.declarationNotFound };
      }
    } else {
      const survey = await getSurveyForAdmin(surveyId);
      if (!survey) {
        return { error: portalCopy.errors.declarationNotFound };
      }
    }

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
      actorId: session?.user?.id,
      eventType: "evidence.registered",
      resourceType: "evidence",
      resourceId: record.id,
      metadata: { surveyId, questionId },
    });

    return { success: true, evidenceId: record.id, fileName: record.fileName };
  });
}
