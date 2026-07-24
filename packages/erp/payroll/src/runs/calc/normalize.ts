import {
	formatScaledToDecimal,
	parseDecimalToScaled,
	roundScaled,
} from "../../shared/money";
import type {
	NormalizedPayrollEmployeeCalcOutput,
	PayrollEmployeeCalcOutput,
} from "./types";

function formatMoneyField(
	value: string,
	policy: PayrollEmployeeCalcOutput["roundingPolicy"],
): string {
	const scaled = parseDecimalToScaled(value);
	return formatScaledToDecimal(roundScaled(scaled, policy));
}

export function normalizeCalcOutput(
	output: PayrollEmployeeCalcOutput,
): NormalizedPayrollEmployeeCalcOutput {
	const policy = output.roundingPolicy;

	const lines = [...output.lines]
		.sort((left, right) => left.sequence - right.sequence)
		.map((line) => ({
			...line,
			amount: formatMoneyField(line.amount, policy),
		}));

	const statutoryResults = [...output.statutoryResults]
		.sort((left, right) => {
			const codeCompare = left.ruleCode.localeCompare(right.ruleCode);
			if (codeCompare !== 0) {
				return codeCompare;
			}
			return left.ruleVersion.localeCompare(right.ruleVersion);
		})
		.map((result) => ({
			...result,
			baseAmount: formatMoneyField(result.baseAmount, policy),
			employeeAmount: formatMoneyField(result.employeeAmount, policy),
			employerAmount: formatMoneyField(result.employerAmount, policy),
		}));

	const trace = [...output.trace].sort((left, right) =>
		left.id.localeCompare(right.id, undefined, { numeric: true }),
	);

	return {
		...output,
		totals: {
			gross: formatMoneyField(output.totals.gross, policy),
			employeeDeductions: formatMoneyField(
				output.totals.employeeDeductions,
				policy,
			),
			employeeStatutory: formatMoneyField(
				output.totals.employeeStatutory,
				policy,
			),
			employerCost: formatMoneyField(output.totals.employerCost, policy),
			net: formatMoneyField(output.totals.net, policy),
		},
		lines,
		statutoryResults,
		trace,
	};
}
