import { errorResult, type Result } from "@afenda/errors";

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

export interface PayrollYearToDateStore {
	listPeriodsForOrganization: (input: {
		organizationId: string;
	}) => Promise<Result<PayrollPeriod[]>>;
	listResultLinesForRun: (input: {
		organizationId: string;
		runId: PayrollRunId;
	}) => Promise<Result<PayrollResultLine[]>>;
	listRunsForPeriod: (input: {
		organizationId: string;
		periodId: string;
	}) => Promise<Result<PayrollRun[]>>;
	listStatutoryResultsForRun: (input: {
		organizationId: string;
		runId: PayrollRunId;
	}) => Promise<Result<PayrollStatutoryResult[]>>;
}

export const EMPTY_PAYROLL_YEAR_TO_DATE = {
	employeeStatutory: "0",
	employerStatutory: "0",
	gross: "0",
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

export function taxYearFromIsoDate(value: string): number {
	return Number(value.slice(0, 4));
}

function sumEmployeeHistory(input: {
	currencyCode: string;
	employeeId: string;
	lines: readonly PayrollResultLine[];
	statutoryResults: readonly PayrollStatutoryResult[];
	taxYear: number;
}): PayrollYearToDateTotals {
	let gross = 0n;
	let preTax = 0n;
	for (const line of input.lines) {
		if (line.employeeId !== input.employeeId) {
			continue;
		}
		if (line.currencyCode !== input.currencyCode) {
			continue;
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
	for (const result of input.statutoryResults) {
		if (result.employeeId !== input.employeeId) {
			continue;
		}
		if (result.currencyCode !== input.currencyCode) {
			continue;
		}
		employeeStatutory = addScaled(
			employeeStatutory,
			parseDecimalToScaled(result.employeeAmount),
		);
		employerStatutory = addScaled(
			employerStatutory,
			parseDecimalToScaled(result.employerAmount),
		);
	}

	return {
		currencyCode: input.currencyCode,
		employeeStatutory: formatScaledToDecimal(employeeStatutory),
		employerStatutory: formatScaledToDecimal(employerStatutory),
		gross: formatScaledToDecimal(gross),
		taxYear: input.taxYear,
		taxableBase: formatScaledToDecimal(subScaled(gross, preTax)),
	};
}

function mergeTotals(
	left: PayrollYearToDateTotals,
	right: PayrollYearToDateTotals,
): PayrollYearToDateTotals {
	return {
		currencyCode: left.currencyCode,
		employeeStatutory: formatScaledToDecimal(
			addScaled(
				parseDecimalToScaled(left.employeeStatutory),
				parseDecimalToScaled(right.employeeStatutory),
			),
		),
		employerStatutory: formatScaledToDecimal(
			addScaled(
				parseDecimalToScaled(left.employerStatutory),
				parseDecimalToScaled(right.employerStatutory),
			),
		),
		gross: formatScaledToDecimal(
			addScaled(
				parseDecimalToScaled(left.gross),
				parseDecimalToScaled(right.gross),
			),
		),
		taxYear: left.taxYear,
		taxableBase: formatScaledToDecimal(
			addScaled(
				parseDecimalToScaled(left.taxableBase),
				parseDecimalToScaled(right.taxableBase),
			),
		),
	};
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

			const histories = await Promise.all(
				finalizedRuns.map(async (run) => {
					const runId = parsePayrollRunId(run.id);
					if (!runId.ok) {
						return runId;
					}
					const [lines, statutoryResults] = await Promise.all([
						store.listResultLinesForRun({
							organizationId: input.organizationId,
							runId: runId.data,
						}),
						store.listStatutoryResultsForRun({
							organizationId: input.organizationId,
							runId: runId.data,
						}),
					]);
					if (!lines.ok) {
						return lines;
					}
					if (!statutoryResults.ok) {
						return statutoryResults;
					}
					return errorResult.ok(
						sumEmployeeHistory({
							currencyCode: input.currencyCode,
							employeeId: input.employeeId,
							lines: lines.data,
							statutoryResults: statutoryResults.data,
							taxYear: input.taxYear,
						}),
					);
				}),
			);

			let totals = emptyPayrollYearToDateTotals({
				currencyCode: input.currencyCode,
				taxYear: input.taxYear,
			});
			for (const history of histories) {
				if (!history.ok) {
					return history;
				}
				totals = mergeTotals(totals, history.data);
			}

			return errorResult.ok(totals);
		},
	};
}
