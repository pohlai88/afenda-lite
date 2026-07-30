import { fail, ok } from "@afenda/errors/result";

import type { PayrollDeliveryStorePort } from "./ports";
import type { PayrollDeliveryRecord } from "./types";

function clone(record: PayrollDeliveryRecord): PayrollDeliveryRecord {
	return structuredClone(record);
}

function idempotencyMapKey(organizationId: string, idempotencyKey: string) {
	return `${organizationId}:${idempotencyKey}`;
}

function runSynchronousMemoryOperation<T>(operation: () => T): Promise<T> {
	try {
		return Promise.resolve(operation());
	} catch (error) {
		return Promise.reject(error);
	}
}

export function createMemoryPayrollDeliveryStore(): PayrollDeliveryStorePort & {
	clear: () => void;
} {
	const records = new Map<string, PayrollDeliveryRecord>();
	const idempotency = new Map<string, string>();

	return {
		findByIdempotencyKey(input) {
			return runSynchronousMemoryOperation(() => {
				const id = idempotency.get(
					idempotencyMapKey(input.organizationId, input.idempotencyKey),
				);
				const record = id ? records.get(id) : undefined;
				return ok(record ? clone(record) : null);
			});
		},
		getById(input) {
			return runSynchronousMemoryOperation(() => {
				const record = records.get(input.deliveryId);
				return ok(
					record?.organizationId === input.organizationId
						? clone(record)
						: null,
				);
			});
		},
		listPending(input) {
			return runSynchronousMemoryOperation(() => {
				if (!Number.isInteger(input.limit) || input.limit < 1) {
					return fail(
						"VALIDATION_ERROR",
						"Pending delivery limit must be positive",
					);
				}
				return ok(
					Array.from(records.values())
						.filter(
							(record) =>
								record.organizationId === input.organizationId &&
								record.status === "pending",
						)
						.sort(
							(left, right) =>
								left.createdAt.getTime() - right.createdAt.getTime() ||
								left.id.localeCompare(right.id),
						)
						.slice(0, input.limit)
						.map(clone),
				);
			});
		},
		create(record) {
			return runSynchronousMemoryOperation(() => {
				const key = idempotencyMapKey(
					record.organizationId,
					record.idempotencyKey,
				);
				if (records.has(record.id) || idempotency.has(key)) {
					return fail("CONFLICT", "Payroll delivery already exists");
				}
				records.set(record.id, clone(record));
				idempotency.set(key, record.id);
				return ok(clone(record));
			});
		},
		createCorrection(input) {
			return runSynchronousMemoryOperation(() => {
				const source = records.get(input.source.id);
				const correctionKey = idempotencyMapKey(
					input.correction.organizationId,
					input.correction.idempotencyKey,
				);
				if (
					!source ||
					source.organizationId !== input.source.organizationId ||
					source.version !== input.expectedSourceVersion ||
					source.status !== "correction_required" ||
					source.supersededByDeliveryId !== null
				) {
					return fail("CONFLICT", "Payroll delivery correction conflict");
				}
				if (
					records.has(input.correction.id) ||
					idempotency.has(correctionKey)
				) {
					return fail("CONFLICT", "Payroll delivery already exists");
				}
				const linkedSource: PayrollDeliveryRecord = {
					...source,
					supersededByDeliveryId: input.correction.id,
					version: source.version + 1,
					updatedBy: input.correction.createdBy,
					updatedAt: input.correction.createdAt,
				};
				records.set(source.id, clone(linkedSource));
				records.set(input.correction.id, clone(input.correction));
				idempotency.set(correctionKey, input.correction.id);
				return ok(clone(input.correction));
			});
		},
		update(input) {
			return runSynchronousMemoryOperation(() => {
				const current = records.get(input.deliveryId);
				if (!current || current.organizationId !== input.organizationId) {
					return fail("NOT_FOUND", "Payroll delivery not found");
				}
				if (current.version !== input.expectedVersion) {
					return fail("CONFLICT", "Payroll delivery version conflict");
				}
				if (
					input.next.id !== current.id ||
					input.next.organizationId !== current.organizationId ||
					input.next.idempotencyKey !== current.idempotencyKey ||
					input.next.version !== current.version + 1
				) {
					return fail("VALIDATION_ERROR", "Invalid payroll delivery update");
				}
				records.set(current.id, clone(input.next));
				return ok(clone(input.next));
			});
		},
		clear() {
			records.clear();
			idempotency.clear();
		},
	};
}
