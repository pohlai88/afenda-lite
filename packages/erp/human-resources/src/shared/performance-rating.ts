import { fail, ok, type Result } from "@afenda/errors/result";
import { z } from "zod";
import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../error-codes";

export type PerformanceRatingScale = {
	codes: string[];
};

export const performanceRatingScaleSchema = z
	.object({
		codes: z.array(z.string().trim().min(1)).min(1),
	})
	.strict();

export function parseRatingScale(
	value: unknown,
): Result<PerformanceRatingScale> {
	if (
		typeof value !== "object" ||
		value === null ||
		!("codes" in value) ||
		!Array.isArray((value as { codes: unknown }).codes)
	) {
		return fail(
			"VALIDATION_ERROR",
			"Rating scale must include a codes array.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	const codes = (value as { codes: unknown[] }).codes.filter(
		(c): c is string => typeof c === "string" && c.trim().length > 0,
	);
	if (codes.length === 0) {
		return fail(
			"VALIDATION_ERROR",
			"Rating scale must include at least one code.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok({ codes });
}

export function isRatingInScale(
	rating: string,
	scale: PerformanceRatingScale,
): boolean {
	return scale.codes.includes(rating);
}

export function validateRatingInScale(
	rating: string,
	scale: PerformanceRatingScale,
): Result<string> {
	if (!isRatingInScale(rating, scale)) {
		return fail(
			"VALIDATION_ERROR",
			"Rating is not in the cycle approved scale.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok(rating);
}
