import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import type { PayrollRun } from "../../kernel/contracts/projected-types";
import type { PayrollCommandOptions as GenericPayrollCommandOptions } from "../../kernel/execution/command-options";
import {
	runPayrollCommand,
	runPayrollQuery,
} from "../../kernel/execution/execute-operation";
import type {
	PayrollPeriodId,
	PayrollRunId,
} from "../../kernel/identity/brands";
import {
	PAYROLL_COMMAND_RETRO_DIFFERENCE_CALCULATE,
	PAYROLL_COMMAND_RETRO_ITEM_QUEUE,
	PAYROLL_COMMAND_RETRO_PERIOD_APPLY,
	PAYROLL_QUERY_RETRO_ITEM_LIST,
} from "../../kernel/operations/module-ids";
import type { PayrollOutputsStore } from "../calculation/outputs.store";
import type { PayrollAssignmentsStore } from "../employee-assignments/assignments.store";
import type { PayrollRunsStore } from "../payroll-runs/runs.store";
import type { PayrollSetupStore } from "../payroll-setup/setup.store";
import type {
	PayrollRetroItem,
	PayrollRetroItemView,
	PayrollRetroLine,
} from "./contract";
import { fingerprintPayrollRetroItem } from "./fingerprint";
import { recomputeRetroDifference } from "./recompute-retro-difference";
import {
	applyRetroToPeriodInputSchema,
	calculateRetroDifferenceInputSchema,
	listRetroItemsInputSchema,
	queueRetroItemInputSchema,
} from "./retro.schema";
import type { PayrollRetroStore } from "./retro.store";

type RetroStore = PayrollAssignmentsStore &
	PayrollOutputsStore &
	PayrollRetroStore &
	PayrollRunsStore &
	PayrollSetupStore;

export type PayrollRetroCommandOptions =
	GenericPayrollCommandOptions<RetroStore>;

/** Run states that may still receive retro lines — sealed states may not. */
const RETRO_TARGET_RUN_STATUSES = new Set<PayrollRun["status"]>([
	"draft",
	"calculating",
	"calculated",
	"failed",
]);

function nowFrom(options: PayrollRetroCommandOptions): Date {
	return options.clock?.now() ?? new Date();
}

async function requirePeriod(
	store: RetroStore,
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

async function requireRun(
	store: RetroStore,
	input: { organizationId: string; runId: PayrollRunId },
) {
	const run = await store.getRun(input);
	if (!run.ok) {
		return run;
	}
	if (run.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The payroll run was not found",
		});
	}
	return errorResult.ok(run.data);
}

export function queueRetroItem(
	input: unknown,
	options: PayrollRetroCommandOptions = {},
): Promise<Result<PayrollRetroItem>> {
	return runPayrollCommand(input, options, {
		schema: queueRetroItemInputSchema,
		invalidMessage: "Invalid payroll retro item input",
		command: PAYROLL_COMMAND_RETRO_ITEM_QUEUE,
		execute: async (data, { store }) => {
			const period = await requirePeriod(store, {
				organizationId: data.organizationId,
				periodId: data.originPeriodId,
			});
			if (!period.ok) {
				return period;
			}

			const requestFingerprint = fingerprintPayrollRetroItem({
				correction: data.correction,
				employeeId: data.employeeId,
				idempotencyKey: data.idempotencyKey,
				organizationId: data.organizationId,
				originPeriodId: data.originPeriodId,
				reason: data.reason,
			});

			const existing = await store.findRetroItemByIdempotencyKey({
				idempotencyKey: data.idempotencyKey,
				organizationId: data.organizationId,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				return existing.data.requestFingerprint === requestFingerprint
					? errorResult.ok(existing.data)
					: errorResult.fail("CONFLICT", {
							publicMessage: "The request conflicts with current state",
						});
			}

			const now = nowFrom(options);
			return store.createRetroItem({
				item: {
					appliedAt: null,
					correction: data.correction,
					correlationId: data.correlationId,
					createdAt: now,
					createdBy: data.actorUserId,
					difference: null,
					employeeId: data.employeeId,
					id: randomUUID(),
					idempotencyKey: data.idempotencyKey,
					organizationId: data.organizationId,
					originPeriodId: data.originPeriodId,
					originRunId: null,
					reason: data.reason,
					requestFingerprint,
					status: "queued",
					targetPeriodId: null,
					targetRunId: null,
					updatedAt: now,
					updatedBy: data.actorUserId,
					version: 1,
				},
			});
		},
	});
}

export function calculateRetroDifference(
	input: unknown,
	options: PayrollRetroCommandOptions = {},
): Promise<Result<PayrollRetroItem>> {
	return runPayrollCommand(input, options, {
		schema: calculateRetroDifferenceInputSchema,
		invalidMessage: "Invalid payroll retro difference input",
		command: PAYROLL_COMMAND_RETRO_DIFFERENCE_CALCULATE,
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Sealed-period recompute keeps every fail-closed gate — item state, run sealing, rule-version pinning, and employee evidence — visibly ordered.
		execute: async (data, { store }) => {
			const item = await store.getRetroItem({
				organizationId: data.organizationId,
				retroItemId: data.retroItemId,
			});
			if (!item.ok) {
				return item;
			}
			if (item.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The retro item was not found",
				});
			}
			const current = item.data;
			if (current.status === "applied") {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The retro item has already been applied",
				});
			}

			const run = await requireRun(store, {
				organizationId: data.organizationId,
				runId: data.originRunId,
			});
			if (!run.ok) {
				return run;
			}
			const originRun = run.data;
			if (originRun.periodId !== current.originPeriodId) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The payroll run does not belong to the origin period",
				});
			}
			// A retro difference may only be taken against a sealed period.
			if (originRun.status !== "finalized") {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The origin payroll run is not finalized",
				});
			}
			if (
				originRun.calculationVersion === null ||
				originRun.calculationSnapshotHash === null
			) {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"The origin payroll run carries no calculation snapshot",
				});
			}

			const runEmployees = await store.listRunEmployeesForRun({
				organizationId: data.organizationId,
				runId: data.originRunId,
			});
			if (!runEmployees.ok) {
				return runEmployees;
			}
			const runEmployee = runEmployees.data.find(
				(entry) => entry.employeeId === current.employeeId,
			);
			if (runEmployee === undefined) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The employee was not calculated in the origin run",
				});
			}
			if (runEmployee.status !== "calculated") {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The origin run employee was not sealed as calculated",
				});
			}
			if (runEmployee.calculationVersion !== originRun.calculationVersion) {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"The origin run employee does not match the run calculation version",
				});
			}

			const resultLines = await store.listResultLinesForRun({
				organizationId: data.organizationId,
				runId: data.originRunId,
			});
			if (!resultLines.ok) {
				return resultLines;
			}

			const difference = recomputeRetroDifference({
				correction: current.correction,
				retroItemId: current.id,
				sealedCalculationVersion: runEmployee.calculationVersion,
				sealedResultLines: resultLines.data.filter(
					(line) => line.runEmployeeId === runEmployee.id,
				),
				sealedSnapshotHash: runEmployee.snapshotHash,
				sealedSnapshotJson: runEmployee.snapshotJson,
			});
			if (!difference.ok) {
				return difference;
			}

			const now = nowFrom(options);
			return store.saveRetroDifference({
				expectedVersion: current.version,
				item: {
					...current,
					difference: difference.data,
					originRunId: originRun.id,
					status: "calculated",
					updatedAt: now,
					updatedBy: data.actorUserId,
					version: current.version + 1,
				},
			});
		},
	});
}

export function applyRetroToPeriod(
	input: unknown,
	options: PayrollRetroCommandOptions = {},
): Promise<Result<PayrollRetroItemView>> {
	return runPayrollCommand(input, options, {
		schema: applyRetroToPeriodInputSchema,
		invalidMessage: "Invalid payroll retro apply input",
		command: PAYROLL_COMMAND_RETRO_PERIOD_APPLY,
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Applying retro keeps item state, open-period policy, target-run sealing, and origin labelling in one auditable order.
		execute: async (data, { store }) => {
			const item = await store.getRetroItem({
				organizationId: data.organizationId,
				retroItemId: data.retroItemId,
			});
			if (!item.ok) {
				return item;
			}
			if (item.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The retro item was not found",
				});
			}
			const current = item.data;
			if (current.status !== "calculated") {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The retro item has no calculated difference",
				});
			}
			const { difference, originRunId } = current;
			if (difference === null || originRunId === null) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The retro item has no calculated difference",
				});
			}

			const period = await requirePeriod(store, {
				organizationId: data.organizationId,
				periodId: data.targetPeriodId,
			});
			if (!period.ok) {
				return period;
			}
			// C3 period freeze — retro lines only ever land in an open period.
			if (period.data.status !== "open") {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The target payroll period is not open",
				});
			}

			const run = await requireRun(store, {
				organizationId: data.organizationId,
				runId: data.targetRunId,
			});
			if (!run.ok) {
				return run;
			}
			const targetRun = run.data;
			if (targetRun.periodId !== data.targetPeriodId) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The payroll run does not belong to the target period",
				});
			}
			if (!RETRO_TARGET_RUN_STATUSES.has(targetRun.status)) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The target payroll run is already sealed",
				});
			}
			if (targetRun.id === originRunId) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "A retro item cannot be applied to its origin run",
				});
			}
			if (data.targetPeriodId === current.originPeriodId) {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"A retro item cannot be applied to its own origin period",
				});
			}

			const payGroup = await store.getPayGroup({
				organizationId: data.organizationId,
				payGroupId: targetRun.payGroupId,
			});
			if (!payGroup.ok) {
				return payGroup;
			}
			if (payGroup.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The payroll pay group was not found",
				});
			}
			// A retro line carries money — it may not cross a currency boundary.
			if (payGroup.data.currencyCode !== difference.currencyCode) {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"The retro difference currency does not match the target pay group",
				});
			}

			const assignments = await store.listActiveAssignmentsForPayGroup({
				organizationId: data.organizationId,
				payGroupId: targetRun.payGroupId,
				effectiveDate: period.data.periodEnd,
			});
			if (!assignments.ok) {
				return assignments;
			}
			if (
				!assignments.data.some(
					(assignment) => assignment.employeeId === current.employeeId,
				)
			) {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"The employee has no active assignment in the target payroll run",
				});
			}

			const now = nowFrom(options);
			const lines: PayrollRetroLine[] = difference.lines.map(
				(line, index): PayrollRetroLine => ({
					amount: line.amount,
					code: line.code,
					createdAt: now,
					currencyCode: line.currencyCode,
					employeeId: current.employeeId,
					id: randomUUID(),
					lineKind: line.lineKind,
					organizationId: data.organizationId,
					originPeriodId: current.originPeriodId,
					originRunId,
					retroItemId: current.id,
					ruleCode: line.ruleCode,
					ruleKind: line.ruleKind,
					ruleVersion: line.ruleVersion,
					sequence: index + 1,
					targetRunId: data.targetRunId,
				}),
			);

			const applied = await store.applyRetroItem({
				expectedVersion: current.version,
				item: {
					...current,
					appliedAt: now,
					status: "applied",
					targetPeriodId: data.targetPeriodId,
					targetRunId: data.targetRunId,
					updatedAt: now,
					updatedBy: data.actorUserId,
					version: current.version + 1,
				},
				lines,
			});
			if (!applied.ok) {
				return applied;
			}
			return errorResult.ok({ item: applied.data, lines });
		},
	});
}

export function listRetroItems(
	input: unknown,
	options: PayrollRetroCommandOptions = {},
): Promise<Result<readonly PayrollRetroItemView[]>> {
	return runPayrollQuery(input, options, {
		schema: listRetroItemsInputSchema,
		invalidMessage: "Invalid payroll retro item query",
		query: PAYROLL_QUERY_RETRO_ITEM_LIST,
		execute: (data, { store }) =>
			store.listRetroItemViews({
				organizationId: data.organizationId,
				...(data.employeeId === undefined
					? {}
					: { employeeId: data.employeeId }),
				...(data.originPeriodId === undefined
					? {}
					: { originPeriodId: data.originPeriodId }),
				...(data.status === undefined ? {} : { status: data.status }),
				...(data.targetRunId === undefined
					? {}
					: { targetRunId: data.targetRunId }),
			}),
	});
}
