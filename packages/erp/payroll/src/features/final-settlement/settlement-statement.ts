import { errorResult, type Result } from "@afenda/errors";

import type { PayrollQueryOptions as GenericPayrollQueryOptions } from "../../kernel/execution/command-options";
import { runPayrollQuery } from "../../kernel/execution/execute-operation";
import {
	PAYROLL_QUERY_FINAL_SETTLEMENT_STATEMENT_READ_ALL,
	PAYROLL_QUERY_FINAL_SETTLEMENT_STATEMENT_READ_OWN,
} from "../../kernel/operations/module-ids";
import type { PayrollPrivacyPort } from "../privacy/contract";
import {
	PAYROLL_FINAL_SETTLEMENT_STATEMENT_CONTRACT_VERSION,
	type PayrollFinalSettlementLine,
	type PayrollFinalSettlementStatement,
} from "./contract";
import { fingerprintPayrollFinalSettlement } from "./fingerprint";
import {
	getFinalSettlementStatementInputSchema,
	getOwnFinalSettlementStatementInputSchema,
} from "./settlement.schema";
import type { PayrollFinalSettlementStore } from "./settlement.store";

type PayrollFinalSettlementStatementStore = Pick<
	PayrollFinalSettlementStore,
	"getFinalSettlement" | "listFinalSettlementLines"
>;

export type PayrollFinalSettlementStatementQueryOptions =
	GenericPayrollQueryOptions<PayrollFinalSettlementStatementStore> & {
		privacy?: PayrollPrivacyPort;
	};

async function enforceStatementRestriction(input: {
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
		correlationId: `payroll-final-settlement-statement:${input.employeeId}`,
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

/**
 * Builds the terminal payslip variant from sealed settlement state.
 *
 * Derived, never stored: the statement is recomputed from the finalized
 * settlement and its sealed lines, and carries a content hash over exactly
 * what it discloses.
 */
async function buildStatement(input: {
	organizationId: string;
	settlementId: string;
	store: PayrollFinalSettlementStatementStore;
	subjectEmployeeId: string | null;
}): Promise<Result<PayrollFinalSettlementStatement>> {
	const settlement = await input.store.getFinalSettlement({
		organizationId: input.organizationId,
		settlementId: input.settlementId,
	});
	if (!settlement.ok) {
		return settlement;
	}
	if (settlement.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The final settlement statement was not found",
		});
	}
	const current = settlement.data;
	if (
		input.subjectEmployeeId !== null &&
		current.employeeId !== input.subjectEmployeeId
	) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The final settlement statement was not found",
		});
	}
	if (current.status !== "finalized") {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Final settlement statements are available only after finalization",
		});
	}
	if (current.totals === null) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The final settlement has no calculated totals",
		});
	}
	const lines = await input.store.listFinalSettlementLines({
		organizationId: input.organizationId,
		settlementId: input.settlementId,
	});
	if (!lines.ok) {
		return lines;
	}
	const content = {
		contractVersion: PAYROLL_FINAL_SETTLEMENT_STATEMENT_CONTRACT_VERSION,
		currencyCode: current.compensationSnapshot.currencyCode,
		employeeId: current.employeeId,
		lines: [...lines.data]
			.sort(
				(left: PayrollFinalSettlementLine, right: PayrollFinalSettlementLine) =>
					left.sequence - right.sequence,
			)
			.map((line: PayrollFinalSettlementLine) => ({
				amount: line.amount,
				category: line.kind,
				code: line.code,
				currencyCode: line.currencyCode,
				sequence: line.sequence,
			})),
		organizationId: current.organizationId,
		periodId: current.periodId,
		settlementId: current.id,
		terminationEffectiveOn: current.terminationEffectiveOn,
		terminationId: current.terminationId,
		totals: current.totals,
	};
	return errorResult.ok({
		...content,
		contentHash: fingerprintPayrollFinalSettlement(content),
		status: current.status,
	});
}

/**
 * Subject read (`payroll.payslip.read-own`): resolves the actor's own employee
 * identity and refuses to disclose any other subject's settlement.
 */
export function getOwnFinalSettlementStatement(
	input: unknown,
	options: PayrollFinalSettlementStatementQueryOptions = {},
): Promise<Result<PayrollFinalSettlementStatement>> {
	return runPayrollQuery(input, options, {
		schema: getOwnFinalSettlementStatementInputSchema,
		invalidMessage: "Invalid own final settlement statement input",
		query: PAYROLL_QUERY_FINAL_SETTLEMENT_STATEMENT_READ_OWN,
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
			const restricted = await enforceStatementRestriction({
				actorUserId: data.actorUserId,
				employeeId: employeeId.data,
				organizationId: data.organizationId,
				privacy: options.privacy,
			});
			if (!restricted.ok) {
				return restricted;
			}
			return buildStatement({
				organizationId: data.organizationId,
				settlementId: data.settlementId,
				store,
				subjectEmployeeId: employeeId.data,
			});
		},
	});
}

/** Administrative read (`payroll.payslip.read-all`): any subject. */
export function getFinalSettlementStatement(
	input: unknown,
	options: PayrollFinalSettlementStatementQueryOptions = {},
): Promise<Result<PayrollFinalSettlementStatement>> {
	return runPayrollQuery(input, options, {
		schema: getFinalSettlementStatementInputSchema,
		invalidMessage: "Invalid final settlement statement input",
		query: PAYROLL_QUERY_FINAL_SETTLEMENT_STATEMENT_READ_ALL,
		execute: async (data, { store }) => {
			const settlement = await store.getFinalSettlement({
				organizationId: data.organizationId,
				settlementId: data.settlementId,
			});
			if (!settlement.ok) {
				return settlement;
			}
			if (settlement.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The final settlement statement was not found",
				});
			}
			const restricted = await enforceStatementRestriction({
				actorUserId: data.actorUserId,
				employeeId: settlement.data.employeeId,
				organizationId: data.organizationId,
				privacy: options.privacy,
			});
			if (!restricted.ok) {
				return restricted;
			}
			return buildStatement({
				organizationId: data.organizationId,
				settlementId: data.settlementId,
				store,
				subjectEmployeeId: null,
			});
		},
	});
}
