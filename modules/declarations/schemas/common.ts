import { z } from "zod";
import { SURVEY_TEXT_ANSWER_MAX } from "@/modules/platform/form-constraints";

export {
  emailSchema,
  parseSchema,
  passwordSchema,
  slugSchema,
  uuidSchema,
} from "@/modules/platform/schemas/common";

/** Declarations-only shared answer map (assignment / public submit). */
export const surveyAnswersSchema = z.record(
  z.string().uuid(),
  z.union([z.boolean(), z.string().max(SURVEY_TEXT_ANSWER_MAX)]),
);
