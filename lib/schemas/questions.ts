import { z } from "zod";
import { SURVEY_EDITOR } from "@/lib/form-constraints";

/** Shared question config — form editor, CDP package import, and `lib/questions.ts`. */
export const questionConfigSchema = z.object({
  helpText: z.string().trim().max(SURVEY_EDITOR.helpTextMax).optional(),
  placeholder: z.string().trim().max(SURVEY_EDITOR.placeholderMax).optional(),
  minLength: z.number().int().min(0).max(SURVEY_EDITOR.textBoundMax).optional(),
  maxLength: z.number().int().min(1).max(SURVEY_EDITOR.textBoundMax).optional(),
  defaultValue: z.union([z.string(), z.boolean()]).optional(),
});

export type QuestionConfig = z.infer<typeof questionConfigSchema>;

/** Operator survey editor + server action payloads. */
export const questionDraftSchema = z.object({
  prompt: z.string().trim().min(1).max(SURVEY_EDITOR.promptMax),
  type: z.enum(["yes_no", "text", "file"]),
  required: z.boolean(),
  config: questionConfigSchema.optional(),
});

/** CDP package import — omitted config becomes `{}`. */
export const cdpQuestionSchema = questionDraftSchema.extend({
  config: questionConfigSchema.optional().default({}),
});
