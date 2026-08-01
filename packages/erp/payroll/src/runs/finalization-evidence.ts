import { errorResult, type Result } from "@afenda/errors";
import {
	addScaled,
	formatScaledToDecimal,
	parseDecimalToScaled,
} from "../shared/money";
import { mapInvalidState } from "../shared/persistence-errors";
import type {
	PayrollFinalizationProjection,
	PayrollResultLine,
	PayrollReversalProjection,
	PayrollRun,
	PayrollRunEmployee,
} from "../types";
import { hashSnapshot } from "./calc/snapshot";

function fail(_message: string): Result<never> {
	return mapInvalidState(_message);
}

function sum(values: string[]): bigint {
	return values.reduce(
		(total, value) => addScaled(total, parseDecimalToScaled(value)),
		0n,
	);
}

export function buildPayrollFinalizationProjection(input: {
	run: PayrollRun;
	periodEnd: string;
	runEmployees: PayrollRunEmployee[];
	resultLines: PayrollResultLine[];
}): Result<PayrollFinalizationProjection> {
	const { run } = input;
	if (
		run.calculationSnapshotHash === null ||
		run.calculationVersion === null ||
		run.roundingPolicyJson === null
	) {
		return fail("Payroll calculation evidence is incomplete");
	}
	if (
		input.runEmployees.some(
			(employee) =>
				employee.status !== "calculated" ||
				employee.calculationVersion !== run.calculationVersion ||
				hashSnapshot(employee.snapshotJson) !== employee.snapshotHash,
		)
	) {
		return fail("Payroll employee calculation evidence is incomplete");
	}

	const expectedHash = hashSnapshot({
		runId: run.id,
		calculationVersion: run.calculationVersion,
		roundingPolicy: run.roundingPolicyJson,
		snapshotHashes: input.runEmployees
			.map(({ snapshotHash }) => snapshotHash)
			.sort((left, right) => left.localeCompare(right)),
	});
	if (expectedHash !== run.calculationSnapshotHash) {
		return fail("Payroll calculation snapshot hash does not match outputs");
	}

	const employeesById = new Map(
		input.runEmployees.map((employee) => [employee.id, employee]),
	);
	if (
		input.resultLines.some((line) => {
			const employee = employeesById.get(line.runEmployeeId);
			return (
				employee === undefined ||
				line.employeeId !== employee.employeeId ||
				line.currencyCode !== employee.currencyCode
			);
		})
	) {
		return fail(
			"Payroll result line ownership does not match employee outputs",
		);
	}
	for (const employee of input.runEmployees) {
		const lines = input.resultLines.filter(
			(line) => line.runEmployeeId === employee.id,
		);
		const gross = sum(
			lines
				.filter(({ lineKind }) => lineKind === "earning")
				.map(({ amount }) => amount),
		);
		const deductions = sum(
			lines
				.filter(
					({ lineKind }) =>
						lineKind === "pre_tax_deduction" ||
						lineKind === "post_tax_deduction",
				)
				.map(({ amount }) => amount),
		);
		const statutory = sum(
			lines
				.filter(({ lineKind }) => lineKind === "employee_statutory")
				.map(({ amount }) => amount),
		);
		const employerCost = sum(
			lines
				.filter(({ lineKind }) => lineKind === "employer_contribution")
				.map(({ amount }) => amount),
		);
		const net = gross - deductions - statutory;
		if (
			gross !== parseDecimalToScaled(employee.gross) ||
			deductions !== parseDecimalToScaled(employee.employeeDeductions) ||
			statutory !== parseDecimalToScaled(employee.employeeStatutory) ||
			employerCost !== parseDecimalToScaled(employee.employerCost) ||
			net !== parseDecimalToScaled(employee.net)
		) {
			return fail("Payroll employee totals do not reconcile to result lines");
		}
	}

	const currencies = [
		...new Set(input.runEmployees.map(({ currencyCode }) => currencyCode)),
	].sort();
	const totals = currencies.map((currencyCode) => {
		const employees = input.runEmployees.filter(
			(employee) => employee.currencyCode === currencyCode,
		);
		return {
			currencyCode,
			gross: formatScaledToDecimal(sum(employees.map(({ gross }) => gross))),
			employeeDeductions: formatScaledToDecimal(
				sum(employees.map(({ employeeDeductions }) => employeeDeductions)),
			),
			employeeStatutory: formatScaledToDecimal(
				sum(employees.map(({ employeeStatutory }) => employeeStatutory)),
			),
			employerCost: formatScaledToDecimal(
				sum(employees.map(({ employerCost }) => employerCost)),
			),
			net: formatScaledToDecimal(sum(employees.map(({ net }) => net))),
		};
	});

	return errorResult.ok({
		paymentDate: input.periodEnd,
		postingDate: input.periodEnd,
		totals,
		payments: input.runEmployees.map((employee) => ({
			employeeId: employee.employeeId,
			sourceId: employee.id,
			amount: employee.net,
			currencyCode: employee.currencyCode,
		})),
		postingLines: input.resultLines.map((line) => ({
			sourceId: line.id,
			employeeId: line.employeeId,
			category: line.lineKind,
			amount: line.amount,
			currencyCode: line.currencyCode,
			dimensions: {
				payGroupId: run.payGroupId,
				periodId: run.periodId,
			},
		})),
	});
}

function negateAmount(amount: string): string {
	return formatScaledToDecimal(-parseDecimalToScaled(amount));
}

export function buildPayrollReversalProjection(input: {
	run: PayrollRun;
	periodEnd: string;
	reason: string;
	reasonCode: PayrollReversalProjection["reasonCode"];
	runEmployees: PayrollRunEmployee[];
	resultLines: PayrollResultLine[];
}): Result<PayrollReversalProjection> {
	const finalization = buildPayrollFinalizationProjection(input);
	if (!finalization.ok) {
		return finalization;
	}
	return errorResult.ok({
		...finalization.data,
		reason: input.reason,
		reasonCode: input.reasonCode,
		payments: finalization.data.payments.map((payment) => ({
			...payment,
			amount: negateAmount(payment.amount),
		})),
		postingLines: finalization.data.postingLines.map((line) => ({
			...line,
			amount: negateAmount(line.amount),
		})),
	});
}
