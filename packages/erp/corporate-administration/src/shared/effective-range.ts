export type EffectiveRange = {
	effectiveFrom: string;
	effectiveTo: string | null;
};

export function isEffectiveAsOf(row: EffectiveRange, asOf: string): boolean {
	return (
		row.effectiveFrom <= asOf &&
		(row.effectiveTo === null || row.effectiveTo >= asOf)
	);
}

export function filterEffectiveAsOf<T extends EffectiveRange>(
	rows: T[],
	asOf: string,
): T[] {
	return rows.filter((row) => isEffectiveAsOf(row, asOf));
}

export function rangesOverlap(a: EffectiveRange, b: EffectiveRange): boolean {
	const aEnd = a.effectiveTo ?? "9999-12-31";
	const bEnd = b.effectiveTo ?? "9999-12-31";
	return a.effectiveFrom <= bEnd && b.effectiveFrom <= aEnd;
}

export function hasOverlappingRange<T extends EffectiveRange>(
	rows: T[],
	candidate: EffectiveRange,
): boolean {
	return rows.some((row) => rangesOverlap(row, candidate));
}
