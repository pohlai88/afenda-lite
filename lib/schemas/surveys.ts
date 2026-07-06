import { z } from "zod";
import { parseQuestionsFromForm } from "@/lib/questions";
import { surveyAnswersSchema, uuidSchema } from "@/lib/schemas/common";

export const questionDraftSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  type: z.enum(["yes_no", "text", "file"]),
  required: z.boolean(),
});

export const surveyFormSchema = z.object({
  title: z.string().trim().min(1).max(500),
  question: z.string().trim().max(5000),
  questions: z.array(questionDraftSchema).min(1),
});

export const updateSurveySchema = z.object({
  id: uuidSchema,
  title: z.string().trim().min(1).max(500),
  question: z.string().trim().max(5000),
  questions: z.array(questionDraftSchema),
});

export const deleteSurveySchema = z.object({
  id: uuidSchema,
});

export const submitSurveyResponseSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  answers: surveyAnswersSchema,
});

export const surveyIdParamSchema = uuidSchema;

export function rawSurveyFormFromFormData(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    question: String(formData.get("description") ?? "").trim(),
    questions: parseQuestionsFromForm(formData),
  };
}

export function rawUpdateSurveyFromFormData(formData: FormData) {
  return {
    id: String(formData.get("id") ?? "").trim(),
    ...rawSurveyFormFromFormData(formData),
  };
}
