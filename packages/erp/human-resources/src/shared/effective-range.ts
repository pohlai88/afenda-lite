export type EffectiveRangeRecord = {
	id: string;
	effectiveFrom: string;
	effectiveTo: string | null;
};

/**
 * Selects the unique record effective on `asOf` from a non-lineage effective-dated set.
 * Returns null when zero or multiple records match (fail-closed).
 */
export function selectUniqueEffectiveRangeRecord<
	TRecord extends EffectiveRangeRecord,
>(input: {
	records: readonly TRecord[];
	asOf: string;
	isEligible?: (record: TRecord) => boolean;
}): TRecord | null {
	const eligible = input.isEligible ?? (() => true);
	const effective = input.records.filter(
		(record) =>
			eligible(record) &&
			record.effectiveFrom <= input.asOf &&
			(record.effectiveTo === null || record.effectiveTo >= input.asOf),
	);
	return effective.length === 1 ? (effective[0] ?? null) : null;
}
