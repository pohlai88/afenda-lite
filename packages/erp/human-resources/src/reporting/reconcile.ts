import { errorResult, type Result } from "@afenda/errors";

import {
	addExactDecimals,
	type ExactDecimal,
	parseExactDecimal,
	subtractExactDecimals,
} from "../shared/exact-decimal";
import type {
	HumanResourcesReadModelFact,
	HumanResourcesReportingFactKind,
	HumanResourcesReportingSourcePort,
} from "./types";

const REPORTING_PAGE_SIZE = 100;
const MAX_REPORTING_FACTS_PER_KIND = 100_000;
const TRAILING_ZEROES_PATTERN = /0+$/;

function formatExactDecimal(value: ExactDecimal): string {
	const negative = value.coefficient < 0n;
	const magnitude = negative ? -value.coefficient : value.coefficient;
	if (value.scale === 0) {
		return `${negative ? "-" : ""}${magnitude}`;
	}
	const digits = magnitude.toString().padStart(value.scale + 1, "0");
	const integer = digits.slice(0, -value.scale);
	const fractional = digits
		.slice(-value.scale)
		.replace(TRAILING_ZEROES_PATTERN, "");
	if (fractional.length === 0) {
		return `${negative ? "-" : ""}${integer}`;
	}
	return `${negative ? "-" : ""}${integer}.${fractional}`;
}

export function addReportingDecimals(
	left: string,
	right: string,
): Result<string> {
	const parsedLeft = parseExactDecimal(left);
	const parsedRight = parseExactDecimal(right);
	if (parsedLeft === null || parsedRight === null) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
		});
	}
	return errorResult.ok(
		formatExactDecimal(addExactDecimals(parsedLeft, parsedRight)),
	);
}

export function subtractReportingDecimals(
	left: string,
	right: string,
): Result<string> {
	const parsedLeft = parseExactDecimal(left);
	const parsedRight = parseExactDecimal(right);
	if (parsedLeft === null || parsedRight === null) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
		});
	}
	return errorResult.ok(
		formatExactDecimal(subtractExactDecimals(parsedLeft, parsedRight)),
	);
}

export function ratioPercent(numerator: number, denominator: number): string {
	if (denominator === 0) {
		return "0.0000";
	}
	const scaled = (BigInt(numerator) * 1_000_000n) / BigInt(denominator);
	const integer = scaled / 10_000n;
	const fraction = (scaled % 10_000n).toString().padStart(4, "0");
	return `${integer}.${fraction}`;
}

export function averageInteger(left: number, right: number): string {
	const total = BigInt(left + right);
	return total % 2n === 0n ? `${total / 2n}.0000` : `${total / 2n}.5000`;
}

export function averageReportingDecimals(
	values: readonly string[],
): Result<string | null> {
	if (values.length === 0) {
		return errorResult.ok(null);
	}
	let total: ExactDecimal = { coefficient: 0n, scale: 0 };
	for (const value of values) {
		const parsed = parseExactDecimal(value);
		if (parsed === null) {
			return errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "The submitted data is invalid",
			});
		}
		total = addExactDecimals(total, parsed);
	}
	const outputScale = Math.max(total.scale, 4);
	const scaledCoefficient =
		total.coefficient * 10n ** BigInt(outputScale - total.scale);
	const quotient = scaledCoefficient / BigInt(values.length);
	return errorResult.ok(
		formatExactDecimal({ coefficient: quotient, scale: outputScale }),
	);
}

export function loadReconciledReportingFacts(input: {
	organizationId: string;
	kind: HumanResourcesReportingFactKind;
	source: HumanResourcesReportingSourcePort;
}): Promise<Result<readonly HumanResourcesReadModelFact[]>> {
	const facts: HumanResourcesReadModelFact[] = [];
	const ids = new Set<string>();
	let expectedTotal: number | null = null;

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Each branch validates one source-page invariant before the next serial read.
	async function loadPage(
		page: number,
	): Promise<Result<readonly HumanResourcesReadModelFact[]>> {
		const result = await input.source.listFacts({
			organizationId: input.organizationId,
			kind: input.kind,
			page,
			pageSize: REPORTING_PAGE_SIZE,
		});
		if (!result.ok) {
			return result;
		}
		const returned = result.data;
		if (returned.page !== page || returned.pageSize !== REPORTING_PAGE_SIZE) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		if (returned.total < 0 || returned.total > MAX_REPORTING_FACTS_PER_KIND) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		expectedTotal ??= returned.total;
		if (returned.total !== expectedTotal) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "The request conflicts with current state",
			});
		}
		for (const fact of returned.entries) {
			if (
				fact.organizationId !== input.organizationId ||
				fact.kind !== input.kind
			) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			if (ids.has(fact.id)) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
				});
			}
			ids.add(fact.id);
			facts.push(fact);
		}
		if (facts.length > expectedTotal) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		if (facts.length === expectedTotal) {
			return errorResult.ok(facts);
		}
		if (returned.entries.length === 0) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		return loadPage(page + 1);
	}

	return loadPage(1);
}
