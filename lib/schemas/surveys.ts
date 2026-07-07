import { z } from "zod";
import { parseQuestionsFromForm } from "@/lib/questions";
import { metadataFromFormData } from "@/lib/survey-package";
import { surveyAnswersSchema, slugSchema, uuidSchema } from "@/lib/schemas/common";

export const questionConfigFormSchema = z.object({
  helpText: z.string().trim().max(2000).optional(),
  placeholder: z.string().trim().max(500).optional(),
  minLength: z.number().int().min(0).max(10000).optional(),
  maxLength: z.number().int().min(1).max(10000).optional(),
  defaultValue: z.union([z.string(), z.boolean()]).optional(),
});

export const questionDraftSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  type: z.enum(["yes_no", "text", "file"]),
  required: z.boolean(),
  config: questionConfigFormSchema.optional(),
});

export const surveyMetadataFormSchema = z.object({
  referenceNumber: z.string().trim().max(100).nullable(),
  caseNumber: z.string().trim().max(100).nullable(),
  effectiveDate: z.date().nullable(),
  submitBefore: z.date().nullable(),
  surveyorName: z.string().trim().max(500).nullable(),
  surveyorOrg: z.string().trim().max(500).nullable(),
  surveyeeIndividual: z.string().trim().max(500).nullable(),
  surveyeeOrg: z.string().trim().max(500).nullable(),
  purpose: z.string().trim().max(5000).nullable(),
  categories: z.array(z.string().trim().min(1).max(100)).max(20),
});

export const surveyFormSchema = z.object({
  title: z.string().trim().min(1).max(500),
  question: z.string().trim().max(5000),
  questions: z.array(questionDraftSchema),
  metadata: surveyMetadataFormSchema.optional(),
});

export const updateSurveySchema = z.object({
  id: uuidSchema,
  title: z.string().trim().min(1).max(500),
  question: z.string().trim().max(5000),
  questions: z.array(questionDraftSchema),
  metadata: surveyMetadataFormSchema.optional(),
});

export const deleteSurveySchema = z.object({
  id: uuidSchema,
});

export const submitSurveyResponseSchema = z.object({
  slug: z.string().trim().min(1).max(200),
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
