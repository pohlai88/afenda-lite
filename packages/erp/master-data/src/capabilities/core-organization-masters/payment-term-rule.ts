import { errorResult, type Result } from "@afenda/errors";
import {
	MAX_PAYMENT_TERM_NET_DAYS,
	type PaymentTerm,
	type PaymentTermDueDayRule,
	type PaymentTermInstallmentPolicy,
} from "../../types";

export interface PaymentTermRuleInput {
	currencyRestrictionId?: string | null | undefined;
	discountDays?: number | null | undefined;
	discountPercent?: string | null | undefined;
	dueDayRule?: PaymentTermDueDayRule | undefined;
	endOfMonth?: boolean | undefined;
	installmentCount?: number | null | undefined;
	installmentPolicy?: PaymentTermInstallmentPolicy | undefined;
	netDays: number;
	validFrom?: Date | null | undefined;
	validTo?: Date | null | undefined;
}

export type PaymentTermRule = Pick<
	PaymentTerm,
	| "netDays"
	| "discountDays"
	| "discountPercent"
	| "dueDayRule"
	| "endOfMonth"
	| "installmentPolicy"
	| "installmentCount"
	| "validFrom"
	| "validTo"
	| "currencyRestrictionId"
>;

function validationFailed(_message: string): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "The request is invalid",
	});
}

export function normalizePaymentTermRule(
	input: PaymentTermRuleInput,
): Result<PaymentTermRule> {
	const rule: PaymentTermRule = {
		netDays: input.netDays,
		discountDays: input.discountDays ?? null,
		discountPercent: input.discountPercent ?? null,
		dueDayRule: input.dueDayRule ?? "net_days",
		endOfMonth: input.endOfMonth ?? false,
		installmentPolicy: input.installmentPolicy ?? "none",
		installmentCount: input.installmentCount ?? null,
		validFrom: input.validFrom ?? null,
		validTo: input.validTo ?? null,
		currencyRestrictionId: input.currencyRestrictionId ?? null,
	};
	const validationReason = validatePaymentTermRule(rule);
	if (validationReason !== null) {
		return validationFailed(validationReason);
	}
	return errorResult.ok(rule);
}

function validatePaymentTermRule(rule: PaymentTermRule): string | null {
	if (
		!Number.isInteger(rule.netDays) ||
		rule.netDays < 0 ||
		rule.netDays > MAX_PAYMENT_TERM_NET_DAYS
	) {
		return `netDays must be an integer between 0 and ${MAX_PAYMENT_TERM_NET_DAYS}`;
	}
	if (rule.discountDays !== null && rule.discountDays > rule.netDays) {
		return "discountDays cannot exceed netDays";
	}
	return (
		validateDiscountRule(rule) ?? validateInstallmentAndEffectiveRule(rule)
	);
}

function validateDiscountRule(rule: PaymentTermRule): string | null {
	if (rule.discountPercent !== null) {
		const value = Number(rule.discountPercent);
		if (!Number.isFinite(value) || value <= 0 || value > 100) {
			return "discountPercent must be greater than 0 and at most 100";
		}
		if (rule.discountDays === null) {
			return "discountDays is required when discountPercent is set";
		}
	}
	return null;
}

function validateInstallmentAndEffectiveRule(
	rule: PaymentTermRule,
): string | null {
	if (rule.installmentPolicy === "none" && rule.installmentCount !== null) {
		return "installmentCount requires an installment policy";
	}
	if (
		rule.installmentPolicy === "equal_installments" &&
		(rule.installmentCount === null || rule.installmentCount < 2)
	) {
		return "equal_installments requires at least 2 installments";
	}
	if (
		rule.validFrom !== null &&
		rule.validTo !== null &&
		rule.validTo < rule.validFrom
	) {
		return "validTo must be on or after validFrom";
	}
	return null;
}
