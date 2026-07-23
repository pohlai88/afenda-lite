export type EffectiveLineageRecord = {
	id: string;
	effectiveFrom: string;
	effectiveTo: string | null;
};

export function selectEffectiveLineageRecord<
	TRecord extends EffectiveLineageRecord,
>(input: {
	assignedId: string;
	records: readonly TRecord[];
	asOf: string;
	getPredecessorId: (record: TRecord) => string | null;
	isEligible: (record: TRecord) => boolean;
}): TRecord | null {
	const byId = new Map(input.records.map((record) => [record.id, record]));

	function rootId(record: TRecord): string | null {
		let current = record;
		const visited = new Set<string>();
		while (true) {
			if (visited.has(current.id)) return null;
			visited.add(current.id);
			const predecessorId = input.getPredecessorId(current);
			if (predecessorId === null) return current.id;
			const predecessor = byId.get(predecessorId);
			if (predecessor === undefined) return null;
			current = predecessor;
		}
	}

	const assigned = byId.get(input.assignedId);
	if (assigned === undefined) return null;
	const assignedRootId = rootId(assigned);
	if (assignedRootId === null) return null;

	const lineage = input.records.filter(
		(record) => rootId(record) === assignedRootId,
	);
	const childCounts = new Map<string, number>();
	for (const record of lineage) {
		const predecessorId = input.getPredecessorId(record);
		if (predecessorId === null) continue;
		const childCount = (childCounts.get(predecessorId) ?? 0) + 1;
		if (childCount > 1) return null;
		childCounts.set(predecessorId, childCount);
	}

	const effective = lineage.filter(
		(record) =>
			input.isEligible(record) &&
			record.effectiveFrom <= input.asOf &&
			(record.effectiveTo === null || record.effectiveTo >= input.asOf),
	);
	return effective.length === 1 ? (effective[0] ?? null) : null;
}
