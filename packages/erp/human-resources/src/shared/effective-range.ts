export type EffectiveRangeRecord = {
	id: string;
	effectiveFrom: string;
	effectiveTo: string | null;
};

export type EffectiveRangeFailureReason =
	| "DUPLICATE_ID"
	| "INVALID_RANGE"
	| "OVERLAP";

export type EffectiveRangeResolution<TRecord> =
	| { ok: true; record: TRecord | null }
	| { ok: false; reason: EffectiveRangeFailureReason };

type EffectiveRangeAccessors<TRecord> = {
	getEffectiveFrom: (record: TRecord) => string;
	getEffectiveTo: (record: TRecord) => string | null;
	getId: (record: TRecord) => string;
};

function resolveEffectiveRange<TRecord>(
	input: {
		records: readonly TRecord[];
		asOf: string;
		isEligible?: (record: TRecord) => boolean;
	} & EffectiveRangeAccessors<TRecord>,
): EffectiveRangeResolution<TRecord> {
	const eligible = input.isEligible ?? (() => true);
	const { getEffectiveFrom, getEffectiveTo, getId } = input;
	const records = input.records.filter(eligible);
	const ids = new Set<string>();
	for (const record of records) {
		const id = getId(record);
		if (ids.has(id)) {
			return { ok: false, reason: "DUPLICATE_ID" };
		}
		ids.add(id);
		const effectiveFrom = getEffectiveFrom(record);
		const effectiveTo = getEffectiveTo(record);
		if (effectiveTo !== null && effectiveTo < effectiveFrom) {
			return { ok: false, reason: "INVALID_RANGE" };
		}
	}

	const ordered = [...records].sort((left, right) =>
		getEffectiveFrom(left).localeCompare(getEffectiveFrom(right)),
	);
	for (let index = 1; index < ordered.length; index += 1) {
		const previous = ordered[index - 1];
		const current = ordered[index];
		if (previous === undefined || current === undefined) continue;
		const previousTo = getEffectiveTo(previous);
		if (previousTo === null || previousTo >= getEffectiveFrom(current)) {
			return { ok: false, reason: "OVERLAP" };
		}
	}

	const effective = records.filter((record) => {
		const effectiveTo = getEffectiveTo(record);
		if (getEffectiveFrom(record) > input.asOf) return false;
		if (effectiveTo === null) return true;
		return effectiveTo >= input.asOf;
	});
	return { ok: true, record: effective[0] ?? null };
}

/**
 * Resolves one canonical effective record and reports why malformed truth
 * failed closed.
 */
export function resolveUniqueEffectiveRangeRecord<
	TRecord extends EffectiveRangeRecord,
>(input: {
	records: readonly TRecord[];
	asOf: string;
	isEligible?: (record: TRecord) => boolean;
}): EffectiveRangeResolution<TRecord> {
	return resolveEffectiveRange({
		...input,
		getId: (record) => record.id,
		getEffectiveFrom: (record) => record.effectiveFrom,
		getEffectiveTo: (record) => record.effectiveTo,
	});
}

/** Resolves records whose canonical range fields have domain-specific names. */
export function resolveUniqueEffectiveRangeRecordBy<TRecord>(
	input: {
		records: readonly TRecord[];
		asOf: string;
		isEligible?: (record: TRecord) => boolean;
	} & EffectiveRangeAccessors<TRecord>,
): EffectiveRangeResolution<TRecord> {
	return resolveEffectiveRange(input);
}

/**
 * Compatibility selector for read paths whose public contract represents every
 * malformed or absent effective truth as `null`.
 */
export function selectUniqueEffectiveRangeRecord<
	TRecord extends EffectiveRangeRecord,
>(input: {
	records: readonly TRecord[];
	asOf: string;
	isEligible?: (record: TRecord) => boolean;
}): TRecord | null {
	const resolution = resolveUniqueEffectiveRangeRecord(input);
	return resolution.ok ? resolution.record : null;
}
