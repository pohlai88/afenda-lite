import type { Result } from "@afenda/errors";
import type { PayrollReconciliation } from "../../kernel/contracts/projected-types";
import type { PayrollCommandOptions as GenericPayrollCommandOptions } from "../../kernel/execution/command-options";
import { runPayrollCommand } from "../../kernel/execution/execute-operation";
import {
	PAYROLL_COMMAND_SETTLEMENT_DISCREPANCY_RESOLVE,
	PAYROLL_COMMAND_SETTLEMENT_PAYMENT_RECORD,
	PAYROLL_COMMAND_SETTLEMENT_POSTING_RECORD,
} from "../../kernel/operations/module-ids";
import type { PayrollReconciliationOperationStore } from "../reconciliation/operation-store";
import {
	recordPayrollReconciliation,
	resolvePayrollReconciliation,
} from "../reconciliation/reconciliation.command";
import { resolvePayrollReconciliationInputSchema } from "../reconciliation/reconciliation.schema";
import {
	recordPaymentSettlementInputSchema,
	recordPostingConfirmationInputSchema,
} from "./settlement.schema";

type PayrollCommandOptions =
	GenericPayrollCommandOptions<PayrollReconciliationOperationStore>;

export function recordPaymentSettlement(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollReconciliation>> {
	return runPayrollCommand(input, options, {
		schema: recordPaymentSettlementInputSchema,
		invalidMessage: "Invalid payroll payment settlement input",
		command: PAYROLL_COMMAND_SETTLEMENT_PAYMENT_RECORD,
		execute: async (data) =>
			recordPayrollReconciliation(
				{
					organizationId: data.organizationId,
					runId: data.runId,
					kind: "payment",
					downstreamReference: data.paymentId,
					actualAmount: data.actualAmount,
					currencyCode: data.currencyCode,
					idempotencyKey: data.idempotencyKey,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				options,
			),
	});
}

export function recordPostingConfirmation(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollReconciliation>> {
	return runPayrollCommand(input, options, {
		schema: recordPostingConfirmationInputSchema,
		invalidMessage: "Invalid payroll posting confirmation input",
		command: PAYROLL_COMMAND_SETTLEMENT_POSTING_RECORD,
		execute: async (data) =>
			recordPayrollReconciliation(
				{
					organizationId: data.organizationId,
					runId: data.runId,
					kind: "accounting",
					downstreamReference: data.journalId,
					actualAmount: data.actualAmount,
					currencyCode: data.currencyCode,
					idempotencyKey: data.idempotencyKey,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				options,
			),
	});
}

export function resolveReconciliationDiscrepancy(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollReconciliation>> {
	return runPayrollCommand(input, options, {
		schema: resolvePayrollReconciliationInputSchema,
		invalidMessage:
			"Invalid payroll reconciliation discrepancy resolution input",
		command: PAYROLL_COMMAND_SETTLEMENT_DISCREPANCY_RESOLVE,
		execute: async (data) => resolvePayrollReconciliation(data, options),
	});
}
