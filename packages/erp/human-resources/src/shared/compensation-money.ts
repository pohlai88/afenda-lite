import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	compareExactDecimals,
	EXACT_DECIMAL_ZERO,
	parseExactDecimal,
} from "./exact-decimal";

/**
 * Compare money amounts order: min <= mid <= max.
 * Returns success if order is valid, fail otherwise.
 * Amounts are decimal strings (non-negative).
 */
export function compareMoneyOrder(
	min: string,
	mid: string,
	max: string,
): Result<true> {
	const minVal = parseExactDecimal(min);
	const midVal = parseExactDecimal(mid);
	const maxVal = parseExactDecimal(max);

	if (minVal === null || midVal === null || maxVal === null) {
		return fail(
			"VALIDATION_ERROR",
			"Invalid money amounts.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}

	if (
		compareExactDecimals(minVal, EXACT_DECIMAL_ZERO) < 0 ||
		compareExactDecimals(midVal, EXACT_DECIMAL_ZERO) < 0 ||
		compareExactDecimals(maxVal, EXACT_DECIMAL_ZERO) < 0
	) {
		return fail(
			"VALIDATION_ERROR",
			"Money amounts must be non-negative.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}

	if (
		compareExactDecimals(minVal, midVal) > 0 ||
		compareExactDecimals(midVal, maxVal) > 0
	) {
		return fail(
			"VALIDATION_ERROR",
			"Salary band amounts must satisfy min <= mid <= max.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}

	return ok(true);
}

/**
 * Check if two date ranges [fromA, toA] and [fromB, toB] overlap.
 * Treats null as open-ended (infinity).
 * Ranges overlap if: fromA <= toB (or inf) AND fromB <= toA (or inf).
 */
export function rangesOverlap(
	fromA: string,
	toA: string | null,
	fromB: string,
	toB: string | null,
): boolean {
	// fromA <= toB (or inf)
	const aStartBeforeBEnd = toB === null || fromA <= toB;
	// fromB <= toA (or inf)
	const bStartBeforeAEnd = toA === null || fromB <= toA;

	return aStartBeforeBEnd && bStartBeforeAEnd;
}
