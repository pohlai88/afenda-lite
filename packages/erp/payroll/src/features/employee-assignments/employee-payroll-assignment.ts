import { errorResult, type Result } from "@afenda/errors";
import type { PayrollEmployeeAssignment } from "../../kernel/contracts/projected-types";
import type { PayrollCommandOptions as GenericPayrollCommandOptions } from "../../kernel/execution/command-options";
import {
	runPayrollCommand,
	runPayrollQuery,
} from "../../kernel/execution/execute-operation";
import { buildPayrollCreateFingerprint } from "../../kernel/identity/create-fingerprint";
import {
	PAYROLL_COMMAND_ASSIGNMENT_CREATE,
	PAYROLL_QUERY_ASSIGNMENT_GET,
} from "../../kernel/operations/module-ids";
import {
	assertCurrencyAlignment,
	assertEmployeeEligibleForPayroll,
	requirePayrollEmployeeAtDate,
} from "../workforce-ingress/employee-eligibility";
import {
	createPayrollEmployeeAssignmentInputSchema,
	getPayrollEmployeeAssignmentInputSchema,
} from "./assignments.schema";
import type { PayrollEmployeeAssignmentsOperationStore } from "./operation-store";

type PayrollCommandOptions =
	GenericPayrollCommandOptions<PayrollEmployeeAssignmentsOperationStore>;

export function createPayrollEmployeeAssignment(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollEmployeeAssignment>> {
	return runPayrollCommand(input, options, {
		schema: createPayrollEmployeeAssignmentInputSchema,
		invalidMessage: "Invalid payroll employee assignment create input",
		command: PAYROLL_COMMAND_ASSIGNMENT_CREATE,
		execute: async (data, { store, ports, employees }) => {
			const employeeResult = await requirePayrollEmployeeAtDate({
				employees,
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				effectiveDate: data.effectiveFrom,
				actorUserId: data.actorUserId,
				correlationId: data.correlationId,
			});
			if (!employeeResult.ok) {
				return employeeResult;
			}
			const eligible = assertEmployeeEligibleForPayroll(employeeResult.data);
			if (!eligible.ok) {
				return eligible;
			}
			const payGroup = await store.getPayGroup({
				organizationId: data.organizationId,
				payGroupId: data.payGroupId,
			});
			if (!payGroup.ok) {
				return payGroup;
			}
			if (payGroup.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Pay group not found",
				});
			}
			if (payGroup.data.status !== "active") {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Pay group is not active",
				});
			}

			const currency = assertCurrencyAlignment({
				expectedCurrencyCode: payGroup.data.currencyCode,
				actualCurrencyCode: eligible.data.currencyCode,
			});
			if (!currency.ok) {
				return currency;
			}

			const fingerprint = buildPayrollCreateFingerprint({
				employeeId: data.employeeId,
				payGroupId: data.payGroupId,
				effectiveFrom: data.effectiveFrom,
				effectiveTo: data.effectiveTo ?? null,
			});

			return store.createEmployeeAssignment(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					payGroupId: data.payGroupId,
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					idempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
					correlationId: data.correlationId,
					actorUserId: data.actorUserId,
				},
				ports,
			);
		},
	});
}

export function getPayrollEmployeeAssignment(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollEmployeeAssignment | null>> {
	return runPayrollQuery(input, options, {
		schema: getPayrollEmployeeAssignmentInputSchema,
		invalidMessage: "Invalid payroll employee assignment get input",
		query: PAYROLL_QUERY_ASSIGNMENT_GET,
		execute: async (data, { store }) =>
			store.getEmployeeAssignment({
				organizationId: data.organizationId,
				assignmentId: data.assignmentId,
			}),
	});
}
