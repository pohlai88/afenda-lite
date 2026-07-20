export type ValidityRange = {
	validFrom: Date | null;
	validTo: Date | null;
};

/** Reject when both ends are set and exclusive end is not after start. */
export function isInvalidValidityRange(range: ValidityRange): boolean {
	if (range.validFrom === null || range.validTo === null) {
		return false;
	}
	return range.validTo.getTime() <= range.validFrom.getTime();
}

/**
 * Half-open ranges `[validFrom, validTo)` with null `validTo` = open-ended.
 * Null `validFrom` is treated as unbounded start.
 */
export function validityRangesOverlap(
	a: ValidityRange,
	b: ValidityRange,
): boolean {
	const aFrom = a.validFrom?.getTime() ?? Number.NEGATIVE_INFINITY;
	const aTo = a.validTo?.getTime() ?? Number.POSITIVE_INFINITY;
	const bFrom = b.validFrom?.getTime() ?? Number.NEGATIVE_INFINITY;
	const bTo = b.validTo?.getTime() ?? Number.POSITIVE_INFINITY;
	return aFrom < bTo && bFrom < aTo;
}
