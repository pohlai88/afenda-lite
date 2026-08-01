export interface EffectiveDateRange {
	effectiveFrom: string;
	effectiveTo?: string | null | undefined;
}

export function isValidEffectiveDateRange(range: EffectiveDateRange): boolean {
	return (
		range.effectiveTo === null ||
		range.effectiveTo === undefined ||
		range.effectiveTo >= range.effectiveFrom
	);
}

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

export function effectiveRangeContains(
	container: EffectiveDateRange,
	candidate: EffectiveDateRange,
): boolean {
	if (candidate.effectiveFrom < container.effectiveFrom) {
		return false;
	}
	if (container.effectiveTo === null || container.effectiveTo === undefined) {
		return true;
	}
	return (
		candidate.effectiveTo !== null &&
		candidate.effectiveTo !== undefined &&
		candidate.effectiveTo <= container.effectiveTo
	);
}

export function previousIsoDate(date: string): string {
	const year = Number(date.slice(0, 4));
	const month = Number(date.slice(5, 7));
	const day = Number(date.slice(8, 10));
	const previous = new Date(Date.UTC(year, month - 1, day - 1));
	return previous.toISOString().slice(0, 10);
}

export function endSupersededEffectiveRange(
	currentEffectiveTo: string | null,
	successorEffectiveFrom: string,
): string {
	const successorBoundary = previousIsoDate(successorEffectiveFrom);
	if (currentEffectiveTo !== null && currentEffectiveTo < successorBoundary) {
		return currentEffectiveTo;
	}
	return successorBoundary;
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
