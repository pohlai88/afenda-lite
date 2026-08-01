import { errorResult, type Result } from "@afenda/errors";

import type { PayrollCommandOptions } from "../command-options";
import {
	PAYROLL_QUERY_PAYSLIP_READ_ALL,
	PAYROLL_QUERY_PAYSLIP_READ_OWN,
} from "../module-ids";
import { hashSnapshot } from "../runs/calc/snapshot";
import {
	getOwnPayrollPayslipInputSchema,
	getPayrollPayslipInputSchema,
} from "../schemas/payslips";
import { runPayrollSetupQuery } from "../shared/setup-command";
import type { PayrollStore } from "../store";
import type { PayrollPayslipViewModel } from "../types";

export const PAYROLL_AGGREGATE_PAYSLIP = "payslip" as const;
export type PayrollPayslipAggregate = typeof PAYROLL_AGGREGATE_PAYSLIP;

async function buildPayslip(input: {
	organizationId: string;
	runId: PayrollPayslipViewModel["runId"];
	employeeId: string;
	store: PayrollStore;
}): Promise<Result<PayrollPayslipViewModel>> {
	const run = await input.store.getRun({
		organizationId: input.organizationId,
		runId: input.runId,
	});
	if (!run.ok) {
		return run;
	}
	if (run.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Payroll run not found",
		});
	}
	if (run.data.status !== "finalized" && run.data.status !== "reversed") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Payslips are available only after payroll finalization",
		});
	}
	const [employeesResult, linesResult] = await Promise.all([
		input.store.listRunEmployeesForRun(input),
		input.store.listResultLinesForRun(input),
	]);
	if (!employeesResult.ok) {
		return employeesResult;
	}
	if (!linesResult.ok) {
		return linesResult;
	}
	const employee = employeesResult.data.find(
		(candidate) => candidate.employeeId === input.employeeId,
	);
	if (employee === undefined) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Payroll payslip not found",
		});
	}
	const lines = linesResult.data
		.filter((line) => line.runEmployeeId === employee.id)
		.sort(
			(left, right) =>
				left.sequence - right.sequence || left.id.localeCompare(right.id),
		)
		.map(({ sequence, lineKind, code, amount, currencyCode }) => ({
			sequence,
			category: lineKind,
			code,
			amount,
			currencyCode,
		}));
	const content = {
		contractVersion: "payroll.payslip.v1" as const,
		organizationId: input.organizationId,
		runId: input.runId,
		employeeId: employee.employeeId,
		currencyCode: employee.currencyCode,
		gross: employee.gross,
		employeeDeductions: employee.employeeDeductions,
		employeeStatutory: employee.employeeStatutory,
		employerCost: employee.employerCost,
		net: employee.net,
		lines,
	};
	return errorResult.ok({
		...content,
		status: run.data.status,
		contentHash: hashSnapshot(content),
	});
}

export function getOwnPayrollPayslip(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollPayslipViewModel>> {
	return runPayrollSetupQuery(input, options, {
		schema: getOwnPayrollPayslipInputSchema,
		invalidMessage: "Invalid own payroll payslip input",
		query: PAYROLL_QUERY_PAYSLIP_READ_OWN,
		execute: async (data, { store, employees }) => {
			if (employees?.resolveActorEmployeeId === undefined) {
				return errorResult.fail("UNAUTHORIZED");
			}
			const employeeId = await employees.resolveActorEmployeeId({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
			});
			if (!employeeId.ok) {
				return employeeId;
			}
			if (employeeId.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Employee identity not found",
				});
			}
			return buildPayslip({ ...data, employeeId: employeeId.data, store });
		},
	});
}

export function getPayrollPayslip(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollPayslipViewModel>> {
	return runPayrollSetupQuery(input, options, {
		schema: getPayrollPayslipInputSchema,
		invalidMessage: "Invalid payroll payslip input",
		query: PAYROLL_QUERY_PAYSLIP_READ_ALL,
		execute: (data, { store }) => buildPayslip({ ...data, store }),
	});
}
