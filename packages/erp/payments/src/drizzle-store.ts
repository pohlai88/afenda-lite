import { randomUUID } from "node:crypto";

import {
	and,
	db,
	desc,
	eq,
	payment,
	paymentAccount,
	paymentAllocation,
	paymentReversal,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";

import {
	PAYMENTS_ERROR_INSTRUCTION_NOT_FOUND,
	PAYMENTS_ERROR_INSUFFICIENT_AVAILABILITY,
	PAYMENTS_ERROR_PAYMENT_NOT_FOUND,
	PAYMENTS_ERROR_REFUND_LIMIT_EXCEEDED,
	PAYMENTS_ERROR_TRANSFER_INVALID,
} from "./error-codes";
import { failPayments } from "./fail-payments";
import type {
	Payment,
	PaymentAccount,
	PaymentApplicationAvailability,
	PaymentApplicationInstruction,
	PaymentApplicationInstructionStatus,
	PaymentApplicationTargetDocumentType,
	PaymentApplicationTargetModule,
	PaymentCreateRecord,
	PaymentDirection,
	PaymentPurpose,
	PaymentReversal,
	PaymentStatus,
	PaymentsStore,
} from "./model";
import {
	APPLICATION_STATUSES,
	PAYMENT_ACCOUNT_KINDS,
	PAYMENT_DIRECTIONS,
	PAYMENT_PURPOSES,
	PAYMENT_STATUSES,
} from "./model";

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
	if (value === null || value.trim().length === 0) return null;
	const parsed: unknown = JSON.parse(value);
	if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error("Invalid payment.counterparty_snapshot");
	}
	return parsed as Record<string, unknown>;
}

function mapAccount(row: typeof paymentAccount.$inferSelect): PaymentAccount {
	return {
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		name: row.name,
		kind: parseEnum(row.kind, PAYMENT_ACCOUNT_KINDS, "payment_account.kind"),
		currencyCode: row.currencyCode,
		active: row.active,
		createdBy: row.createdBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
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

export class DrizzlePaymentsStore implements PaymentsStore {
	async createPaymentAccount(
		record: Omit<PaymentAccount, "id" | "createdAt" | "updatedAt">,
	): Promise<Result<PaymentAccount>> {
		const id = randomUUID();
		try {
			const [row] = await db
				.insert(paymentAccount)
				.values({
					id,
					organizationId: record.organizationId,
					code: record.code,
					normalizedCode: record.normalizedCode,
					name: record.name,
					kind: record.kind,
					currencyCode: record.currencyCode,
					active: record.active,
					createdBy: record.createdBy,
				})
				.returning();
			if (row === undefined) {
				return fail("INTERNAL_ERROR", "Failed to create payment account");
			}
			return ok(mapAccount(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to create payment account");
		}
	}

	async listPaymentAccounts(
		organizationId: string,
	): Promise<Result<PaymentAccount[]>> {
		try {
			const rows = await db
				.select()
				.from(paymentAccount)
				.where(eq(paymentAccount.organizationId, organizationId))
				.orderBy(desc(paymentAccount.updatedAt), desc(paymentAccount.id));
			return ok(rows.map(mapAccount));
		} catch (error) {
			return failFromUnknown(error, "Failed to list payment accounts");
		}
	}

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
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
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
				return fail("CONFLICT", "Payment create conflict");
			}
			return reload(this, record.organizationId, id, "Created payment missing");
		} catch (error) {
			return failFromUnknown(error, "Failed to create payment");
		}
	}

	async addApplicationInstruction(
		record: Parameters<PaymentsStore["addApplicationInstruction"]>[0],
	): Promise<Result<PaymentApplicationInstruction>> {
		const id = randomUUID();
		const eventId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<
				[
					Array<{
						id: string;
						organization_id: string;
						payment_id: string;
						target_module: string;
						target_document_type: string;
						target_document_id: string;
						intended_amount: string;
						applied_amount: string;
						currency_code: string;
						status: string;
						rejection_code: string | null;
						created_by: string;
						created_at: Date;
						updated_at: Date;
					}>,
				]
			>((sql) => [
				sql`
					WITH eligible AS (
						SELECT p.id, p.currency_code
						FROM payment p
						WHERE p.id = ${record.paymentId}
							AND p.organization_id = ${record.organizationId}
							AND p.status = 'draft'
							AND p.currency_code = ${record.currencyCode}
							AND (
								(p.direction = 'receipt' AND ${record.targetModule} = 'receivables')
								OR (p.direction = 'disbursement' AND ${record.targetModule} = 'payables')
							)
							AND (
								SELECT COALESCE(SUM(a.intended_amount::numeric), 0)
								FROM payment_allocation a
								WHERE a.payment_id = p.id
									AND a.organization_id = p.organization_id
									AND a.status IN ('pending', 'applied', 'partially_applied')
							) + ${record.intendedAmount}::numeric <= p.amount::numeric
					),
					allocated AS (
						INSERT INTO payment_allocation (
							id, organization_id, payment_id, target_module, target_document_type,
							target_document_id, intended_amount, applied_amount, currency_code,
							status, created_by
						)
						SELECT ${id}, ${record.organizationId}, ${record.paymentId},
							${record.targetModule}, ${record.targetDocumentType},
							${record.targetDocumentId}, ${record.intendedAmount}, '0',
							${record.currencyCode}, 'pending', ${record.actorUserId}
						FROM eligible
						RETURNING *
					),
					bumped AS (
						UPDATE payment
						SET version = version + 1,
							updated_by = ${record.actorUserId},
							updated_at = now()
						WHERE id = ${record.paymentId}
							AND organization_id = ${record.organizationId}
							AND EXISTS (SELECT 1 FROM allocated)
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, ${record.organizationId},
							'payments.application_instruction.created.v1', 'payments',
							${record.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', ${record.organizationId},
								'paymentId', allocated.payment_id,
								'instructionId', allocated.id,
								'targetModule', allocated.target_module,
								'targetDocumentType', allocated.target_document_type,
								'targetDocumentId', allocated.target_document_id,
								'intendedAmount', allocated.intended_amount,
								'appliedAmount', allocated.applied_amount,
								'currencyCode', allocated.currency_code,
								'status', allocated.status,
								'rejectionCode', allocated.rejection_code,
								'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId}
							), 'pending', 0
						FROM allocated, bumped
						RETURNING id
					)
					SELECT allocated.* FROM allocated, bumped, outboxed
				`,
			]);
			const row = rows[0];
			if (row === undefined) {
				return failPayments(
					"CONFLICT",
					"Payment application instruction conflict",
					PAYMENTS_ERROR_INSUFFICIENT_AVAILABILITY,
				);
			}
			return ok({
				id: row.id,
				organizationId: row.organization_id,
				paymentId: row.payment_id,
				targetModule: row.target_module as PaymentApplicationTargetModule,
				targetDocumentType:
					row.target_document_type as PaymentApplicationTargetDocumentType,
				targetDocumentId: row.target_document_id,
				intendedAmount: row.intended_amount,
				appliedAmount: row.applied_amount,
				currencyCode: row.currency_code,
				status: row.status as PaymentApplicationInstructionStatus,
				rejectionCode: row.rejection_code,
				createdBy: row.created_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch (error) {
			return failFromUnknown(
				error,
				"Failed to add payment application instruction",
			);
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
				return fail("CONFLICT", "Payment post conflict");
			}
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
				return fail("CONFLICT", "Payment reversal conflict");
			}
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

	async createAndPostTransfer(
		record: Parameters<PaymentsStore["createAndPostTransfer"]>[0],
	): Promise<Result<{ outgoing: Payment; incoming: Payment }>> {
		if (record.fromPaymentAccountId === record.toPaymentAccountId) {
			return failPayments(
				"CONFLICT",
				"Transfer accounts must differ",
				PAYMENTS_ERROR_TRANSFER_INVALID,
			);
		}
		const groupId = randomUUID();
		const outgoingId = randomUUID();
		const incomingId = randomUUID();
		const eventId = randomUUID();
		const outgoingCode = `${record.code}-OUT`;
		const incomingCode = `${record.code}-IN`;
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
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
				return failPayments(
					"CONFLICT",
					"Payment transfer conflict",
					PAYMENTS_ERROR_TRANSFER_INVALID,
				);
			}
			const [outgoing, incoming] = await Promise.all([
				this.getById(record.organizationId, outgoingId),
				this.getById(record.organizationId, incomingId),
			]);
			if (!outgoing.ok) return outgoing;
			if (!incoming.ok) return incoming;
			if (outgoing.data === null || incoming.data === null) {
				return fail("INTERNAL_ERROR", "Posted transfer payments missing");
			}
			return ok({ outgoing: outgoing.data, incoming: incoming.data });
		} catch (error) {
			return failFromUnknown(error, "Failed to create payment transfer");
		}
	}

	async postRefund(
		record: Parameters<PaymentsStore["postRefund"]>[0],
	): Promise<Result<Payment>> {
		const id = randomUUID();
		const eventId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
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
				return failPayments(
					"CONFLICT",
					"Refund post conflict",
					PAYMENTS_ERROR_REFUND_LIMIT_EXCEEDED,
				);
			}
			return reload(this, record.organizationId, id, "Posted refund missing");
		} catch (error) {
			return failFromUnknown(error, "Failed to post refund");
		}
	}

	async markInstructionApplied(
		record: Parameters<PaymentsStore["markInstructionApplied"]>[0],
	): Promise<Result<PaymentApplicationInstruction>> {
		const eventId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<
				[
					Array<{
						id: string;
						organization_id: string;
						payment_id: string;
						target_module: string;
						target_document_type: string;
						target_document_id: string;
						intended_amount: string;
						applied_amount: string;
						currency_code: string;
						status: string;
						rejection_code: string | null;
						created_by: string;
						created_at: Date;
						updated_at: Date;
					}>,
				]
			>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE payment_allocation
						SET applied_amount = ${record.appliedAmount},
							status = CASE
								WHEN ${record.appliedAmount}::numeric = intended_amount::numeric THEN 'applied'
								ELSE 'partially_applied'
							END,
							updated_at = now()
						WHERE id = ${record.instructionId}
							AND organization_id = ${record.organizationId}
							AND status IN ('pending', 'partially_applied', 'applied')
							AND ${record.appliedAmount}::numeric > 0
							AND ${record.appliedAmount}::numeric <= intended_amount::numeric
						RETURNING *
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id,
							'payments.application_instruction.applied.v1', 'payments',
							${record.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', organization_id,
								'paymentId', payment_id,
								'instructionId', id,
								'targetModule', target_module,
								'targetDocumentType', target_document_type,
								'targetDocumentId', target_document_id,
								'intendedAmount', intended_amount,
								'appliedAmount', applied_amount,
								'currencyCode', currency_code,
								'status', status,
								'rejectionCode', rejection_code,
								'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId}
							), 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, outboxed
				`,
			]);
			const row = rows[0];
			if (row === undefined) {
				return failPayments(
					"CONFLICT",
					"Application instruction apply conflict",
					PAYMENTS_ERROR_INSTRUCTION_NOT_FOUND,
				);
			}
			return ok({
				id: row.id,
				organizationId: row.organization_id,
				paymentId: row.payment_id,
				targetModule: row.target_module as PaymentApplicationTargetModule,
				targetDocumentType:
					row.target_document_type as PaymentApplicationTargetDocumentType,
				targetDocumentId: row.target_document_id,
				intendedAmount: row.intended_amount,
				appliedAmount: row.applied_amount,
				currencyCode: row.currency_code,
				status: row.status as PaymentApplicationInstructionStatus,
				rejectionCode: row.rejection_code,
				createdBy: row.created_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch (error) {
			return failFromUnknown(error, "Failed to apply application instruction");
		}
	}

	async markInstructionRejected(
		record: Parameters<PaymentsStore["markInstructionRejected"]>[0],
	): Promise<Result<PaymentApplicationInstruction>> {
		const eventId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<
				[
					Array<{
						id: string;
						organization_id: string;
						payment_id: string;
						target_module: string;
						target_document_type: string;
						target_document_id: string;
						intended_amount: string;
						applied_amount: string;
						currency_code: string;
						status: string;
						rejection_code: string | null;
						created_by: string;
						created_at: Date;
						updated_at: Date;
					}>,
				]
			>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE payment_allocation
						SET status = CASE
								WHEN ${record.rejectionCode} = 'PAYMENT_REVERSED' THEN 'reversed'
								ELSE 'rejected'
							END,
							rejection_code = ${record.rejectionCode},
							updated_at = now()
						WHERE id = ${record.instructionId}
							AND organization_id = ${record.organizationId}
							AND status IN ('pending', 'partially_applied', 'applied')
						RETURNING *
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id,
							'payments.application_instruction.rejected.v1', 'payments',
							${record.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', organization_id,
								'paymentId', payment_id,
								'instructionId', id,
								'targetModule', target_module,
								'targetDocumentType', target_document_type,
								'targetDocumentId', target_document_id,
								'intendedAmount', intended_amount,
								'appliedAmount', applied_amount,
								'currencyCode', currency_code,
								'status', status,
								'rejectionCode', rejection_code,
								'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId}
							), 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, outboxed
				`,
			]);
			const row = rows[0];
			if (row === undefined) {
				return failPayments(
					"CONFLICT",
					"Application instruction reject conflict",
					PAYMENTS_ERROR_INSTRUCTION_NOT_FOUND,
				);
			}
			return ok({
				id: row.id,
				organizationId: row.organization_id,
				paymentId: row.payment_id,
				targetModule: row.target_module as PaymentApplicationTargetModule,
				targetDocumentType:
					row.target_document_type as PaymentApplicationTargetDocumentType,
				targetDocumentId: row.target_document_id,
				intendedAmount: row.intended_amount,
				appliedAmount: row.applied_amount,
				currencyCode: row.currency_code,
				status: row.status as PaymentApplicationInstructionStatus,
				rejectionCode: row.rejection_code,
				createdBy: row.created_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch (error) {
			return failFromUnknown(error, "Failed to reject application instruction");
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
			const [instructions, reversals] = await Promise.all([
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
					instructions.map(mapInstruction),
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

	async getApplicationAvailability(
		organizationId: string,
		paymentId: string,
	): Promise<Result<PaymentApplicationAvailability>> {
		try {
			const loaded = await this.getById(organizationId, paymentId);
			if (!loaded.ok) return loaded;
			if (loaded.data === null) {
				return failPayments(
					"NOT_FOUND",
					"Payment not found",
					PAYMENTS_ERROR_PAYMENT_NOT_FOUND,
				);
			}
			if (loaded.data.status !== "posted") {
				return fail(
					"CONFLICT",
					"Application availability requires a posted payment",
				);
			}
			const intended = loaded.data.applicationInstructions
				.filter((instruction) =>
					["pending", "applied", "partially_applied"].includes(
						instruction.status,
					),
				)
				.reduce(
					(sum, instruction) => sum + Number(instruction.intendedAmount),
					0,
				);
			const refundRows = await db
				.select({ amount: payment.amount })
				.from(payment)
				.where(
					and(
						eq(payment.organizationId, organizationId),
						eq(payment.originalPaymentId, paymentId),
						eq(payment.status, "posted"),
					),
				);
			const refunded = refundRows.reduce(
				(sum, row) => sum + Number(row.amount),
				0,
			);
			const posted = Number(loaded.data.amount);
			return ok({
				paymentId,
				currencyCode: loaded.data.currencyCode,
				postedAmount: loaded.data.amount,
				intendedAmount: String(intended),
				refundedAmount: String(refunded),
				availableToApply: String(posted - intended - refunded),
			});
		} catch (error) {
			return failFromUnknown(error, "Failed to load payment availability");
		}
	}
}

export function createDrizzlePaymentsStore(): DrizzlePaymentsStore {
	return new DrizzlePaymentsStore();
}
