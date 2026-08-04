import { randomUUID } from "node:crypto";

import {
	database as afendaDatabase,
	and,
	asc,
	eq,
	supplierCreditNote,
	supplierCreditNoteLine,
} from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

import type {
	SupplierInvoice,
	SupplierInvoiceCreateRecord,
	SupplierInvoiceLine,
	SupplierInvoiceStatus,
} from "../../kernel/contracts/domain";
import type { PayablesCreditNotesStore } from "./credit-notes.store";

function failFromPersistence(error: unknown, _fallbackMessage: string) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

function creditStatus(value: string): SupplierInvoiceStatus {
	if (
		value === "draft" ||
		value === "matched" ||
		value === "posted" ||
		value === "cancelled"
	) {
		return value;
	}
	throw new Error(`Invalid supplier_credit_note.status: ${value}`);
}

function mapCredit(
	credit: typeof supplierCreditNote.$inferSelect,
	lines: SupplierInvoiceLine[],
	openAmount: string,
): SupplierInvoice {
	return {
		cancelledAt: null,
		cancelledBy: null,
		code: credit.code,
		createdAt: credit.createdAt,
		createdBy: credit.createdBy,
		currencyCode: credit.currencyCode,
		documentType: "credit_note",
		id: credit.id,
		lines,
		matchedAt: null,
		matchedBy: null,
		matchResult: null,
		normalizedCode: credit.normalizedCode,
		openAmount,
		organizationId: credit.organizationId,
		postedAt: credit.postedAt,
		postedBy: credit.postedBy,
		status: creditStatus(credit.status),
		supplierCode: credit.supplierPartyCode,
		supplierId: credit.supplierPartyId,
		supplierName: credit.supplierPartyName,
		totalAmount: credit.amount,
		updatedAt: credit.updatedAt,
		updatedBy: credit.updatedBy,
		version: credit.version,
	};
}

export const drizzleCreditNoteMethods: PayablesCreditNotesStore = {
	async createCredit(
		record: SupplierInvoiceCreateRecord,
	): Promise<Result<SupplierInvoice>> {
		const id = randomUUID();
		try {
			await afendaDatabase.client.insert(supplierCreditNote).values({
				amount: "0",
				code: record.code,
				createdBy: record.actorUserId,
				currencyCode: record.currencyCode,
				id,
				normalizedCode: record.normalizedCode,
				organizationId: record.organizationId,
				status: "draft",
				supplierPartyCode: record.supplierCode,
				supplierPartyId: record.supplierId,
				supplierPartyName: record.supplierName,
				updatedBy: record.actorUserId,
				version: 1,
			});
			const [credit] = await afendaDatabase.client
				.select()
				.from(supplierCreditNote)
				.where(
					and(
						eq(supplierCreditNote.organizationId, record.organizationId),
						eq(supplierCreditNote.id, id),
					),
				)
				.limit(1);
			if (credit === undefined) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok(mapCredit(credit, [], "0"));
		} catch (error) {
			return failFromPersistence(
				error,
				"Failed to create supplier credit note",
			);
		}
	},

	async addCreditLine(
		record: Parameters<PayablesCreditNotesStore["addCreditLine"]>[0],
	): Promise<Result<SupplierInvoiceLine>> {
		const id = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
				WITH eligible AS (
					SELECT id FROM supplier_credit_note
					WHERE id = ${record.creditNoteId} AND supplier_credit_note.organization_id = ${record.organizationId}
						AND status = 'draft'
				), inserted AS (
					INSERT INTO supplier_credit_note_line (
						id, organization_id, credit_note_id, line_no, item_id, item_code, item_name,
						quantity, unit_price, line_amount, version, created_by, updated_by
					)
					SELECT ${id}, ${record.organizationId}, ${record.creditNoteId},
						(SELECT COALESCE(MAX(line_no), 0) + 1 FROM supplier_credit_note_line
							WHERE supplier_credit_note_line.organization_id = ${record.organizationId} AND credit_note_id = ${record.creditNoteId}),
						${record.itemId}, ${record.itemId}, ${record.description}, ${record.quantity},
						${record.unitPrice}, (${record.quantity}::numeric * ${record.unitPrice}::numeric)::text,
						1, ${record.actorUserId}, ${record.actorUserId}
					FROM eligible RETURNING line_no, created_at
				), bumped AS (
					UPDATE supplier_credit_note SET version = version + 1, updated_by = ${record.actorUserId}, updated_at = now()
					WHERE id = ${record.creditNoteId} AND supplier_credit_note.organization_id = ${record.organizationId}
						AND EXISTS (SELECT 1 FROM inserted)
				) SELECT * FROM inserted
				`,
			]);
			const [row] = rows;
			return row === undefined
				? errorResult.fail("CONFLICT", {
						publicMessage: "Supplier credit note line conflict",
					})
				: errorResult.ok({
						createdAt: row.created_at,
						createdBy: record.actorUserId,
						description: record.description,
						id,
						invoiceId: record.creditNoteId,
						itemId: record.itemId,
						lineAmount: String(
							Number(record.quantity) * Number(record.unitPrice),
						),
						lineNo: row.line_no,
						organizationId: record.organizationId,
						quantity: record.quantity,
						unitPrice: record.unitPrice,
					});
		} catch (error) {
			return failFromPersistence(
				error,
				"Failed to add supplier credit note line",
			);
		}
	},

	async postCredit(
		record: Parameters<PayablesCreditNotesStore["postCredit"]>[0],
	): Promise<Result<SupplierInvoice>> {
		const eventId = randomUUID();
		try {
			// Mode B fix: the credit_note.posted event is written to the outbox
			// inside the same transaction as the state mutation (previously it
			// was emitted after commit, losing atomicity on partial failure).
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
				WITH totaled AS (
					SELECT credit.*, (SELECT COALESCE(SUM(line_amount::numeric), 0) FROM supplier_credit_note_line
						WHERE credit_note_id = credit.id AND supplier_credit_note_line.organization_id = credit.organization_id) AS total
					FROM supplier_credit_note credit
					WHERE id = ${record.creditNoteId} AND credit.organization_id = ${record.organizationId}
						AND status = 'draft' AND version = ${record.expectedVersion}
					), 				mutated AS (
					UPDATE supplier_credit_note SET status = 'posted', amount = totaled.total::text,
						posted_at = now(), posted_by = ${record.actorUserId}, version = version + 1,
						updated_at = now(), updated_by = ${record.actorUserId}
					FROM totaled WHERE supplier_credit_note.id = totaled.id
						AND supplier_credit_note.organization_id = ${record.organizationId}
						AND totaled.total > 0 RETURNING supplier_credit_note.*
				), projected AS (
						INSERT INTO supplier_balance_projection (id, organization_id, supplier_party_id, currency_code, open_balance, version, created_by, updated_by)
						SELECT ${randomUUID()}, organization_id, supplier_party_id, currency_code, (-amount::numeric)::text, 1, ${record.actorUserId}, ${record.actorUserId}
						FROM mutated ON CONFLICT (organization_id, supplier_party_id, currency_code) DO UPDATE SET
							open_balance = (supplier_balance_projection.open_balance::numeric + EXCLUDED.open_balance::numeric)::text,
							version = supplier_balance_projection.version + 1, updated_at = now(), updated_by = ${record.actorUserId}
					), outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'payables.credit_note.posted.v1', 'payables',
							${record.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', organization_id, 'entityId', id,
								'supplierId', supplier_party_id, 'amount', amount,
								'currencyCode', currency_code, 'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId}
							), 'pending', 0 FROM mutated RETURNING id
					) SELECT mutated.id FROM mutated, outboxed
				`,
			]);
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Supplier credit note post conflict",
				});
			}
			const [credit] = await afendaDatabase.client
				.select()
				.from(supplierCreditNote)
				.where(
					and(
						eq(supplierCreditNote.organizationId, record.organizationId),
						eq(supplierCreditNote.id, record.creditNoteId),
					),
				)
				.limit(1);
			if (credit === undefined) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			const lines = await afendaDatabase.client
				.select()
				.from(supplierCreditNoteLine)
				.where(
					and(
						eq(supplierCreditNoteLine.organizationId, record.organizationId),
						eq(supplierCreditNoteLine.creditNoteId, credit.id),
					),
				)
				.orderBy(asc(supplierCreditNoteLine.lineNo));
			return errorResult.ok(
				mapCredit(
					credit,
					lines.map((line) => ({
						createdAt: line.createdAt,
						createdBy: line.createdBy,
						description: line.itemName,
						id: line.id,
						invoiceId: line.creditNoteId,
						itemId: line.itemId,
						lineAmount: line.lineAmount,
						lineNo: line.lineNo,
						organizationId: line.organizationId,
						quantity: line.quantity,
						unitPrice: line.unitPrice,
					})),
					credit.amount,
				),
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to post supplier credit note");
		}
	},
};
