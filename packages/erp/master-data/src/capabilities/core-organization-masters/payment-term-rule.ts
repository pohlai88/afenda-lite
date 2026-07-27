import { fail, ok, type Result } from "@afenda/errors/result";
import type { MasterFailureDetails } from "../../contracts/reasons";
import {
	MAX_PAYMENT_TERM_NET_DAYS,
	type PaymentTerm,
	type PaymentTermDueDayRule,
	type PaymentTermInstallmentPolicy,
} from "../../types";

export type PaymentTermRuleInput = {
	netDays: number;
	discountDays?: number | null;
	discountPercent?: string | null;
	dueDayRule?: PaymentTermDueDayRule;
	endOfMonth?: boolean;
	installmentPolicy?: PaymentTermInstallmentPolicy;
	installmentCount?: number | null;
	validFrom?: Date | null;
	validTo?: Date | null;
	currencyRestrictionId?: string | null;
};

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

function validationFailed(message: string): Result<never> {
	return fail("BAD_REQUEST", message, {
		reason: "MASTER_VALIDATION_FAILED",
	} satisfies MasterFailureDetails);
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
	if (
		!Number.isInteger(rule.netDays) ||
		rule.netDays < 0 ||
		rule.netDays > MAX_PAYMENT_TERM_NET_DAYS
	) {
		return validationFailed(
			`netDays must be an integer between 0 and ${MAX_PAYMENT_TERM_NET_DAYS}`,
		);
	}
	if (rule.discountDays !== null && rule.discountDays > rule.netDays) {
		return validationFailed("discountDays cannot exceed netDays");
	}
	if (rule.discountPercent !== null) {
		const value = Number(rule.discountPercent);
		if (!Number.isFinite(value) || value <= 0 || value > 100) {
			return validationFailed(
				"discountPercent must be greater than 0 and at most 100",
			);
		}
		if (rule.discountDays === null) {
			return validationFailed(
				"discountDays is required when discountPercent is set",
			);
		}
	}
	if (rule.installmentPolicy === "none" && rule.installmentCount !== null) {
		return validationFailed("installmentCount requires an installment policy");
	}
	if (
		rule.installmentPolicy === "equal_installments" &&
		(rule.installmentCount === null || rule.installmentCount < 2)
	) {
		return validationFailed(
			"equal_installments requires at least 2 installments",
		);
	}
	if (
		rule.validFrom !== null &&
		rule.validTo !== null &&
		rule.validTo < rule.validFrom
	) {
		return validationFailed("validTo must be on or after validFrom");
	}
	return ok(rule);
}
