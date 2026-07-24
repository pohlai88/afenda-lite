import { selectEffectiveLineageRecord } from "../shared/effective-lineage";
import type { LeavePolicy } from "../types";

function isPublishedLeavePolicyLineageEligible(policy: LeavePolicy): boolean {
	return policy.status === "published" || policy.status === "superseded";
}

/**
 * Resolves the single published leave policy effective on `asOf` for a policy code,
 * walking successor lineage chains via `supersedesPolicyId`.
 */
export function resolvePublishedLeavePolicyByCodeLineageAsOf(input: {
	policies: readonly LeavePolicy[];
	code: string;
	asOf: string;
}): LeavePolicy | null {
	const lineagePolicies = input.policies.filter(
		(policy) =>
			policy.code === input.code &&
			isPublishedLeavePolicyLineageEligible(policy),
	);
	if (lineagePolicies.length === 0) {
		return null;
	}

	const leaves = lineagePolicies.filter(
		(leaf) =>
			!lineagePolicies.some(
				(candidate) => candidate.supersedesPolicyId === leaf.id,
			),
	);

	const effectivePolicies: LeavePolicy[] = [];
	for (const leaf of leaves) {
		const effective = selectEffectiveLineageRecord({
			assignedId: leaf.id,
			records: lineagePolicies,
			asOf: input.asOf,
			getPredecessorId: (record) => record.supersedesPolicyId,
			isEligible: isPublishedLeavePolicyLineageEligible,
		});
		if (effective !== null) {
			effectivePolicies.push(effective);
		}
	}

	if (effectivePolicies.length !== 1) {
		return null;
	}
	return effectivePolicies[0] ?? null;
}
