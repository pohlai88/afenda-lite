import { HUMAN_RESOURCES_AUTHORIZATION_POLICIES } from "./authorization-policies/index";
import {
	type HumanResourcesAuthorizationPolicy,
	HumanResourcesAuthorizationPolicyResolveError,
} from "./authorization-policy-types";
import type { HumanResourcesOperationId } from "./authorization-types";

export { HUMAN_RESOURCES_AUTHORIZATION_POLICIES } from "./authorization-policies/index";
export {
	type HumanResourcesAuthorizationPolicy,
	HumanResourcesAuthorizationPolicyResolveError,
	type HumanResourcesPolicyMode,
} from "./authorization-policy-types";

export const HUMAN_RESOURCES_MANIFEST_ONLY_POLICY_ID =
	"hr.manifest-only" as const;

/**
 * Exclusive policy resolve: exactly one match, or throw typed fail-closed error.
 * Callers that return Result envelopes must catch and map; CI coverage asserts throw.
 */
export function resolveHumanResourcesAuthorizationPolicy(
	operationId: HumanResourcesOperationId,
	policies: readonly HumanResourcesAuthorizationPolicy[] = HUMAN_RESOURCES_AUTHORIZATION_POLICIES,
): HumanResourcesAuthorizationPolicy {
	const matches = policies.filter((policyValue2) =>
		policyValue2.operationPrefixes.some((prefix) =>
			operationId.startsWith(prefix),
		),
	);

	if (matches.length === 0) {
		throw new HumanResourcesAuthorizationPolicyResolveError(
			"policy_not_registered",
			`No HR authorization policy registered for ${operationId}`,
		);
	}

	if (matches.length > 1) {
		throw new HumanResourcesAuthorizationPolicyResolveError(
			"ambiguous_policy",
			`Ambiguous HR authorization policies for ${operationId}: ${matches
				.map((policyValue) => policyValue.id)
				.join(", ")}`,
		);
	}

	const [policy] = matches;
	if (policy === undefined) {
		throw new HumanResourcesAuthorizationPolicyResolveError(
			"policy_not_registered",
			`No HR authorization policy registered for ${operationId}`,
		);
	}
	return policy;
}
