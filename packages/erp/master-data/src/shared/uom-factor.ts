import { z } from "zod";

/**
 * Positive non-zero integer factor as a decimal digit string (bigint-safe).
 * Rejects leading zeros (except "0" which is invalid), signs, and decimals.
 */
const POSITIVE_INTEGER_FACTOR = /^[1-9]\d{0,38}$/;

export function isPositiveIntegerFactor(value: string): boolean {
	return POSITIVE_INTEGER_FACTOR.test(value);
}

export const positiveIntegerFactorSchema = z
	.string()
	.trim()
	.min(1)
	.max(40)
	.refine(isPositiveIntegerFactor, {
		message: "Must be a positive non-zero integer digit string",
	});
