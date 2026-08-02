import { randomUUID } from "node:crypto";

import {
	database as afendaDatabase,
	and,
	eq,
	supplierAllocation,
} from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

import type { SupplierAllocation } from "../../kernel/contracts/domain";
import type { PayablesAllocationsStore } from "./allocations.store";

function failFromPersistence(error: unknown, _fallbackMessage: string) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

interface ReversedAllocationSqlRow {
	amount: string;
	created_at: Date;
	created_by: string;
	id: string;
	invoice_id: string;
	organization_id: string;
	payment_id: string;
	supplier_id: string;
}

function mapAllocation(
	row: typeof supplierAllocation.$inferSelect,
): SupplierAllocation {
	return {
		amount: row.amount,
		applyIdempotencyKey: row.applyIdempotencyKey,
		createdAt: row.createdAt,
		createdBy: row.createdBy,
		creditNoteId: row.creditNoteId,
		id: row.id,
		invoiceId: row.supplierInvoiceId,
		organizationId: row.organizationId,
		paymentApplicationInstructionId: row.paymentApplicationInstructionId,
		paymentId: row.paymentId,
		reversedAt: row.reversedAt,
		reversedBy: row.reversedBy,
		status: row.status === "reversed" ? "reversed" : "active",
		supplierId: row.supplierPartyId,
	};
}

export const drizzleAllocationMethods: PayablesAllocationsStore = {
	async applyPayment(
		record: Parameters<PayablesAllocationsStore["applyPayment"]>[0],
	): Promise<Result<SupplierAllocation>> {
		const id = randomUUID();
		const eventId = randomUUID();
		try {
			const [replay] = await afendaDatabase.client
				.select()
				.from(supplierAllocation)
				.where(
					and(
						eq(supplierAllocation.organizationId, record.organizationId),
						eq(supplierAllocation.applyIdempotencyKey, record.idempotencyKey),
					),
				)
				.limit(1);
			if (replay !== undefined) {
				return errorResult.ok(mapAllocation(replay));
			}
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					WITH eligible AS (
						SELECT invoice.*, (
							SELECT COALESCE(SUM(line_amount::numeric), 0)
							FROM supplier_invoice_line
							WHERE invoice_id = invoice.id
								AND organization_id = invoice.organization_id
						) - (
							SELECT COALESCE(SUM(amount::numeric), 0)
							FROM supplier_allocation
							WHERE supplier_invoice_id = invoice.id
								AND organization_id = invoice.organization_id
						) AS open_amount
						FROM supplier_invoice invoice
						WHERE id = ${record.invoiceId} AND organization_id = ${record.organizationId}
							AND status = 'posted'
					),
					mutated AS (
						UPDATE supplier_invoice
						SET version = version + 1, updated_by = ${record.actorUserId}, updated_at = now()
						WHERE id = ${record.invoiceId} AND organization_id = ${record.organizationId}
							AND ${record.amount}::numeric > 0
							AND (SELECT open_amount FROM eligible) >= ${record.amount}::numeric
						RETURNING *
					),
					allocated AS (
						INSERT INTO supplier_allocation (
							id, organization_id, supplier_party_id, supplier_invoice_id, payment_id,
							payment_application_instruction_id, status, apply_idempotency_key, amount,
							allocated_at, allocated_by, version, created_by, updated_by
						)
						SELECT ${id}, organization_id, supplier_party_id, id, ${record.paymentId},
							${record.paymentApplicationInstructionId}, 'active', ${record.idempotencyKey},
							${record.amount}, now(), ${record.actorUserId}, 1,
							${record.actorUserId}, ${record.actorUserId}
						FROM mutated RETURNING *
					),
					projected AS (
						UPDATE supplier_balance_projection
						SET open_balance = (open_balance::numeric - ${record.amount}::numeric)::text,
							version = version + 1, updated_by = ${record.actorUserId}, updated_at = now()
						WHERE organization_id = ${record.organizationId}
							AND supplier_party_id = (SELECT supplier_party_id FROM mutated)
							AND currency_code = (SELECT currency_code FROM mutated)
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'payables.allocation.posted.v1', 'payables',
							${record.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', organization_id, 'entityId', ${id},
								'supplierId', supplier_party_id, 'amount', ${record.amount},
								'currencyCode', currency_code, 'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId}
							), 'pending', 0 FROM mutated RETURNING id
					)
					SELECT allocated.id, allocated.organization_id,
						allocated.supplier_invoice_id AS invoice_id,
						allocated.supplier_party_id AS supplier_id,
						allocated.payment_id, allocated.amount,
						allocated.created_by, allocated.created_at
					FROM allocated, projected, outboxed
				`,
			]);
			const [row] = rows;
			if (row === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Supplier allocation conflict",
				});
			}
			return errorResult.ok({
				amount: row.amount,
				applyIdempotencyKey: record.idempotencyKey,
				createdAt: row.created_at,
				createdBy: row.created_by,
				creditNoteId: null,
				id: row.id,
				invoiceId: row.invoice_id,
				organizationId: row.organization_id,
				paymentApplicationInstructionId: record.paymentApplicationInstructionId,
				paymentId: row.payment_id,
				reversedAt: null,
				reversedBy: null,
				status: "active",
				supplierId: row.supplier_id,
			});
		} catch (error) {
			return failFromPersistence(error, "Failed to apply supplier payment");
		}
	},

	async applyCredit(
		record: Parameters<PayablesAllocationsStore["applyCredit"]>[0],
	): Promise<Result<SupplierAllocation>> {
		const id = randomUUID();
		const eventId = randomUUID();
		try {
			const [replay] = await afendaDatabase.client
				.select()
				.from(supplierAllocation)
				.where(
					and(
						eq(supplierAllocation.organizationId, record.organizationId),
						eq(supplierAllocation.applyIdempotencyKey, record.idempotencyKey),
					),
				)
				.limit(1);
			if (replay !== undefined) {
				return errorResult.ok(mapAllocation(replay));
			}
			// Mode B fix: credit application now records the declared
			// payables.allocation.posted.v1 event in the same transaction
			// (previously no event was emitted at all for credit applies).
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					WITH invoice AS (
						SELECT row.*, (SELECT COALESCE(SUM(amount::numeric), 0) FROM supplier_allocation
							WHERE supplier_invoice_id = row.id AND organization_id = row.organization_id AND status = 'active') AS applied
						FROM supplier_invoice row
						WHERE id = ${record.invoiceId} AND organization_id = ${record.organizationId} AND status = 'posted'
					), credit AS (
						SELECT row.*, (SELECT COALESCE(SUM(amount::numeric), 0) FROM supplier_allocation
							WHERE credit_note_id = row.id AND organization_id = row.organization_id AND status = 'active') AS applied
						FROM supplier_credit_note row
						WHERE id = ${record.creditNoteId} AND organization_id = ${record.organizationId} AND status = 'posted'
					), allocated AS (
						INSERT INTO supplier_allocation (
							id, organization_id, supplier_party_id, supplier_invoice_id, credit_note_id,
							status, apply_idempotency_key, amount, allocated_at, allocated_by, version, created_by, updated_by
						)
						SELECT ${id}, invoice.organization_id, invoice.supplier_party_id, invoice.id, credit.id,
							'active', ${record.idempotencyKey}, ${record.amount}, now(), ${record.actorUserId}, 1,
							${record.actorUserId}, ${record.actorUserId}
						FROM invoice JOIN credit ON credit.organization_id = invoice.organization_id
							AND credit.supplier_party_id = invoice.supplier_party_id AND credit.currency_code = invoice.currency_code
						WHERE ${record.amount}::numeric > 0
							AND (SELECT COALESCE(SUM(line_amount::numeric), 0) FROM supplier_invoice_line WHERE invoice_id = invoice.id) - invoice.applied >= ${record.amount}::numeric
							AND credit.amount::numeric - credit.applied >= ${record.amount}::numeric
						RETURNING *
					), invoice_bumped AS (
						UPDATE supplier_invoice SET version = version + 1, updated_by = ${record.actorUserId}, updated_at = now()
						WHERE id = ${record.invoiceId} AND EXISTS (SELECT 1 FROM allocated)
					), credit_bumped AS (
						UPDATE supplier_credit_note SET version = version + 1, updated_by = ${record.actorUserId}, updated_at = now()
						WHERE id = ${record.creditNoteId} AND EXISTS (SELECT 1 FROM allocated)
					), projected AS (
						UPDATE supplier_balance_projection SET open_balance = (open_balance::numeric - ${record.amount}::numeric)::text,
							version = version + 1, updated_by = ${record.actorUserId}, updated_at = now()
						WHERE organization_id = ${record.organizationId}
							AND supplier_party_id = (SELECT supplier_party_id FROM allocated)
							AND currency_code = (SELECT currency_code FROM invoice)
					), outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT ${eventId}, allocated.organization_id, 'payables.allocation.posted.v1', 'payables',
							${record.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', allocated.organization_id, 'entityId', allocated.id,
								'supplierId', allocated.supplier_party_id, 'amount', ${record.amount},
								'currencyCode', (SELECT currency_code FROM invoice), 'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId}
							), 'pending', 0 FROM allocated RETURNING id
					) SELECT allocated.id FROM allocated, outboxed
				`,
			]);
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Supplier credit application conflict",
				});
			}
			const [allocation] = await afendaDatabase.client
				.select()
				.from(supplierAllocation)
				.where(
					and(
						eq(supplierAllocation.organizationId, record.organizationId),
						eq(supplierAllocation.id, id),
					),
				)
				.limit(1);
			return allocation === undefined
				? errorResult.fail("INTERNAL_ERROR")
				: errorResult.ok(mapAllocation(allocation));
		} catch (error) {
			return failFromPersistence(error, "Failed to apply supplier credit");
		}
	},

	async reversePaymentApplication(
		record: Parameters<
			PayablesAllocationsStore["reversePaymentApplication"]
		>[0],
	): Promise<Result<SupplierAllocation[]>> {
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					WITH deleted AS (
						UPDATE supplier_allocation
						SET status = 'reversed', reversed_at = now(), reversed_by = ${record.actorUserId},
							updated_at = now(), updated_by = ${record.actorUserId}, version = version + 1
						WHERE organization_id = ${record.organizationId}
							AND payment_id = ${record.paymentId} AND status = 'active'
						RETURNING *
					),
					by_invoice AS (
						SELECT supplier_invoice_id, supplier_party_id, SUM(amount::numeric) AS amount
						FROM deleted GROUP BY supplier_invoice_id, supplier_party_id
					),
					mutated AS (
						UPDATE supplier_invoice invoice
						SET version = version + 1, updated_by = ${record.actorUserId}, updated_at = now()
						FROM by_invoice
						WHERE invoice.id = by_invoice.supplier_invoice_id
							AND invoice.organization_id = ${record.organizationId}
						RETURNING invoice.id, invoice.supplier_party_id, invoice.currency_code
					),
					projected AS (
						UPDATE supplier_balance_projection balance
						SET open_balance = (balance.open_balance::numeric + by_invoice.amount)::text,
							version = balance.version + 1, updated_by = ${record.actorUserId}, updated_at = now()
						FROM by_invoice, mutated
						WHERE balance.organization_id = ${record.organizationId}
							AND balance.supplier_party_id = by_invoice.supplier_party_id
							AND mutated.id = by_invoice.supplier_invoice_id
							AND balance.currency_code = mutated.currency_code
						RETURNING balance.id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT gen_random_uuid(), deleted.organization_id,
							'payables.payment_application.reversed.v1', 'payables',
							${record.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', deleted.organization_id, 'entityId', deleted.id,
								'supplierId', deleted.supplier_party_id, 'amount', deleted.amount,
								'currencyCode', mutated.currency_code, 'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId}
							), 'pending', 0
						FROM deleted
						JOIN mutated ON mutated.id = deleted.supplier_invoice_id
					)
					SELECT deleted.id, deleted.organization_id,
						deleted.supplier_invoice_id AS invoice_id,
						deleted.supplier_party_id AS supplier_id, deleted.payment_id, deleted.amount,
						deleted.created_by, deleted.created_at
					FROM deleted
				`,
			]);
			return errorResult.ok(
				rows.map((row: ReversedAllocationSqlRow) => ({
					amount: row.amount,
					applyIdempotencyKey: null,
					createdAt: row.created_at,
					createdBy: row.created_by,
					creditNoteId: null,
					id: row.id,
					invoiceId: row.invoice_id,
					organizationId: row.organization_id,
					paymentApplicationInstructionId: null,
					paymentId: row.payment_id,
					reversedAt: new Date(),
					reversedBy: record.actorUserId,
					status: "reversed",
					supplierId: row.supplier_id,
				})),
			);
		} catch (error) {
			return failFromPersistence(
				error,
				"Failed to reverse supplier allocations",
			);
		}
	},
};
