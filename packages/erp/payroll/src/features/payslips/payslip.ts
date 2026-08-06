import { errorResult, type Result } from "@afenda/errors";
import {
	PAYROLL_PAYSLIP_CONTRACT_VERSION,
	type PayrollPayslipViewModel,
} from "../../kernel/contracts/projected-types";
import type { PayrollQueryOptions as GenericPayrollQueryOptions } from "../../kernel/execution/command-options";
import { runPayrollQuery } from "../../kernel/execution/execute-operation";
import {
	PAYROLL_QUERY_PAYSLIP_READ_ALL,
	PAYROLL_QUERY_PAYSLIP_READ_OWN,
} from "../../kernel/operations/module-ids";
import { hashSnapshot } from "../calculation/calculation-snapshot";
import type { PayrollOutputsStore } from "../calculation/outputs.store";
import type { PayrollRunsStore } from "../payroll-runs/runs.store";
import type { PayrollPrivacyPort } from "../privacy/contract";
import {
	getOwnPayrollPayslipInputSchema,
	getPayrollPayslipInputSchema,
} from "./payslip.schema";

type PayrollPayslipStore = Pick<PayrollRunsStore, "getRun"> &
	Pick<PayrollOutputsStore, "listResultLinesForRun" | "listRunEmployeesForRun">;
type PayrollCommandOptions = GenericPayrollQueryOptions<PayrollPayslipStore> & {
	privacy?: PayrollPrivacyPort;
};

async function enforcePayslipRestriction(input: {
	actorUserId: string;
	employeeId: string;
	organizationId: string;
	privacy: PayrollPrivacyPort | undefined;
}): Promise<Result<void>> {
	if (input.privacy === undefined) {
		return errorResult.ok(undefined);
	}
	const evaluation = await input.privacy.evaluateRestriction({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: `payroll-payslip:${input.employeeId}`,
		subjectEmployeeId: input.employeeId,
		requestedAt: new Date().toISOString(),
		legalBasis: "payslip_read",
	});
	if (!evaluation.ok) {
		return evaluation;
	}
	if (evaluation.data.restricted) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Payroll subject data is restricted.",
		});
	}
	return errorResult.ok(undefined);
}

async function buildPayslip(input: {
	organizationId: string;
	runId: PayrollPayslipViewModel["runId"];
	employeeId: string;
	store: PayrollPayslipStore;
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
		contractVersion: PAYROLL_PAYSLIP_CONTRACT_VERSION,
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
	return runPayrollQuery(input, options, {
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
			const restricted = await enforcePayslipRestriction({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				employeeId: employeeId.data,
				privacy: options.privacy,
			});
			if (!restricted.ok) {
				return restricted;
			}
			return buildPayslip({ ...data, employeeId: employeeId.data, store });
		},
	});
}

export function getPayrollPayslip(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollPayslipViewModel>> {
	return runPayrollQuery(input, options, {
		schema: getPayrollPayslipInputSchema,
		invalidMessage: "Invalid payroll payslip input",
		query: PAYROLL_QUERY_PAYSLIP_READ_ALL,
		execute: async (data, { store }) => {
			const restricted = await enforcePayslipRestriction({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				employeeId: data.employeeId,
				privacy: options.privacy,
			});
			if (!restricted.ok) {
				return restricted;
			}
			return buildPayslip({ ...data, store });
		},
	});
}
