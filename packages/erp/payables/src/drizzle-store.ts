import { randomUUID } from "node:crypto";

import {
	and,
	asc,
	db,
	desc,
	eq,
	inArray,
	runNeonHttpTransaction,
	supplierAllocation,
	supplierCreditNote,
	supplierCreditNoteLine,
	supplierInvoice,
	supplierInvoiceLine,
	threeWayMatchResult,
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";

import type {
	PayablesStore,
	SupplierAllocation,
	SupplierBalance,
	SupplierInvoice,
	SupplierInvoiceCreateRecord,
	SupplierInvoiceLine,
	SupplierInvoiceStatus,
	ThreeWayMatchResult,
} from "./model";

function invoiceStatus(value: string): SupplierInvoiceStatus {
	if (
		value === "draft" ||
		value === "matched" ||
		value === "posted" ||
		value === "cancelled"
	) {
		return value;
	}
	throw new Error(`Invalid supplier_invoice.status: ${value}`);
}

function mapLine(
	row: typeof supplierInvoiceLine.$inferSelect,
): SupplierInvoiceLine {
	return {
		id: row.id,
		organizationId: row.organizationId,
		invoiceId: row.invoiceId,
		lineNo: row.lineNo,
		itemId: row.itemId,
		description: row.itemName,
		quantity: row.quantity,
		unitPrice: row.unitPrice,
		lineAmount: row.lineAmount,
		createdBy: row.createdBy,
		createdAt: row.createdAt,
	};
}

function mapMatchStatus(status: string): ThreeWayMatchResult["result"] {
	switch (status) {
		case "pending":
		case "matched":
		case "matched_with_tolerance":
		case "exception":
			return status;
		default:
			throw new Error(`Invalid three_way_match_result.match_status: ${status}`);
	}
}

function mapMatch(
	row: typeof threeWayMatchResult.$inferSelect,
): ThreeWayMatchResult {
	if (row.purchaseOrderId === null || row.goodsReceiptId === null) {
		throw new Error(
			"Matched three-way result requires purchase order and goods receipt",
		);
	}
	return {
		id: row.id,
		organizationId: row.organizationId,
		invoiceId: row.supplierInvoiceId,
		purchaseOrderId: row.purchaseOrderId,
		goodsReceiptId: row.goodsReceiptId,
		result: mapMatchStatus(row.matchStatus),
		evidence:
			row.evidenceJson === null
				? {
						quantityTolerancePct: "0",
						priceTolerancePct: "0",
						lineResults: [],
					}
				: (JSON.parse(row.evidenceJson) as ThreeWayMatchResult["evidence"]),
		purchaseOrderVersion: row.poEvidenceVersion ?? 0,
		goodsReceiptVersion: row.grEvidenceVersion ?? 0,
		matchedBy: row.createdBy,
		matchedAt: row.createdAt,
	};
}

function mapAllocation(
	row: typeof supplierAllocation.$inferSelect,
): SupplierAllocation {
	return {
		id: row.id,
		organizationId: row.organizationId,
		invoiceId: row.supplierInvoiceId,
		supplierId: row.supplierPartyId,
		paymentId: row.paymentId,
		paymentApplicationInstructionId: row.paymentApplicationInstructionId,
		creditNoteId: row.creditNoteId,
		status: row.status === "reversed" ? "reversed" : "active",
		amount: row.amount,
		applyIdempotencyKey: row.applyIdempotencyKey,
		reversedAt: row.reversedAt,
		reversedBy: row.reversedBy,
		createdBy: row.createdBy,
		createdAt: row.createdAt,
	};
}

function mapInvoice(
	row: typeof supplierInvoice.$inferSelect,
	lines: SupplierInvoiceLine[],
	matchResult: ThreeWayMatchResult | null,
	allocatedAmount = 0,
): SupplierInvoice {
	const total = lines.reduce((sum, line) => sum + Number(line.lineAmount), 0);
	return {
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		documentType: "invoice",
		status: invoiceStatus(row.status),
		supplierId: row.supplierPartyId,
		supplierCode: row.supplierPartyCode,
		supplierName: row.supplierPartyName,
		currencyCode: row.currencyCode,
		totalAmount: String(total),
		openAmount:
			row.status === "posted"
				? String(Math.max(0, total - allocatedAmount))
				: "0",
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		matchedAt: matchResult?.matchedAt ?? null,
		matchedBy: matchResult?.matchedBy ?? null,
		postedAt: row.postedAt,
		postedBy: row.postedBy,
		cancelledAt: row.cancelledAt,
		cancelledBy: row.cancelledBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		lines,
		matchResult,
	};
}

async function reload(
	store: DrizzlePayablesStore,
	organizationId: string,
	id: string,
	message: string,
): Promise<Result<SupplierInvoice>> {
	const result = await store.getById(organizationId, id);
	if (!result.ok) return result;
	return result.data === null
		? fail("INTERNAL_ERROR", message)
		: ok(result.data);
}

function eventPayload(record: {
	organizationId: string;
	entityId: string;
	supplierId?: string;
	amount?: string;
	currencyCode?: string;
	actorUserId: string;
	correlationId: string;
}): string {
	return JSON.stringify({
		organizationId: record.organizationId,
		entityId: record.entityId,
		supplierId: record.supplierId,
		amount: record.amount,
		currencyCode: record.currencyCode,
		actorId: record.actorUserId,
		correlationId: record.correlationId,
	});
}

export class DrizzlePayablesStore implements PayablesStore {
	async createInvoice(
		record: SupplierInvoiceCreateRecord,
	): Promise<Result<SupplierInvoice>> {
		const id = randomUUID();
		const eventId = randomUUID();
		try {
			const payload = eventPayload({
				organizationId: record.organizationId,
				entityId: id,
				supplierId: record.supplierId,
				amount: "0",
				currencyCode: record.currencyCode,
				actorUserId: record.actorUserId,
				correlationId: record.correlationId,
			});
			await runNeonHttpTransaction((sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO supplier_invoice (
							id, organization_id, code, normalized_code, status,
							supplier_party_id, supplier_party_code, supplier_party_name,
							currency_code, version, created_by, updated_by
						) VALUES (
							${id}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
							'draft', ${record.supplierId}, ${record.supplierCode}, ${record.supplierName},
							${record.currencyCode}, 1, ${record.actorUserId}, ${record.actorUserId}
						) RETURNING id
					)
					INSERT INTO platform_domain_event (
						id, organization_id, type, source_module, correlation_id, actor_user_id,
						payload, status, attempts
					)
					SELECT ${eventId}, ${record.organizationId}, 'payables.invoice.created.v1',
						'payables', ${record.correlationId}, ${record.actorUserId},
						${payload}::jsonb, 'pending', 0 FROM mutated
				`,
			]);
			return reload(
				this,
				record.organizationId,
				id,
				"Created supplier invoice missing",
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to create supplier invoice");
		}
	}

	async addLine(
		record: Parameters<PayablesStore["addLine"]>[0],
	): Promise<Result<SupplierInvoiceLine>> {
		const id = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH numbered AS (
						SELECT COALESCE(MAX(line_no), 0) + 1 AS line_no
						FROM supplier_invoice_line
						WHERE organization_id = ${record.organizationId}
							AND invoice_id = ${record.invoiceId}
					),
					inserted AS (
						INSERT INTO supplier_invoice_line (
							id, organization_id, invoice_id, line_no, item_id, item_code,
							item_name, quantity, unit_price, line_amount, version, created_by, updated_by
						)
						SELECT ${id}, ${record.organizationId}, ${record.invoiceId}, numbered.line_no,
							${record.itemId}, ${record.itemId}, ${record.description}, ${record.quantity},
							${record.unitPrice}, (${record.quantity}::numeric * ${record.unitPrice}::numeric)::text,
							1, ${record.actorUserId}, ${record.actorUserId}
						FROM numbered
						WHERE EXISTS (
							SELECT 1 FROM supplier_invoice
							WHERE id = ${record.invoiceId} AND organization_id = ${record.organizationId}
								AND status = 'draft'
						)
						RETURNING id
					),
					bumped AS (
						UPDATE supplier_invoice
						SET version = version + 1, updated_by = ${record.actorUserId}, updated_at = now()
						WHERE id = ${record.invoiceId} AND organization_id = ${record.organizationId}
							AND EXISTS (SELECT 1 FROM inserted)
						RETURNING id
					)
					SELECT inserted.id FROM inserted, bumped
				`,
			]);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Supplier invoice line conflict");
			const [line] = await db
				.select()
				.from(supplierInvoiceLine)
				.where(
					and(
						eq(supplierInvoiceLine.organizationId, record.organizationId),
						eq(supplierInvoiceLine.id, id),
					),
				)
				.limit(1);
			return line === undefined
				? fail("INTERNAL_ERROR", "Created supplier invoice line missing")
				: ok(mapLine(line));
		} catch (error) {
			return failFromUnknown(error, "Failed to add supplier invoice line");
		}
	}

	async matchInvoice(
		record: Parameters<PayablesStore["matchInvoice"]>[0],
	): Promise<Result<SupplierInvoice>> {
		const matchId = randomUUID();
		const eventId = randomUUID();
		try {
			const payload = eventPayload({
				organizationId: record.organizationId,
				entityId: record.invoiceId,
				actorUserId: record.actorUserId,
				correlationId: record.correlationId,
			});
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE supplier_invoice
						SET status = CASE WHEN ${record.matchStatus} = 'exception' THEN 'draft' ELSE 'matched' END,
							purchase_order_id = ${record.purchaseOrderId},
							updated_at = now(),
							updated_by = ${record.actorUserId}, version = version + 1
						WHERE id = ${record.invoiceId} AND organization_id = ${record.organizationId}
							AND status = 'draft' AND version = ${record.expectedVersion}
							AND EXISTS (
								SELECT 1 FROM supplier_invoice_line
								WHERE invoice_id = ${record.invoiceId}
									AND organization_id = ${record.organizationId}
							)
							AND (
								SELECT COALESCE(SUM(line_amount::numeric), 0)
								FROM supplier_invoice_line
								WHERE invoice_id = ${record.invoiceId}
									AND organization_id = ${record.organizationId}
							) > 0
						RETURNING *
					),
					matched AS (
						INSERT INTO three_way_match_result (
							id, organization_id, supplier_invoice_id, purchase_order_id,
							goods_receipt_id, match_status, evidence_json, po_evidence_version,
							gr_evidence_version, matched_at, matched_by, version, created_by, updated_by
						)
						SELECT ${matchId}, organization_id, id, ${record.purchaseOrderId},
							${record.goodsReceiptId}, ${record.matchStatus}, ${JSON.stringify(record.evidence)},
							${record.purchaseOrderVersion}, ${record.goodsReceiptVersion}, now(),
							${record.actorUserId}, 1,
							${record.actorUserId}, ${record.actorUserId}
						FROM mutated RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'payables.invoice.matched.v1', 'payables',
							${record.correlationId}, ${record.actorUserId},
							(${payload}::jsonb || jsonb_build_object(
								'supplierId', supplier_party_id,
								'amount', (SELECT SUM(line_amount::numeric)::text
									FROM supplier_invoice_line WHERE invoice_id = mutated.id),
								'currencyCode', currency_code
							)), 'pending', 0 FROM mutated RETURNING id
					)
					SELECT mutated.id FROM mutated, matched, outboxed
				`,
			]);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Supplier invoice match conflict");
			return reload(
				this,
				record.organizationId,
				record.invoiceId,
				"Matched supplier invoice missing",
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to match supplier invoice");
		}
	}

	async postInvoice(
		record: Parameters<PayablesStore["postInvoice"]>[0],
	): Promise<Result<SupplierInvoice>> {
		const balanceId = randomUUID();
		const eventId = randomUUID();
		try {
			const payload = eventPayload({
				organizationId: record.organizationId,
				entityId: record.invoiceId,
				actorUserId: record.actorUserId,
				correlationId: record.correlationId,
			});
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE supplier_invoice
						SET status = 'posted', posted_at = now(), posted_by = ${record.actorUserId},
							updated_at = now(), updated_by = ${record.actorUserId}, version = version + 1
						WHERE id = ${record.invoiceId} AND organization_id = ${record.organizationId}
							AND status = 'matched' AND version = ${record.expectedVersion}
						RETURNING *
					),
					totaled AS (
						SELECT mutated.*, (
							SELECT SUM(line_amount::numeric) FROM supplier_invoice_line
							WHERE invoice_id = mutated.id
								AND organization_id = mutated.organization_id
						) AS total_amount FROM mutated
					),
					projected AS (
						INSERT INTO supplier_balance_projection (
							id, organization_id, supplier_party_id, currency_code, open_balance,
							version, created_by, updated_by
						)
						SELECT ${balanceId}, organization_id, supplier_party_id, currency_code,
							total_amount::text, 1, ${record.actorUserId}, ${record.actorUserId}
						FROM totaled
						ON CONFLICT (organization_id, supplier_party_id, currency_code)
						DO UPDATE SET
							open_balance = (supplier_balance_projection.open_balance::numeric +
								EXCLUDED.open_balance::numeric)::text,
							version = supplier_balance_projection.version + 1,
							updated_by = ${record.actorUserId}, updated_at = now()
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'payables.invoice.posted.v1', 'payables',
							${record.correlationId}, ${record.actorUserId},
							(${payload}::jsonb || jsonb_build_object(
								'supplierId', supplier_party_id, 'amount', total_amount::text,
								'currencyCode', currency_code
							)), 'pending', 0 FROM totaled RETURNING id
					)
					SELECT totaled.id FROM totaled, projected, outboxed
				`,
			]);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Supplier invoice post conflict");
			return reload(
				this,
				record.organizationId,
				record.invoiceId,
				"Posted supplier invoice missing",
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to post supplier invoice");
		}
	}

	async createCredit(
		record: SupplierInvoiceCreateRecord,
	): Promise<Result<SupplierInvoice>> {
		const id = randomUUID();
		try {
			await db.insert(supplierCreditNote).values({
				id,
				organizationId: record.organizationId,
				code: record.code,
				normalizedCode: record.normalizedCode,
				status: "draft",
				supplierPartyId: record.supplierId,
				supplierPartyCode: record.supplierCode,
				supplierPartyName: record.supplierName,
				currencyCode: record.currencyCode,
				amount: "0",
				version: 1,
				createdBy: record.actorUserId,
				updatedBy: record.actorUserId,
			});
			const [credit] = await db
				.select()
				.from(supplierCreditNote)
				.where(
					and(
						eq(supplierCreditNote.organizationId, record.organizationId),
						eq(supplierCreditNote.id, id),
					),
				)
				.limit(1);
			if (credit === undefined)
				return fail("INTERNAL_ERROR", "Created supplier credit note missing");
			return ok({
				id: credit.id,
				organizationId: credit.organizationId,
				code: credit.code,
				normalizedCode: credit.normalizedCode,
				documentType: "credit_note",
				status: invoiceStatus(credit.status),
				supplierId: credit.supplierPartyId,
				supplierCode: credit.supplierPartyCode,
				supplierName: credit.supplierPartyName,
				currencyCode: credit.currencyCode,
				totalAmount: credit.amount,
				openAmount: "0",
				version: credit.version,
				createdBy: credit.createdBy,
				updatedBy: credit.updatedBy,
				matchedAt: null,
				matchedBy: null,
				postedAt: credit.postedAt,
				postedBy: credit.postedBy,
				cancelledAt: null,
				cancelledBy: null,
				createdAt: credit.createdAt,
				updatedAt: credit.updatedAt,
				lines: [],
				matchResult: null,
			});
		} catch (error) {
			return failFromUnknown(error, "Failed to create supplier credit note");
		}
	}

	async addCreditLine(
		record: Parameters<PayablesStore["addCreditLine"]>[0],
	): Promise<Result<SupplierInvoiceLine>> {
		const id = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<
				[{ line_no: number; created_at: Date }[]]
			>((sql) => [
				sql`
					WITH eligible AS (
						SELECT id FROM supplier_credit_note
						WHERE id = ${record.creditNoteId} AND organization_id = ${record.organizationId}
							AND status = 'draft'
					), inserted AS (
						INSERT INTO supplier_credit_note_line (
							id, organization_id, credit_note_id, line_no, item_id, item_code, item_name,
							quantity, unit_price, line_amount, version, created_by, updated_by
						)
						SELECT ${id}, ${record.organizationId}, ${record.creditNoteId},
							(SELECT COALESCE(MAX(line_no), 0) + 1 FROM supplier_credit_note_line
								WHERE organization_id = ${record.organizationId} AND credit_note_id = ${record.creditNoteId}),
							${record.itemId}, ${record.itemId}, ${record.description}, ${record.quantity},
							${record.unitPrice}, (${record.quantity}::numeric * ${record.unitPrice}::numeric)::text,
							1, ${record.actorUserId}, ${record.actorUserId}
						FROM eligible RETURNING line_no, created_at
					), bumped AS (
						UPDATE supplier_credit_note SET version = version + 1, updated_by = ${record.actorUserId}, updated_at = now()
						WHERE id = ${record.creditNoteId} AND organization_id = ${record.organizationId}
							AND EXISTS (SELECT 1 FROM inserted)
					) SELECT * FROM inserted
				`,
			]);
			const row = rows[0];
			return row === undefined
				? fail("CONFLICT", "Supplier credit note line conflict")
				: ok({
						id,
						organizationId: record.organizationId,
						invoiceId: record.creditNoteId,
						lineNo: row.line_no,
						itemId: record.itemId,
						description: record.description,
						quantity: record.quantity,
						unitPrice: record.unitPrice,
						lineAmount: String(
							Number(record.quantity) * Number(record.unitPrice),
						),
						createdBy: record.actorUserId,
						createdAt: row.created_at,
					});
		} catch (error) {
			return failFromUnknown(error, "Failed to add supplier credit note line");
		}
	}

	async postCredit(
		record: Parameters<PayablesStore["postCredit"]>[0],
	): Promise<Result<SupplierInvoice>> {
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH totaled AS (
						SELECT credit.*, (SELECT COALESCE(SUM(line_amount::numeric), 0) FROM supplier_credit_note_line
							WHERE credit_note_id = credit.id AND organization_id = credit.organization_id) AS total
						FROM supplier_credit_note credit
						WHERE id = ${record.creditNoteId} AND organization_id = ${record.organizationId}
							AND status = 'draft' AND version = ${record.expectedVersion}
					), mutated AS (
						UPDATE supplier_credit_note SET status = 'posted', amount = totaled.total::text,
							posted_at = now(), posted_by = ${record.actorUserId}, version = version + 1,
							updated_at = now(), updated_by = ${record.actorUserId}
						FROM totaled WHERE supplier_credit_note.id = totaled.id AND totaled.total > 0 RETURNING supplier_credit_note.*
					), projected AS (
						INSERT INTO supplier_balance_projection (id, organization_id, supplier_party_id, currency_code, open_balance, version, created_by, updated_by)
						SELECT ${randomUUID()}, organization_id, supplier_party_id, currency_code, (-amount::numeric)::text, 1, ${record.actorUserId}, ${record.actorUserId}
						FROM mutated ON CONFLICT (organization_id, supplier_party_id, currency_code) DO UPDATE SET
							open_balance = (supplier_balance_projection.open_balance::numeric + EXCLUDED.open_balance::numeric)::text,
							version = supplier_balance_projection.version + 1, updated_at = now(), updated_by = ${record.actorUserId}
					) SELECT id FROM mutated
				`,
			]);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Supplier credit note post conflict");
			const [credit] = await db
				.select()
				.from(supplierCreditNote)
				.where(
					and(
						eq(supplierCreditNote.organizationId, record.organizationId),
						eq(supplierCreditNote.id, record.creditNoteId),
					),
				)
				.limit(1);
			if (credit === undefined)
				return fail("INTERNAL_ERROR", "Posted supplier credit note missing");
			const lines = await db
				.select()
				.from(supplierCreditNoteLine)
				.where(
					and(
						eq(supplierCreditNoteLine.organizationId, record.organizationId),
						eq(supplierCreditNoteLine.creditNoteId, credit.id),
					),
				)
				.orderBy(asc(supplierCreditNoteLine.lineNo));
			const emitted = await record.effects.emit({
				type: "payables.credit_note.posted.v1",
				organizationId: record.organizationId,
				actorUserId: record.actorUserId,
				correlationId: record.correlationId,
				payload: JSON.parse(
					eventPayload({
						organizationId: record.organizationId,
						entityId: credit.id,
						supplierId: credit.supplierPartyId,
						amount: credit.amount,
						currencyCode: credit.currencyCode,
						actorUserId: record.actorUserId,
						correlationId: record.correlationId,
					}),
				),
			});
			if (!emitted.ok) return emitted;
			return ok({
				id: credit.id,
				organizationId: credit.organizationId,
				code: credit.code,
				normalizedCode: credit.normalizedCode,
				documentType: "credit_note",
				status: invoiceStatus(credit.status),
				supplierId: credit.supplierPartyId,
				supplierCode: credit.supplierPartyCode,
				supplierName: credit.supplierPartyName,
				currencyCode: credit.currencyCode,
				totalAmount: credit.amount,
				openAmount: credit.amount,
				version: credit.version,
				createdBy: credit.createdBy,
				updatedBy: credit.updatedBy,
				matchedAt: null,
				matchedBy: null,
				postedAt: credit.postedAt,
				postedBy: credit.postedBy,
				cancelledAt: null,
				cancelledBy: null,
				createdAt: credit.createdAt,
				updatedAt: credit.updatedAt,
				lines: lines.map((line) => ({
					id: line.id,
					organizationId: line.organizationId,
					invoiceId: line.creditNoteId,
					lineNo: line.lineNo,
					itemId: line.itemId,
					description: line.itemName,
					quantity: line.quantity,
					unitPrice: line.unitPrice,
					lineAmount: line.lineAmount,
					createdBy: line.createdBy,
					createdAt: line.createdAt,
				})),
				matchResult: null,
			});
		} catch (error) {
			return failFromUnknown(error, "Failed to post supplier credit note");
		}
	}

	async issueCredit(
		record: SupplierInvoiceCreateRecord & { amount: string },
	): Promise<Result<SupplierInvoice>> {
		const id = randomUUID();
		const balanceId = randomUUID();
		const eventId = randomUUID();
		try {
			const payload = eventPayload({
				organizationId: record.organizationId,
				entityId: id,
				supplierId: record.supplierId,
				amount: record.amount,
				currencyCode: record.currencyCode,
				actorUserId: record.actorUserId,
				correlationId: record.correlationId,
			});
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO supplier_credit_note (
							id, organization_id, code, normalized_code, status,
							supplier_party_id, supplier_party_code, supplier_party_name,
							currency_code, version, created_by, updated_by, posted_at, posted_by
						) VALUES (
							${id}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
							'posted', ${record.supplierId}, ${record.supplierCode}, ${record.supplierName},
							${record.currencyCode}, 2, ${record.actorUserId},
							${record.actorUserId}, now(), ${record.actorUserId}
						) RETURNING *
					),
					projected AS (
						INSERT INTO supplier_balance_projection (
							id, organization_id, supplier_party_id, currency_code, open_balance,
							version, created_by, updated_by
						)
						SELECT ${balanceId}, organization_id, supplier_party_id, currency_code,
							(-${record.amount}::numeric)::text, 1,
							${record.actorUserId}, ${record.actorUserId}
						FROM mutated
						ON CONFLICT (organization_id, supplier_party_id, currency_code)
						DO UPDATE SET
							open_balance = (supplier_balance_projection.open_balance::numeric +
								EXCLUDED.open_balance::numeric)::text,
							version = supplier_balance_projection.version + 1,
							updated_by = ${record.actorUserId}, updated_at = now()
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'payables.credit_note.posted.v1',
							'payables', ${record.correlationId}, ${record.actorUserId},
							${payload}::jsonb, 'pending', 0 FROM mutated RETURNING id
					)
					SELECT mutated.id FROM mutated, projected, outboxed
				`,
			]);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Supplier credit note issue conflict");
			const [credit] = await db
				.select()
				.from(supplierCreditNote)
				.where(
					and(
						eq(supplierCreditNote.organizationId, record.organizationId),
						eq(supplierCreditNote.id, id),
					),
				)
				.limit(1);
			if (credit === undefined)
				return fail("INTERNAL_ERROR", "Issued supplier credit note missing");
			return ok({
				id: credit.id,
				organizationId: credit.organizationId,
				code: credit.code,
				normalizedCode: credit.normalizedCode,
				documentType: "credit_note",
				status: invoiceStatus(credit.status),
				supplierId: credit.supplierPartyId,
				supplierCode: credit.supplierPartyCode,
				supplierName: credit.supplierPartyName,
				currencyCode: credit.currencyCode,
				totalAmount: record.amount,
				openAmount: "0",
				version: credit.version,
				createdBy: credit.createdBy,
				updatedBy: credit.updatedBy,
				matchedAt: null,
				matchedBy: null,
				postedAt: credit.postedAt,
				postedBy: credit.postedBy,
				cancelledAt: null,
				cancelledBy: null,
				createdAt: credit.createdAt,
				updatedAt: credit.updatedAt,
				lines: [],
				matchResult: null,
			});
		} catch (error) {
			return failFromUnknown(error, "Failed to issue supplier credit note");
		}
	}

	async applyPayment(
		record: Parameters<PayablesStore["applyPayment"]>[0],
	): Promise<Result<SupplierAllocation>> {
		const id = randomUUID();
		const eventId = randomUUID();
		try {
			const [replay] = await db
				.select()
				.from(supplierAllocation)
				.where(
					and(
						eq(supplierAllocation.organizationId, record.organizationId),
						eq(supplierAllocation.applyIdempotencyKey, record.idempotencyKey),
					),
				)
				.limit(1);
			if (replay !== undefined) return ok(mapAllocation(replay));
			const [rows] = await runNeonHttpTransaction<
				[
					Array<{
						id: string;
						organization_id: string;
						invoice_id: string;
						supplier_id: string;
						payment_id: string;
						amount: string;
						created_by: string;
						created_at: Date;
					}>,
				]
			>((sql) => [
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
			const row = rows[0];
			if (row === undefined)
				return fail("CONFLICT", "Supplier allocation conflict");
			return ok({
				id: row.id,
				organizationId: row.organization_id,
				invoiceId: row.invoice_id,
				supplierId: row.supplier_id,
				paymentId: row.payment_id,
				paymentApplicationInstructionId: record.paymentApplicationInstructionId,
				creditNoteId: null,
				status: "active",
				amount: row.amount,
				applyIdempotencyKey: record.idempotencyKey,
				reversedAt: null,
				reversedBy: null,
				createdBy: row.created_by,
				createdAt: row.created_at,
			});
		} catch (error) {
			return failFromUnknown(error, "Failed to apply supplier payment");
		}
	}

	async applyCredit(
		record: Parameters<PayablesStore["applyCredit"]>[0],
	): Promise<Result<SupplierAllocation>> {
		const id = randomUUID();
		try {
			const [replay] = await db
				.select()
				.from(supplierAllocation)
				.where(
					and(
						eq(supplierAllocation.organizationId, record.organizationId),
						eq(supplierAllocation.applyIdempotencyKey, record.idempotencyKey),
					),
				)
				.limit(1);
			if (replay !== undefined) return ok(mapAllocation(replay));
			const [rows] = await runNeonHttpTransaction<[Array<{ id: string }>]>(
				(sql) => [
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
					) SELECT id FROM allocated
				`,
				],
			);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Supplier credit application conflict");
			const [allocation] = await db
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
				? fail("INTERNAL_ERROR", "Created supplier credit allocation missing")
				: ok(mapAllocation(allocation));
		} catch (error) {
			return failFromUnknown(error, "Failed to apply supplier credit");
		}
	}

	async reversePaymentApplication(
		record: Parameters<PayablesStore["reversePaymentApplication"]>[0],
	): Promise<Result<SupplierAllocation[]>> {
		try {
			const [rows] = await runNeonHttpTransaction<
				[
					Array<{
						id: string;
						organization_id: string;
						invoice_id: string;
						supplier_id: string;
						payment_id: string;
						amount: string;
						created_by: string;
						created_at: Date;
					}>,
				]
			>((sql) => [
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
			return ok(
				rows.map((row) => ({
					id: row.id,
					organizationId: row.organization_id,
					invoiceId: row.invoice_id,
					supplierId: row.supplier_id,
					paymentId: row.payment_id,
					paymentApplicationInstructionId: null,
					creditNoteId: null,
					status: "reversed",
					amount: row.amount,
					applyIdempotencyKey: null,
					reversedAt: new Date(),
					reversedBy: record.actorUserId,
					createdBy: row.created_by,
					createdAt: row.created_at,
				})),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to reverse supplier allocations");
		}
	}

	async cancel(
		record: Parameters<PayablesStore["cancel"]>[0],
	): Promise<Result<SupplierInvoice>> {
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE supplier_invoice
						SET status = 'cancelled', cancelled_at = now(),
							cancelled_by = ${record.actorUserId}, updated_by = ${record.actorUserId},
							updated_at = now(), version = version + 1
						WHERE id = ${record.invoiceId} AND organization_id = ${record.organizationId}
							AND version = ${record.expectedVersion}
							AND status IN ('draft', 'matched')
						RETURNING *
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT ${randomUUID()}, organization_id, 'payables.invoice.cancelled.v1', 'payables',
							${record.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', organization_id, 'entityId', id,
								'supplierId', supplier_party_id, 'amount', '0',
								'currencyCode', currency_code, 'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId}
							), 'pending', 0 FROM mutated
					)
					SELECT mutated.id FROM mutated, outboxed
				`,
			]);
			if (rows[0] === undefined)
				return fail(
					"CONFLICT",
					"Supplier invoice cancel conflict — only draft or matched invoices may be cancelled",
				);
			return reload(
				this,
				record.organizationId,
				record.invoiceId,
				"Cancelled supplier invoice missing",
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to cancel supplier invoice");
		}
	}

	async getById(
		organizationId: string,
		id: string,
	): Promise<Result<SupplierInvoice | null>> {
		try {
			const [header] = await db
				.select()
				.from(supplierInvoice)
				.where(
					and(
						eq(supplierInvoice.organizationId, organizationId),
						eq(supplierInvoice.id, id),
					),
				)
				.limit(1);
			if (header === undefined) return ok(null);
			const [lines, matches, allocations] = await Promise.all([
				db
					.select()
					.from(supplierInvoiceLine)
					.where(
						and(
							eq(supplierInvoiceLine.organizationId, organizationId),
							eq(supplierInvoiceLine.invoiceId, id),
						),
					)
					.orderBy(asc(supplierInvoiceLine.lineNo)),
				db
					.select()
					.from(threeWayMatchResult)
					.where(
						and(
							eq(threeWayMatchResult.organizationId, organizationId),
							eq(threeWayMatchResult.supplierInvoiceId, id),
						),
					)
					.limit(1),
				db
					.select()
					.from(supplierAllocation)
					.where(
						and(
							eq(supplierAllocation.organizationId, organizationId),
							eq(supplierAllocation.supplierInvoiceId, id),
							eq(supplierAllocation.status, "active"),
						),
					),
			]);
			const allocated = allocations.reduce(
				(total, row) => total + Number(row.amount),
				0,
			);
			return ok(
				mapInvoice(
					header,
					lines.map(mapLine),
					matches[0] === undefined ? null : mapMatch(matches[0]),
					allocated,
				),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to load supplier invoice");
		}
	}

	async list(
		filter: Parameters<PayablesStore["list"]>[0],
	): Promise<Result<SupplierInvoice[]>> {
		try {
			const conditions = [
				eq(supplierInvoice.organizationId, filter.organizationId),
			];
			if (filter.status !== undefined)
				conditions.push(eq(supplierInvoice.status, filter.status));
			const headers = await db
				.select()
				.from(supplierInvoice)
				.where(and(...conditions))
				.orderBy(desc(supplierInvoice.updatedAt), desc(supplierInvoice.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			if (headers.length === 0) return ok([]);
			const ids = headers.map((row) => row.id);
			const [lines, matches, allocations] = await Promise.all([
				db
					.select()
					.from(supplierInvoiceLine)
					.where(
						and(
							eq(supplierInvoiceLine.organizationId, filter.organizationId),
							inArray(supplierInvoiceLine.invoiceId, ids),
						),
					),
				db
					.select()
					.from(threeWayMatchResult)
					.where(
						and(
							eq(threeWayMatchResult.organizationId, filter.organizationId),
							inArray(threeWayMatchResult.supplierInvoiceId, ids),
						),
					),
				db
					.select()
					.from(supplierAllocation)
					.where(
						and(
							eq(supplierAllocation.organizationId, filter.organizationId),
							inArray(supplierAllocation.supplierInvoiceId, ids),
							eq(supplierAllocation.status, "active"),
						),
					),
			]);
			const linesByInvoice = new Map<string, SupplierInvoiceLine[]>();
			for (const row of lines) {
				linesByInvoice.set(row.invoiceId, [
					...(linesByInvoice.get(row.invoiceId) ?? []),
					mapLine(row),
				]);
			}
			const matchByInvoice = new Map(
				matches.map((row) => [row.supplierInvoiceId, mapMatch(row)]),
			);
			const allocatedByInvoice = new Map<string, number>();
			for (const row of allocations) {
				allocatedByInvoice.set(
					row.supplierInvoiceId,
					(allocatedByInvoice.get(row.supplierInvoiceId) ?? 0) +
						Number(row.amount),
				);
			}
			return ok(
				headers.map((row) =>
					mapInvoice(
						row,
						linesByInvoice.get(row.id) ?? [],
						matchByInvoice.get(row.id) ?? null,
						allocatedByInvoice.get(row.id) ?? 0,
					),
				),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to list supplier invoices");
		}
	}

	async getBalance(
		organizationId: string,
		supplierId: string,
		currencyCode?: string,
	): Promise<Result<SupplierBalance[]>> {
		try {
			const [rows] = await runNeonHttpTransaction<
				[
					Array<{
						organization_id: string;
						supplier_id: string;
						currency_code: string;
						open_balance: string;
						invoiced_amount: string;
						credited_amount: string;
						paid_amount: string;
						updated_at: Date;
					}>,
				]
			>((sql) => [
				sql`
					SELECT balance.organization_id, balance.supplier_party_id AS supplier_id,
						balance.currency_code, balance.open_balance, balance.updated_at,
						(SELECT COALESCE(SUM(line.line_amount::numeric), 0)::text
							FROM supplier_invoice invoice
							JOIN supplier_invoice_line line ON line.invoice_id = invoice.id
							WHERE invoice.organization_id = balance.organization_id
								AND invoice.supplier_party_id = balance.supplier_party_id
								AND invoice.currency_code = balance.currency_code
								AND invoice.status = 'posted') AS invoiced_amount,
						(SELECT COALESCE(SUM(credit.amount::numeric), 0)::text
							FROM supplier_credit_note credit
							WHERE credit.organization_id = balance.organization_id
								AND credit.supplier_party_id = balance.supplier_party_id
								AND credit.currency_code = balance.currency_code
								AND credit.status = 'posted') AS credited_amount,
						(SELECT COALESCE(SUM(allocation.amount::numeric), 0)::text
							FROM supplier_allocation allocation
							WHERE allocation.organization_id = balance.organization_id
								AND allocation.supplier_party_id = balance.supplier_party_id
								AND allocation.status = 'active' AND allocation.payment_id IS NOT NULL) AS paid_amount
					FROM supplier_balance_projection balance
					WHERE balance.organization_id = ${organizationId}
						AND balance.supplier_party_id = ${supplierId}
						AND (${currencyCode ?? null}::text IS NULL OR balance.currency_code = ${currencyCode ?? null})
					ORDER BY balance.currency_code ASC
				`,
			]);
			return ok(
				rows.map((row) => ({
					organizationId: row.organization_id,
					supplierId: row.supplier_id,
					currencyCode: row.currency_code,
					openBalance: row.open_balance,
					invoicedAmount: row.invoiced_amount,
					creditedAmount: row.credited_amount,
					paidAmount: row.paid_amount,
					outstandingAmount: row.open_balance,
					asOf: new Date(),
					updatedAt: row.updated_at,
				})),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to load supplier balance");
		}
	}
}

export function createDrizzlePayablesStore(): DrizzlePayablesStore {
	return new DrizzlePayablesStore();
}
