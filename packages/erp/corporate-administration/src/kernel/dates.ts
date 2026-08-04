import { z } from "zod";

const CANONICAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const CANONICAL_INSTANT_PATTERN =
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function isValidCalendarDate(value: string): boolean {
	const match = CANONICAL_DATE_PATTERN.exec(value);

	if (!match) {
		return false;
	}

	const [, yearText, monthText, dayText] = match;

	const year = Number(yearText);
	const month = Number(monthText);
	const day = Number(dayText);

	if (year < 1) {
		return false;
	}

	const date = new Date(0);
	date.setUTCHours(0, 0, 0, 0);
	date.setUTCFullYear(year, month - 1, day);

	return (
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
	);
}

export const canonicalDateSchema = z
	.string()
	.regex(CANONICAL_DATE_PATTERN, "Expected a date in YYYY-MM-DD format")
	.refine(
		isValidCalendarDate,
		"Expected a valid YYYY-MM-DD calendar date with year 0001-9999",
	)
	.brand<"CanonicalDate">();

export type CanonicalDate = z.infer<typeof canonicalDateSchema>;

export const canonicalInstantSchema = z
	.string()
	.regex(
		CANONICAL_INSTANT_PATTERN,
		"Expected a canonical UTC instant with millisecond precision",
	)
	.refine((value) => {
		const instant = new Date(value);
		return (
			Number.isFinite(instant.getTime()) && instant.toISOString() === value
		);
	}, "Expected a valid canonical UTC instant")
	.brand<"CanonicalInstant">();

export type CanonicalInstant = z.infer<typeof canonicalInstantSchema>;

export function toCanonicalInstant(value: Date): CanonicalInstant {
	if (!Number.isFinite(value.getTime())) {
		throw new RangeError("Expected a valid instant");
	}
	return canonicalInstantSchema.parse(value.toISOString());
}

export function isCanonicalDate(value: string): value is CanonicalDate {
	return canonicalDateSchema.safeParse(value).success;
}

export function compareCanonicalDates(
	left: CanonicalDate,
	right: CanonicalDate,
): -1 | 0 | 1 {
	if (left === right) {
		return 0;
	}

	return left < right ? -1 : 1;
}
