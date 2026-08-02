import { errorResult, type Result } from "@afenda/errors";
import { z } from "zod";
import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";

export interface PerformanceRatingScale {
	codes: string[];
}

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
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	const codes = (value as { codes: unknown[] }).codes.filter(
		(c): c is string => typeof c === "string" && c.trim().length > 0,
	);
	if (codes.length === 0) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return errorResult.ok({ codes });
}

export function isRatingInScale(
	rating: string,
	scale: PerformanceRatingScale,
): boolean {
	return scale.codes.includes(rating);
}

export function assertRatingScaleUniqueCodes(
	scale: PerformanceRatingScale,
): Result<PerformanceRatingScale> {
	const seen = new Set<string>();
	for (const code of scale.codes) {
		const normalized = code.trim();
		if (seen.has(normalized)) {
			return errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "The submitted data is invalid",
				internalContext: humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_INVALID_INPUT,
				),
			});
		}
		seen.add(normalized);
	}
	return errorResult.ok({ codes: scale.codes.map((code) => code.trim()) });
}

export function validateRatingInScale(
	rating: string,
	scale: PerformanceRatingScale,
): Result<string> {
	if (!isRatingInScale(rating, scale)) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return errorResult.ok(rating);
}
