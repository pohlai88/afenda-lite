import type { HumanResourcesPersonId } from "../../../kernel/identity/brands";
import {
	type EffectiveLineageResolution,
	resolveEffectiveLineageRecord,
} from "../../../kernel/temporal/effective-lineage";
import type { PersonIdentityVersion } from "./types";

function isPersonIdentityLineageEligible(
	version: PersonIdentityVersion,
): boolean {
	return (
		version.lineageStatus === "active" || version.lineageStatus === "superseded"
	);
}

function findPersonIdentityLeaf(
	versions: readonly PersonIdentityVersion[],
): PersonIdentityVersion | null {
	const leaves = versions.filter(
		(leaf) =>
			!versions.some(
				(candidate) => candidate.supersedesIdentityVersionId === leaf.id,
			),
	);
	if (leaves.length !== 1) {
		return null;
	}
	return leaves[0] ?? null;
}

export function resolvePersonIdentityAsOf(input: {
	versions: readonly PersonIdentityVersion[];
	personId: HumanResourcesPersonId;
	asOf: string;
}): EffectiveLineageResolution<PersonIdentityVersion> {
	const lineageVersions = input.versions.filter(
		(version) =>
			version.personId === input.personId &&
			isPersonIdentityLineageEligible(version),
	);
	const leaf = findPersonIdentityLeaf(lineageVersions);
	if (leaf === null) {
		return { ok: false, reason: "MISSING_ASSIGNED" };
	}

	return resolveEffectiveLineageRecord({
		assignedId: leaf.id,
		records: lineageVersions,
		asOf: input.asOf,
		getPredecessorId: (record) => record.supersedesIdentityVersionId,
		isEligible: isPersonIdentityLineageEligible,
	});
}
