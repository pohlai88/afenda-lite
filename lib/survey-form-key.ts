import type { QuestionType } from "@/lib/questions";
import type { SurveyMetadata } from "@/lib/surveys";

/** Stable key so defaultValue fields remount when server survey data changes (e.g. after package ingest). */
export function buildSurveyFieldsKey(input: {
  title: string;
  description: string;
  metadata: Partial<SurveyMetadata>;
  questions: Array<{
    prompt: string;
    type: QuestionType;
    required: boolean;
    config?: unknown;
  }>;
}): string {
  const metadata = input.metadata;

  return [
    input.title,
    input.description,
    metadata.referenceNumber ?? "",
    metadata.caseNumber ?? "",
    metadata.effectiveDate?.toISOString() ?? "",
    metadata.submitBefore?.toISOString() ?? "",
    metadata.surveyorName ?? "",
    metadata.surveyorOrg ?? "",
    metadata.surveyeeIndividual ?? "",
    metadata.surveyeeOrg ?? "",
    metadata.purpose ?? "",
    (metadata.categories ?? []).join("\x1e"),
    JSON.stringify(
      input.questions.map((question) => ({
        prompt: question.prompt,
        type: question.type,
        required: question.required,
        config: question.config ?? {},
      })),
    ),
  ].join("\x1f");
}
