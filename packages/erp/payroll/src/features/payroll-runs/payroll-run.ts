import { errorResult, type Result } from "@afenda/errors";
import type { PayrollRun } from "../../kernel/contracts/projected-types";
import {
	runPayrollCommand,
	runPayrollQuery,
} from "../../kernel/execution/execute-operation";
import { buildPayrollCreateFingerprint } from "../../kernel/identity/create-fingerprint";
import {
	PAYROLL_COMMAND_RUN_CREATE,
	PAYROLL_QUERY_RUN_GET,
} from "../../kernel/operations/module-ids";
import type { PayrollRunCommandOptions as PayrollCommandOptions } from "./operation-store";
import { loadPayrollRun } from "./run-helpers";
import {
	createPayrollRunInputSchema,
	getPayrollRunInputSchema,
} from "./runs.schema";

export function createPayrollRun(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollRun>> {
	return runPayrollCommand(input, options, {
		schema: createPayrollRunInputSchema,
		invalidMessage: "Invalid payroll run create input",
		command: PAYROLL_COMMAND_RUN_CREATE,
		execute: async (data, { store, ports }) => {
			const period = await store.getPeriod({
				organizationId: data.organizationId,
				periodId: data.periodId,
			});
			if (!period.ok) {
				return period;
			}
			if (period.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Payroll period not found",
				});
			}
			if (period.data.status !== "open") {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Payroll period is not open",
				});
			}
			if (period.data.payGroupId !== data.payGroupId) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Pay group does not match payroll period",
				});
			}

			const fingerprint = buildPayrollCreateFingerprint({
				payGroupId: data.payGroupId,
				periodId: data.periodId,
				runType: data.runType,
				sequence: data.sequence,
			});
			return store.createRun(
				{
					organizationId: data.organizationId,
					payGroupId: data.payGroupId,
					periodId: data.periodId,
					runType: data.runType,
					sequence: data.sequence,
					idempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			);
		},
	});
}

export function getPayrollRun(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollRun>> {
	return runPayrollQuery(input, options, {
		schema: getPayrollRunInputSchema,
		invalidMessage: "Invalid payroll run get input",
		query: PAYROLL_QUERY_RUN_GET,
		execute: async (data, { store }) =>
			loadPayrollRun(store, {
				organizationId: data.organizationId,
				runId: data.runId,
			}),
	});
}
