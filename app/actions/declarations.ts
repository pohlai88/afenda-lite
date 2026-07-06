"use server";

import {
  getEvidenceRecord,
  registerEvidence,
} from "@/lib/questions";
import { getSurveyForAdmin } from "@/lib/surveys";
import { portalCopy } from "@/lib/portal-copy";

export async function registerEvidenceAction(formData: FormData) {
  const surveyId = String(formData.get("surveyId") ?? "").trim();
  const questionId = String(formData.get("questionId") ?? "").trim();
  const fileName = String(formData.get("fileName") ?? "").trim();
  const mimeType = String(formData.get("mimeType") ?? "").trim();
  const sizeBytes = Number(formData.get("sizeBytes") ?? 0);

  if (!surveyId || !questionId || !fileName) {
    return { error: portalCopy.declarationForm.fileRequired };
  }

  const survey = await getSurveyForAdmin(surveyId);
  if (!survey) {
    return { error: "Declaration not found." };
  }

  const record = await registerEvidence({
    surveyId,
    questionId,
    fileName,
    mimeType,
    sizeBytes,
  });

  return { success: true, evidenceId: record.id, fileName: record.fileName };
}

export async function getEvidenceNameAction(evidenceId: string, surveyId: string) {
  const record = await getEvidenceRecord(evidenceId, surveyId);
  return record?.fileName ?? evidenceId;
}
