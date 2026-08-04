import { randomUUID } from "node:crypto";

import {
	database as afendaDatabase,
	and,
	asc,
	desc,
	eq,
	inArray,
	supplierAllocation,
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
	SupplierInvoice,
	SupplierInvoiceCreateRecord,
	SupplierInvoiceLine,
	SupplierInvoiceStatus,
	ThreeWayMatchResult,
} from "../../kernel/contracts/domain";
import type { PayablesInvoiceLifecycleStore } from "./invoice-lifecycle.store";

function failFromPersistence(error: unknown, _fallbackMessage: string) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
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

async function getById(
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

async function reload(
	organizationId: string,
	id: string,
	_message: string,
): Promise<Result<SupplierInvoice>> {
	const result = await getById(organizationId, id);
	if (!result.ok) {
		return result;
	}
	return result.data === null
		? errorResult.fail("INTERNAL_ERROR")
		: errorResult.ok(result.data);
}

export const drizzleInvoiceLifecycleMethods: PayablesInvoiceLifecycleStore = {
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
				record.organizationId,
				id,
				"Created supplier invoice missing",
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to create supplier invoice");
		}
	},

	async addLine(
		record: Parameters<PayablesInvoiceLifecycleStore["addLine"]>[0],
	): Promise<Result<SupplierInvoiceLine>> {
		const id = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
				WITH numbered AS (
					SELECT COALESCE(MAX(line_no), 0) + 1 AS line_no
					FROM supplier_invoice_line
					WHERE supplier_invoice_line.organization_id = ${record.organizationId}
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
						WHERE id = ${record.invoiceId} AND supplier_invoice.organization_id = ${record.organizationId}
							AND status = 'draft'
					)
					RETURNING id
				),
				bumped AS (
					UPDATE supplier_invoice
					SET version = version + 1, updated_by = ${record.actorUserId}, updated_at = now()
					WHERE id = ${record.invoiceId} AND supplier_invoice.organization_id = ${record.organizationId}
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
	},

	async matchInvoice(
		record: Parameters<PayablesInvoiceLifecycleStore["matchInvoice"]>[0],
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
					WHERE id = ${record.invoiceId} AND supplier_invoice.organization_id = ${record.organizationId}
						AND status = 'draft' AND version = ${record.expectedVersion}
						AND EXISTS (
							SELECT 1 FROM supplier_invoice_line
							WHERE invoice_id = ${record.invoiceId}
								AND supplier_invoice_line.organization_id = ${record.organizationId}
						)
						AND (
							SELECT COALESCE(SUM(line_amount::numeric), 0)
							FROM supplier_invoice_line
							WHERE invoice_id = ${record.invoiceId}
								AND supplier_invoice_line.organization_id = ${record.organizationId}
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
				record.organizationId,
				record.invoiceId,
				"Matched supplier invoice missing",
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to match supplier invoice");
		}
	},

	async postInvoice(
		record: Parameters<PayablesInvoiceLifecycleStore["postInvoice"]>[0],
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
					WHERE id = ${record.invoiceId} AND supplier_invoice.organization_id = ${record.organizationId}
						AND status = 'matched' AND version = ${record.expectedVersion}
					RETURNING *
				),
				totaled AS (
					SELECT mutated.*, (
						SELECT SUM(line_amount::numeric) FROM supplier_invoice_line
						WHERE invoice_id = mutated.id
							AND supplier_invoice_line.organization_id = mutated.organization_id
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
				record.organizationId,
				record.invoiceId,
				"Posted supplier invoice missing",
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to post supplier invoice");
		}
	},

	async cancel(
		record: Parameters<PayablesInvoiceLifecycleStore["cancel"]>[0],
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
				record.organizationId,
				record.invoiceId,
				"Cancelled supplier invoice missing",
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to cancel supplier invoice");
		}
	},

	getById,

	async list(
		filter: Parameters<PayablesInvoiceLifecycleStore["list"]>[0],
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
	},
};
