import { z } from "zod";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isLeapYear(year: number): boolean {
	return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
	if (month === 2) return isLeapYear(year) ? 29 : 28;
	if ([4, 6, 9, 11].includes(month)) return 30;
	return 31;
}

export function isCanonicalDate(value: string): boolean {
	const match = DATE_PATTERN.exec(value);
	if (!match) return false;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	return (
		year >= 1 &&
		month >= 1 &&
		month <= 12 &&
		day >= 1 &&
		day <= daysInMonth(year, month)
	);
}

export const canonicalDateSchema = z
	.string()
	.refine(isCanonicalDate, "Expected a real calendar date in YYYY-MM-DD format")
	.brand<"CanonicalDate">();

export type CanonicalDate = z.infer<typeof canonicalDateSchema>;

export function compareCanonicalDates(
	left: CanonicalDate,
	right: CanonicalDate,
): -1 | 0 | 1 {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}
