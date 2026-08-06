import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";

import type { PayrollRun } from "../../kernel/contracts/projected-types";
import type { PayrollCommandOptions as GenericPayrollCommandOptions } from "../../kernel/execution/command-options";
import { runPayrollCommand } from "../../kernel/execution/execute-operation";
import type {
	MutationPorts,
	PayrollEmployeeFacts,
	PayrollWorkforceInputPort,
} from "../../kernel/execution/ports";
import {
	type PayrollPeriodId,
	type PayrollRunId,
	parsePayrollPayGroupId,
	parsePayrollPeriodId,
} from "../../kernel/identity/brands";
import {
	DEFAULT_PAYROLL_ROUNDING_POLICY,
	type PayrollRoundingPolicy,
} from "../../kernel/money/rounding-policy";
import {
	PAYROLL_COMMAND_FINAL_SETTLEMENT_CALCULATE,
	PAYROLL_COMMAND_FINAL_SETTLEMENT_FINALIZE,
	PAYROLL_COMMAND_FINAL_SETTLEMENT_INITIATE,
} from "../../kernel/operations/module-ids";
import type { PayrollRunsStore } from "../payroll-runs/runs.store";
import type { PayrollSetupStore } from "../payroll-setup/setup.store";
import {
	resolveYearToDate,
	taxYearFromIsoDate,
} from "../statutory-rules/year-to-date-capability";
import { normalizePayrollWorkforceHandoff } from "../workforce-ingress/normalize-workforce-handoff";
import { computeFinalSettlement } from "./compute-final-settlement";
import type {
	PayrollFinalSettlement,
	PayrollFinalSettlementCompensationSnapshot,
	PayrollFinalSettlementFacts,
	PayrollFinalSettlementView,
} from "./contract";
import { PAYROLL_FINAL_SETTLEMENT_TERMINAL_STATUSES } from "./contract";
import { fingerprintPayrollFinalSettlement } from "./fingerprint";
import { createFinalSettlementStatutoryResolver } from "./resolve-settlement-statutory";
import {
	calculateFinalSettlementInputSchema,
	finalizeFinalSettlementInputSchema,
	initiateFinalSettlementInputSchema,
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

const TERMINAL_EMPLOYMENT_STATUSES = new Set<string>(
	PAYROLL_FINAL_SETTLEMENT_TERMINAL_STATUSES,
);

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

/**
 * Pins compensation from the accepted workforce handoff (bridging D4 + D3
 * pinning discipline).
 *
 * The termination fact itself is the handoff's `employmentStatus`: a
 * settlement may only be initiated for an employee HR has placed on notice or
 * terminated. Everything the calculation prices from — base amount, currency,
 * scale, rounding, pay frequency, source versions — is sealed here, so a
 * superseding handoff after initiate cannot change the settlement.
 */
async function pinCompensation(
	employees: PayrollWorkforceInputPort | undefined,
	input: InitiateInput,
	period: { periodEnd: string; periodStart: string },
	options: PayrollFinalSettlementCommandOptions,
): Promise<
	Result<{
		leaveBalanceDays: string;
		snapshot: PayrollFinalSettlementCompensationSnapshot;
	}>
> {
	if (employees === undefined) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Approved workforce facts are required to initiate a final settlement",
		});
	}
	const payload = await employees.getApprovedPayrollHandoff({
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		effectiveDate: input.terminationEffectiveOn,
		employeeId: input.employeeId,
		organizationId: input.organizationId,
		periodEnd: period.periodEnd,
		periodStart: period.periodStart,
	});
	if (!payload.ok) {
		return payload;
	}
	if (payload.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage:
				"No approved workforce handoff was found for the termination date",
		});
	}
	const normalized = normalizePayrollWorkforceHandoff(payload.data, {
		effectiveDate: input.terminationEffectiveOn,
		employeeId: input.employeeId,
		organizationId: input.organizationId,
		periodEnd: period.periodEnd,
		periodStart: period.periodStart,
	});
	if (!normalized.ok) {
		return normalized;
	}
	const facts = normalized.data;
	if (!TERMINAL_EMPLOYMENT_STATUSES.has(facts.employmentStatus)) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"The employee has no HR termination fact for a final settlement",
		});
	}
	const leaveBalance = facts.approvedHandoff.leaveBalanceAtTermination;
	if (leaveBalance === null || leaveBalance === undefined) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"The termination handoff does not pin a closing leave balance",
		});
	}
	const roundingPolicy = resolveRoundingPolicy(options, facts.currencyCode);
	if (!roundingPolicy.ok) {
		return roundingPolicy;
	}
	const yearToDate = await resolveYearToDate({
		capability: options.yearToDate,
		currencyCode: facts.currencyCode,
		employeeId: facts.employeeId,
		organizationId: input.organizationId,
		priorEmployerYtd: facts.approvedHandoff.priorEmployerYtd ?? [],
		taxYear: taxYearFromIsoDate(input.terminationEffectiveOn),
		throughDate: input.terminationEffectiveOn,
	});
	if (!yearToDate.ok) {
		return yearToDate;
	}
	return errorResult.ok({
		leaveBalanceDays: leaveBalance.days,
		snapshot: buildCompensationSnapshot(
			facts,
			input,
			roundingPolicy.data,
			yearToDate.data,
		),
	});
}

/**
 * Payable rounding is pinned with the compensation, so a later currency-policy
 * change cannot restate a settlement either.
 */
function resolveRoundingPolicy(
	options: PayrollFinalSettlementCommandOptions,
	currencyCode: string,
): Result<PayrollRoundingPolicy> {
	if (options.currency === undefined) {
		return errorResult.ok(DEFAULT_PAYROLL_ROUNDING_POLICY);
	}
	return options.currency.payableRounding({ currencyCode });
}

function buildCompensationSnapshot(
	facts: PayrollEmployeeFacts,
	input: InitiateInput,
	roundingPolicy: PayrollRoundingPolicy,
	yearToDate: PayrollFinalSettlementCompensationSnapshot["yearToDate"],
): PayrollFinalSettlementCompensationSnapshot {
	const { approvedHandoff } = facts;
	return {
		baseCompensation: facts.baseCompensation,
		currencyCode: facts.currencyCode,
		decimalScale: approvedHandoff.decimalScale,
		effectiveDate: input.terminationEffectiveOn,
		employeeId: facts.employeeId,
		employmentId: approvedHandoff.employmentId,
		employmentStatus:
			facts.employmentStatus === "notice" ? "notice" : "terminated",
		payFrequency: approvedHandoff.payFrequency,
		priorEmployerYtd: [...(approvedHandoff.priorEmployerYtd ?? [])],
		roundingMode: approvedHandoff.roundingMode,
		roundingPolicy,
		sourceVersion: { ...approvedHandoff.sourceVersion },
		statutoryProfile: approvedHandoff.statutoryProfile ?? null,
		yearToDate,
	};
}

async function requireMatchingPayGroup(
	store: FinalSettlementStore,
	input: InitiateInput,
	periodPayGroupId: string,
	currencyCode: string,
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
	if (payGroup.data.currencyCode !== currencyCode) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"The pinned compensation currency does not match the payroll pay group",
		});
	}
	return errorResult.ok(true);
}

function buildFacts(
	input: InitiateInput,
	leaveBalanceDays: string,
): PayrollFinalSettlementFacts {
	return {
		leaveBalanceDays,
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
	compensationSnapshot: PayrollFinalSettlementCompensationSnapshot;
	compensationSnapshotHash: string;
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
		compensationSnapshot: input.compensationSnapshot,
		compensationSnapshotHash: input.compensationSnapshotHash,
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
		statutoryEvidence: null,
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
		statutoryEvidence: input.computed.statutoryEvidence,
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
	employees: PayrollWorkforceInputPort | undefined,
	options: PayrollFinalSettlementCommandOptions,
	ports: MutationPorts,
): Promise<Result<PayrollFinalSettlement>> {
	// Caller-supplied fields only. Leave balance is pinned from the accepted
	// handoff after this lookup, so it is absent from the fingerprint entirely —
	// a hardcoded "0" placeholder is not a caller-supplied fact.
	const requestFingerprint = fingerprintPayrollFinalSettlement({
		employeeId: data.employeeId,
		facts: {
			noticeInLieuAmount: data.noticeInLieuAmount ?? "0",
			noticePayAmount: data.noticePayAmount ?? "0",
			recoveries: data.recoveries ?? [],
		},
		idempotencyKey: data.idempotencyKey,
		organizationId: data.organizationId,
		originRunId: data.originRunId ?? null,
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
	const period = await requirePeriod(store, {
		organizationId: data.organizationId,
		periodId: data.periodId,
	});
	if (!period.ok) {
		return period;
	}
	const pinned = await pinCompensation(employees, data, period.data, options);
	if (!pinned.ok) {
		return pinned;
	}
	const facts = buildFacts(data, pinned.data.leaveBalanceDays);
	const payGroup = await requireMatchingPayGroup(
		store,
		data,
		period.data.payGroupId,
		pinned.data.snapshot.currencyCode,
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
	const compensationSnapshotHash = fingerprintPayrollFinalSettlement(
		pinned.data.snapshot,
	);
	return store.createFinalSettlement(
		{
			settlement: buildInitiatedSettlement({
				compensationSnapshot: pinned.data.snapshot,
				compensationSnapshotHash,
				data,
				facts,
				now: nowFrom(options),
				originRunId: origin.data.originRunId,
				originRunLocked: origin.data.originRunLocked,
				periodClosed: period.data.status === "closed",
				requestFingerprint,
			}),
		},
		ports,
	);
}

async function executeCalculate(
	data: CalculateInput,
	store: FinalSettlementStore,
	options: PayrollFinalSettlementCommandOptions,
	ports: MutationPorts,
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
	const periodId = parsePayrollPeriodId(current.data.periodId);
	if (!periodId.ok) {
		return periodId;
	}
	const payGroupId = parsePayrollPayGroupId(current.data.payGroupId);
	if (!payGroupId.ok) {
		return payGroupId;
	}
	const period = await requirePeriod(store, {
		organizationId: data.organizationId,
		periodId: periodId.data,
	});
	if (!period.ok) {
		return period;
	}
	const rules = await store.listActiveStatutoryRulesForPayGroup({
		effectiveDate: current.data.terminationEffectiveOn,
		organizationId: data.organizationId,
		payGroupId: payGroupId.data,
	});
	if (!rules.ok) {
		return rules;
	}
	const now = nowFrom(options);
	const computed = computeFinalSettlement({
		compensationSnapshot: current.data.compensationSnapshot,
		facts: current.data.facts,
		now,
		organizationId: data.organizationId,
		periodEnd: period.data.periodEnd,
		periodStart: period.data.periodStart,
		resolveStatutory: createFinalSettlementStatutoryResolver({
			compensationSnapshot: current.data.compensationSnapshot,
			rules: rules.data,
			statutory: options.statutory,
		}),
		settlementId: current.data.id,
		terminationEffectiveOn: current.data.terminationEffectiveOn,
	});
	if (!computed.ok) {
		return computed;
	}
	const saved = await store.saveFinalSettlementCalculation(
		{
			expectedVersion: current.data.version,
			lines: computed.data.lines,
			settlement: applyCalculation({
				actorUserId: data.actorUserId,
				clearanceReason: data.clearanceReason,
				computed: computed.data,
				now,
				settlement: current.data,
			}),
		},
		ports,
	);
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
		execute: (data, { store, employees, ports }) =>
			executeInitiate(data, store, employees, options, ports),
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
		execute: (data, { store, ports }) =>
			executeCalculate(data, store, options, ports),
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
		execute: async (data, { store, ports }) => {
			const current = await requireSettlement(store, {
				organizationId: data.organizationId,
				settlementId: data.settlementId,
			});
			if (!current.ok) {
				return current;
			}
			const settlement = current.data;
			if (settlement.status === "finalized") {
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
			return store.saveFinalSettlementTransition(
				{
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
				},
				ports,
			);
		},
	});
}
