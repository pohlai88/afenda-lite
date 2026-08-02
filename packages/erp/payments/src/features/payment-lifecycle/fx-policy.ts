import { errorResult, type Result } from "@afenda/errors";

import type {
	ApplicationFxContext,
	PaymentFxContext,
} from "../../kernel/contracts/domain";
import {
	decimal,
	formatDecimal,
	multiplyRoundHalfEven,
} from "../../kernel/money";

/** Functional-currency precision for derived amounts. */
export const FUNCTIONAL_PRECISION = 2;

const RATE_PATTERN = /^\d+(?:\.\d{1,6})?$/;

/**
 * Presence invariant: a context is only meaningful for cross-currency
 * payments; a payment without one is same-currency by construction, so the
 * functional currency is the payment currency itself.
 */
export function validateFxContext(input: {
	amount: string;
	currencyCode: string;
	fxContext: PaymentFxContext | null | undefined;
}): Result<PaymentFxContext | null> {
	const context = input.fxContext ?? null;
	if (context === null) {
		return errorResult.ok(null);
	}
	if (context.transactionCurrency === context.functionalCurrency) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage:
				"FX context is forbidden when transaction and functional currencies are equal",
		});
	}
	if (context.transactionCurrency !== input.currencyCode) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage:
				"FX context transaction currency must match the payment currency",
		});
	}
	if (
		!RATE_PATTERN.test(context.exchangeRate) ||
		decimal(context.exchangeRate) <= 0n
	) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "FX exchange rate must be a positive decimal",
		});
	}
	return errorResult.ok(context);
}

/** transaction amount → functional amount at the payment's rate. */
export function deriveFunctionalAmount(
	amount: string,
	fxContext: PaymentFxContext | null,
): string {
	if (fxContext === null) {
		return amount;
	}
	return multiplyRoundHalfEven(
		amount,
		fxContext.exchangeRate,
		FUNCTIONAL_PRECISION,
	);
}

function subtract(a: string, b: string): string {
	const diff = decimal(a) - decimal(b);
	return diff < 0n ? `-${formatDecimal(-diff)}` : formatDecimal(diff);
}

/**
 * Application-time FX gate shared by every store implementation:
 * a cross-currency payment demands a complete context (reject, never
 * infer); a supplied context is validated and produces the realized fact.
 */
export function resolveApplicationFx(input: {
	appliedAmount: string;
	applicationFx: ApplicationFxContext | null;
	paymentFx: PaymentFxContext | null;
}): Result<{ fx: ApplicationFxContext | null; realizedFx: string | null }> {
	if (input.paymentFx !== null && input.applicationFx === null) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Cross-currency application requires a complete fx context",
		});
	}
	if (input.applicationFx === null) {
		return errorResult.ok({ fx: null, realizedFx: null });
	}
	const realized = computeRealizedFx({
		appliedTransactionAmount: input.appliedAmount,
		paymentRate: input.paymentFx?.exchangeRate ?? null,
		appliedDocumentAmount: input.applicationFx.appliedDocumentAmount,
		documentBookedRate: input.applicationFx.documentBookedRate,
		appliedFunctionalAmount: input.applicationFx.appliedFunctionalAmount,
	});
	if (!realized.ok) {
		return realized;
	}
	return errorResult.ok({
		fx: input.applicationFx,
		realizedFx: realized.data.realizedFx,
	});
}

/**
 * Realized FX at application time. Validates the caller's arithmetic
 * (reject, never infer) and returns the signed fact for the applied event.
 */
export function computeRealizedFx(input: {
	appliedTransactionAmount: string;
	paymentRate: string | null;
	appliedDocumentAmount: string;
	documentBookedRate: string;
	appliedFunctionalAmount: string;
}): Result<{
	paymentEquivalentFunctionalAmount: string;
	documentBookedFunctionalAmount: string;
	realizedFx: string;
}> {
	const paymentEquivalentFunctionalAmount = multiplyRoundHalfEven(
		input.appliedTransactionAmount,
		input.paymentRate ?? "1",
		FUNCTIONAL_PRECISION,
	);
	const documentBookedFunctionalAmount = multiplyRoundHalfEven(
		input.appliedDocumentAmount,
		input.documentBookedRate,
		FUNCTIONAL_PRECISION,
	);
	if (documentBookedFunctionalAmount !== input.appliedFunctionalAmount) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage:
				"Applied functional amount does not match document rate arithmetic",
		});
	}
	return errorResult.ok({
		paymentEquivalentFunctionalAmount,
		documentBookedFunctionalAmount,
		realizedFx: subtract(
			paymentEquivalentFunctionalAmount,
			documentBookedFunctionalAmount,
		),
	});
}
