import { randomUUID } from "node:crypto";

import {
	database as afendaDatabase,
	and,
	asc,
	desc,
	eq,
	inArray,
	supplierAllocation,
	supplierCreditNote,
	supplierCreditNoteLine,
	supplierInvoice,
	supplierInvoiceLine,
	threeWayMatchResult,
} from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

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

interface SupplierBalanceSqlRow {
	credited_amount: string;
	currency_code: string;
	invoiced_amount: string;
	open_balance: string;
	organization_id: string;
	paid_amount: string;
	supplier_id: string;
	updated_at: Date;
}

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
		createdAt: row.createdAt,
		createdBy: row.createdBy,
		description: row.itemName,
		id: row.id,
		invoiceId: row.invoiceId,
		itemId: row.itemId,
		lineAmount: row.lineAmount,
		lineNo: row.lineNo,
		organizationId: row.organizationId,
		quantity: row.quantity,
		unitPrice: row.unitPrice,
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
		evidence:
			row.evidenceJson === null
				? {
						lineResults: [],
						priceTolerancePct: "0",
						quantityTolerancePct: "0",
					}
				: (JSON.parse(row.evidenceJson) as ThreeWayMatchResult["evidence"]),
		goodsReceiptId: row.goodsReceiptId,
		goodsReceiptVersion: row.grEvidenceVersion ?? 0,
		id: row.id,
		invoiceId: row.supplierInvoiceId,
		matchedAt: row.createdAt,
		matchedBy: row.createdBy,
		organizationId: row.organizationId,
		purchaseOrderId: row.purchaseOrderId,
		purchaseOrderVersion: row.poEvidenceVersion ?? 0,
		result: mapMatchStatus(row.matchStatus),
	};
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

function mapInvoice(
	row: typeof supplierInvoice.$inferSelect,
	lines: SupplierInvoiceLine[],
	matchResult: ThreeWayMatchResult | null,
	allocatedAmount = 0,
): SupplierInvoice {
	const total = lines.reduce((sum, line) => sum + Number(line.lineAmount), 0);
	return {
		cancelledAt: row.cancelledAt,
		cancelledBy: row.cancelledBy,
		code: row.code,
		createdAt: row.createdAt,
		createdBy: row.createdBy,
		currencyCode: row.currencyCode,
		documentType: "invoice",
		id: row.id,
		lines,
		matchedAt: matchResult?.matchedAt ?? null,
		matchedBy: matchResult?.matchedBy ?? null,
		matchResult,
		normalizedCode: row.normalizedCode,
		openAmount:
			row.status === "posted"
				? String(Math.max(0, total - allocatedAmount))
				: "0",
		organizationId: row.organizationId,
		postedAt: row.postedAt,
		postedBy: row.postedBy,
		status: invoiceStatus(row.status),
		supplierCode: row.supplierPartyCode,
		supplierId: row.supplierPartyId,
		supplierName: row.supplierPartyName,
		totalAmount: String(total),
		updatedAt: row.updatedAt,
		updatedBy: row.updatedBy,
		version: row.version,
	};
}

async function reload(
	store: DrizzlePayablesStore,
	organizationId: string,
	id: string,
	_message: string,
): Promise<Result<SupplierInvoice>> {
	const result = await store.getById(organizationId, id);
	if (!result.ok) {
		return result;
	}
	return result.data === null
		? errorResult.fail("INTERNAL_ERROR")
		: errorResult.ok(result.data);
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
		actorId: record.actorUserId,
		amount: record.amount,
		correlationId: record.correlationId,
		currencyCode: record.currencyCode,
		entityId: record.entityId,
		organizationId: record.organizationId,
		supplierId: record.supplierId,
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
				actorUserId: record.actorUserId,
				amount: "0",
				correlationId: record.correlationId,
				currencyCode: record.currencyCode,
				entityId: id,
				organizationId: record.organizationId,
				supplierId: record.supplierId,
			});
			await afendaDatabase.transaction((sql) => [
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
			return failFromPersistence(error, "Failed to create supplier invoice");
		}
	}

	async addLine(
		record: Parameters<PayablesStore["addLine"]>[0],
	): Promise<Result<SupplierInvoiceLine>> {
		const id = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
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
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Supplier invoice line conflict",
				});
			}
			const [line] = await afendaDatabase.client
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
				? errorResult.fail("INTERNAL_ERROR")
				: errorResult.ok(mapLine(line));
		} catch (error) {
			return failFromPersistence(error, "Failed to add supplier invoice line");
		}
	}

	async matchInvoice(
		record: Parameters<PayablesStore["matchInvoice"]>[0],
	): Promise<Result<SupplierInvoice>> {
		const matchId = randomUUID();
		const eventId = randomUUID();
		try {
			const payload = eventPayload({
				actorUserId: record.actorUserId,
				correlationId: record.correlationId,
				entityId: record.invoiceId,
				organizationId: record.organizationId,
			});
			const [rows] = await afendaDatabase.transaction((sql) => [
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
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Supplier invoice match conflict",
				});
			}
			return reload(
				this,
				record.organizationId,
				record.invoiceId,
				"Matched supplier invoice missing",
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to match supplier invoice");
		}
	}

	async postInvoice(
		record: Parameters<PayablesStore["postInvoice"]>[0],
	): Promise<Result<SupplierInvoice>> {
		const balanceId = randomUUID();
		const eventId = randomUUID();
		try {
			const payload = eventPayload({
				actorUserId: record.actorUserId,
				correlationId: record.correlationId,
				entityId: record.invoiceId,
				organizationId: record.organizationId,
			});
			const [rows] = await afendaDatabase.transaction((sql) => [
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
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Supplier invoice post conflict",
				});
			}
			return reload(
				this,
				record.organizationId,
				record.invoiceId,
				"Posted supplier invoice missing",
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to post supplier invoice");
		}
	}

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
			return errorResult.ok({
				cancelledAt: null,
				cancelledBy: null,
				code: credit.code,
				createdAt: credit.createdAt,
				createdBy: credit.createdBy,
				currencyCode: credit.currencyCode,
				documentType: "credit_note",
				id: credit.id,
				lines: [],
				matchedAt: null,
				matchedBy: null,
				matchResult: null,
				normalizedCode: credit.normalizedCode,
				openAmount: "0",
				organizationId: credit.organizationId,
				postedAt: credit.postedAt,
				postedBy: credit.postedBy,
				status: invoiceStatus(credit.status),
				supplierCode: credit.supplierPartyCode,
				supplierId: credit.supplierPartyId,
				supplierName: credit.supplierPartyName,
				totalAmount: credit.amount,
				updatedAt: credit.updatedAt,
				updatedBy: credit.updatedBy,
				version: credit.version,
			});
		} catch (error) {
			return failFromPersistence(
				error,
				"Failed to create supplier credit note",
			);
		}
	}

	async addCreditLine(
		record: Parameters<PayablesStore["addCreditLine"]>[0],
	): Promise<Result<SupplierInvoiceLine>> {
		const id = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
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
	}

	async postCredit(
		record: Parameters<PayablesStore["postCredit"]>[0],
	): Promise<Result<SupplierInvoice>> {
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
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
			const emitted = await record.effects.emit({
				actorUserId: record.actorUserId,
				correlationId: record.correlationId,
				organizationId: record.organizationId,
				payload: JSON.parse(
					eventPayload({
						actorUserId: record.actorUserId,
						amount: credit.amount,
						correlationId: record.correlationId,
						currencyCode: credit.currencyCode,
						entityId: credit.id,
						organizationId: record.organizationId,
						supplierId: credit.supplierPartyId,
					}),
				),
				type: "payables.credit_note.posted.v1",
			});
			if (!emitted.ok) {
				return emitted;
			}
			return errorResult.ok({
				cancelledAt: null,
				cancelledBy: null,
				code: credit.code,
				createdAt: credit.createdAt,
				createdBy: credit.createdBy,
				currencyCode: credit.currencyCode,
				documentType: "credit_note",
				id: credit.id,
				lines: lines.map((line) => ({
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
				matchedAt: null,
				matchedBy: null,
				matchResult: null,
				normalizedCode: credit.normalizedCode,
				openAmount: credit.amount,
				organizationId: credit.organizationId,
				postedAt: credit.postedAt,
				postedBy: credit.postedBy,
				status: invoiceStatus(credit.status),
				supplierCode: credit.supplierPartyCode,
				supplierId: credit.supplierPartyId,
				supplierName: credit.supplierPartyName,
				totalAmount: credit.amount,
				updatedAt: credit.updatedAt,
				updatedBy: credit.updatedBy,
				version: credit.version,
			});
		} catch (error) {
			return failFromPersistence(error, "Failed to post supplier credit note");
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
				actorUserId: record.actorUserId,
				amount: record.amount,
				correlationId: record.correlationId,
				currencyCode: record.currencyCode,
				entityId: id,
				organizationId: record.organizationId,
				supplierId: record.supplierId,
			});
			const [rows] = await afendaDatabase.transaction((sql) => [
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
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Supplier credit note issue conflict",
				});
			}
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
			return errorResult.ok({
				cancelledAt: null,
				cancelledBy: null,
				code: credit.code,
				createdAt: credit.createdAt,
				createdBy: credit.createdBy,
				currencyCode: credit.currencyCode,
				documentType: "credit_note",
				id: credit.id,
				lines: [],
				matchedAt: null,
				matchedBy: null,
				matchResult: null,
				normalizedCode: credit.normalizedCode,
				openAmount: "0",
				organizationId: credit.organizationId,
				postedAt: credit.postedAt,
				postedBy: credit.postedBy,
				status: invoiceStatus(credit.status),
				supplierCode: credit.supplierPartyCode,
				supplierId: credit.supplierPartyId,
				supplierName: credit.supplierPartyName,
				totalAmount: record.amount,
				updatedAt: credit.updatedAt,
				updatedBy: credit.updatedBy,
				version: credit.version,
			});
		} catch (error) {
			return failFromPersistence(error, "Failed to issue supplier credit note");
		}
	}

	async applyPayment(
		record: Parameters<PayablesStore["applyPayment"]>[0],
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
	}

	async applyCredit(
		record: Parameters<PayablesStore["applyCredit"]>[0],
	): Promise<Result<SupplierAllocation>> {
		const id = randomUUID();
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
	}

	async reversePaymentApplication(
		record: Parameters<PayablesStore["reversePaymentApplication"]>[0],
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
	}

	async cancel(
		record: Parameters<PayablesStore["cancel"]>[0],
	): Promise<Result<SupplierInvoice>> {
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
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
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Supplier invoice cancel conflict — only draft or matched invoices may be cancelled",
				});
			}
			return reload(
				this,
				record.organizationId,
				record.invoiceId,
				"Cancelled supplier invoice missing",
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to cancel supplier invoice");
		}
	}

	async getById(
		organizationId: string,
		id: string,
	): Promise<Result<SupplierInvoice | null>> {
		try {
			const [header] = await afendaDatabase.client
				.select()
				.from(supplierInvoice)
				.where(
					and(
						eq(supplierInvoice.organizationId, organizationId),
						eq(supplierInvoice.id, id),
					),
				)
				.limit(1);
			if (header === undefined) {
				return errorResult.ok(null);
			}
			const [lines, matches, allocations] = await Promise.all([
				afendaDatabase.client
					.select()
					.from(supplierInvoiceLine)
					.where(
						and(
							eq(supplierInvoiceLine.organizationId, organizationId),
							eq(supplierInvoiceLine.invoiceId, id),
						),
					)
					.orderBy(asc(supplierInvoiceLine.lineNo)),
				afendaDatabase.client
					.select()
					.from(threeWayMatchResult)
					.where(
						and(
							eq(threeWayMatchResult.organizationId, organizationId),
							eq(threeWayMatchResult.supplierInvoiceId, id),
						),
					)
					.limit(1),
				afendaDatabase.client
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
			return errorResult.ok(
				mapInvoice(
					header,
					lines.map(mapLine),
					matches[0] === undefined ? null : mapMatch(matches[0]),
					allocated,
				),
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to load supplier invoice");
		}
	}

	async list(
		filter: Parameters<PayablesStore["list"]>[0],
	): Promise<Result<SupplierInvoice[]>> {
		try {
			const conditions = [
				eq(supplierInvoice.organizationId, filter.organizationId),
			];
			if (filter.status !== undefined) {
				conditions.push(eq(supplierInvoice.status, filter.status));
			}
			const headers = await afendaDatabase.client
				.select()
				.from(supplierInvoice)
				.where(and(...conditions))
				.orderBy(desc(supplierInvoice.updatedAt), desc(supplierInvoice.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			if (headers.length === 0) {
				return errorResult.ok([]);
			}
			const ids = headers.map((row) => row.id);
			const [lines, matches, allocations] = await Promise.all([
				afendaDatabase.client
					.select()
					.from(supplierInvoiceLine)
					.where(
						and(
							eq(supplierInvoiceLine.organizationId, filter.organizationId),
							inArray(supplierInvoiceLine.invoiceId, ids),
						),
					),
				afendaDatabase.client
					.select()
					.from(threeWayMatchResult)
					.where(
						and(
							eq(threeWayMatchResult.organizationId, filter.organizationId),
							inArray(threeWayMatchResult.supplierInvoiceId, ids),
						),
					),
				afendaDatabase.client
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
			return errorResult.ok(
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
			return failFromPersistence(error, "Failed to list supplier invoices");
		}
	}

	async getBalance(
		organizationId: string,
		supplierId: string,
		currencyCode?: string,
	): Promise<Result<SupplierBalance[]>> {
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
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
			return errorResult.ok(
				rows.map((row: SupplierBalanceSqlRow) => ({
					asOf: new Date(),
					creditedAmount: row.credited_amount,
					currencyCode: row.currency_code,
					invoicedAmount: row.invoiced_amount,
					openBalance: row.open_balance,
					organizationId: row.organization_id,
					outstandingAmount: row.open_balance,
					paidAmount: row.paid_amount,
					supplierId: row.supplier_id,
					updatedAt: row.updated_at,
				})),
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to load supplier balance");
		}
	}
}

export function createDrizzlePayablesStore(): DrizzlePayablesStore {
	return new DrizzlePayablesStore();
}
