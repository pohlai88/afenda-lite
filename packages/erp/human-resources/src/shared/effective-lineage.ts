import { previousIsoDate } from "./effective-dates";

export interface EffectiveLineageRecord {
	effectiveFrom: string;
	effectiveTo: string | null;
	id: string;
}

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

type LineageCheck<T> =
	| { ok: true; value: T }
	| { ok: false; reason: EffectiveLineageFailureReason };

function indexLineageRecords<TRecord extends EffectiveLineageRecord>(
	records: readonly TRecord[],
): LineageCheck<Map<string, TRecord>> {
	const byId = new Map<string, TRecord>();
	for (const record of records) {
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
	return { ok: true, value: byId };
}

function resolveLineageRootId<TRecord extends EffectiveLineageRecord>(input: {
	record: TRecord;
	byId: ReadonlyMap<string, TRecord>;
	getPredecessorId: (record: TRecord) => string | null;
}): LineageCheck<string> {
	let current = input.record;
	const visited = new Set<string>();
	for (;;) {
		if (visited.has(current.id)) {
			return { ok: false, reason: "CYCLE" };
		}
		visited.add(current.id);
		const predecessorId = input.getPredecessorId(current);
		if (predecessorId === null) {
			return { ok: true, value: current.id };
		}
		const predecessor = input.byId.get(predecessorId);
		if (predecessor === undefined) {
			return { ok: false, reason: "MISSING_PREDECESSOR" };
		}
		current = predecessor;
	}
}

function collectLineage<TRecord extends EffectiveLineageRecord>(input: {
	records: readonly TRecord[];
	assigned: TRecord;
	assignedRootId: string;
	byId: ReadonlyMap<string, TRecord>;
	getPredecessorId: (record: TRecord) => string | null;
}): LineageCheck<TRecord[]> {
	const lineage: TRecord[] = [];
	for (const record of input.records) {
		const root = resolveLineageRootId({
			record,
			byId: input.byId,
			getPredecessorId: input.getPredecessorId,
		});
		if (!root.ok) {
			if (record.id === input.assigned.id) {
				return root;
			}
			continue;
		}
		if (root.value === input.assignedRootId) {
			lineage.push(record);
		}
	}
	return { ok: true, value: lineage };
}

function validateLinearLineage<TRecord extends EffectiveLineageRecord>(input: {
	lineage: readonly TRecord[];
	getPredecessorId: (record: TRecord) => string | null;
}): LineageCheck<true> {
	const childByPredecessor = new Map<string, TRecord>();
	for (const record of input.lineage) {
		const predecessorId = input.getPredecessorId(record);
		if (predecessorId === null) {
			continue;
		}
		if (childByPredecessor.has(predecessorId)) {
			return { ok: false, reason: "BRANCH" };
		}
		childByPredecessor.set(predecessorId, record);
	}
	const root = input.lineage.find(
		(record) => input.getPredecessorId(record) === null,
	);
	if (root === undefined) {
		return { ok: false, reason: "CYCLE" };
	}
	let predecessor = root;
	let visitedCount = 1;
	for (;;) {
		const successor = childByPredecessor.get(predecessor.id);
		if (successor === undefined) {
			break;
		}
		if (predecessor.effectiveTo === null) {
			return { ok: false, reason: "OVERLAP" };
		}
		const expectedEnd = previousIsoDate(successor.effectiveFrom);
		if (predecessor.effectiveTo !== expectedEnd) {
			return {
				ok: false,
				reason: predecessor.effectiveTo > expectedEnd ? "OVERLAP" : "GAP",
			};
		}
		predecessor = successor;
		visitedCount += 1;
	}
	return visitedCount === input.lineage.length
		? { ok: true, value: true }
		: { ok: false, reason: "CYCLE" };
}

export function resolveEffectiveLineageRecord<
	TRecord extends EffectiveLineageRecord,
>(input: {
	assignedId: string;
	records: readonly TRecord[];
	asOf: string;
	getPredecessorId: (record: TRecord) => string | null;
	isEligible: (record: TRecord) => boolean;
}): EffectiveLineageResolution<TRecord> {
	const indexed = indexLineageRecords(input.records);
	if (!indexed.ok) {
		return indexed;
	}
	const assigned = indexed.value.get(input.assignedId);
	if (assigned === undefined) {
		return { ok: false, reason: "MISSING_ASSIGNED" };
	}
	const assignedRoot = resolveLineageRootId({
		record: assigned,
		byId: indexed.value,
		getPredecessorId: input.getPredecessorId,
	});
	if (!assignedRoot.ok) {
		return assignedRoot;
	}
	const lineage = collectLineage({
		records: input.records,
		assigned,
		assignedRootId: assignedRoot.value,
		byId: indexed.value,
		getPredecessorId: input.getPredecessorId,
	});
	if (!lineage.ok) {
		return lineage;
	}
	const linear = validateLinearLineage({
		lineage: lineage.value,
		getPredecessorId: input.getPredecessorId,
	});
	if (!linear.ok) {
		return linear;
	}

	const effective = lineage.value.filter(
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
