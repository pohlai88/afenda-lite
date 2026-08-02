// biome-ignore-all lint/suspicious/useAwait: The deterministic memory adapter implements asynchronous payroll run ports.
import { randomUUID } from "node:crypto";
import type { Change } from "@afenda/audit";
import { errorResult, type Result } from "@afenda/errors";
import { events } from "@afenda/events";
import type {
	IdempotentPayrollRunRecord,
	PayrollAdjustment,
	PayrollDeductionRule,
	PayrollEarningRule,
	PayrollException,
	PayrollExceptionCreateRecord,
	PayrollRun,
	PayrollRunCreateRecord,
	PayrollRunEmployee,
	PayrollRunUpdateInput,
	PayrollStatutoryRule,
} from "../../kernel/contracts/projected-types";
import { assertExpectedVersion } from "../../kernel/execution/concurrency";
import {
	mapConflict,
	mapInvalidState,
	mapNotFound,
} from "../../kernel/execution/persistence-errors";
import type { MutationPorts } from "../../kernel/execution/ports";
import { recordPayrollAudit as recordAudit } from "../../kernel/execution/record-audit";
import {
	type PayrollAdjustmentId,
	type PayrollDeductionRuleId,
	type PayrollEarningRuleId,
	type PayrollExceptionId,
	type PayrollRunEmployeeId,
	type PayrollRunId,
	type PayrollStatutoryRuleId,
	parsePayrollAdjustmentId,
	parsePayrollExceptionId,
	parsePayrollRunId,
} from "../../kernel/identity/brands";
import { idempotencyMapKey } from "../../kernel/identity/source-idempotency";
import {
	formatScaledToDecimal,
	parseDecimalToScaled,
} from "../../kernel/money/money";
import {
	collectFinalizedRuleUsage,
	type FinalizedRuleUsage,
} from "../payroll-setup/finalized-rule-usage";
import { ruleFinalizedUsageKey } from "../payroll-setup/rule-finalized-lock";
import {
	buildPayrollRunEventPayload,
	buildPayrollRunEventPayloadForType,
	payrollRunEventsForStatus,
} from "./lifecycle-events";
import { assertPayrollRunReversalUpdate } from "./reversal-policy";
import type { PayrollRunsStore } from "./runs.store";
import { assertPayrollRunTransition } from "./transitions";

export interface RunsMemoryState {
	adjustments: Map<PayrollAdjustmentId, PayrollAdjustment>;
	exceptions: Map<PayrollExceptionId, PayrollException>;
	runIdempotency: Map<string, IdempotentPayrollRunRecord>;
	runs: Map<PayrollRunId, PayrollRun>;
}

export interface PayrollRunsMemoryContext {
	outputs: { runEmployees: Map<PayrollRunEmployeeId, PayrollRunEmployee> };
	runs: RunsMemoryState;
	setup: {
		deductionRules: Map<PayrollDeductionRuleId, PayrollDeductionRule>;
		earningRules: Map<PayrollEarningRuleId, PayrollEarningRule>;
		ruleFinalizedUsage: Set<string>;
		statutoryRules: Map<PayrollStatutoryRuleId, PayrollStatutoryRule>;
	};
}

function cloneRun(run: PayrollRun): PayrollRun {
	return { ...run };
}

function cloneException(exception: PayrollException): PayrollException {
	return { ...exception };
}

async function appendRunEvents(
	ports: MutationPorts,
	input: {
		actorUserId: string;
		correlationId: string;
		organizationId: string;
		runId: string;
		status: PayrollRun["status"];
		run?: PayrollRun;
		finalizationProjection?: PayrollRunUpdateInput["finalizationProjection"];
		reversalProjection?: PayrollRunUpdateInput["reversalProjection"];
	},
): Promise<Result<void>> {
	const eventTypes = payrollRunEventsForStatus(input.status);
	for (const type of eventTypes) {
		const payload =
			input.run === undefined
				? buildPayrollRunEventPayload(input)
				: buildPayrollRunEventPayloadForType({
						eventType: type,
						actorUserId: input.actorUserId,
						correlationId: input.correlationId,
						run: input.run,
						finalizationProjection: input.finalizationProjection,
						reversalProjection: input.reversalProjection,
					});
		if (
			!events.registry.validatePayload(type, payload).success ||
			events.registry.sourceModule(type) !== "payroll"
		) {
			return errorResult.fail("INTERNAL_ERROR");
		}
	}
	const results = await Promise.all(
		eventTypes.map((type) => {
			const payload =
				input.run === undefined
					? buildPayrollRunEventPayload(input)
					: buildPayrollRunEventPayloadForType({
							eventType: type,
							actorUserId: input.actorUserId,
							correlationId: input.correlationId,
							run: input.run,
							finalizationProjection: input.finalizationProjection,
							reversalProjection: input.reversalProjection,
						});
			return ports.outbox.append({
				type,
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				payload,
			});
		}),
	);
	const failure = results.find((result) => !result.ok);
	if (failure !== undefined && !failure.ok) {
		return failure;
	}
	return errorResult.ok(undefined);
}

async function recordRunTransitionFacts(
	ports: MutationPorts,
	input: {
		audit: Parameters<typeof recordAudit>[1];
		events?: Parameters<typeof appendRunEvents>[1];
	},
): Promise<Result<void>> {
	const work = async (): Promise<Result<void>> => {
		const audit = await recordAudit(ports, input.audit);
		if (!audit.ok) {
			return audit;
		}
		if (input.events !== undefined) {
			const outbox = await appendRunEvents(ports, input.events);
			if (!outbox.ok) {
				return outbox;
			}
		}
		return errorResult.ok(undefined);
	};
	return ports.transaction === undefined
		? work()
		: ports.transaction.execute(work);
}

export function createMemoryRunsMethods(
	memoryState: PayrollRunsMemoryContext,
): PayrollRunsStore {
	const state = memoryState.runs;
	const createLocks = new Map<string, Promise<void>>();
	function isCurrentRuleVersion(usage: FinalizedRuleUsage): boolean {
		if (usage.ruleKind === "earning") {
			return (
				memoryState.setup.earningRules.get(usage.ruleId)?.version ===
				usage.recordVersion
			);
		}
		if (usage.ruleKind === "deduction") {
			return (
				memoryState.setup.deductionRules.get(usage.ruleId)?.version ===
				usage.recordVersion
			);
		}
		return (
			memoryState.setup.statutoryRules.get(usage.ruleId)?.version ===
			usage.recordVersion
		);
	}
	return {
		async findRunByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentPayrollRunRecord | null>> {
			const record = state.runIdempotency.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			if (record === undefined) {
				return errorResult.ok(null);
			}
			return errorResult.ok({
				run: cloneRun(record.run),
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Creation intentionally owns keyed serialization, idempotency, rollback, audit, and outbox consistency.
		async createRun(
			record: PayrollRunCreateRecord,
			ports: MutationPorts,
		): Promise<Result<PayrollRun>> {
			const lockKey = idempotencyMapKey(
				record.organizationId,
				record.idempotencyKey,
			);
			const previous = createLocks.get(lockKey) ?? Promise.resolve();
			let releaseLock = (): void => undefined;
			const current = new Promise<void>((resolve) => {
				releaseLock = resolve;
			});
			const queued = previous.then(() => current);
			createLocks.set(lockKey, queued);
			await previous;
			try {
				const existing = await this.findRunByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.idempotencyKey,
				});
				if (!existing.ok) {
					return existing;
				}
				if (existing.data !== null) {
					if (
						existing.data.createRequestFingerprint !==
						record.createRequestFingerprint
					) {
						return mapConflict("Idempotency key conflict");
					}
					return errorResult.ok(cloneRun(existing.data.run));
				}

				for (const run of state.runs.values()) {
					if (
						run.organizationId === record.organizationId &&
						run.payGroupId === record.payGroupId &&
						run.periodId === record.periodId &&
						run.runType === record.runType &&
						run.sequence === record.sequence
					) {
						return mapConflict("Payroll run identity already exists");
					}
				}

				const idResult = parsePayrollRunId(randomUUID());
				if (!idResult.ok) {
					return idResult;
				}

				const now = new Date();
				const run: PayrollRun = {
					id: idResult.data,
					organizationId: record.organizationId,
					payGroupId: record.payGroupId,
					periodId: record.periodId,
					runType: record.runType,
					sequence: record.sequence,
					status: "draft",
					finalizedAt: null,
					finalizedBy: null,
					calculationSnapshotHash: null,
					calculationVersion: null,
					roundingPolicyJson: null,
					reversalReasonCode: null,
					reversalIdempotencyKey: null,
					reversalRequestFingerprint: null,
					version: 1,
					createdBy: record.createdBy,
					updatedBy: record.createdBy,
					createdAt: now,
					updatedAt: now,
				};

				state.runs.set(run.id, run);
				state.runIdempotency.set(
					idempotencyMapKey(record.organizationId, record.idempotencyKey),
					{
						run: cloneRun(run),
						createRequestFingerprint: record.createRequestFingerprint,
					},
				);

				const audit = await recordAudit(ports, {
					organizationId: record.organizationId,
					actorUserId: record.createdBy,
					correlationId: record.correlationId,
					entity: "payroll_run",
					entityId: run.id,
					action: "CREATE",
				});
				if (!audit.ok) {
					state.runs.delete(run.id);
					state.runIdempotency.delete(
						idempotencyMapKey(record.organizationId, record.idempotencyKey),
					);
					return audit;
				}

				const outbox = await appendRunEvents(ports, {
					organizationId: record.organizationId,
					runId: run.id,
					status: run.status,
					run,
					actorUserId: record.createdBy,
					correlationId: record.correlationId,
				});
				if (!outbox.ok) {
					state.runs.delete(run.id);
					state.runIdempotency.delete(
						idempotencyMapKey(record.organizationId, record.idempotencyKey),
					);
					return outbox;
				}

				return errorResult.ok(cloneRun(run));
			} finally {
				releaseLock();
				if (createLocks.get(lockKey) === queued) {
					createLocks.delete(lockKey);
				}
			}
		},

		async getRun(input: {
			organizationId: string;
			runId: PayrollRunId;
		}): Promise<Result<PayrollRun | null>> {
			const run = state.runs.get(input.runId);
			if (run === undefined || run.organizationId !== input.organizationId) {
				return errorResult.ok(null);
			}
			return errorResult.ok(cloneRun(run));
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors versioned transition validation and explicit rollback behavior.
		async updateRunWithVersion(
			input: PayrollRunUpdateInput,
			ports: MutationPorts,
		): Promise<Result<PayrollRun>> {
			const latest = state.runs.get(input.runId);
			if (
				latest === undefined ||
				latest.organizationId !== input.organizationId
			) {
				return mapNotFound("Payroll run not found");
			}

			const versionCheck = assertExpectedVersion(
				latest.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			if (latest.status === "finalized" && input.status !== "reversed") {
				return mapInvalidState(
					"Finalized payroll runs cannot be updated except to reversed",
				);
			}
			if (latest.status === "reversed") {
				return mapInvalidState("Reversed payroll runs cannot be updated");
			}

			const nextStatus = input.status ?? latest.status;
			const reversalCheck = assertPayrollRunReversalUpdate({
				current: latest,
				update: input,
				nextStatus,
			});
			if (!reversalCheck.ok) {
				return reversalCheck;
			}
			if (nextStatus !== latest.status) {
				const transitionCheck = assertPayrollRunTransition(
					latest.status,
					nextStatus,
				);
				if (!transitionCheck.ok) {
					return transitionCheck;
				}
			}
			const finalizedRuleUsage =
				nextStatus === "finalized"
					? collectFinalizedRuleUsage({
							organizationId: input.organizationId,
							runId: input.runId,
							snapshots: Array.from(memoryState.outputs.runEmployees.values())
								.filter(
									(employee) =>
										employee.organizationId === input.organizationId &&
										employee.runId === input.runId,
								)
								.map((employee) => employee.snapshotJson),
						})
					: errorResult.ok([]);
			if (!finalizedRuleUsage.ok) {
				return finalizedRuleUsage;
			}
			if (!finalizedRuleUsage.data.every(isCurrentRuleVersion)) {
				return mapInvalidState(
					"Payroll calculation snapshots reference stale rule versions",
				);
			}

			const now = new Date();
			const updated: PayrollRun = {
				...latest,
				status: nextStatus,
				calculationSnapshotHash:
					input.calculationSnapshotHash === undefined
						? latest.calculationSnapshotHash
						: input.calculationSnapshotHash,
				calculationVersion:
					input.calculationVersion === undefined
						? latest.calculationVersion
						: input.calculationVersion,
				roundingPolicyJson:
					input.roundingPolicyJson === undefined
						? latest.roundingPolicyJson
						: input.roundingPolicyJson,
				finalizedAt:
					input.finalizedAt === undefined
						? latest.finalizedAt
						: input.finalizedAt,
				finalizedBy:
					input.finalizedBy === undefined
						? latest.finalizedBy
						: input.finalizedBy,
				reversalReasonCode:
					input.reversalReasonCode === undefined
						? latest.reversalReasonCode
						: input.reversalReasonCode,
				reversalIdempotencyKey:
					input.reversalIdempotencyKey === undefined
						? latest.reversalIdempotencyKey
						: input.reversalIdempotencyKey,
				reversalRequestFingerprint:
					input.reversalRequestFingerprint === undefined
						? latest.reversalRequestFingerprint
						: input.reversalRequestFingerprint,
				version: latest.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.runs.set(updated.id, updated);
			const createdAdjustmentIds: PayrollAdjustmentId[] = [];
			if (nextStatus === "reversed" && input.reversalProjection !== undefined) {
				for (const total of input.reversalProjection.totals) {
					const adjustmentId = parsePayrollAdjustmentId(randomUUID());
					if (!adjustmentId.ok) {
						state.runs.set(latest.id, latest);
						return adjustmentId;
					}
					memoryState.runs.adjustments.set(adjustmentId.data, {
						id: adjustmentId.data,
						organizationId: input.organizationId,
						originalRunId: input.runId,
						reversalRunId: null,
						originalRunEmployeeId: null,
						adjustmentType: "reversal",
						amount: formatScaledToDecimal(-parseDecimalToScaled(total.net)),
						currencyCode: total.currencyCode,
						reason: input.reversalProjection.reason,
						createdBy: input.actorUserId,
						createdAt: now,
					});
					createdAdjustmentIds.push(adjustmentId.data);
				}
			}

			const changes: Change[] =
				latest.status === updated.status
					? []
					: [
							{
								field: "status",
								oldValue: latest.status,
								newValue: updated.status,
							},
						];
			if (input.auditReason !== undefined) {
				changes.push({
					field: "reason",
					oldValue: null,
					newValue: input.auditReason,
				});
			}
			const eventFacts =
				latest.status === updated.status
					? {}
					: {
							events: {
								organizationId: input.organizationId,
								runId: updated.id,
								status: updated.status,
								run: updated,
								finalizationProjection: input.finalizationProjection,
								reversalProjection: input.reversalProjection,
								actorUserId: input.actorUserId,
								correlationId: input.correlationId,
							},
						};
			const facts = await recordRunTransitionFacts(ports, {
				audit: {
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId: input.correlationId,
					entity: "payroll_run",
					entityId: updated.id,
					action: "UPDATE",
					changes,
				},
				...eventFacts,
			});
			if (!facts.ok) {
				state.runs.set(latest.id, latest);
				for (const adjustmentId of createdAdjustmentIds) {
					memoryState.runs.adjustments.delete(adjustmentId);
				}
				return facts;
			}
			for (const usage of finalizedRuleUsage.data) {
				memoryState.setup.ruleFinalizedUsage.add(ruleFinalizedUsageKey(usage));
			}

			return errorResult.ok(cloneRun(updated));
		},

		async createException(
			record: PayrollExceptionCreateRecord,
			ports: MutationPorts,
		): Promise<Result<PayrollException>> {
			const run = state.runs.get(record.runId);
			if (run === undefined || run.organizationId !== record.organizationId) {
				return mapNotFound("Payroll run not found");
			}
			if (run.status === "finalized" || run.status === "reversed") {
				return mapInvalidState(
					"Finalized or reversed payroll runs cannot accept exceptions",
				);
			}

			const idResult = parsePayrollExceptionId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const exception: PayrollException = {
				id: idResult.data,
				organizationId: record.organizationId,
				runId: record.runId,
				severity: record.severity,
				exceptionCode: record.exceptionCode,
				message: record.message,
				employeeRef: record.employeeRef,
				createdBy: record.createdBy,
				createdAt: new Date(),
			};

			state.exceptions.set(exception.id, exception);

			const audit = await recordAudit(ports, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				entity: "payroll_exception",
				entityId: exception.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				state.exceptions.delete(exception.id);
				return audit;
			}

			return errorResult.ok(cloneException(exception));
		},

		async listExceptionsForRun(input: {
			organizationId: string;
			runId: PayrollRunId;
		}): Promise<Result<PayrollException[]>> {
			const run = state.runs.get(input.runId);
			if (run === undefined || run.organizationId !== input.organizationId) {
				return errorResult.ok([]);
			}

			const exceptions = Array.from(state.exceptions.values()).filter(
				(exception) =>
					exception.organizationId === input.organizationId &&
					exception.runId === input.runId,
			);
			return errorResult.ok(exceptions.map(cloneException));
		},

		async deleteExceptionsForRun(
			input: {
				organizationId: string;
				runId: PayrollRunId;
				actorUserId: string;
				correlationId: string;
			},
			ports: MutationPorts,
		): Promise<Result<{ deletedCount: number }>> {
			const run = state.runs.get(input.runId);
			if (run === undefined || run.organizationId !== input.organizationId) {
				return mapNotFound("Payroll run not found");
			}
			if (run.status === "finalized" || run.status === "reversed") {
				return mapInvalidState(
					"Finalized or reversed payroll runs cannot delete exceptions",
				);
			}

			const toDelete = Array.from(state.exceptions.entries()).filter(
				([, exception]) =>
					exception.organizationId === input.organizationId &&
					exception.runId === input.runId,
			);
			if (toDelete.length === 0) {
				return errorResult.ok({ deletedCount: 0 });
			}

			for (const [exceptionId] of toDelete) {
				state.exceptions.delete(exceptionId);
			}

			const audit = await recordAudit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "payroll_run",
				entityId: input.runId,
				action: "DELETE",
			});
			if (!audit.ok) {
				for (const [exceptionId, exception] of toDelete) {
					state.exceptions.set(exceptionId, exception);
				}
				return audit;
			}

			return errorResult.ok({ deletedCount: toDelete.length });
		},
	};
}
