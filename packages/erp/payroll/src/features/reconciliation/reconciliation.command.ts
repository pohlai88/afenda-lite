import { errorResult, type Result } from "@afenda/errors";
import type { PayrollReconciliation } from "../../kernel/contracts/projected-types";
import type { PayrollCommandOptions as GenericPayrollCommandOptions } from "../../kernel/execution/command-options";
import {
	runPayrollCommand,
	runPayrollQuery,
} from "../../kernel/execution/execute-operation";
import { buildPayrollCreateFingerprint } from "../../kernel/identity/create-fingerprint";
import {
	absScaled,
	addScaled,
	compareScaled,
	formatScaledToDecimal,
	parseDecimalToScaled,
} from "../../kernel/money/money";
import {
	PAYROLL_COMMAND_RECONCILIATION_RECORD,
	PAYROLL_COMMAND_RECONCILIATION_RESOLVE,
	PAYROLL_QUERY_RECONCILIATION_LIST,
} from "../../kernel/operations/module-ids";
import type { PayrollReconciliationOperationStore } from "./operation-store";

type PayrollCommandOptions =
	GenericPayrollCommandOptions<PayrollReconciliationOperationStore>;

import {
	listPayrollReconciliationsForRunInputSchema,
	recordPayrollReconciliationInputSchema,
	resolvePayrollReconciliationInputSchema,
} from "./reconciliation.schema";

const PAYROLL_RECONCILIATION_POLICY = {
	accounting: { toleranceAmount: "0" },
	payment: { toleranceAmount: "0" },
} as const;

function sumAmounts(amounts: readonly string[]): bigint {
	return amounts.reduce(
		(total, amount) => addScaled(total, parseDecimalToScaled(amount)),
		0n,
	);
}

export function recordPayrollReconciliation(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollReconciliation>> {
	return runPayrollCommand(input, options, {
		schema: recordPayrollReconciliationInputSchema,
		invalidMessage: "Invalid payroll reconciliation input",
		command: PAYROLL_COMMAND_RECONCILIATION_RECORD,
		execute: async (data, { store, ports }) => {
			const run = await store.getRun({
				organizationId: data.organizationId,
				runId: data.runId,
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
					publicMessage:
						"Only finalized or reversed payroll runs can be reconciled",
				});
			}
			const [employees, lines] = await Promise.all([
				store.listRunEmployeesForRun({
					organizationId: data.organizationId,
					runId: data.runId,
				}),
				store.listResultLinesForRun({
					organizationId: data.organizationId,
					runId: data.runId,
				}),
			]);
			if (!employees.ok) {
				return employees;
			}
			if (!lines.ok) {
				return lines;
			}
			const sourceAmounts =
				data.kind === "payment"
					? employees.data
							.filter(({ currencyCode }) => currencyCode === data.currencyCode)
							.map(({ net }) => net)
					: lines.data
							.filter(({ currencyCode }) => currencyCode === data.currencyCode)
							.map(({ amount }) => amount);
			if (sourceAmounts.length === 0) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage:
						"Reconciliation currency has no finalized payroll evidence",
				});
			}
			const expected = sumAmounts(sourceAmounts);
			const actual = parseDecimalToScaled(data.actualAmount);
			const { toleranceAmount } = PAYROLL_RECONCILIATION_POLICY[data.kind];
			const tolerance = parseDecimalToScaled(toleranceAmount);
			if (expected < 0n || actual < 0n || tolerance < 0n) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Reconciliation amounts cannot be negative",
				});
			}
			const status =
				compareScaled(absScaled(expected - actual), tolerance) <= 0
					? "matched"
					: "discrepant";
			const expectedAmount = formatScaledToDecimal(expected);
			const fingerprint = buildPayrollCreateFingerprint({
				runId: data.runId,
				kind: data.kind,
				downstreamReference: data.downstreamReference,
				expectedAmount,
				actualAmount: data.actualAmount,
				toleranceAmount,
				currencyCode: data.currencyCode,
			});
			return store.createReconciliation(
				{
					...data,
					expectedAmount,
					toleranceAmount,
					status,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
				},
				ports,
			);
		},
	});
}

export function resolvePayrollReconciliation(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollReconciliation>> {
	return runPayrollCommand(input, options, {
		schema: resolvePayrollReconciliationInputSchema,
		invalidMessage: "Invalid payroll reconciliation resolution input",
		command: PAYROLL_COMMAND_RECONCILIATION_RESOLVE,
		execute: (data, { store, ports }) =>
			store.resolveReconciliation(data, ports),
	});
}

export function listPayrollReconciliationsForRun(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollReconciliation[]>> {
	return runPayrollQuery(input, options, {
		schema: listPayrollReconciliationsForRunInputSchema,
		invalidMessage: "Invalid payroll reconciliation query input",
		query: PAYROLL_QUERY_RECONCILIATION_LIST,
		execute: (data, { store }) => store.listReconciliationsForRun(data),
	});
}
