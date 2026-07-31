import {
	database as afendaDatabase,
	and,
	asc,
	eq,
	hrPayrollHandoffDelivery,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import { approvedPayrollHandoffSchema } from "@afenda/events/schemas";

import type { PayrollDeliveryStorePort } from "../../integrations/payroll-delivery/ports";
import type {
	PayrollDeliveryRecord,
	PayrollDeliveryStatus,
} from "../../integrations/payroll-delivery/types";
import {
	isPostgresUniqueViolation,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";

type PayrollDeliveryRow = typeof hrPayrollHandoffDelivery.$inferSelect;

const PAYROLL_DELIVERY_STATUSES = new Set<string>([
	"pending",
	"delivered",
	"acknowledged",
	"rejected",
	"correction_required",
	"failed",
]);

function parseDate(value: unknown, _field: string): Result<Date> {
	const parsed = value instanceof Date ? value : new Date(String(value));
	return Number.isNaN(parsed.getTime())
		? errorResult.fail("INTERNAL_ERROR")
		: errorResult.ok(parsed);
}

function parseNullableDate(value: unknown, field: string): Result<Date | null> {
	return value === null || value === undefined
		? errorResult.ok(null)
		: parseDate(value, field);
}

function mapRow(row: PayrollDeliveryRow): Result<PayrollDeliveryRecord> {
	const payload = approvedPayrollHandoffSchema.safeParse(row.payload);
	if (!payload.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	if (!PAYROLL_DELIVERY_STATUSES.has(row.status)) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	const createdAt = parseDate(row.createdAt, "createdAt");
	if (!createdAt.ok) {
		return createdAt;
	}
	const updatedAt = parseDate(row.updatedAt, "updatedAt");
	if (!updatedAt.ok) {
		return updatedAt;
	}
	const lastAttemptAt = parseNullableDate(row.lastAttemptAt, "lastAttemptAt");
	if (!lastAttemptAt.ok) {
		return lastAttemptAt;
	}
	const deliveredAt = parseNullableDate(row.deliveredAt, "deliveredAt");
	if (!deliveredAt.ok) {
		return deliveredAt;
	}
	const feedbackAt = parseNullableDate(row.feedbackAt, "feedbackAt");
	if (!feedbackAt.ok) {
		return feedbackAt;
	}
	return errorResult.ok({
		id: row.id,
		organizationId: row.organizationId,
		correlationId: row.correlationId,
		idempotencyKey: row.idempotencyKey,
		requestFingerprint: row.requestFingerprint,
		payloadHash: row.payloadHash,
		payload: payload.data,
		status: row.status as PayrollDeliveryStatus,
		version: row.version,
		attemptCount: row.attemptCount,
		maxAttempts: row.maxAttempts,
		lastAttemptAt: lastAttemptAt.data,
		lastError: row.lastError,
		deliveredAt: deliveredAt.data,
		producerReceiptId: row.producerReceiptId,
		feedbackAt: feedbackAt.data,
		feedbackBy: row.feedbackBy,
		feedbackReason: row.feedbackReason,
		supersedesDeliveryId: row.supersedesDeliveryId,
		supersededByDeliveryId: row.supersededByDeliveryId,
		createdBy: row.createdBy,
		createdAt: createdAt.data,
		updatedBy: row.updatedBy,
		updatedAt: updatedAt.data,
	});
}

function values(record: PayrollDeliveryRecord) {
	return {
		id: record.id,
		organizationId: record.organizationId,
		correlationId: record.correlationId,
		idempotencyKey: record.idempotencyKey,
		requestFingerprint: record.requestFingerprint,
		payloadHash: record.payloadHash,
		payload: record.payload,
		status: record.status,
		version: record.version,
		attemptCount: record.attemptCount,
		maxAttempts: record.maxAttempts,
		lastAttemptAt: record.lastAttemptAt,
		lastError: record.lastError,
		deliveredAt: record.deliveredAt,
		producerReceiptId: record.producerReceiptId,
		feedbackAt: record.feedbackAt,
		feedbackBy: record.feedbackBy,
		feedbackReason: record.feedbackReason,
		supersedesDeliveryId: record.supersedesDeliveryId,
		supersededByDeliveryId: record.supersededByDeliveryId,
		createdBy: record.createdBy,
		createdAt: record.createdAt,
		updatedBy: record.updatedBy,
		updatedAt: record.updatedAt,
	};
}

function mutableValues(record: PayrollDeliveryRecord) {
	return {
		status: record.status,
		version: record.version,
		attemptCount: record.attemptCount,
		maxAttempts: record.maxAttempts,
		lastAttemptAt: record.lastAttemptAt,
		lastError: record.lastError,
		deliveredAt: record.deliveredAt,
		producerReceiptId: record.producerReceiptId,
		feedbackAt: record.feedbackAt,
		feedbackBy: record.feedbackBy,
		feedbackReason: record.feedbackReason,
		supersededByDeliveryId: record.supersededByDeliveryId,
		updatedBy: record.updatedBy,
		updatedAt: record.updatedAt,
	};
}

async function mapOptional(
	row: PayrollDeliveryRow | undefined,
): Promise<Result<PayrollDeliveryRecord | null>> {
	if (row === undefined) {
		return await errorResult.ok(null);
	}
	return await mapRow(row);
}

export function createDrizzlePayrollDeliveryStore(): PayrollDeliveryStorePort {
	return {
		async findByIdempotencyKey(input) {
			try {
				const rows = await afendaDatabase.client
					.select()
					.from(hrPayrollHandoffDelivery)
					.where(
						and(
							eq(hrPayrollHandoffDelivery.organizationId, input.organizationId),
							eq(hrPayrollHandoffDelivery.idempotencyKey, input.idempotencyKey),
						),
					)
					.limit(1);
				return mapOptional(rows[0]);
			} catch (error) {
				return mapPersistenceFailure(error, "Failed to find payroll delivery");
			}
		},
		async getById(input) {
			try {
				const rows = await afendaDatabase.client
					.select()
					.from(hrPayrollHandoffDelivery)
					.where(
						and(
							eq(hrPayrollHandoffDelivery.organizationId, input.organizationId),
							eq(hrPayrollHandoffDelivery.id, input.deliveryId),
						),
					)
					.limit(1);
				return mapOptional(rows[0]);
			} catch (error) {
				return mapPersistenceFailure(error, "Failed to get payroll delivery");
			}
		},
		async listPending(input) {
			if (
				!Number.isInteger(input.limit) ||
				input.limit < 1 ||
				input.limit > 500
			) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}
			try {
				const rows = await afendaDatabase.client
					.select()
					.from(hrPayrollHandoffDelivery)
					.where(
						and(
							eq(hrPayrollHandoffDelivery.organizationId, input.organizationId),
							eq(hrPayrollHandoffDelivery.status, "pending"),
						),
					)
					.orderBy(
						asc(hrPayrollHandoffDelivery.createdAt),
						asc(hrPayrollHandoffDelivery.id),
					)
					.limit(input.limit);
				const mapped: PayrollDeliveryRecord[] = [];
				for (const row of rows) {
					const record = mapRow(row);
					if (!record.ok) {
						return record;
					}
					mapped.push(record.data);
				}
				return errorResult.ok(mapped);
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to list payroll deliveries",
				);
			}
		},
		async create(record) {
			try {
				const rows = await afendaDatabase.client
					.insert(hrPayrollHandoffDelivery)
					.values(values(record))
					.returning();
				const [row] = rows;
				return row ? mapRow(row) : errorResult.fail("INTERNAL_ERROR");
			} catch (error) {
				return isPostgresUniqueViolation(error)
					? errorResult.fail("CONFLICT", {
							publicMessage: "The request conflicts with current state",
						})
					: mapPersistenceFailure(error, "Failed to create payroll delivery");
			}
		},
		async createCorrection(input) {
			const { correction } = input;
			try {
				const [rows] = await afendaDatabase.transaction((sqlTag) => [
					sqlTag`
							WITH linked_source AS (
								UPDATE hr_payroll_handoff_delivery
								SET superseded_by_delivery_id = ${correction.id},
									version = version + 1,
									updated_by = ${correction.createdBy},
									updated_at = ${correction.createdAt}
								WHERE id = ${input.source.id}
									AND organization_id = ${input.source.organizationId}
									AND version = ${input.expectedSourceVersion}
									AND status = 'correction_required'
									AND superseded_by_delivery_id IS NULL
								RETURNING id
							), inserted AS (
								INSERT INTO hr_payroll_handoff_delivery (
									id, organization_id, correlation_id, idempotency_key,
									request_fingerprint, payload_hash, payload, status, version,
									attempt_count, max_attempts, last_attempt_at, last_error,
									delivered_at, producer_receipt_id, feedback_at, feedback_by,
									feedback_reason, supersedes_delivery_id, superseded_by_delivery_id,
									created_by, created_at, updated_by, updated_at
								)
								SELECT
									${correction.id}, ${correction.organizationId}, ${correction.correlationId},
									${correction.idempotencyKey}, ${correction.requestFingerprint},
									${correction.payloadHash}, ${JSON.stringify(correction.payload)}::jsonb,
									${correction.status}, ${correction.version}, ${correction.attemptCount},
									${correction.maxAttempts}, ${correction.lastAttemptAt}, ${correction.lastError},
									${correction.deliveredAt}, ${correction.producerReceiptId}, ${correction.feedbackAt},
									${correction.feedbackBy}, ${correction.feedbackReason}, ${correction.supersedesDeliveryId},
									${correction.supersededByDeliveryId}, ${correction.createdBy}, ${correction.createdAt},
									${correction.updatedBy}, ${correction.updatedAt}
								FROM linked_source
								RETURNING *
							)
							SELECT * FROM inserted
						`,
				]);
				if (!rows[0]) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
					});
				}
				const inserted = await afendaDatabase.client
					.select()
					.from(hrPayrollHandoffDelivery)
					.where(
						and(
							eq(
								hrPayrollHandoffDelivery.organizationId,
								correction.organizationId,
							),
							eq(hrPayrollHandoffDelivery.id, correction.id),
						),
					)
					.limit(1);
				const [row] = inserted;
				return row ? mapRow(row) : errorResult.fail("INTERNAL_ERROR");
			} catch (error) {
				return isPostgresUniqueViolation(error)
					? errorResult.fail("CONFLICT", {
							publicMessage: "The request conflicts with current state",
						})
					: mapPersistenceFailure(error, "Failed to create payroll correction");
			}
		},
		async update(input) {
			if (
				input.next.id !== input.deliveryId ||
				input.next.organizationId !== input.organizationId ||
				input.next.idempotencyKey.trim().length === 0 ||
				input.next.version !== input.expectedVersion + 1
			) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "The submitted data is invalid",
				});
			}
			try {
				const rows = await afendaDatabase.client
					.update(hrPayrollHandoffDelivery)
					.set(mutableValues(input.next))
					.where(
						and(
							eq(hrPayrollHandoffDelivery.organizationId, input.organizationId),
							eq(hrPayrollHandoffDelivery.id, input.deliveryId),
							eq(hrPayrollHandoffDelivery.version, input.expectedVersion),
						),
					)
					.returning();
				const [row] = rows;
				return row
					? mapRow(row)
					: errorResult.fail("CONFLICT", {
							publicMessage: "The request conflicts with current state",
						});
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Failed to update payroll delivery",
				);
			}
		},
	};
}
