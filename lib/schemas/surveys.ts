import { z } from "zod";
import { SURVEY_EDITOR } from "@/lib/form-constraints";
import { parseQuestionsFromForm } from "@/lib/domain/questions";
import { metadataFromFormData } from "@/lib/domain/survey-package";
import { questionDraftSchema } from "@/lib/schemas/questions";
import { surveyAnswersSchema, slugSchema, uuidSchema } from "@/lib/schemas/common";

export { questionConfigSchema, questionDraftSchema } from "@/lib/schemas/questions";

export const surveyMetadataFormSchema = z.object({
  referenceNumber: z.string().trim().max(SURVEY_EDITOR.referenceMax).nullable(),
  caseNumber: z.string().trim().max(SURVEY_EDITOR.referenceMax).nullable(),
  effectiveDate: z.date().nullable(),
  submitBefore: z.date().nullable(),
  surveyorName: z.string().trim().max(SURVEY_EDITOR.partyNameMax).nullable(),
  surveyorOrg: z.string().trim().max(SURVEY_EDITOR.partyNameMax).nullable(),
  surveyeeIndividual: z.string().trim().max(SURVEY_EDITOR.partyNameMax).nullable(),
  surveyeeOrg: z.string().trim().max(SURVEY_EDITOR.partyNameMax).nullable(),
  purpose: z.string().trim().max(SURVEY_EDITOR.purposeMax).nullable(),
  categories: z
    .array(z.string().trim().min(1).max(SURVEY_EDITOR.categoryMax))
    .max(SURVEY_EDITOR.categoriesMax),
});

export const updateSurveySchema = z.object({
  id: uuidSchema,
  title: z.string().trim().min(1).max(SURVEY_EDITOR.titleMax),
  question: z.string().trim().max(SURVEY_EDITOR.introMax),
  questions: z.array(questionDraftSchema),
  metadata: surveyMetadataFormSchema.optional(),
});

export const deleteSurveySchema = z.object({
  id: uuidSchema,
});

export const submitSurveyResponseSchema = z.object({
  slug: slugSchema,
  answers: surveyAnswersSchema,
});

export const surveyIdParamSchema = uuidSchema;

/** Secure share token (`survey_invite_tokens.token`) — not a UUID. */
export const surveyInviteTokenParamSchema = z.string().trim().min(1).max(200);

/** Open share slug (`surveys.slug`). */
export const openSurveySlugParamSchema = slugSchema;

export function rawSurveyFormFromFormData(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    question: String(formData.get("description") ?? "").trim(),
    questions: parseQuestionsFromForm(formData),
    metadata: metadataFromFormData(formData),
  };
}

export function rawUpdateSurveyFromFormData(formData: FormData) {
  return {
    id: String(formData.get("id") ?? "").trim(),
    ...rawSurveyFormFromFormData(formData),
  };
}
