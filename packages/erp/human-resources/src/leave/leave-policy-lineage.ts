import { selectEffectiveLineageRecord } from "../shared/effective-lineage";
import type { LeavePolicy } from "../types";

function isPublishedLeavePolicyEligible(policy: LeavePolicy): boolean {
	return policy.status === "published";
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
	const published = input.policies.filter(
		(policy) =>
			policy.code === input.code && isPublishedLeavePolicyEligible(policy),
	);
	if (published.length === 0) {
		return null;
	}

	const leaves = published.filter(
		(leaf) =>
			!published.some((candidate) => candidate.supersedesPolicyId === leaf.id),
	);

	const effectivePolicies: LeavePolicy[] = [];
	for (const leaf of leaves) {
		const effective = selectEffectiveLineageRecord({
			assignedId: leaf.id,
			records: published,
			asOf: input.asOf,
			getPredecessorId: (record) => record.supersedesPolicyId,
			isEligible: isPublishedLeavePolicyEligible,
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
