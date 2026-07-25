import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesLeaveEntitlementId } from "../brands";
import { assertLeavePolicyPublished } from "../shared/leave-guards";
import type { ResolvedLeavePolicyBalanceRules } from "../shared/leave-policy-balance-rules";
import { resolveLeavePolicyBalanceRulesFromInput } from "../shared/leave-policy-balance-rules";
import type { HumanResourcesLeaveStore } from "../store/leave";
import type { LeaveEntitlement, LeavePolicy } from "../types";

export async function loadLeaveEntitlementForCommand(
	store: HumanResourcesLeaveStore,
	input: {
		organizationId: string;
		entitlementId: HumanResourcesLeaveEntitlementId;
	},
): Promise<Result<LeaveEntitlement>> {
	const entitlement = await store.getLeaveEntitlementById(input);
	if (!entitlement.ok) return entitlement;
	if (entitlement.data === null) {
		return fail("NOT_FOUND", "Leave entitlement not found");
	}
	return ok(entitlement.data);
}

export async function loadPublishedLeavePolicyForEntitlement(
	store: HumanResourcesLeaveStore,
	input: {
		organizationId: string;
		entitlement: LeaveEntitlement;
	},
): Promise<
	Result<{
		policy: LeavePolicy;
		balanceRules: ResolvedLeavePolicyBalanceRules;
	}>
> {
	const policy = await store.getLeavePolicyById({
		organizationId: input.organizationId,
		policyId: input.entitlement.policyId,
	});
	if (!policy.ok) return policy;
	if (policy.data === null) {
		return fail("NOT_FOUND", "Leave policy not found");
	}
	const published = assertLeavePolicyPublished(policy.data.status);
	if (!published.ok) return published;
	return ok({
		policy: policy.data,
		balanceRules: resolveLeavePolicyBalanceRulesFromInput(policy.data),
	});
}
