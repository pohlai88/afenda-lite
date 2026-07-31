// biome-ignore-all lint/suspicious/useAwait: The deterministic memory adapter implements asynchronous payroll run ports.
import { randomUUID } from "node:crypto";
import type { Change } from "@afenda/audit";
import { errorResult, type Result } from "@afenda/errors";

import {
	type PayrollRunId,
	parsePayrollExceptionId,
	parsePayrollRunId,
} from "../../brands";
import type { MutationPorts } from "../../ports";
import { assertPayrollRunTransition } from "../../runs/transitions";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	mapConflict,
	mapInvalidState,
	mapNotFound,
} from "../../shared/persistence-errors";
import type { PayrollRunsStore } from "../../store/runs";
import type {
	IdempotentPayrollRunRecord,
	PayrollException,
	PayrollExceptionCreateRecord,
	PayrollRun,
	PayrollRunCreateRecord,
	PayrollRunUpdateInput,
} from "../../types";
import { idempotencyMapKey, type RunsMemoryState } from "./state";

function cloneRun(run: PayrollRun): PayrollRun {
	return { ...run };
}

function cloneException(exception: PayrollException): PayrollException {
	return { ...exception };
}

async function recordAudit(
	ports: MutationPorts,
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		entity: string;
		entityId: string;
		action: "CREATE" | "UPDATE" | "DELETE";
		changes?: Change[];
	},
): Promise<Result<{ id: string }>> {
	return ports.audit.record({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		changes: input.changes ?? [],
	});
}

export function createMemoryRunsMethods(
	state: RunsMemoryState,
): PayrollRunsStore {
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

		async createRun(
			record: PayrollRunCreateRecord,
			ports: MutationPorts,
		): Promise<Result<PayrollRun>> {
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

			return errorResult.ok(cloneRun(run));
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
			if (nextStatus !== latest.status) {
				const transitionCheck = assertPayrollRunTransition(
					latest.status,
					nextStatus,
				);
				if (!transitionCheck.ok) {
					return transitionCheck;
				}
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
				version: latest.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.runs.set(updated.id, updated);

			const audit = await recordAudit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "payroll_run",
				entityId: updated.id,
				action: "UPDATE",
				changes:
					latest.status === updated.status
						? []
						: [
								{
									field: "status",
									oldValue: latest.status,
									newValue: updated.status,
								},
							],
			});
			if (!audit.ok) {
				state.runs.set(latest.id, latest);
				return audit;
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
