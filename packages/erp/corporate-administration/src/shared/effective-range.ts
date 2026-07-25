// Authority §6.3: statutory effective ranges are inclusive start, exclusive end.
// `effectiveTo` is the first date the row is no longer effective.

export type EffectiveRange = {
	readonly effectiveFrom: string;
	readonly effectiveTo: string | null;
};

export const OPEN_EFFECTIVE_TO_SENTINEL = "9999-12-31";

export const EFFECTIVE_RANGE_INVALID_MESSAGE =
	"Effective end date must be later than start date";

export function isInvalidEffectiveDateRange(range: EffectiveRange): boolean {
	return (
		range.effectiveTo !== null && range.effectiveTo <= range.effectiveFrom
	);
}

export function isEffectiveOnDate(
	range: EffectiveRange,
	asOf: string,
): boolean {
	return (
		range.effectiveFrom <= asOf &&
		(range.effectiveTo === null || range.effectiveTo > asOf)
	);
}

export function effectiveRangesOverlap(
	left: EffectiveRange,
	right: EffectiveRange,
): boolean {
	const leftEnd = left.effectiveTo ?? OPEN_EFFECTIVE_TO_SENTINEL;
	const rightEnd = right.effectiveTo ?? OPEN_EFFECTIVE_TO_SENTINEL;

	return left.effectiveFrom < rightEnd && right.effectiveFrom < leftEnd;
}

export function assertValidEffectiveDateRange(range: EffectiveRange): void {
	if (isInvalidEffectiveDateRange(range)) {
		throw new InvalidEffectiveDateRangeError(
			range.effectiveFrom,
			range.effectiveTo as string,
		);
	}
}

export class InvalidEffectiveDateRangeError extends Error {
	readonly effectiveFrom: string;
	readonly effectiveTo: string;

	constructor(effectiveFrom: string, effectiveTo: string) {
		super(
			`effectiveTo must be later than effectiveFrom: ${effectiveFrom} -> ${effectiveTo}`,
		);

		this.name = "InvalidEffectiveDateRangeError";
		this.effectiveFrom = effectiveFrom;
		this.effectiveTo = effectiveTo;
	}
}

export function appointmentEffectiveRange(input: {
	appointedDate: string;
	resignedDate: string | null;
}): EffectiveRange {
	return {
		effectiveFrom: input.appointedDate,
		effectiveTo: input.resignedDate,
	};
}

export function filterEffectiveAsOf<T extends EffectiveRange>(
	rows: T[],
	asOf: string,
): T[] {
	return rows.filter((row) => isEffectiveOnDate(row, asOf));
}

export function hasOverlappingRange<T extends EffectiveRange>(
	rows: T[],
	candidate: EffectiveRange,
): boolean {
	return rows.some((row) => effectiveRangesOverlap(row, candidate));
}
