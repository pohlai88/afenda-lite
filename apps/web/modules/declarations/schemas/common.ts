import { uuidSchema } from "@/modules/platform/schemas/common";
import { z } from "@/modules/platform/schemas/openapi-zod";

/**
 * Declarations shared Zod — survey answer map (API-004).
 */

export const surveyAnswersSchema = z.record(
	uuidSchema,
	z.union([z.boolean(), z.string().max(10_000)]),
);

export type SurveyAnswers = z.infer<typeof surveyAnswersSchema>;
