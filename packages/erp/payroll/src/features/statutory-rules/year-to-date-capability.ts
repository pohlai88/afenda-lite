import { errorResult, type Result } from "@afenda/errors";
import type { HandoffPriorEmployerYtd } from "@afenda/events/schemas";

import type {
	PayrollPeriod,
	PayrollResultLine,
	PayrollRun,
	PayrollStatutoryResult,
} from "../../kernel/contracts/projected-types";
import type {
	PayrollYearToDateCapability,
	PayrollYearToDateTotals,
} from "../../kernel/execution/capability-ports";
import {
	type PayrollRunId,
	parsePayrollRunId,
} from "../../kernel/identity/brands";
import {
	addScaled,
	formatScaledToDecimal,
	parseDecimalToScaled,
	subScaled,
} from "../../kernel/money/money";
import { resolveStatutoryCalculatorKind } from "./calculator-registry";

export interface PayrollYearToDateStore {
	listPeriodsForOrganization: (input: {
		organizationId: string;
	}) => Promise<Result<PayrollPeriod[]>>;
	listResultLinesForEmployeeRuns: (input: {
		organizationId: string;
		employeeId: string;
		runIds: readonly PayrollRunId[];
	}) => Promise<Result<PayrollResultLine[]>>;
	listRunsForPeriod: (input: {
		organizationId: string;
		periodId: string;
	}) => Promise<Result<PayrollRun[]>>;
	listStatutoryResultsForEmployeeRuns: (input: {
		organizationId: string;
		employeeId: string;
		runIds: readonly PayrollRunId[];
	}) => Promise<Result<PayrollStatutoryResult[]>>;
}

export const EMPTY_PAYROLL_YEAR_TO_DATE = {
	employeeStatutory: "0",
	employerStatutory: "0",
	gross: "0",
	taxWithheld: "0",
	taxableBase: "0",
} as const;

export function emptyPayrollYearToDateTotals(input: {
	currencyCode: string;
	taxYear: number;
}): PayrollYearToDateTotals {
	return {
		currencyCode: input.currencyCode,
		taxYear: input.taxYear,
		...EMPTY_PAYROLL_YEAR_TO_DATE,
	};
}

/**
 * Tax year of a payroll period or settlement.
 *
 * Attribution is by `periodStart` (and by the termination effective date for a
 * final settlement) — deliberately, not by `periodEnd`. A period that straddles
 * a year boundary belongs to the year it opened in, which is the same year the
 * HR handoff attributes its prior-employer figures to, so both sides of the
 * hire-year merge below always agree on which year they are talking about.
 */
export function taxYearFromIsoDate(value: string): number {
	return Number(value.slice(0, 4));
}

function crossCurrencyConflict(scope: string): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: `Year-to-date totals cannot mix currencies (${scope})`,
	});
}

function sumEmployeeHistory(input: {
	currencyCode: string;
	employeeId: string;
	lines: readonly PayrollResultLine[];
	statutoryResults: readonly PayrollStatutoryResult[];
	taxYear: number;
}): Result<PayrollYearToDateTotals> {
	let gross = 0n;
	let preTax = 0n;
	for (const line of input.lines) {
		if (line.employeeId !== input.employeeId) {
			continue;
		}
		if (line.currencyCode !== input.currencyCode) {
			// Silently skipping a foreign-currency line under-reports the year to
			// date and would under-withhold; the totals refuse instead.
			return crossCurrencyConflict("finalized result line");
		}
		const amount = parseDecimalToScaled(line.amount);
		if (line.lineKind === "earning") {
			gross = addScaled(gross, amount);
		}
		if (line.lineKind === "pre_tax_deduction") {
			preTax = addScaled(preTax, amount);
		}
	}

	let employeeStatutory = 0n;
	let employerStatutory = 0n;
	let taxWithheld = 0n;
	for (const result of input.statutoryResults) {
		if (result.employeeId !== input.employeeId) {
			continue;
		}
		if (result.currencyCode !== input.currencyCode) {
			return crossCurrencyConflict("finalized statutory result");
		}
		// The registry — not a rule-code list here — owns whether a persisted
		// result was a tax withholding or a contribution. Every statutory result
		// row already carries the `calculatorId` that produced it.
		const kind = resolveStatutoryCalculatorKind(result.calculatorId);
		if (!kind.ok) {
			return kind;
		}
		const employeeAmount = parseDecimalToScaled(result.employeeAmount);
		if (kind.data === "tax") {
			taxWithheld = addScaled(taxWithheld, employeeAmount);
		} else {
			employeeStatutory = addScaled(employeeStatutory, employeeAmount);
		}
		employerStatutory = addScaled(
			employerStatutory,
			parseDecimalToScaled(result.employerAmount),
		);
	}

	return errorResult.ok({
		currencyCode: input.currencyCode,
		employeeStatutory: formatScaledToDecimal(employeeStatutory),
		employerStatutory: formatScaledToDecimal(employerStatutory),
		gross: formatScaledToDecimal(gross),
		taxWithheld: formatScaledToDecimal(taxWithheld),
		taxYear: input.taxYear,
		taxableBase: formatScaledToDecimal(subScaled(gross, preTax)),
	});
}

/**
 * The one and only hire-year merge.
 *
 * Prior-employer figures are HR-declared facts for a subject who joined
 * mid-year; from the statutory calculators' point of view they are simply more
 * year-to-date. The handoff already separates the two employee-side figures, so
 * each lands in its own channel: `statutoryContributionAmount` in
 * `employeeStatutory`, `taxWithheldAmount` in `taxWithheld`. Folding the prior
 * employer's tax into the contribution total would make a tax pack net off money
 * that was never tax. `employerStatutory` is untouched: the prior employer's own
 * liability is not this employer's. Records for another tax year are not part of
 * this year's totals; a record in another currency refuses rather than being
 * dropped.
 */
function mergePriorEmployerYtd(
	totals: PayrollYearToDateTotals,
	priorEmployerYtd: readonly HandoffPriorEmployerYtd[],
): Result<PayrollYearToDateTotals> {
	let gross = parseDecimalToScaled(totals.gross);
	let taxableBase = parseDecimalToScaled(totals.taxableBase);
	let employeeStatutory = parseDecimalToScaled(totals.employeeStatutory);
	let taxWithheld = parseDecimalToScaled(totals.taxWithheld);

	for (const record of priorEmployerYtd) {
		if (record.taxYear !== totals.taxYear) {
			continue;
		}
		if (record.currencyCode !== totals.currencyCode) {
			return crossCurrencyConflict("prior-employer year-to-date");
		}
		const priorGross = parseDecimalToScaled(record.grossAmount);
		gross = addScaled(gross, priorGross);
		taxableBase = addScaled(taxableBase, priorGross);
		employeeStatutory = addScaled(
			employeeStatutory,
			parseDecimalToScaled(record.statutoryContributionAmount),
		);
		taxWithheld = addScaled(
			taxWithheld,
			parseDecimalToScaled(record.taxWithheldAmount),
		);
	}

	return errorResult.ok({
		currencyCode: totals.currencyCode,
		employeeStatutory: formatScaledToDecimal(employeeStatutory),
		employerStatutory: totals.employerStatutory,
		gross: formatScaledToDecimal(gross),
		taxWithheld: formatScaledToDecimal(taxWithheld),
		taxYear: totals.taxYear,
		taxableBase: formatScaledToDecimal(taxableBase),
	});
}

/**
 * The one fail-closed consumer seam for year-to-date facts.
 *
 * An absent capability used to zero-fill, which silently told every statutory
 * calculator that the employee had earned nothing this year — the same class of
 * under-withholding the statutory gate already refuses. Payroll now refuses the
 * calculation instead, exactly like `createFinalSettlementStatutoryResolver`
 * does when the statutory capability is missing.
 */
export async function resolveYearToDate(input: {
	capability: PayrollYearToDateCapability | undefined;
	currencyCode: string;
	employeeId: string;
	organizationId: string;
	priorEmployerYtd: readonly HandoffPriorEmployerYtd[];
	taxYear: number;
	throughDate: string;
}): Promise<Result<PayrollYearToDateTotals>> {
	const { capability, ...request } = input;
	if (capability === undefined) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Payroll year-to-date facts are not composed for this calculation",
		});
	}
	return await capability.employeeTotals(request);
}

export function createPayrollHistoryYearToDateCapability(
	store: PayrollYearToDateStore,
): PayrollYearToDateCapability {
	return {
		async employeeTotals(input): Promise<Result<PayrollYearToDateTotals>> {
			const periods = await store.listPeriodsForOrganization({
				organizationId: input.organizationId,
			});
			if (!periods.ok) {
				return periods;
			}

			const eligiblePeriods = periods.data.filter(
				(period) =>
					taxYearFromIsoDate(period.periodStart) === input.taxYear &&
					period.periodEnd < input.throughDate,
			);

			const runPages = await Promise.all(
				eligiblePeriods.map((period) =>
					store.listRunsForPeriod({
						organizationId: input.organizationId,
						periodId: period.id,
					}),
				),
			);
			const finalizedRuns: PayrollRun[] = [];
			for (const runs of runPages) {
				if (!runs.ok) {
					return runs;
				}
				finalizedRuns.push(
					...runs.data.filter((run) => run.status === "finalized"),
				);
			}

			const runIds: PayrollRunId[] = [];
			for (const finalizedRun of finalizedRuns) {
				const runId = parsePayrollRunId(finalizedRun.id);
				if (!runId.ok) {
					return runId;
				}
				runIds.push(runId.data);
			}

			if (runIds.length === 0) {
				return mergePriorEmployerYtd(
					emptyPayrollYearToDateTotals({
						currencyCode: input.currencyCode,
						taxYear: input.taxYear,
					}),
					input.priorEmployerYtd,
				);
			}

			// Two batched reads for the employee across all eligible finalized runs
			// (not N×2 full-run loads).
			const [lines, statutoryResults] = await Promise.all([
				store.listResultLinesForEmployeeRuns({
					organizationId: input.organizationId,
					employeeId: input.employeeId,
					runIds,
				}),
				store.listStatutoryResultsForEmployeeRuns({
					organizationId: input.organizationId,
					employeeId: input.employeeId,
					runIds,
				}),
			]);
			if (!lines.ok) {
				return lines;
			}
			if (!statutoryResults.ok) {
				return statutoryResults;
			}

			const history = sumEmployeeHistory({
				currencyCode: input.currencyCode,
				employeeId: input.employeeId,
				lines: lines.data,
				statutoryResults: statutoryResults.data,
				taxYear: input.taxYear,
			});
			if (!history.ok) {
				return history;
			}

			return mergePriorEmployerYtd(history.data, input.priorEmployerYtd);
		},
	};
}
