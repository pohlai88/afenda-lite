export function effectiveRangesOverlap(
	aFrom: string,
	aTo: string | null,
	bFrom: string,
	bTo: string | null,
): boolean {
	const aEnd = aTo ?? "9999-12-31";
	const bEnd = bTo ?? "9999-12-31";
	return aFrom <= bEnd && bFrom <= aEnd;
}

export function isEffectiveOnDate(
	effectiveFrom: string,
	effectiveTo: string | null,
	date: string,
): boolean {
	if (date < effectiveFrom) {
		return false;
	}
	return effectiveTo === null || date <= effectiveTo;
}
