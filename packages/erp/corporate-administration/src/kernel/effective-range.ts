import { z } from "zod";

import { type CanonicalDate, canonicalDateSchema } from "./dates";

export const effectiveRangeSchema = z
	.object({
		from: canonicalDateSchema,
		to: canonicalDateSchema.nullable(),
	})
	.superRefine((range, context) => {
		if (range.to !== null && range.from >= range.to) {
			context.addIssue({
				code: "custom",
				path: ["to"],
				message: "Effective range end must be after its start",
			});
		}
	});

export type EffectiveRange = z.infer<typeof effectiveRangeSchema>;

export function effectiveRangesOverlap(
	left: EffectiveRange,
	right: EffectiveRange,
): boolean {
	const leftStartsBeforeRightEnds = right.to === null || left.from < right.to;
	const rightStartsBeforeLeftEnds = left.to === null || right.from < left.to;
	return leftStartsBeforeRightEnds && rightStartsBeforeLeftEnds;
}

export function isDateInEffectiveRange(
	date: CanonicalDate,
	range: EffectiveRange,
): boolean {
	return range.from <= date && (range.to === null || date < range.to);
}
