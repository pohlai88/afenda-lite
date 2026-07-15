import { uuidSchema } from "@/modules/platform/schemas/common";
import { z } from "@/modules/platform/schemas/openapi-zod";

/**
 * Declarations shared Zod — survey answer map + Platform re-exports (API-004).
 */

export {
	emailSchema,
	parseSchema,
	uuidSchema,
} from "@/modules/platform/schemas/common";

export const surveyAnswersSchema = z.record(
	uuidSchema,
	z.union([z.boolean(), z.string().max(10_000)]),
);

export type SurveyAnswers = z.infer<typeof surveyAnswersSchema>;
