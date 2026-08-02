import { errorResult, type Result } from "@afenda/errors";
import type { LeaveEntitlement, LeavePolicy } from "../../kernel/contracts";
import type { HumanResourcesLeaveEntitlementId } from "../../kernel/identity/brands";
import { assertLeavePolicyPublished } from "./guards";
import type { ResolvedLeavePolicyBalanceRules } from "./policy-balance-rules";
import { resolveLeavePolicyBalanceRulesFromInput } from "./policy-balance-rules";
import type { HumanResourcesLeaveStore } from "./store-contract";

export async function loadLeaveEntitlementForCommand(
	store: Pick<HumanResourcesLeaveStore, "getLeaveEntitlementById">,
	input: {
		organizationId: string;
		entitlementId: HumanResourcesLeaveEntitlementId;
	},
): Promise<Result<LeaveEntitlement>> {
	const entitlement = await store.getLeaveEntitlementById(input);
	if (!entitlement.ok) {
		return entitlement;
	}
	if (entitlement.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The requested resource was not found",
		});
	}
	return errorResult.ok(entitlement.data);
}

export async function loadPublishedLeavePolicyForEntitlement(
	store: Pick<HumanResourcesLeaveStore, "getLeavePolicyById">,
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
	if (!policy.ok) {
		return policy;
	}
	if (policy.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The requested resource was not found",
		});
	}
	const published = assertLeavePolicyPublished(policy.data.status);
	if (!published.ok) {
		return published;
	}
	return errorResult.ok({
		policy: policy.data,
		balanceRules: resolveLeavePolicyBalanceRulesFromInput(policy.data),
	});
}
