import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";

import type { PayrollRun } from "../../kernel/contracts/projected-types";
import type { PayrollCommandOptions as GenericPayrollCommandOptions } from "../../kernel/execution/command-options";
import { runPayrollCommand } from "../../kernel/execution/execute-operation";
import type {
	PayrollPeriodId,
	PayrollRunId,
} from "../../kernel/identity/brands";
import {
	PAYROLL_COMMAND_FINAL_SETTLEMENT_CALCULATE,
	PAYROLL_COMMAND_FINAL_SETTLEMENT_FINALIZE,
	PAYROLL_COMMAND_FINAL_SETTLEMENT_INITIATE,
	PAYROLL_COMMAND_FINAL_SETTLEMENT_STATEMENT_ISSUE,
} from "../../kernel/operations/module-ids";
import type { PayrollRunsStore } from "../payroll-runs/runs.store";
import type { PayrollSetupStore } from "../payroll-setup/setup.store";
import { computeFinalSettlement } from "./compute-final-settlement";
import type {
	PayrollFinalSettlement,
	PayrollFinalSettlementFacts,
	PayrollFinalSettlementView,
} from "./contract";
import { fingerprintPayrollFinalSettlement } from "./fingerprint";
import {
	calculateFinalSettlementInputSchema,
	finalizeFinalSettlementInputSchema,
	initiateFinalSettlementInputSchema,
	issueFinalSettlementStatementInputSchema,
} from "./settlement.schema";
import type { PayrollFinalSettlementStore } from "./settlement.store";

type FinalSettlementStore = PayrollFinalSettlementStore &
	PayrollRunsStore &
	PayrollSetupStore;

export type PayrollFinalSettlementCommandOptions =
	GenericPayrollCommandOptions<FinalSettlementStore>;

type InitiateInput = z.infer<typeof initiateFinalSettlementInputSchema>;
type CalculateInput = z.infer<typeof calculateFinalSettlementInputSchema>;

const LOCKED_ORIGIN_RUN_STATUSES = new Set<PayrollRun["status"]>([
	"calculating",
	"calculated",
	"finalized",
]);

const CALCULABLE_STATUSES = new Set<PayrollFinalSettlement["status"]>([
	"initiated",
	"clearance_required",
	"calculated",
]);

function nowFrom(options: PayrollFinalSettlementCommandOptions): Date {
	return options.clock?.now() ?? new Date();
}

async function requirePeriod(
	store: FinalSettlementStore,
	input: { organizationId: string; periodId: PayrollPeriodId },
) {
	const period = await store.getPeriod(input);
	if (!period.ok) {
		return period;
	}
	if (period.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The payroll period was not found",
		});
	}
	return errorResult.ok(period.data);
}

async function requireSettlement(
	store: FinalSettlementStore,
	input: { organizationId: string; settlementId: string },
) {
	const settlement = await store.getFinalSettlement(input);
	if (!settlement.ok) {
		return settlement;
	}
	if (settlement.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The final settlement was not found",
		});
	}
	return errorResult.ok(settlement.data);
}

async function resolveOriginRun(
	store: FinalSettlementStore,
	input: {
		organizationId: string;
		originRunId: PayrollRunId | undefined;
		periodId: PayrollPeriodId;
	},
): Promise<Result<{ originRunId: string | null; originRunLocked: boolean }>> {
	if (input.originRunId === undefined) {
		return errorResult.ok({ originRunId: null, originRunLocked: false });
	}
	const run = await store.getRun({
		organizationId: input.organizationId,
		runId: input.originRunId,
	});
	if (!run.ok) {
		return run;
	}
	if (run.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The origin payroll run was not found",
		});
	}
	if (run.data.periodId !== input.periodId) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"The origin payroll run does not belong to the settlement period",
		});
	}
	return errorResult.ok({
		originRunId: run.data.id,
		originRunLocked: LOCKED_ORIGIN_RUN_STATUSES.has(run.data.status),
	});
}

async function requireMatchingPayGroup(
	store: FinalSettlementStore,
	input: InitiateInput,
	periodPayGroupId: string,
): Promise<Result<true>> {
	if (periodPayGroupId !== input.payGroupId) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The pay group does not match the payroll period",
		});
	}
	const payGroup = await store.getPayGroup({
		organizationId: input.organizationId,
		payGroupId: input.payGroupId,
	});
	if (!payGroup.ok) {
		return payGroup;
	}
	if (payGroup.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The payroll pay group was not found",
		});
	}
	if (payGroup.data.currencyCode !== input.currencyCode) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"The settlement currency does not match the payroll pay group",
		});
	}
	return errorResult.ok(true);
}

function buildFacts(input: InitiateInput): PayrollFinalSettlementFacts {
	return {
		baseCompensation: input.baseCompensation,
		currencyCode: input.currencyCode,
		employeeStatutoryAmount: input.employeeStatutoryAmount ?? "0",
		employerStatutoryAmount: input.employerStatutoryAmount ?? "0",
		leaveBalanceDays: input.leaveBalanceDays,
		noticeInLieuAmount: input.noticeInLieuAmount ?? "0",
		noticePayAmount: input.noticePayAmount ?? "0",
		recoveries: input.recoveries ?? [],
	};
}

function clearanceRequiredReason(input: {
	originRunLocked: boolean;
	periodClosed: boolean;
}): string | null {
	if (input.originRunLocked) {
		return "Mid-period termination arrived after the origin run was locked";
	}
	if (input.periodClosed) {
		return "Mid-period termination arrived after the payroll period was closed";
	}
	return null;
}

async function existingOrConflict(
	store: FinalSettlementStore,
	input: { idempotencyKey: string; organizationId: string },
	requestFingerprint: string,
): Promise<Result<PayrollFinalSettlement | null>> {
	const existing = await store.findFinalSettlementByIdempotencyKey(input);
	if (!existing.ok) {
		return existing;
	}
	if (existing.data === null) {
		return errorResult.ok(null);
	}
	if (existing.data.requestFingerprint === requestFingerprint) {
		return errorResult.ok(existing.data);
	}
	return errorResult.fail("CONFLICT", {
		publicMessage: "The request conflicts with current state",
	});
}

function buildInitiatedSettlement(input: {
	data: InitiateInput;
	facts: PayrollFinalSettlementFacts;
	now: Date;
	originRunId: string | null;
	originRunLocked: boolean;
	periodClosed: boolean;
	requestFingerprint: string;
}): PayrollFinalSettlement {
	const requiredReason = clearanceRequiredReason({
		originRunLocked: input.originRunLocked,
		periodClosed: input.periodClosed,
	});
	return {
		calculatedAt: null,
		calculatedBy: null,
		clearanceAt: null,
		clearanceBy: null,
		clearanceReason: null,
		clearanceRequiredReason: requiredReason,
		correlationId: input.data.correlationId,
		createdAt: input.now,
		createdBy: input.data.actorUserId,
		employeeId: input.data.employeeId,
		facts: input.facts,
		finalizedAt: null,
		finalizedBy: null,
		id: randomUUID(),
		idempotencyKey: input.data.idempotencyKey,
		organizationId: input.data.organizationId,
		originRunId: input.originRunId,
		payGroupId: input.data.payGroupId,
		periodId: input.data.periodId,
		requestFingerprint: input.requestFingerprint,
		statement: null,
		status: requiredReason === null ? "initiated" : "clearance_required",
		terminationEffectiveOn: input.data.terminationEffectiveOn,
		terminationId: input.data.terminationId,
		totals: null,
		updatedAt: input.now,
		updatedBy: input.data.actorUserId,
		version: 1,
	};
}

function assertCalculable(
	settlement: PayrollFinalSettlement,
	input: CalculateInput,
): Result<true> {
	if (!CALCULABLE_STATUSES.has(settlement.status)) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The final settlement cannot be calculated",
		});
	}
	if (settlement.version !== input.expectedVersion) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The request conflicts with current state",
		});
	}
	if (
		settlement.status === "clearance_required" &&
		(input.clearanceReason === undefined || input.clearanceReason.length === 0)
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Human clearance is required before calculating a locked-period termination settlement",
		});
	}
	return errorResult.ok(true);
}

function applyCalculation(input: {
	actorUserId: string;
	clearanceReason: string | undefined;
	computed: Extract<
		ReturnType<typeof computeFinalSettlement>,
		{ ok: true }
	>["data"];
	now: Date;
	settlement: PayrollFinalSettlement;
}): PayrollFinalSettlement {
	const cleared = input.settlement.status === "clearance_required";
	return {
		...input.settlement,
		calculatedAt: input.now,
		calculatedBy: input.actorUserId,
		clearanceAt: cleared ? input.now : input.settlement.clearanceAt,
		clearanceBy: cleared ? input.actorUserId : input.settlement.clearanceBy,
		clearanceReason: cleared
			? (input.clearanceReason ?? null)
			: input.settlement.clearanceReason,
		status: "calculated",
		totals: input.computed.totals,
		updatedAt: input.now,
		updatedBy: input.actorUserId,
		version: input.settlement.version + 1,
	};
}

async function executeInitiate(
	data: InitiateInput,
	store: FinalSettlementStore,
	options: PayrollFinalSettlementCommandOptions,
): Promise<Result<PayrollFinalSettlement>> {
	const period = await requirePeriod(store, {
		organizationId: data.organizationId,
		periodId: data.periodId,
	});
	if (!period.ok) {
		return period;
	}
	const payGroup = await requireMatchingPayGroup(
		store,
		data,
		period.data.payGroupId,
	);
	if (!payGroup.ok) {
		return payGroup;
	}
	const origin = await resolveOriginRun(store, {
		organizationId: data.organizationId,
		originRunId: data.originRunId,
		periodId: data.periodId,
	});
	if (!origin.ok) {
		return origin;
	}
	const facts = buildFacts(data);
	const requestFingerprint = fingerprintPayrollFinalSettlement({
		employeeId: data.employeeId,
		facts,
		idempotencyKey: data.idempotencyKey,
		organizationId: data.organizationId,
		originRunId: origin.data.originRunId,
		payGroupId: data.payGroupId,
		periodId: data.periodId,
		terminationEffectiveOn: data.terminationEffectiveOn,
		terminationId: data.terminationId,
	});
	const existing = await existingOrConflict(
		store,
		{
			idempotencyKey: data.idempotencyKey,
			organizationId: data.organizationId,
		},
		requestFingerprint,
	);
	if (!existing.ok) {
		return existing;
	}
	if (existing.data !== null) {
		return errorResult.ok(existing.data);
	}
	return store.createFinalSettlement({
		settlement: buildInitiatedSettlement({
			data,
			facts,
			now: nowFrom(options),
			originRunId: origin.data.originRunId,
			originRunLocked: origin.data.originRunLocked,
			periodClosed: period.data.status === "closed",
			requestFingerprint,
		}),
	});
}

async function executeCalculate(
	data: CalculateInput,
	store: FinalSettlementStore,
	options: PayrollFinalSettlementCommandOptions,
): Promise<Result<PayrollFinalSettlementView>> {
	const current = await requireSettlement(store, {
		organizationId: data.organizationId,
		settlementId: data.settlementId,
	});
	if (!current.ok) {
		return current;
	}
	const ready = assertCalculable(current.data, data);
	if (!ready.ok) {
		return ready;
	}
	const period = await requirePeriod(store, {
		organizationId: data.organizationId,
		periodId: current.data.periodId as PayrollPeriodId,
	});
	if (!period.ok) {
		return period;
	}
	const now = nowFrom(options);
	const computed = computeFinalSettlement({
		facts: current.data.facts,
		now,
		organizationId: data.organizationId,
		periodEnd: period.data.periodEnd,
		periodStart: period.data.periodStart,
		settlementId: current.data.id,
		terminationEffectiveOn: current.data.terminationEffectiveOn,
	});
	if (!computed.ok) {
		return computed;
	}
	const saved = await store.saveFinalSettlementCalculation({
		expectedVersion: current.data.version,
		lines: computed.data.lines,
		settlement: applyCalculation({
			actorUserId: data.actorUserId,
			clearanceReason: data.clearanceReason,
			computed: computed.data,
			now,
			settlement: current.data,
		}),
	});
	if (!saved.ok) {
		return saved;
	}
	return errorResult.ok({
		lines: computed.data.lines,
		settlement: saved.data,
	});
}

export function initiateFinalSettlement(
	input: unknown,
	options: PayrollFinalSettlementCommandOptions = {},
): Promise<Result<PayrollFinalSettlement>> {
	return runPayrollCommand(input, options, {
		schema: initiateFinalSettlementInputSchema,
		invalidMessage: "Invalid final settlement initiate input",
		command: PAYROLL_COMMAND_FINAL_SETTLEMENT_INITIATE,
		execute: (data, { store }) => executeInitiate(data, store, options),
	});
}

export function calculateFinalSettlement(
	input: unknown,
	options: PayrollFinalSettlementCommandOptions = {},
): Promise<Result<PayrollFinalSettlementView>> {
	return runPayrollCommand(input, options, {
		schema: calculateFinalSettlementInputSchema,
		invalidMessage: "Invalid final settlement calculate input",
		command: PAYROLL_COMMAND_FINAL_SETTLEMENT_CALCULATE,
		execute: (data, { store }) => executeCalculate(data, store, options),
	});
}

export function finalizeFinalSettlement(
	input: unknown,
	options: PayrollFinalSettlementCommandOptions = {},
): Promise<Result<PayrollFinalSettlement>> {
	return runPayrollCommand(input, options, {
		schema: finalizeFinalSettlementInputSchema,
		invalidMessage: "Invalid final settlement finalize input",
		command: PAYROLL_COMMAND_FINAL_SETTLEMENT_FINALIZE,
		execute: async (data, { store }) => {
			const current = await requireSettlement(store, {
				organizationId: data.organizationId,
				settlementId: data.settlementId,
			});
			if (!current.ok) {
				return current;
			}
			const settlement = current.data;
			if (settlement.status === "finalized" || settlement.status === "stated") {
				return errorResult.ok(settlement);
			}
			if (settlement.status !== "calculated") {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The final settlement has not been calculated",
				});
			}
			if (settlement.version !== data.expectedVersion) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
				});
			}
			if (settlement.calculatedBy === data.actorUserId) {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Segregation of duties: the actor who calculated a final settlement cannot finalize it",
				});
			}

			const now = nowFrom(options);
			return store.saveFinalSettlementTransition({
				expectedVersion: settlement.version,
				settlement: {
					...settlement,
					finalizedAt: now,
					finalizedBy: data.actorUserId,
					status: "finalized",
					updatedAt: now,
					updatedBy: data.actorUserId,
					version: settlement.version + 1,
				},
			});
		},
	});
}

export function issueFinalSettlementStatement(
	input: unknown,
	options: PayrollFinalSettlementCommandOptions = {},
): Promise<Result<PayrollFinalSettlementView>> {
	return runPayrollCommand(input, options, {
		schema: issueFinalSettlementStatementInputSchema,
		invalidMessage: "Invalid final settlement statement input",
		command: PAYROLL_COMMAND_FINAL_SETTLEMENT_STATEMENT_ISSUE,
		execute: async (data, { store }) => {
			const current = await requireSettlement(store, {
				organizationId: data.organizationId,
				settlementId: data.settlementId,
			});
			if (!current.ok) {
				return current;
			}
			const settlement = current.data;
			const lines = await store.listFinalSettlementLines({
				organizationId: data.organizationId,
				settlementId: data.settlementId,
			});
			if (!lines.ok) {
				return lines;
			}
			if (settlement.status === "stated") {
				return errorResult.ok({ lines: lines.data, settlement });
			}
			if (settlement.status !== "finalized") {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Final settlement statements are available only after finalization",
				});
			}
			if (settlement.version !== data.expectedVersion) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
				});
			}
			if (settlement.totals === null) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The final settlement has no calculated totals",
				});
			}

			const now = nowFrom(options);
			const statement = {
				contentHash: fingerprintPayrollFinalSettlement({
					employeeId: settlement.employeeId,
					lines: lines.data.map((line) => ({
						amount: line.amount,
						code: line.code,
						kind: line.kind,
						sequence: line.sequence,
					})),
					settlementId: settlement.id,
					totals: settlement.totals,
				}),
				currencyCode: settlement.facts.currencyCode,
				employeeId: settlement.employeeId,
				issuedAt: now,
				issuedBy: data.actorUserId,
				lines: lines.data,
				periodId: settlement.periodId,
				settlementId: settlement.id,
				terminationEffectiveOn: settlement.terminationEffectiveOn,
				terminationId: settlement.terminationId,
				totals: settlement.totals,
			};
			const saved = await store.saveFinalSettlementTransition({
				expectedVersion: settlement.version,
				settlement: {
					...settlement,
					statement,
					status: "stated",
					updatedAt: now,
					updatedBy: data.actorUserId,
					version: settlement.version + 1,
				},
			});
			if (!saved.ok) {
				return saved;
			}
			return errorResult.ok({ lines: lines.data, settlement: saved.data });
		},
	});
}
