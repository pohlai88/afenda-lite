import { randomUUID } from "node:crypto";

import {
	and,
	db,
	desc,
	eq,
	payment,
	paymentAllocation,
	paymentReversal,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";

import type {
	Payment,
	PaymentAllocation,
	PaymentAllocationTarget,
	PaymentCreateRecord,
	PaymentDirection,
	PaymentRefundRecord,
	PaymentReversal,
	PaymentStatus,
	PaymentsStore,
} from "./model";

function direction(value: string): PaymentDirection {
	if (
		value === "receipt" ||
		value === "disbursement" ||
		value === "refund" ||
		value === "transfer"
	) {
		return value;
	}
	throw new Error(`Invalid payment.direction: ${value}`);
}

function status(value: string): PaymentStatus {
	if (value === "draft" || value === "posted" || value === "reversed") {
		return value;
	}
	throw new Error(`Invalid payment.status: ${value}`);
}

function targetType(value: string): PaymentAllocationTarget {
	if (value === "receivable" || value === "payable") return value;
	throw new Error(`Invalid payment_allocation.target_type: ${value}`);
}

function mapAllocation(
	row: typeof paymentAllocation.$inferSelect,
): PaymentAllocation {
	return {
		id: row.id,
		organizationId: row.organizationId,
		paymentId: row.paymentId,
		targetType: targetType(row.targetType),
		targetId: row.targetId,
		amount: row.amount,
		createdBy: row.createdBy,
		createdAt: row.createdAt,
	};
}

function mapReversal(
	row: typeof paymentReversal.$inferSelect,
): PaymentReversal {
	return {
		id: row.id,
		organizationId: row.organizationId,
		paymentId: row.paymentId,
		reason: row.reason,
		reversedBy: row.reversedBy,
		reversedAt: row.reversedAt,
	};
}

function mapPayment(
	row: typeof payment.$inferSelect,
	allocations: PaymentAllocation[],
	reversal: PaymentReversal | null,
): Payment {
	return {
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		direction: direction(row.direction),
		status: status(row.status),
		counterpartyId: row.counterpartyId,
		originalPaymentId: row.originalPaymentId,
		currencyCode: row.currencyCode,
		amount: row.amount,
		reference: row.reference,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		postedAt: row.postedAt,
		postedBy: row.postedBy,
		reversedAt: row.reversedAt,
		reversedBy: row.reversedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		allocations,
		reversal,
	};
}

async function reload(
	store: DrizzlePaymentsStore,
	organizationId: string,
	id: string,
	message: string,
): Promise<Result<Payment>> {
	const result = await store.getById(organizationId, id);
	if (!result.ok) return result;
	return result.data === null
		? fail("INTERNAL_ERROR", message)
		: ok(result.data);
}

function basePayload(record: {
	organizationId: string;
	entityId: string;
	direction: PaymentDirection;
	counterpartyId: string | null;
	amount: string;
	currencyCode: string;
	actorUserId: string;
	correlationId: string;
}): string {
	return JSON.stringify({
		organizationId: record.organizationId,
		entityId: record.entityId,
		direction: record.direction,
		counterpartyId: record.counterpartyId,
		amount: record.amount,
		currencyCode: record.currencyCode,
		allocations: [],
		actorId: record.actorUserId,
		correlationId: record.correlationId,
	});
}

export class DrizzlePaymentsStore implements PaymentsStore {
	async createDraft(record: PaymentCreateRecord): Promise<Result<Payment>> {
		const id = randomUUID();
		const eventId = randomUUID();
		try {
			const payload = basePayload({
				...record,
				entityId: id,
			});
			await runNeonHttpTransaction((sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO payment (
							id, organization_id, code, normalized_code, direction, status,
							counterparty_id, currency_code, amount, reference, version,
							created_by, updated_by
						) VALUES (
							${id}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
							${record.direction}, 'draft', ${record.counterpartyId},
							${record.currencyCode}, ${record.amount}, ${record.reference}, 1,
							${record.actorUserId}, ${record.actorUserId}
						) RETURNING id
					)
					INSERT INTO platform_domain_event (
						id, organization_id, type, source_module, correlation_id, actor_user_id,
						payload, status, attempts
					)
					SELECT ${eventId}, ${record.organizationId}, 'payments.payment.created.v1',
						'payments', ${record.correlationId}, ${record.actorUserId},
						${payload}::jsonb, 'pending', 0 FROM mutated
				`,
			]);
			return reload(this, record.organizationId, id, "Created payment missing");
		} catch (error) {
			return failFromUnknown(error, "Failed to create payment");
		}
	}

	async addAllocation(
		record: Parameters<PaymentsStore["addAllocation"]>[0],
	): Promise<Result<PaymentAllocation>> {
		const id = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<
				[
					Array<{
						id: string;
						organization_id: string;
						payment_id: string;
						target_type: string;
						target_id: string;
						amount: string;
						created_by: string;
						created_at: Date;
					}>,
				]
			>((sql) => [
				sql`
					WITH eligible AS (
						SELECT p.id FROM payment p
						WHERE p.id = ${record.paymentId}
							AND p.organization_id = ${record.organizationId}
							AND p.status = 'draft'
							AND (
								(p.direction = 'receipt' AND ${record.targetType} = 'receivable')
								OR (p.direction = 'disbursement' AND ${record.targetType} = 'payable')
							)
							AND ${record.amount}::numeric > 0
							AND (
								SELECT COALESCE(SUM(a.amount::numeric), 0)
								FROM payment_allocation a
								WHERE a.payment_id = p.id
									AND a.organization_id = p.organization_id
							) + ${record.amount}::numeric <= p.amount::numeric
					),
					allocated AS (
						INSERT INTO payment_allocation (
							id, organization_id, payment_id, target_type, target_id,
							amount, created_by
						)
						SELECT ${id}, ${record.organizationId}, ${record.paymentId},
							${record.targetType}, ${record.targetId}, ${record.amount},
							${record.actorUserId}
						FROM eligible RETURNING *
					),
					bumped AS (
						UPDATE payment SET version = version + 1,
							updated_by = ${record.actorUserId}, updated_at = now()
						WHERE id = ${record.paymentId}
							AND organization_id = ${record.organizationId}
							AND EXISTS (SELECT 1 FROM allocated)
						RETURNING id
					)
					SELECT allocated.* FROM allocated, bumped
				`,
			]);
			const row = rows[0];
			if (row === undefined)
				return fail("CONFLICT", "Payment allocation conflict");
			return ok({
				id: row.id,
				organizationId: row.organization_id,
				paymentId: row.payment_id,
				targetType: targetType(row.target_type),
				targetId: row.target_id,
				amount: row.amount,
				createdBy: row.created_by,
				createdAt: row.created_at,
			});
		} catch (error) {
			return failFromUnknown(error, "Failed to add payment allocation");
		}
	}

	async post(
		record: Parameters<PaymentsStore["post"]>[0],
	): Promise<Result<Payment>> {
		const eventId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE payment
						SET status = 'posted', posted_at = now(),
							posted_by = ${record.actorUserId}, updated_at = now(),
							updated_by = ${record.actorUserId}, version = version + 1
						WHERE id = ${record.paymentId}
							AND organization_id = ${record.organizationId}
							AND status = 'draft' AND direction <> 'refund'
							AND version = ${record.expectedVersion}
						RETURNING *
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'payments.payment.posted.v1',
							'payments', ${record.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', organization_id, 'entityId', id,
								'direction', direction, 'counterpartyId', counterparty_id,
								'amount', amount, 'currencyCode', currency_code,
								'allocations', (
									SELECT COALESCE(jsonb_agg(jsonb_build_object(
										'targetType', target_type, 'targetId', target_id,
										'amount', amount
									)), '[]'::jsonb)
									FROM payment_allocation
									WHERE payment_id = mutated.id
										AND organization_id = mutated.organization_id
								),
								'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId}
							), 'pending', 0 FROM mutated RETURNING id
					)
					SELECT mutated.id FROM mutated, outboxed
				`,
			]);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Payment post conflict");
			return reload(
				this,
				record.organizationId,
				record.paymentId,
				"Posted payment missing",
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to post payment");
		}
	}

	async reverse(
		record: Parameters<PaymentsStore["reverse"]>[0],
	): Promise<Result<Payment>> {
		const reversalId = randomUUID();
		const eventId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE payment
						SET status = 'reversed', reversed_at = now(),
							reversed_by = ${record.actorUserId}, updated_at = now(),
							updated_by = ${record.actorUserId}, version = version + 1
						WHERE id = ${record.paymentId}
							AND organization_id = ${record.organizationId}
							AND status = 'posted' AND version = ${record.expectedVersion}
						RETURNING *
					),
					reversed AS (
						INSERT INTO payment_reversal (
							id, organization_id, payment_id, reason, reversed_by
						)
						SELECT ${reversalId}, organization_id, id, ${record.reason},
							${record.actorUserId} FROM mutated RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'payments.payment.reversed.v1',
							'payments', ${record.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', organization_id, 'entityId', id,
								'direction', direction, 'counterpartyId', counterparty_id,
								'amount', amount, 'currencyCode', currency_code,
								'allocations', (
									SELECT COALESCE(jsonb_agg(jsonb_build_object(
										'targetType', target_type, 'targetId', target_id,
										'amount', amount
									)), '[]'::jsonb)
									FROM payment_allocation
									WHERE payment_id = mutated.id
										AND organization_id = mutated.organization_id
								),
								'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId},
								'reversalId', ${reversalId}, 'reason', ${record.reason}
							), 'pending', 0 FROM mutated RETURNING id
					)
					SELECT mutated.id FROM mutated, reversed, outboxed
				`,
			]);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Payment reversal conflict");
			return reload(
				this,
				record.organizationId,
				record.paymentId,
				"Reversed payment missing",
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to reverse payment");
		}
	}

	async postRefund(record: PaymentRefundRecord): Promise<Result<Payment>> {
		const id = randomUUID();
		const eventId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH original AS (
						SELECT p.* FROM payment p
						WHERE p.id = ${record.originalPaymentId}
							AND p.organization_id = ${record.organizationId}
							AND p.status = 'posted' AND p.direction <> 'refund'
							AND (
								SELECT COALESCE(SUM(r.amount::numeric), 0)
								FROM payment r
								WHERE r.organization_id = p.organization_id
									AND r.original_payment_id = p.id
									AND r.status = 'posted'
							) + ${record.amount}::numeric <= p.amount::numeric
					),
					mutated AS (
						INSERT INTO payment (
							id, organization_id, code, normalized_code, direction, status,
							counterparty_id, original_payment_id, currency_code, amount,
							reference, version, created_by, updated_by, posted_at, posted_by
						)
						SELECT ${id}, organization_id, ${record.code}, ${record.normalizedCode},
							'refund', 'posted', counterparty_id, id, currency_code,
							${record.amount}, ${record.reference}, 1, ${record.actorUserId},
							${record.actorUserId}, now(), ${record.actorUserId}
						FROM original RETURNING *
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'payments.refund.posted.v1',
							'payments', ${record.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', organization_id, 'entityId', id,
								'direction', direction, 'counterpartyId', counterparty_id,
								'amount', amount, 'currencyCode', currency_code,
								'allocations', '[]'::jsonb,
								'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId},
								'originalPaymentId', original_payment_id
							), 'pending', 0 FROM mutated RETURNING id
					)
					SELECT mutated.id FROM mutated, outboxed
				`,
			]);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Refund post conflict");
			return reload(this, record.organizationId, id, "Posted refund missing");
		} catch (error) {
			return failFromUnknown(error, "Failed to post refund");
		}
	}

	async getById(
		organizationId: string,
		id: string,
	): Promise<Result<Payment | null>> {
		try {
			const [header] = await db
				.select()
				.from(payment)
				.where(
					and(eq(payment.organizationId, organizationId), eq(payment.id, id)),
				)
				.limit(1);
			if (header === undefined) return ok(null);
			const [allocations, reversals] = await Promise.all([
				db
					.select()
					.from(paymentAllocation)
					.where(
						and(
							eq(paymentAllocation.organizationId, organizationId),
							eq(paymentAllocation.paymentId, id),
						),
					),
				db
					.select()
					.from(paymentReversal)
					.where(
						and(
							eq(paymentReversal.organizationId, organizationId),
							eq(paymentReversal.paymentId, id),
						),
					)
					.limit(1),
			]);
			return ok(
				mapPayment(
					header,
					allocations.map(mapAllocation),
					reversals[0] === undefined ? null : mapReversal(reversals[0]),
				),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to load payment");
		}
	}

	async list(
		filter: Parameters<PaymentsStore["list"]>[0],
	): Promise<Result<Payment[]>> {
		try {
			const conditions = [eq(payment.organizationId, filter.organizationId)];
			if (filter.status !== undefined) {
				conditions.push(eq(payment.status, filter.status));
			}
			if (filter.direction !== undefined) {
				conditions.push(eq(payment.direction, filter.direction));
			}
			const headers = await db
				.select()
				.from(payment)
				.where(and(...conditions))
				.orderBy(desc(payment.updatedAt), desc(payment.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			const results = await Promise.all(
				headers.map((row) => this.getById(filter.organizationId, row.id)),
			);
			const payments: Payment[] = [];
			for (const result of results) {
				if (!result.ok) return result;
				if (result.data === null) {
					return fail("INTERNAL_ERROR", "Listed payment missing");
				}
				payments.push(result.data);
			}
			return ok(payments);
		} catch (error) {
			return failFromUnknown(error, "Failed to list payments");
		}
	}
}

export function createDrizzlePaymentsStore(): DrizzlePaymentsStore {
	return new DrizzlePaymentsStore();
}
