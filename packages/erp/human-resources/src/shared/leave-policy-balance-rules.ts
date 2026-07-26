import type {
	LeavePolicyAccrualBasis,
	LeavePolicyAccrualFrequency,
	LeavePolicyEntitlementExpiryRule,
} from "./leave-status";

export type LeavePolicyBalanceRuleInput = {
	accrualBasis?: LeavePolicyAccrualBasis;
	accrualFrequency?: LeavePolicyAccrualFrequency | null;
	accrualQuantityPerPeriod?: string | null;
	carryForwardEnabled?: boolean;
	carryForwardMaxQuantity?: string | null;
	entitlementExpiryRule?: LeavePolicyEntitlementExpiryRule;
	entitlementExpiryDays?: number | null;
};

export type ResolvedLeavePolicyBalanceRules = {
	accrualBasis: LeavePolicyAccrualBasis;
	accrualFrequency: LeavePolicyAccrualFrequency | null;
	accrualQuantityPerPeriod: string | null;
	carryForwardEnabled: boolean;
	carryForwardMaxQuantity: string | null;
	entitlementExpiryRule: LeavePolicyEntitlementExpiryRule;
	entitlementExpiryDays: number | null;
};

export const DEFAULT_LEAVE_POLICY_BALANCE_RULES: ResolvedLeavePolicyBalanceRules =
	{
		accrualBasis: "none",
		accrualFrequency: null,
		accrualQuantityPerPeriod: null,
		carryForwardEnabled: false,
		carryForwardMaxQuantity: null,
		entitlementExpiryRule: "none",
		entitlementExpiryDays: null,
	};

export function resolveLeavePolicyBalanceRulesFromInput(
	input: LeavePolicyBalanceRuleInput,
): ResolvedLeavePolicyBalanceRules {
	return {
		accrualBasis:
			input.accrualBasis ?? DEFAULT_LEAVE_POLICY_BALANCE_RULES.accrualBasis,
		accrualFrequency: input.accrualFrequency ?? null,
		accrualQuantityPerPeriod: input.accrualQuantityPerPeriod ?? null,
		carryForwardEnabled:
			input.carryForwardEnabled ??
			DEFAULT_LEAVE_POLICY_BALANCE_RULES.carryForwardEnabled,
		carryForwardMaxQuantity: input.carryForwardMaxQuantity ?? null,
		entitlementExpiryRule:
			input.entitlementExpiryRule ??
			DEFAULT_LEAVE_POLICY_BALANCE_RULES.entitlementExpiryRule,
		entitlementExpiryDays: input.entitlementExpiryDays ?? null,
	};
}

export function mergeLeavePolicyBalanceRules(
	existing: ResolvedLeavePolicyBalanceRules,
	input: LeavePolicyBalanceRuleInput,
): ResolvedLeavePolicyBalanceRules {
	return resolveLeavePolicyBalanceRulesFromInput({
		accrualBasis: input.accrualBasis ?? existing.accrualBasis,
		accrualFrequency:
			input.accrualFrequency !== undefined
				? input.accrualFrequency
				: existing.accrualFrequency,
		accrualQuantityPerPeriod:
			input.accrualQuantityPerPeriod !== undefined
				? input.accrualQuantityPerPeriod
				: existing.accrualQuantityPerPeriod,
		carryForwardEnabled:
			input.carryForwardEnabled ?? existing.carryForwardEnabled,
		carryForwardMaxQuantity:
			input.carryForwardMaxQuantity !== undefined
				? input.carryForwardMaxQuantity
				: existing.carryForwardMaxQuantity,
		entitlementExpiryRule:
			input.entitlementExpiryRule ?? existing.entitlementExpiryRule,
		entitlementExpiryDays:
			input.entitlementExpiryDays !== undefined
				? input.entitlementExpiryDays
				: existing.entitlementExpiryDays,
	});
}
