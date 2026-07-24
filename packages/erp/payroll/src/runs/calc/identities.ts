import { addScaled, parseDecimalToScaled, subScaled } from "../../shared/money";
import type {
	PayrollAccountingIdentityResult,
	PayrollEmployeeCalcOutput,
} from "./types";

export function verifyAccountingIdentities(
	output: PayrollEmployeeCalcOutput,
): PayrollAccountingIdentityResult {
	const violations: string[] = [];

	const gross = parseDecimalToScaled(output.totals.gross);
	const employeeDeductions = parseDecimalToScaled(
		output.totals.employeeDeductions,
	);
	const employeeStatutory = parseDecimalToScaled(
		output.totals.employeeStatutory,
	);
	const net = parseDecimalToScaled(output.totals.net);
	const employerCost = parseDecimalToScaled(output.totals.employerCost);

	const expectedNet = subScaled(
		subScaled(gross, employeeDeductions),
		employeeStatutory,
	);

	if (expectedNet !== net) {
		violations.push(
			"net must equal gross minus employee deductions minus employee statutory",
		);
	}

	const employerLineTotal = output.lines
		.filter((line) => line.lineKind === "employer_contribution")
		.reduce(
			(sum, line) => addScaled(sum, parseDecimalToScaled(line.amount)),
			0n,
		);

	if (employerLineTotal !== employerCost) {
		violations.push(
			"employer cost must equal employer contribution result lines",
		);
	}

	const employerStatutoryLineTotal = output.lines
		.filter(
			(line) =>
				line.lineKind === "employer_contribution" &&
				line.ruleKind === "statutory",
		)
		.reduce(
			(sum, line) => addScaled(sum, parseDecimalToScaled(line.amount)),
			0n,
		);
	const employerStatutoryTotal = output.statutoryResults.reduce(
		(sum, result) =>
			addScaled(sum, parseDecimalToScaled(result.employerAmount)),
		0n,
	);

	if (employerStatutoryLineTotal !== employerStatutoryTotal) {
		violations.push(
			"employer statutory lines must match statutory result employer amounts",
		);
	}

	const netIncludingEmployer = addScaled(net, employerCost);
	const netExcludingEmployer = subScaled(netIncludingEmployer, employerCost);
	if (netExcludingEmployer !== net) {
		violations.push("employer cost must not reduce employee net pay");
	}

	return {
		valid: violations.length === 0,
		violations,
	};
}
