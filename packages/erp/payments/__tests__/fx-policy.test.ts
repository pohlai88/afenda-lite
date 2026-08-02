import { describe, expect, it } from "vitest";

import {
	computeRealizedFx,
	deriveFunctionalAmount,
	validateFxContext,
} from "../src/features/payment-lifecycle/fx-policy";

const fx = {
	transactionCurrency: "EUR",
	functionalCurrency: "USD",
	exchangeRate: "1.1",
	rateDate: "2026-08-01",
	rateSource: null,
};

describe("validateFxContext", () => {
	it("forbids fx context when transaction currency equals functional", () => {
		const result = validateFxContext({
			amount: "100",
			currencyCode: "USD",
			fxContext: {
				...fx,
				transactionCurrency: "USD",
				functionalCurrency: "USD",
			},
		});
		expect(result.ok).toBe(false);
	});

	it("rejects a context whose transaction currency mismatches the payment", () => {
		const result = validateFxContext({
			amount: "100",
			currencyCode: "GBP",
			fxContext: fx,
		});
		expect(result.ok).toBe(false);
	});

	it("rejects a zero exchange rate", () => {
		const result = validateFxContext({
			amount: "100",
			currencyCode: "EUR",
			fxContext: { ...fx, exchangeRate: "0" },
		});
		expect(result.ok).toBe(false);
	});

	it("accepts a valid cross-currency context and a same-currency null", () => {
		expect(
			validateFxContext({ amount: "100", currencyCode: "EUR", fxContext: fx })
				.ok,
		).toBe(true);
		expect(
			validateFxContext({ amount: "100", currencyCode: "USD", fxContext: null })
				.ok,
		).toBe(true);
	});
});

describe("deriveFunctionalAmount", () => {
	it("equals the amount when no fx context (same currency)", () => {
		expect(deriveFunctionalAmount("123.45", null)).toBe("123.45");
	});

	it("converts and rounds half-even at functional precision", () => {
		expect(deriveFunctionalAmount("100", fx)).toBe("110");
		expect(deriveFunctionalAmount("100.05", { ...fx, exchangeRate: "1" })).toBe(
			"100.05",
		);
	});
});

describe("computeRealizedFx", () => {
	it("computes the signed difference between payment-rate and document-rate values", () => {
		const result = computeRealizedFx({
			appliedTransactionAmount: "100",
			paymentRate: "1.1",
			appliedDocumentAmount: "100",
			documentBookedRate: "1.05",
			appliedFunctionalAmount: "105",
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.paymentEquivalentFunctionalAmount).toBe("110");
			expect(result.data.documentBookedFunctionalAmount).toBe("105");
			expect(result.data.realizedFx).toBe("5");
		}
	});

	it("returns a negative realized fx when the payment rate is lower", () => {
		const result = computeRealizedFx({
			appliedTransactionAmount: "100",
			paymentRate: "1",
			appliedDocumentAmount: "100",
			documentBookedRate: "1.05",
			appliedFunctionalAmount: "105",
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.realizedFx).toBe("-5");
		}
	});

	it("rejects when the caller-supplied functional amount fails arithmetic validation", () => {
		const result = computeRealizedFx({
			appliedTransactionAmount: "100",
			paymentRate: "1.1",
			appliedDocumentAmount: "100",
			documentBookedRate: "1.05",
			appliedFunctionalAmount: "999",
		});
		expect(result.ok).toBe(false);
	});
});
