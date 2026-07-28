import { fail, ok, type Result } from "@afenda/errors/result";

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

function formatExactDecimal(value: ExactDecimal): string {
	const negative = value.coefficient < 0n;
	const magnitude = negative ? -value.coefficient : value.coefficient;
	if (value.scale === 0) return `${negative ? "-" : ""}${magnitude}`;
	const digits = magnitude.toString().padStart(value.scale + 1, "0");
	const integer = digits.slice(0, -value.scale);
	const fractional = digits.slice(-value.scale).replace(/0+$/, "");
	if (fractional.length === 0) return `${negative ? "-" : ""}${integer}`;
	return `${negative ? "-" : ""}${integer}.${fractional}`;
}

export function addReportingDecimals(
	left: string,
	right: string,
): Result<string> {
	const parsedLeft = parseExactDecimal(left);
	const parsedRight = parseExactDecimal(right);
	if (parsedLeft === null || parsedRight === null) {
		return fail("VALIDATION_ERROR", "Reporting decimal is invalid");
	}
	return ok(formatExactDecimal(addExactDecimals(parsedLeft, parsedRight)));
}

export function subtractReportingDecimals(
	left: string,
	right: string,
): Result<string> {
	const parsedLeft = parseExactDecimal(left);
	const parsedRight = parseExactDecimal(right);
	if (parsedLeft === null || parsedRight === null) {
		return fail("VALIDATION_ERROR", "Reporting decimal is invalid");
	}
	return ok(formatExactDecimal(subtractExactDecimals(parsedLeft, parsedRight)));
}

export function ratioPercent(numerator: number, denominator: number): string {
	if (denominator === 0) return "0.0000";
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
	if (values.length === 0) return ok(null);
	let total: ExactDecimal = { coefficient: 0n, scale: 0 };
	for (const value of values) {
		const parsed = parseExactDecimal(value);
		if (parsed === null) {
			return fail("VALIDATION_ERROR", "Reporting decimal is invalid");
		}
		total = addExactDecimals(total, parsed);
	}
	const outputScale = Math.max(total.scale, 4);
	const scaledCoefficient =
		total.coefficient * 10n ** BigInt(outputScale - total.scale);
	const quotient = scaledCoefficient / BigInt(values.length);
	return ok(formatExactDecimal({ coefficient: quotient, scale: outputScale }));
}

export async function loadReconciledReportingFacts(input: {
	organizationId: string;
	kind: HumanResourcesReportingFactKind;
	source: HumanResourcesReportingSourcePort;
}): Promise<Result<readonly HumanResourcesReadModelFact[]>> {
	const facts: HumanResourcesReadModelFact[] = [];
	const ids = new Set<string>();
	let page = 1;
	let expectedTotal: number | null = null;

	while (true) {
		const result = await input.source.listFacts({
			organizationId: input.organizationId,
			kind: input.kind,
			page,
			pageSize: REPORTING_PAGE_SIZE,
		});
		if (!result.ok) return result;
		const returned = result.data;
		if (returned.page !== page || returned.pageSize !== REPORTING_PAGE_SIZE) {
			return fail(
				"INTERNAL_ERROR",
				"Reporting source returned invalid pagination metadata",
			);
		}
		if (returned.total < 0 || returned.total > MAX_REPORTING_FACTS_PER_KIND) {
			return fail(
				"INTERNAL_ERROR",
				"Reporting source total is outside the supported range",
			);
		}
		expectedTotal ??= returned.total;
		if (returned.total !== expectedTotal) {
			return fail("CONFLICT", "Reporting source changed during reconciliation");
		}
		for (const fact of returned.entries) {
			if (
				fact.organizationId !== input.organizationId ||
				fact.kind !== input.kind
			) {
				return fail(
					"INTERNAL_ERROR",
					"Reporting source crossed a tenant or fact boundary",
				);
			}
			if (ids.has(fact.id)) {
				return fail("CONFLICT", "Reporting source returned a duplicate fact");
			}
			ids.add(fact.id);
			facts.push(fact);
		}
		if (facts.length > expectedTotal) {
			return fail(
				"INTERNAL_ERROR",
				"Reporting source returned more facts than declared",
			);
		}
		if (facts.length === expectedTotal) break;
		if (returned.entries.length === 0) {
			return fail(
				"INTERNAL_ERROR",
				"Reporting source pagination ended before reconciliation",
			);
		}
		page += 1;
	}

	return ok(facts);
}
