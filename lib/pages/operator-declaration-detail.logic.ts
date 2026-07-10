import type { EvidenceRecord, SurveyQuestion } from "@/lib/domain/questions";
import type { SurveyResponse } from "@/lib/domain/surveys";

export function collectSubmissionFileEvidenceIds(
  responses: SurveyResponse[],
  questions: SurveyQuestion[],
) {
  const evidenceIds = new Set<string>();

  for (const response of responses) {
    if (!response.answers) continue;

    for (const question of questions) {
      if (question.type !== "file") continue;

      const value = response.answers[question.id];
      if (typeof value === "string" && value) {
        evidenceIds.add(value);
      }
    }
  }

  return [...evidenceIds];
}

export function mapOperatorDeclarationQuestionDrafts(
  questions: SurveyQuestion[],
) {
  return questions.map((question) => ({
    prompt: question.prompt,
    type: question.type,
    required: question.required,
    config: question.config,
  }));
}

export type OperatorDeclarationQuestionDraft = ReturnType<
  typeof mapOperatorDeclarationQuestionDrafts
>[number];

/** Index evidence rows for client-boundary props (plain object, not Map). */
export function indexEvidenceRecordsById(
  records: EvidenceRecord[],
): Record<string, EvidenceRecord> {
  return Object.fromEntries(records.map((record) => [record.id, record]));
}
