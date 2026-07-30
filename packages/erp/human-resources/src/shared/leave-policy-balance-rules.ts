import type {
	LeavePolicyAccrualBasis,
	LeavePolicyAccrualFrequency,
	LeavePolicyEntitlementExpiryRule,
} from "./leave-status";

export interface LeavePolicyBalanceRuleInput {
	accrualBasis?: LeavePolicyAccrualBasis | undefined;
	accrualFrequency?: LeavePolicyAccrualFrequency | null | undefined;
	accrualQuantityPerPeriod?: string | null | undefined;
	carryForwardEnabled?: boolean | undefined;
	carryForwardMaxQuantity?: string | null | undefined;
	entitlementExpiryDays?: number | null | undefined;
	entitlementExpiryRule?: LeavePolicyEntitlementExpiryRule | undefined;
}

export interface ResolvedLeavePolicyBalanceRules {
	accrualBasis: LeavePolicyAccrualBasis;
	accrualFrequency: LeavePolicyAccrualFrequency | null;
	accrualQuantityPerPeriod: string | null;
	carryForwardEnabled: boolean;
	carryForwardMaxQuantity: string | null;
	entitlementExpiryDays: number | null;
	entitlementExpiryRule: LeavePolicyEntitlementExpiryRule;
}

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
			input.accrualFrequency === undefined
				? existing.accrualFrequency
				: input.accrualFrequency,
		accrualQuantityPerPeriod:
			input.accrualQuantityPerPeriod === undefined
				? existing.accrualQuantityPerPeriod
				: input.accrualQuantityPerPeriod,
		carryForwardEnabled:
			input.carryForwardEnabled ?? existing.carryForwardEnabled,
		carryForwardMaxQuantity:
			input.carryForwardMaxQuantity === undefined
				? existing.carryForwardMaxQuantity
				: input.carryForwardMaxQuantity,
		entitlementExpiryRule:
			input.entitlementExpiryRule ?? existing.entitlementExpiryRule,
		entitlementExpiryDays:
			input.entitlementExpiryDays === undefined
				? existing.entitlementExpiryDays
				: input.entitlementExpiryDays,
	});
}
