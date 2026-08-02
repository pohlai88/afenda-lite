import { randomUUID } from "node:crypto";

import { database as afendaDatabase, and, eq, payment } from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

import type {
	Payment,
	PaymentApplicationAvailability,
	PaymentApplicationInstruction,
	PaymentApplicationInstructionStatus,
	PaymentApplicationTargetDocumentType,
	PaymentApplicationTargetModule,
} from "../../kernel/contracts/domain";
import type { PaymentApplicationInstructionsStore } from "./instructions.store";

function failFromPersistence(error: unknown, _fallbackMessage: string) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

export interface DrizzleInstructionDeps {
	/** Narrow lifecycle capability: load a payment with embedded instructions. */
	getPaymentById: (
		organizationId: string,
		id: string,
	) => Promise<Result<Payment | null>>;
}

export function createDrizzleApplicationInstructionMethods(
	deps: DrizzleInstructionDeps,
): PaymentApplicationInstructionsStore {
	return {
		async addApplicationInstruction(
			record: Parameters<
				PaymentApplicationInstructionsStore["addApplicationInstruction"]
			>[0],
		): Promise<Result<PaymentApplicationInstruction>> {
			const id = randomUUID();
			const eventId = randomUUID();
			try {
				const [rows] = await afendaDatabase.transaction((sql) => [
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
				const [row] = rows;
				if (row === undefined) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Payment application instruction conflict",
					});
				}
				return errorResult.ok({
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
				return failFromPersistence(
					error,
					"Failed to add payment application instruction",
				);
			}
		},

		async markInstructionApplied(
			record: Parameters<
				PaymentApplicationInstructionsStore["markInstructionApplied"]
			>[0],
		): Promise<Result<PaymentApplicationInstruction>> {
			const eventId = randomUUID();
			try {
				const [rows] = await afendaDatabase.transaction((sql) => [
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
				const [row] = rows;
				if (row === undefined) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Application instruction apply conflict",
					});
				}
				return errorResult.ok({
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
				return failFromPersistence(
					error,
					"Failed to apply application instruction",
				);
			}
		},

		async markInstructionRejected(
			record: Parameters<
				PaymentApplicationInstructionsStore["markInstructionRejected"]
			>[0],
		): Promise<Result<PaymentApplicationInstruction>> {
			const eventId = randomUUID();
			try {
				const [rows] = await afendaDatabase.transaction((sql) => [
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
				const [row] = rows;
				if (row === undefined) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Application instruction reject conflict",
					});
				}
				return errorResult.ok({
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
				return failFromPersistence(
					error,
					"Failed to reject application instruction",
				);
			}
		},

		async getApplicationAvailability(
			organizationId: string,
			paymentId: string,
		): Promise<Result<PaymentApplicationAvailability>> {
			try {
				const loaded = await deps.getPaymentById(organizationId, paymentId);
				if (!loaded.ok) {
					return loaded;
				}
				if (loaded.data === null) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "Payment not found",
					});
				}
				if (loaded.data.status !== "posted") {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Application availability requires a posted payment",
					});
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
				const refundRows = await afendaDatabase.client
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
				return errorResult.ok({
					paymentId,
					currencyCode: loaded.data.currencyCode,
					postedAmount: loaded.data.amount,
					intendedAmount: String(intended),
					refundedAmount: String(refunded),
					availableToApply: String(posted - intended - refunded),
				});
			} catch (error) {
				return failFromPersistence(
					error,
					"Failed to load payment availability",
				);
			}
		},
	};
}
