import type { HumanResourcesWorkerId } from "../../../kernel/identity/brands";
import {
	type EffectiveLineageResolution,
	resolveEffectiveLineageRecord,
} from "../../../kernel/temporal/effective-lineage";
import type { WorkerClassificationVersion } from "./types";

function isWorkerClassificationLineageEligible(
	version: WorkerClassificationVersion,
): boolean {
	return (
		version.lineageStatus === "active" || version.lineageStatus === "superseded"
	);
}

function findWorkerClassificationLeaf(
	versions: readonly WorkerClassificationVersion[],
): WorkerClassificationVersion | null {
	const leaves = versions.filter(
		(leaf) =>
			!versions.some(
				(candidate) => candidate.supersedesClassificationVersionId === leaf.id,
			),
	);
	if (leaves.length !== 1) {
		return null;
	}
	return leaves[0] ?? null;
}

export function resolveWorkerClassificationAsOf(input: {
	versions: readonly WorkerClassificationVersion[];
	workerId: HumanResourcesWorkerId;
	asOf: string;
}): EffectiveLineageResolution<WorkerClassificationVersion> {
	const lineageVersions = input.versions.filter(
		(version) =>
			version.workerId === input.workerId &&
			isWorkerClassificationLineageEligible(version),
	);
	const leaf = findWorkerClassificationLeaf(lineageVersions);
	if (leaf === null) {
		return { ok: false, reason: "MISSING_ASSIGNED" };
	}

	return resolveEffectiveLineageRecord({
		assignedId: leaf.id,
		records: lineageVersions,
		asOf: input.asOf,
		getPredecessorId: (record) => record.supersedesClassificationVersionId,
		isEligible: isWorkerClassificationLineageEligible,
	});
}
