import { previousIsoDate } from "./effective-dates";

export type EffectiveLineageRecord = {
	id: string;
	effectiveFrom: string;
	effectiveTo: string | null;
};

export type EffectiveLineageFailureReason =
	| "AMBIGUOUS"
	| "BRANCH"
	| "CYCLE"
	| "DUPLICATE_ID"
	| "GAP"
	| "INVALID_RANGE"
	| "MISSING_ASSIGNED"
	| "MISSING_PREDECESSOR"
	| "OVERLAP";

export type EffectiveLineageResolution<TRecord> =
	| { ok: true; record: TRecord | null }
	| { ok: false; reason: EffectiveLineageFailureReason };

export function resolveEffectiveLineageRecord<
	TRecord extends EffectiveLineageRecord,
>(input: {
	assignedId: string;
	records: readonly TRecord[];
	asOf: string;
	getPredecessorId: (record: TRecord) => string | null;
	isEligible: (record: TRecord) => boolean;
}): EffectiveLineageResolution<TRecord> {
	const byId = new Map<string, TRecord>();
	for (const record of input.records) {
		if (byId.has(record.id)) {
			return { ok: false, reason: "DUPLICATE_ID" };
		}
		if (
			record.effectiveTo !== null &&
			record.effectiveTo < record.effectiveFrom
		) {
			return { ok: false, reason: "INVALID_RANGE" };
		}
		byId.set(record.id, record);
	}

	function rootId(
		record: TRecord,
	):
		| { ok: true; id: string }
		| { ok: false; reason: EffectiveLineageFailureReason } {
		let current = record;
		const visited = new Set<string>();
		while (true) {
			if (visited.has(current.id)) {
				return { ok: false, reason: "CYCLE" };
			}
			visited.add(current.id);
			const predecessorId = input.getPredecessorId(current);
			if (predecessorId === null) return { ok: true, id: current.id };
			const predecessor = byId.get(predecessorId);
			if (predecessor === undefined) {
				return { ok: false, reason: "MISSING_PREDECESSOR" };
			}
			current = predecessor;
		}
	}

	const assigned = byId.get(input.assignedId);
	if (assigned === undefined) {
		return { ok: false, reason: "MISSING_ASSIGNED" };
	}
	const assignedRoot = rootId(assigned);
	if (!assignedRoot.ok) return assignedRoot;

	const lineage: TRecord[] = [];
	for (const record of input.records) {
		const root = rootId(record);
		if (!root.ok) {
			if (record.id === assigned.id) return root;
			continue;
		}
		if (root.id === assignedRoot.id) lineage.push(record);
	}
	const childCounts = new Map<string, number>();
	const childByPredecessor = new Map<string, TRecord>();
	for (const record of lineage) {
		const predecessorId = input.getPredecessorId(record);
		if (predecessorId === null) continue;
		const childCount = (childCounts.get(predecessorId) ?? 0) + 1;
		if (childCount > 1) {
			return { ok: false, reason: "BRANCH" };
		}
		childCounts.set(predecessorId, childCount);
		childByPredecessor.set(predecessorId, record);
	}

	const root = lineage.find(
		(record) => input.getPredecessorId(record) === null,
	);
	if (root === undefined) {
		return { ok: false, reason: "CYCLE" };
	}
	let predecessor = root;
	let visitedCount = 1;
	while (true) {
		const successor = childByPredecessor.get(predecessor.id);
		if (successor === undefined) break;
		if (predecessor.effectiveTo === null) {
			return { ok: false, reason: "OVERLAP" };
		}
		const expectedPredecessorEnd = previousIsoDate(successor.effectiveFrom);
		if (predecessor.effectiveTo > expectedPredecessorEnd) {
			return { ok: false, reason: "OVERLAP" };
		}
		if (predecessor.effectiveTo < expectedPredecessorEnd) {
			return { ok: false, reason: "GAP" };
		}
		predecessor = successor;
		visitedCount += 1;
	}
	if (visitedCount !== lineage.length) {
		return { ok: false, reason: "CYCLE" };
	}

	const effective = lineage.filter(
		(record) =>
			input.isEligible(record) &&
			record.effectiveFrom <= input.asOf &&
			(record.effectiveTo === null || record.effectiveTo >= input.asOf),
	);
	if (effective.length > 1) {
		return { ok: false, reason: "AMBIGUOUS" };
	}
	return { ok: true, record: effective[0] ?? null };
}

export function selectEffectiveLineageRecord<
	TRecord extends EffectiveLineageRecord,
>(input: {
	assignedId: string;
	records: readonly TRecord[];
	asOf: string;
	getPredecessorId: (record: TRecord) => string | null;
	isEligible: (record: TRecord) => boolean;
}): TRecord | null {
	const resolution = resolveEffectiveLineageRecord(input);
	return resolution.ok ? resolution.record : null;
}
