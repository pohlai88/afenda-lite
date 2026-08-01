// biome-ignore-all lint/suspicious/useAwait: Deterministic memory store mirrors the async production contract.
import { randomUUID } from "node:crypto";
import { errorResult } from "@afenda/errors";
import { parsePayrollReconciliationId } from "../../brands";
import { mapConflict, mapNotFound } from "../../shared/persistence-errors";
import type { PayrollReconciliationStore } from "../../store/reconciliation";
import type { PayrollReconciliation } from "../../types";
import { idempotencyMapKey, type MemoryPayrollStoreState } from "./state";

export function createMemoryReconciliationMethods(
	state: MemoryPayrollStoreState,
): PayrollReconciliationStore {
	return {
		async findReconciliationByIdempotencyKey(input) {
			const found = state.reconciliation.idempotency.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			return errorResult.ok(found ?? null);
		},
		async createReconciliation(record, ports) {
			const run = state.runs.runs.get(record.runId);
			if (run === undefined || run.organizationId !== record.organizationId) {
				return mapNotFound("Payroll run not found");
			}
			const key = idempotencyMapKey(
				record.organizationId,
				record.idempotencyKey,
			);
			const existing = state.reconciliation.idempotency.get(key);
			if (existing !== undefined) {
				return existing.createRequestFingerprint ===
					record.createRequestFingerprint
					? errorResult.ok(existing.entity)
					: mapConflict("Idempotency key conflict");
			}
			const id = parsePayrollReconciliationId(randomUUID());
			if (!id.ok) {
				return id;
			}
			const now = new Date();
			const entity: PayrollReconciliation = {
				id: id.data,
				organizationId: record.organizationId,
				runId: record.runId,
				kind: record.kind,
				downstreamReference: record.downstreamReference,
				expectedAmount: record.expectedAmount,
				actualAmount: record.actualAmount,
				toleranceAmount: record.toleranceAmount,
				currencyCode: record.currencyCode,
				status: record.status,
				resolutionNote: null,
				resolvedBy: null,
				resolvedAt: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.reconciliation.reconciliations.set(entity.id, entity);
			state.reconciliation.idempotency.set(key, {
				entity,
				createRequestFingerprint: record.createRequestFingerprint,
			});
			const audit = await ports.audit.record({
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				entity: "payroll_reconciliation",
				entityId: entity.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.reconciliation.reconciliations.delete(entity.id);
				state.reconciliation.idempotency.delete(key);
				return audit;
			}
			return errorResult.ok(entity);
		},
		async listReconciliationsForRun(input) {
			return errorResult.ok(
				[...state.reconciliation.reconciliations.values()].filter(
					(entity) =>
						entity.organizationId === input.organizationId &&
						entity.runId === input.runId,
				),
			);
		},
		async resolveReconciliation(input, ports) {
			const current = state.reconciliation.reconciliations.get(
				input.reconciliationId,
			);
			if (
				current === undefined ||
				current.organizationId !== input.organizationId
			) {
				return mapNotFound("Payroll reconciliation not found");
			}
			if (current.version !== input.expectedVersion) {
				return mapConflict("Payroll reconciliation version is stale");
			}
			if (current.status !== "discrepant") {
				return mapConflict("Only discrepant reconciliations can be resolved");
			}
			const now = new Date();
			const resolved: PayrollReconciliation = {
				...current,
				status: "resolved",
				resolutionNote: input.resolutionNote,
				resolvedBy: input.actorUserId,
				resolvedAt: now,
				version: current.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.reconciliation.reconciliations.set(resolved.id, resolved);
			const idempotencyEntries = [
				...state.reconciliation.idempotency.entries(),
			].filter(([, record]) => record.entity.id === resolved.id);
			for (const [key, record] of idempotencyEntries) {
				state.reconciliation.idempotency.set(key, {
					...record,
					entity: resolved,
				});
			}
			const audit = await ports.audit.record({
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "payroll_reconciliation",
				entityId: resolved.id,
				action: "UPDATE",
				changes: [
					{ field: "status", oldValue: "discrepant", newValue: "resolved" },
				],
			});
			if (!audit.ok) {
				state.reconciliation.reconciliations.set(current.id, current);
				for (const [key, record] of idempotencyEntries) {
					state.reconciliation.idempotency.set(key, record);
				}
				return audit;
			}
			return errorResult.ok(resolved);
		},
	};
}
