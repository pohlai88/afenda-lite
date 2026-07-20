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
	supplierBalanceProjection,
	supplierCreditNote,
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

function mapMatch(
	row: typeof threeWayMatchResult.$inferSelect,
): ThreeWayMatchResult {
	if (row.matchStatus !== "matched") {
		throw new Error(
			`Invalid three_way_match_result.match_status: ${row.matchStatus}`,
		);
	}
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
		result: row.matchStatus,
		matchedBy: row.createdBy,
		matchedAt: row.createdAt,
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
							AND supplier_invoice_id = ${record.invoiceId}
					),
					inserted AS (
						INSERT INTO supplier_invoice_line (
							id, organization_id, supplier_invoice_id, line_no, item_id, item_code,
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
						SET status = 'matched', updated_at = now(),
							updated_by = ${record.actorUserId}, version = version + 1
						WHERE id = ${record.invoiceId} AND organization_id = ${record.organizationId}
							AND status = 'draft' AND version = ${record.expectedVersion}
							AND EXISTS (
								SELECT 1 FROM supplier_invoice_line
								WHERE supplier_invoice_id = ${record.invoiceId}
									AND organization_id = ${record.organizationId}
							)
							AND EXISTS (
								SELECT 1 FROM purchase_order
								WHERE id = ${record.purchaseOrderId}
									AND organization_id = ${record.organizationId}
									AND status = 'posted'
									AND party_id = supplier_invoice.supplier_party_id
							)
							AND EXISTS (
								SELECT 1 FROM goods_receipt
								WHERE id = ${record.goodsReceiptId}
									AND organization_id = ${record.organizationId}
									AND status IN ('posted', 'closed')
									AND source_type = 'purchase_order'
									AND source_id = ${record.purchaseOrderId}
							)
							AND NOT EXISTS (
								SELECT 1
								FROM supplier_invoice_line invoice_line
								WHERE invoice_line.supplier_invoice_id = supplier_invoice.id
									AND invoice_line.organization_id = supplier_invoice.organization_id
									AND NOT EXISTS (
										SELECT 1
										FROM purchase_order_line po_line
										JOIN goods_receipt_line receipt_line
											ON receipt_line.purchase_order_line_id = po_line.id
											AND receipt_line.organization_id = po_line.organization_id
										WHERE po_line.order_id = ${record.purchaseOrderId}
											AND po_line.organization_id = ${record.organizationId}
											AND receipt_line.goods_receipt_id = ${record.goodsReceiptId}
											AND po_line.item_id = invoice_line.item_id
											AND po_line.quantity >= invoice_line.quantity::numeric
											AND receipt_line.quantity_received::numeric >= invoice_line.quantity::numeric
									)
							)
						RETURNING *
					),
					matched AS (
						INSERT INTO three_way_match_result (
							id, organization_id, supplier_invoice_id, purchase_order_id,
							goods_receipt_id, match_status, version, created_by, updated_by
						)
						SELECT ${matchId}, organization_id, id, ${record.purchaseOrderId},
							${record.goodsReceiptId}, 'matched', 1,
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
									FROM supplier_invoice_line WHERE supplier_invoice_id = mutated.id),
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
							WHERE supplier_invoice_id = mutated.id
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

	async issueCredit(
		record: Parameters<PayablesStore["issueCredit"]>[0],
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

	async allocate(
		record: Parameters<PayablesStore["allocate"]>[0],
	): Promise<Result<SupplierAllocation>> {
		const id = randomUUID();
		const eventId = randomUUID();
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
					WITH eligible AS (
						SELECT invoice.*, (
							SELECT COALESCE(SUM(line_amount::numeric), 0)
							FROM supplier_invoice_line
							WHERE supplier_invoice_id = invoice.id
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
							amount, allocated_at, allocated_by, version, created_by, updated_by
						)
						SELECT ${id}, organization_id, supplier_party_id, id, ${record.paymentId},
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
				amount: row.amount,
				createdBy: row.created_by,
				createdAt: row.created_at,
			});
		} catch (error) {
			return failFromUnknown(error, "Failed to allocate supplier payment");
		}
	}

	async cancel(
		record: Parameters<PayablesStore["cancel"]>[0],
	): Promise<Result<SupplierInvoice>> {
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH eligible AS (
						SELECT invoice.*, (
							SELECT COALESCE(SUM(line_amount::numeric), 0)
							FROM supplier_invoice_line
							WHERE supplier_invoice_id = invoice.id
								AND organization_id = invoice.organization_id
						) AS total_amount
						FROM supplier_invoice invoice
						WHERE id = ${record.invoiceId} AND organization_id = ${record.organizationId}
							AND version = ${record.expectedVersion}
							AND status IN ('draft', 'matched', 'posted')
							AND NOT EXISTS (
								SELECT 1 FROM supplier_allocation
								WHERE supplier_invoice_id = invoice.id
									AND organization_id = invoice.organization_id
							)
					),
					mutated AS (
						UPDATE supplier_invoice
						SET status = 'cancelled', cancelled_at = now(),
							cancelled_by = ${record.actorUserId}, updated_by = ${record.actorUserId},
							updated_at = now(), version = version + 1
						WHERE id = ${record.invoiceId} AND organization_id = ${record.organizationId}
							AND EXISTS (SELECT 1 FROM eligible)
						RETURNING id
					),
					projected AS (
						UPDATE supplier_balance_projection
						SET open_balance = (
							open_balance::numeric - (SELECT total_amount FROM eligible)
						)::text, version = version + 1,
							updated_by = ${record.actorUserId}, updated_at = now()
						WHERE organization_id = ${record.organizationId}
							AND supplier_party_id = (SELECT supplier_party_id FROM eligible)
							AND currency_code = (SELECT currency_code FROM eligible)
							AND (SELECT status FROM eligible) = 'posted'
							AND EXISTS (SELECT 1 FROM mutated)
						RETURNING id
					)
					SELECT mutated.id FROM mutated
				`,
			]);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Supplier invoice cancel conflict");
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
			const conditions = [
				eq(supplierBalanceProjection.organizationId, organizationId),
				eq(supplierBalanceProjection.supplierPartyId, supplierId),
			];
			if (currencyCode !== undefined) {
				conditions.push(
					eq(supplierBalanceProjection.currencyCode, currencyCode),
				);
			}
			const rows = await db
				.select()
				.from(supplierBalanceProjection)
				.where(and(...conditions))
				.orderBy(asc(supplierBalanceProjection.currencyCode));
			return ok(
				rows.map((row) => ({
					organizationId: row.organizationId,
					supplierId: row.supplierPartyId,
					currencyCode: row.currencyCode,
					openBalance: row.openBalance,
					updatedAt: row.updatedAt,
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
