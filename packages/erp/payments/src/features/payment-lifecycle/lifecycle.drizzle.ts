import { randomUUID } from "node:crypto";

import {
	database as afendaDatabase,
	and,
	desc,
	eq,
	payment,
	paymentAllocation,
	paymentReversal,
} from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

import type {
	Payment,
	PaymentApplicationInstruction,
	PaymentDirection,
	PaymentPurpose,
	PaymentReversal,
	PaymentStatus,
} from "../../kernel/contracts/domain";
import {
	APPLICATION_STATUSES,
	PAYMENT_DIRECTIONS,
	PAYMENT_PURPOSES,
	PAYMENT_STATUSES,
} from "../../kernel/contracts/domain";
import type {
	PaymentCreateRecord,
	PaymentsLifecycleStore,
} from "./lifecycle.store";

function failFromPersistence(error: unknown, _fallbackMessage: string) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

function parseEnum<T extends string>(
	value: string,
	values: readonly T[],
	field: string,
): T {
	const found = values.find((candidate) => candidate === value);
	if (found === undefined) {
		throw new Error(`Invalid ${field}: ${value}`);
	}
	return found;
}

function parseSnapshot(value: string | null): Record<string, unknown> | null {
	if (value === null || value.trim().length === 0) {
		return null;
	}
	const parsed: unknown = JSON.parse(value);
	if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error("Invalid payment.counterparty_snapshot");
	}
	return parsed as Record<string, unknown>;
}

function mapInstruction(
	row: typeof paymentAllocation.$inferSelect,
): PaymentApplicationInstruction {
	return {
		id: row.id,
		organizationId: row.organizationId,
		paymentId: row.paymentId,
		targetModule: parseEnum(
			row.targetModule,
			["receivables", "payables"] as const,
			"payment_allocation.target_module",
		),
		targetDocumentType: parseEnum(
			row.targetDocumentType,
			[
				"customer_invoice",
				"customer_credit",
				"supplier_invoice",
				"supplier_credit",
			] as const,
			"payment_allocation.target_document_type",
		),
		targetDocumentId: row.targetDocumentId,
		intendedAmount: row.intendedAmount,
		appliedAmount: row.appliedAmount,
		currencyCode: row.currencyCode,
		status: parseEnum(
			row.status,
			APPLICATION_STATUSES,
			"payment_allocation.status",
		),
		rejectionCode: row.rejectionCode,
		createdBy: row.createdBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
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
	instructions: PaymentApplicationInstruction[],
	reversal: PaymentReversal | null,
): Payment {
	return {
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		paymentAccountId: row.paymentAccountId,
		direction: parseEnum(
			row.direction,
			PAYMENT_DIRECTIONS,
			"payment.direction",
		),
		purpose: parseEnum(row.purpose, PAYMENT_PURPOSES, "payment.purpose"),
		status: parseEnum(row.status, PAYMENT_STATUSES, "payment.status"),
		counterpartyId: row.counterpartyId,
		counterpartySnapshot: parseSnapshot(row.counterpartySnapshot),
		transferGroupId: row.transferGroupId,
		linkedPaymentId: row.linkedPaymentId,
		originalPaymentId: row.originalPaymentId,
		refundSource:
			row.refundSource === null
				? null
				: parseEnum(
						row.refundSource,
						["customer_payment", "customer_credit", "manual"] as const,
						"payment.refund_source",
					),
		currencyCode: row.currencyCode,
		amount: row.amount,
		reference: row.reference,
		createIdempotencyKey: row.createIdempotencyKey,
		postIdempotencyKey: row.postIdempotencyKey,
		reverseIdempotencyKey: row.reverseIdempotencyKey,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		postedAt: row.postedAt,
		postedBy: row.postedBy,
		reversedAt: row.reversedAt,
		reversedBy: row.reversedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		applicationInstructions: instructions,
		reversal,
	};
}

function paymentPayload(record: {
	organizationId: string;
	paymentId: string;
	paymentAccountId: string;
	direction: PaymentDirection;
	purpose: PaymentPurpose;
	status: PaymentStatus;
	amount: string;
	currencyCode: string;
	transferGroupId: string | null;
	linkedPaymentId: string | null;
	originalPaymentId: string | null;
	actorUserId: string;
	correlationId: string;
}): string {
	return JSON.stringify({
		organizationId: record.organizationId,
		paymentId: record.paymentId,
		paymentAccountId: record.paymentAccountId,
		direction: record.direction,
		purpose: record.purpose,
		status: record.status,
		amount: record.amount,
		currencyCode: record.currencyCode,
		transferGroupId: record.transferGroupId,
		linkedPaymentId: record.linkedPaymentId,
		originalPaymentId: record.originalPaymentId,
		actorId: record.actorUserId,
		correlationId: record.correlationId,
	});
}

async function getById(
	organizationId: string,
	id: string,
): Promise<Result<Payment | null>> {
	try {
		const [header] = await afendaDatabase.client
			.select()
			.from(payment)
			.where(
				and(eq(payment.organizationId, organizationId), eq(payment.id, id)),
			)
			.limit(1);
		if (header === undefined) {
			return errorResult.ok(null);
		}
		const [instructions, reversals] = await Promise.all([
			afendaDatabase.client
				.select()
				.from(paymentAllocation)
				.where(
					and(
						eq(paymentAllocation.organizationId, organizationId),
						eq(paymentAllocation.paymentId, id),
					),
				),
			afendaDatabase.client
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
		return errorResult.ok(
			mapPayment(
				header,
				instructions.map(mapInstruction),
				reversals[0] === undefined ? null : mapReversal(reversals[0]),
			),
		);
	} catch (error) {
		return failFromPersistence(error, "Failed to load payment");
	}
}

async function reload(
	organizationId: string,
	id: string,
	_message: string,
): Promise<Result<Payment>> {
	const result = await getById(organizationId, id);
	if (!result.ok) {
		return result;
	}
	return result.data === null
		? errorResult.fail("INTERNAL_ERROR")
		: errorResult.ok(result.data);
}

export const drizzlePaymentLifecycleMethods: PaymentsLifecycleStore = {
	async createDraft(record: PaymentCreateRecord): Promise<Result<Payment>> {
		const id = randomUUID();
		const eventId = randomUUID();
		const snapshot =
			record.counterpartySnapshot === null
				? null
				: JSON.stringify(record.counterpartySnapshot);
		const payload = paymentPayload({
			organizationId: record.organizationId,
			paymentId: id,
			paymentAccountId: record.paymentAccountId,
			direction: record.direction,
			purpose: record.purpose,
			status: "draft",
			amount: record.amount,
			currencyCode: record.currencyCode,
			transferGroupId: record.transferGroupId,
			linkedPaymentId: record.linkedPaymentId,
			originalPaymentId: record.originalPaymentId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
		});
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					WITH account AS (
						SELECT id FROM payment_account
						WHERE id = ${record.paymentAccountId}
							AND organization_id = ${record.organizationId}
							AND active = true
							AND currency_code = ${record.currencyCode}
					),
					mutated AS (
						INSERT INTO payment (
							id, organization_id, code, normalized_code, payment_account_id,
							direction, purpose, status, counterparty_id, counterparty_snapshot,
							transfer_group_id, linked_payment_id, original_payment_id, refund_source,
							currency_code, amount, reference, create_idempotency_key, version,
							created_by, updated_by
						)
						SELECT ${id}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
							account.id, ${record.direction}, ${record.purpose}, 'draft',
							${record.counterpartyId}, ${snapshot}, ${record.transferGroupId},
							${record.linkedPaymentId}, ${record.originalPaymentId}, ${record.refundSource},
							${record.currencyCode}, ${record.amount}, ${record.reference},
							${record.createIdempotencyKey}, 1, ${record.actorUserId}, ${record.actorUserId}
						FROM account
						RETURNING id
					)
					INSERT INTO platform_domain_event (
						id, organization_id, type, source_module, correlation_id, actor_user_id,
						payload, status, attempts
					)
					SELECT ${eventId}, ${record.organizationId}, 'payments.payment.created.v1',
						'payments', ${record.correlationId}, ${record.actorUserId},
						${payload}::jsonb, 'pending', 0
					FROM mutated
					RETURNING id
				`,
			]);
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Payment create conflict",
				});
			}
			return reload(record.organizationId, id, "Created payment missing");
		} catch (error) {
			return failFromPersistence(error, "Failed to create payment");
		}
	},

	async post(
		record: Parameters<PaymentsLifecycleStore["post"]>[0],
	): Promise<Result<Payment>> {
		const eventId = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					WITH mutated AS (
						UPDATE payment
						SET status = 'posted',
							posted_at = now(),
							posted_by = ${record.actorUserId},
							post_idempotency_key = ${record.idempotencyKey},
							updated_at = now(),
							updated_by = ${record.actorUserId},
							version = version + 1
						WHERE id = ${record.paymentId}
							AND organization_id = ${record.organizationId}
							AND status = 'draft'
							AND direction <> 'refund'
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
								'organizationId', organization_id,
								'paymentId', id,
								'paymentAccountId', payment_account_id,
								'direction', direction,
								'purpose', purpose,
								'status', status,
								'amount', amount,
								'currencyCode', currency_code,
								'transferGroupId', transfer_group_id,
								'linkedPaymentId', linked_payment_id,
								'originalPaymentId', original_payment_id,
								'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId}
							), 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.id FROM mutated, outboxed
				`,
			]);
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Payment post conflict",
				});
			}
			return reload(
				record.organizationId,
				record.paymentId,
				"Posted payment missing",
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to post payment");
		}
	},

	async reverse(
		record: Parameters<PaymentsLifecycleStore["reverse"]>[0],
	): Promise<Result<Payment>> {
		const reversalId = randomUUID();
		const eventId = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					WITH mutated AS (
						UPDATE payment
						SET status = 'reversed',
							reversed_at = now(),
							reversed_by = ${record.actorUserId},
							reverse_idempotency_key = ${record.idempotencyKey},
							updated_at = now(),
							updated_by = ${record.actorUserId},
							version = version + 1
						WHERE id = ${record.paymentId}
							AND organization_id = ${record.organizationId}
							AND status = 'posted'
							AND version = ${record.expectedVersion}
						RETURNING *
					),
					reversed AS (
						INSERT INTO payment_reversal (
							id, organization_id, payment_id, reason, reversed_by
						)
						SELECT ${reversalId}, organization_id, id, ${record.reason},
							${record.actorUserId}
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'payments.payment.reversed.v1',
							'payments', ${record.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', organization_id,
								'paymentId', id,
								'paymentAccountId', payment_account_id,
								'direction', direction,
								'purpose', purpose,
								'status', status,
								'amount', amount,
								'currencyCode', currency_code,
								'transferGroupId', transfer_group_id,
								'linkedPaymentId', linked_payment_id,
								'originalPaymentId', original_payment_id,
								'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId},
								'reversalId', ${reversalId},
								'reason', ${record.reason}
							), 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.id FROM mutated, reversed, outboxed
				`,
			]);
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Payment reversal conflict",
				});
			}
			return reload(
				record.organizationId,
				record.paymentId,
				"Reversed payment missing",
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to reverse payment");
		}
	},

	async createAndPostTransfer(
		record: Parameters<PaymentsLifecycleStore["createAndPostTransfer"]>[0],
	): Promise<Result<{ outgoing: Payment; incoming: Payment }>> {
		if (record.fromPaymentAccountId === record.toPaymentAccountId) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Transfer accounts must differ",
			});
		}
		const groupId = randomUUID();
		const outgoingId = randomUUID();
		const incomingId = randomUUID();
		const eventId = randomUUID();
		const outgoingCode = `${record.code}-OUT`;
		const incomingCode = `${record.code}-IN`;
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					WITH from_account AS (
						SELECT id, currency_code FROM payment_account
						WHERE id = ${record.fromPaymentAccountId}
							AND organization_id = ${record.organizationId}
							AND active = true
							AND currency_code = ${record.currencyCode}
					),
					to_account AS (
						SELECT id, currency_code FROM payment_account
						WHERE id = ${record.toPaymentAccountId}
							AND organization_id = ${record.organizationId}
							AND active = true
							AND currency_code = ${record.currencyCode}
							AND id <> ${record.fromPaymentAccountId}
					),
					outgoing AS (
						INSERT INTO payment (
							id, organization_id, code, normalized_code, payment_account_id,
							direction, purpose, status, currency_code, amount, reference,
							transfer_group_id, linked_payment_id, create_idempotency_key,
							post_idempotency_key, version, created_by, updated_by,
							posted_at, posted_by
						)
						SELECT ${outgoingId}, ${record.organizationId}, ${outgoingCode},
							${`${record.normalizedCode}-OUT`}, from_account.id, 'disbursement',
							'internal_transfer', 'posted', ${record.currencyCode}, ${record.amount},
							${record.reference}, ${groupId}, ${incomingId},
							${`${record.idempotencyKey}:out`}, ${record.idempotencyKey}, 1,
							${record.actorUserId}, ${record.actorUserId}, now(), ${record.actorUserId}
						FROM from_account, to_account
						RETURNING id
					),
					incoming AS (
						INSERT INTO payment (
							id, organization_id, code, normalized_code, payment_account_id,
							direction, purpose, status, currency_code, amount, reference,
							transfer_group_id, linked_payment_id, create_idempotency_key,
							post_idempotency_key, version, created_by, updated_by,
							posted_at, posted_by
						)
						SELECT ${incomingId}, ${record.organizationId}, ${incomingCode},
							${`${record.normalizedCode}-IN`}, to_account.id, 'receipt',
							'internal_transfer', 'posted', ${record.currencyCode}, ${record.amount},
							${record.reference}, ${groupId}, ${outgoingId},
							${`${record.idempotencyKey}:in`}, ${record.idempotencyKey}, 1,
							${record.actorUserId}, ${record.actorUserId}, now(), ${record.actorUserId}
						FROM from_account, to_account, outgoing
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, ${record.organizationId}, 'payments.transfer.posted.v1',
							'payments', ${record.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', ${record.organizationId},
								'transferGroupId', ${groupId},
								'outgoingPaymentId', ${outgoingId},
								'incomingPaymentId', ${incomingId},
								'amount', ${record.amount},
								'currencyCode', ${record.currencyCode},
								'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId}
							), 'pending', 0
						FROM outgoing, incoming
						RETURNING id
					)
					SELECT outgoing.id FROM outgoing, incoming, outboxed
				`,
			]);
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Payment transfer conflict",
				});
			}
			const [outgoing, incoming] = await Promise.all([
				getById(record.organizationId, outgoingId),
				getById(record.organizationId, incomingId),
			]);
			if (!outgoing.ok) {
				return outgoing;
			}
			if (!incoming.ok) {
				return incoming;
			}
			if (outgoing.data === null || incoming.data === null) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok({
				outgoing: outgoing.data,
				incoming: incoming.data,
			});
		} catch (error) {
			return failFromPersistence(error, "Failed to create payment transfer");
		}
	},

	async postRefund(
		record: Parameters<PaymentsLifecycleStore["postRefund"]>[0],
	): Promise<Result<Payment>> {
		const id = randomUUID();
		const eventId = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					WITH original AS (
						SELECT p.*
						FROM payment p
						WHERE p.id = ${record.originalPaymentId}
							AND p.organization_id = ${record.organizationId}
							AND p.status = 'posted'
							AND p.direction <> 'refund'
							AND (
								SELECT COALESCE(SUM(r.amount::numeric), 0)
								FROM payment r
								WHERE r.organization_id = p.organization_id
									AND r.original_payment_id = p.id
									AND r.status = 'posted'
							) + ${record.amount}::numeric <= p.amount::numeric
					),
					account AS (
						SELECT a.id
						FROM payment_account a, original
						WHERE a.id = ${record.paymentAccountId}
							AND a.organization_id = ${record.organizationId}
							AND a.active = true
							AND a.currency_code = original.currency_code
					),
					mutated AS (
						INSERT INTO payment (
							id, organization_id, code, normalized_code, payment_account_id,
							direction, purpose, status, counterparty_id, counterparty_snapshot,
							original_payment_id, refund_source, currency_code, amount, reference,
							create_idempotency_key, post_idempotency_key, version,
							created_by, updated_by, posted_at, posted_by
						)
						SELECT ${id}, original.organization_id, ${record.code}, ${record.normalizedCode},
							account.id, 'refund',
							CASE WHEN original.direction = 'receipt' THEN 'customer_refund'
								ELSE 'supplier_refund_receipt' END,
							'posted', original.counterparty_id, original.counterparty_snapshot,
							original.id, ${record.refundSource}, original.currency_code,
							${record.amount}, ${record.reference}, ${record.createIdempotencyKey},
							${record.createIdempotencyKey}, 1, ${record.actorUserId},
							${record.actorUserId}, now(), ${record.actorUserId}
						FROM original, account
						RETURNING *
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'payments.refund.posted.v1',
							'payments', ${record.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', organization_id,
								'paymentId', id,
								'paymentAccountId', payment_account_id,
								'direction', direction,
								'purpose', purpose,
								'status', status,
								'amount', amount,
								'currencyCode', currency_code,
								'transferGroupId', transfer_group_id,
								'linkedPaymentId', linked_payment_id,
								'originalPaymentId', original_payment_id,
								'refundSource', refund_source,
								'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId}
							), 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.id FROM mutated, outboxed
				`,
			]);
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Refund post conflict",
				});
			}
			return reload(record.organizationId, id, "Posted refund missing");
		} catch (error) {
			return failFromPersistence(error, "Failed to post refund");
		}
	},

	getById,

	async list(
		filter: Parameters<PaymentsLifecycleStore["list"]>[0],
	): Promise<Result<Payment[]>> {
		try {
			const conditions = [eq(payment.organizationId, filter.organizationId)];
			if (filter.status !== undefined) {
				conditions.push(eq(payment.status, filter.status));
			}
			if (filter.direction !== undefined) {
				conditions.push(eq(payment.direction, filter.direction));
			}
			const headers = await afendaDatabase.client
				.select()
				.from(payment)
				.where(and(...conditions))
				.orderBy(desc(payment.updatedAt), desc(payment.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			const results = await Promise.all(
				headers.map((row) => getById(filter.organizationId, row.id)),
			);
			const payments: Payment[] = [];
			for (const result of results) {
				if (!result.ok) {
					return result;
				}
				if (result.data === null) {
					return errorResult.fail("INTERNAL_ERROR");
				}
				payments.push(result.data);
			}
			return errorResult.ok(payments);
		} catch (error) {
			return failFromPersistence(error, "Failed to list payments");
		}
	},
};
