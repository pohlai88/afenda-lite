import { z } from "zod";

import {
	type CanonicalDate,
	canonicalDateSchema,
	compareCanonicalDates,
} from "./dates";

export const effectiveRangeSchema = z
	.object({
		from: canonicalDateSchema,
		to: canonicalDateSchema.nullable(),
	})
	.superRefine((range, context) => {
		if (range.to !== null && compareCanonicalDates(range.from, range.to) >= 0) {
			context.addIssue({
				code: "custom",
				path: ["to"],
				message: "Effective range end must be after its start",
			});
		}
	})
	.readonly();

export type EffectiveRange = z.infer<typeof effectiveRangeSchema>;

export function effectiveRangesOverlap(
	left: EffectiveRange,
	right: EffectiveRange,
): boolean {
	return (
		(right.to === null || compareCanonicalDates(left.from, right.to) < 0) &&
		(left.to === null || compareCanonicalDates(right.from, left.to) < 0)
	);
}

export function isDateInEffectiveRange(
	date: CanonicalDate,
	range: EffectiveRange,
): boolean {
	return (
		compareCanonicalDates(range.from, date) <= 0 &&
		(range.to === null || compareCanonicalDates(date, range.to) < 0)
	);
}

export function isOpenEffectiveRange(range: EffectiveRange): boolean {
	return range.to === null;
}

export function effectiveRangeEndsBeforeOrAt(
	range: EffectiveRange,
	date: CanonicalDate,
): boolean {
	return range.to !== null && compareCanonicalDates(range.to, date) <= 0;
}

export function effectiveRangeStartsAfter(
	range: EffectiveRange,
	date: CanonicalDate,
): boolean {
	return compareCanonicalDates(range.from, date) > 0;
}

export function effectiveRangeContainsRange(
	outer: EffectiveRange,
	inner: EffectiveRange,
): boolean {
	const startsInside = compareCanonicalDates(outer.from, inner.from) <= 0;
	const endsInside =
		outer.to === null ||
		(inner.to !== null && compareCanonicalDates(inner.to, outer.to) <= 0);

	return startsInside && endsInside;
}
