import { randomUUID } from "node:crypto";

import {
	and,
	asc,
	db,
	desc,
	eq,
	inArray,
	purchaseOrder,
	purchaseOrderLine,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";

import {
	PURCHASING_ERROR_CODE_CONFLICT,
	PURCHASING_ERROR_ORDER_ALREADY_CANCELLED,
	PURCHASING_ERROR_ORDER_ALREADY_CLOSED,
	PURCHASING_ERROR_ORDER_ALREADY_POSTED,
	PURCHASING_ERROR_ORDER_EMPTY_LINES,
	PURCHASING_ERROR_ORDER_NOT_DRAFT,
	PURCHASING_ERROR_ORDER_NOT_FOUND,
	PURCHASING_ERROR_ORDER_NOT_POSTED,
	PURCHASING_ERROR_ORDER_VERSION_CONFLICT,
	purchasingErrorDetails,
} from "./error-codes";
import type { MutationPorts } from "./ports";
import type {
	OrderCancelRecord,
	OrderCloseRecord,
	OrderCreateRecord,
	OrderLineCreateRecord,
	OrderListFilter,
	OrderPostRecord,
	PurchasingStore,
} from "./store";
import {
	PURCHASE_ORDER_STATUSES,
	type PurchaseOrder,
	type PurchaseOrderLine,
	type PurchaseOrderStatus,
} from "./types";

type OrderSqlRow = {
	id: string;
	organization_id: string;
	code: string;
	normalized_code: string;
	status: string;
	party_id: string;
	party_code: string;
	party_name: string;
	payment_term_id: string | null;
	payment_term_code: string | null;
	payment_term_name: string | null;
	net_days: number | null;
	warehouse_id: string | null;
	warehouse_code: string | null;
	warehouse_name: string | null;
	currency_code: string;
	exchange_rate: string | null;
	subtotal_amount: string | null;
	discount_total: string | null;
	tax_total: string | null;
	document_total: string | null;
	create_idempotency_key: string;
	post_idempotency_key: string | null;
	cancel_idempotency_key: string | null;
	close_idempotency_key: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	posted_at: Date | null;
	posted_by: string | null;
	cancelled_at: Date | null;
	cancelled_by: string | null;
	closed_at: Date | null;
	closed_by: string | null;
	created_at: Date;
	updated_at: Date;
};

type LineSqlRow = {
	id: string;
	organization_id: string;
	order_id: string;
	line_no: number;
	item_id: string;
	item_code: string;
	item_name: string;
	base_uom_id: string;
	base_uom_code: string;
	quantity: string;
	unit_price: string;
	discount_amount: string;
	tax_classification: string | null;
	line_amount: string;
	over_receipt_percent: string;
	under_receipt_percent: string;
	invoice_quantity_tolerance_percent: string;
	invoice_price_tolerance_percent: string;
	line_idempotency_key: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapLine(row: LineSqlRow): PurchaseOrderLine {
	return {
		id: row.id,
		organizationId: row.organization_id,
		orderId: row.order_id,
		lineNo: row.line_no,
		itemId: row.item_id,
		itemCode: row.item_code,
		itemName: row.item_name,
		baseUomId: row.base_uom_id,
		baseUomCode: row.base_uom_code,
		quantity: row.quantity,
		unitPrice: row.unit_price,
		discountAmount: row.discount_amount,
		taxClassification: row.tax_classification,
		lineAmount: row.line_amount,
		overReceiptPercent: row.over_receipt_percent,
		underReceiptPercent: row.under_receipt_percent,
		invoiceQuantityTolerancePercent: row.invoice_quantity_tolerance_percent,
		invoicePriceTolerancePercent: row.invoice_price_tolerance_percent,
		lineIdempotencyKey: row.line_idempotency_key,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function parseOrderStatus(status: string): PurchaseOrderStatus {
	for (const candidate of PURCHASE_ORDER_STATUSES) {
		if (candidate === status) {
			return candidate;
		}
	}
	throw new Error(`Invalid purchase_order.status: ${status}`);
}

function mapOrder(row: OrderSqlRow, lines: PurchaseOrderLine[]): PurchaseOrder {
	return {
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		normalizedCode: row.normalized_code,
		status: parseOrderStatus(row.status),
		partyId: row.party_id,
		partyCode: row.party_code,
		partyName: row.party_name,
		paymentTermId: row.payment_term_id,
		paymentTermCode: row.payment_term_code,
		paymentTermName: row.payment_term_name,
		netDays: row.net_days,
		warehouseId: row.warehouse_id,
		warehouseCode: row.warehouse_code,
		warehouseName: row.warehouse_name,
		currencyCode: row.currency_code,
		exchangeRate: row.exchange_rate,
		subtotalAmount: row.subtotal_amount,
		discountTotal: row.discount_total,
		taxTotal: row.tax_total,
		documentTotal: row.document_total,
		createIdempotencyKey: row.create_idempotency_key,
		postIdempotencyKey: row.post_idempotency_key,
		cancelIdempotencyKey: row.cancel_idempotency_key,
		closeIdempotencyKey: row.close_idempotency_key,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		postedAt: row.posted_at,
		postedBy: row.posted_by,
		cancelledAt: row.cancelled_at,
		cancelledBy: row.cancelled_by,
		closedAt: row.closed_at,
		closedBy: row.closed_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		lines,
	};
}

function mapHeaderRow(header: typeof purchaseOrder.$inferSelect): OrderSqlRow {
	return {
		id: header.id,
		organization_id: header.organizationId,
		code: header.code,
		normalized_code: header.normalizedCode,
		status: header.status,
		party_id: header.partyId,
		party_code: header.partyCode,
		party_name: header.partyName,
		payment_term_id: header.paymentTermId,
		payment_term_code: header.paymentTermCode,
		payment_term_name: header.paymentTermName,
		net_days: header.netDays,
		warehouse_id: header.warehouseId,
		warehouse_code: header.warehouseCode,
		warehouse_name: header.warehouseName,
		currency_code: header.currencyCode,
		exchange_rate: header.exchangeRate,
		subtotal_amount: header.subtotalAmount,
		discount_total: header.discountTotal,
		tax_total: header.taxTotal,
		document_total: header.documentTotal,
		create_idempotency_key: header.createIdempotencyKey,
		post_idempotency_key: header.postIdempotencyKey,
		cancel_idempotency_key: header.cancelIdempotencyKey,
		close_idempotency_key: header.closeIdempotencyKey,
		version: header.version,
		created_by: header.createdBy,
		updated_by: header.updatedBy,
		posted_at: header.postedAt,
		posted_by: header.postedBy,
		cancelled_at: header.cancelledAt,
		cancelled_by: header.cancelledBy,
		closed_at: header.closedAt,
		closed_by: header.closedBy,
		created_at: header.createdAt,
		updated_at: header.updatedAt,
	};
}

function mapLineFromSelect(
	line: typeof purchaseOrderLine.$inferSelect,
): PurchaseOrderLine {
	return mapLine({
		id: line.id,
		organization_id: line.organizationId,
		order_id: line.orderId,
		line_no: line.lineNo,
		item_id: line.itemId,
		item_code: line.itemCode,
		item_name: line.itemName,
		base_uom_id: line.baseUomId,
		base_uom_code: line.baseUomCode,
		quantity: line.quantity,
		unit_price: line.unitPrice,
		discount_amount: line.discountAmount,
		tax_classification: line.taxClassification,
		line_amount: line.lineAmount,
		over_receipt_percent: line.overReceiptPercent,
		under_receipt_percent: line.underReceiptPercent,
		invoice_quantity_tolerance_percent: line.invoiceQuantityTolerancePercent,
		invoice_price_tolerance_percent: line.invoicePriceTolerancePercent,
		line_idempotency_key: line.lineIdempotencyKey,
		version: line.version,
		created_by: line.createdBy,
		updated_by: line.updatedBy,
		created_at: line.createdAt,
		updated_at: line.updatedAt,
	});
}

function eventPayloadJson(input: Record<string, unknown>): string {
	return JSON.stringify(input);
}

function fieldChangeJson(
	field: string,
	oldValue: unknown,
	newValue: unknown,
): string {
	return JSON.stringify([{ field, oldValue, newValue }]);
}

function valueSnapshotJson(value: Record<string, unknown>): string {
	return JSON.stringify(value);
}

function writeErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function isUniqueViolation(error: unknown): boolean {
	return /unique|duplicate/i.test(writeErrorMessage(error));
}

function isCreateIdempotencyConflict(error: unknown): boolean {
	return /purchase_order_org_create_idempotency_uidx|create_idempotency_key/i.test(
		writeErrorMessage(error),
	);
}

function isLineIdempotencyConflict(error: unknown): boolean {
	return /purchase_order_line_org_order_idempotency_uidx|line_idempotency_key/i.test(
		writeErrorMessage(error),
	);
}

function mapWriteError(
	error: unknown,
	conflictMessage: string,
	fallbackMessage: string,
): Result<never> {
	if (isUniqueViolation(error)) {
		return fail("CONFLICT", conflictMessage);
	}
	return failFromUnknown(error, fallbackMessage);
}

export class DrizzlePurchasingStore implements PurchasingStore {
	async createOrder(
		record: OrderCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PurchaseOrder>> {
		const entityId = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changesJson = fieldChangeJson("code", null, record.code);
		const newValueJson = valueSnapshotJson({
			code: record.code,
			status: "draft",
		});
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "purchase_order",
			entityId,
			code: record.code,
			version: 1,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[OrderSqlRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO purchase_order (
							id, organization_id, code, normalized_code, status,
							party_id, party_code, party_name,
							payment_term_id, payment_term_code, payment_term_name, net_days,
							warehouse_id, warehouse_code, warehouse_name,
							currency_code, exchange_rate,
							create_idempotency_key,
							version, created_by, updated_by
						) VALUES (
							${entityId}, ${record.organizationId}, ${record.code}, ${record.normalizedCode}, 'draft',
							${record.partyId}, ${record.partyCode}, ${record.partyName},
							${record.paymentTermId}, ${record.paymentTermCode}, ${record.paymentTermName}, ${record.netDays},
							${record.warehouseId}, ${record.warehouseCode}, ${record.warehouseName},
							${record.currencyCode}, ${record.exchangeRate},
							${record.createIdempotencyKey},
							1, ${record.createdBy}, ${record.createdBy}
						)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'purchasing', 'purchase_order', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, 'purchasing.order.created.v1', 'purchasing',
							${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			]);
			const row = rows[0];
			if (row === undefined) {
				return fail("INTERNAL_ERROR", "Purchase order create returned no row");
			}
			return ok(mapOrder(row, []));
		} catch (error) {
			if (isCreateIdempotencyConflict(error)) {
				const existing = await this.getOrderByCreateIdempotencyKey(
					record.organizationId,
					record.createIdempotencyKey,
				);
				if (!existing.ok) {
					return existing;
				}
				if (existing.data !== null) {
					return ok(existing.data);
				}
			}
			if (isUniqueViolation(error)) {
				return fail(
					"CONFLICT",
					"Purchase order code already exists",
					purchasingErrorDetails(PURCHASING_ERROR_CODE_CONFLICT),
				);
			}
			return failFromUnknown(error, "Failed to create purchase order");
		}
	}

	async addLine(
		record: OrderLineCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PurchaseOrderLine>> {
		const orderResult = await this.getOrderById(
			record.organizationId,
			record.orderId,
		);
		if (!orderResult.ok) {
			return orderResult;
		}
		if (orderResult.data === null) {
			return fail(
				"NOT_FOUND",
				"Purchase order not found",
				purchasingErrorDetails(PURCHASING_ERROR_ORDER_NOT_FOUND),
			);
		}
		const replay = orderResult.data.lines.find(
			(line) => line.lineIdempotencyKey === record.lineIdempotencyKey,
		);
		if (replay !== undefined) {
			return ok(replay);
		}
		if (orderResult.data.status !== "draft") {
			return fail(
				"CONFLICT",
				"Cannot add lines to a posted or cancelled order",
				purchasingErrorDetails(PURCHASING_ERROR_ORDER_NOT_DRAFT),
			);
		}
		const lineNo =
			orderResult.data.lines.reduce(
				(max, line) => Math.max(max, line.lineNo),
				0,
			) + 1;
		const lineId = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changesJson = fieldChangeJson("item_code", null, record.itemCode);
		const newValueJson = valueSnapshotJson({
			orderId: record.orderId,
			lineNo,
			itemCode: record.itemCode,
			quantity: record.quantity,
		});
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "purchase_order_line",
			entityId: lineId,
			code: orderResult.data.code,
			version: 1,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
			orderId: record.orderId,
			lineNo,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[LineSqlRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO purchase_order_line (
							id, organization_id, order_id, line_no,
							item_id, item_code, item_name, base_uom_id, base_uom_code,
							quantity, unit_price, discount_amount, tax_classification, line_amount,
							over_receipt_percent, under_receipt_percent,
							invoice_quantity_tolerance_percent, invoice_price_tolerance_percent,
							line_idempotency_key, version, created_by, updated_by
						) VALUES (
							${lineId}, ${record.organizationId}, ${record.orderId}, ${lineNo},
							${record.itemId}, ${record.itemCode}, ${record.itemName},
							${record.baseUomId}, ${record.baseUomCode},
							${record.quantity}, ${record.unitPrice}, ${record.discountAmount},
							${record.taxClassification}, ${record.lineAmount},
							${record.overReceiptPercent}, ${record.underReceiptPercent},
							${record.invoiceQuantityTolerancePercent}, ${record.invoicePriceTolerancePercent},
							${record.lineIdempotencyKey}, 1,
							${record.createdBy}, ${record.createdBy}
						)
						RETURNING *
					),
					bumped AS (
						UPDATE purchase_order
						SET version = version + 1,
							updated_by = ${record.createdBy},
							updated_at = now()
						WHERE id = ${record.orderId}
							AND organization_id = ${record.organizationId}
							AND status = 'draft'
						RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'purchasing', 'purchase_order_line', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, 'purchasing.order.line_added.v1', 'purchasing',
							${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, bumped, audited, outboxed
				`,
			]);
			const row = rows[0];
			if (row === undefined) {
				return fail(
					"INTERNAL_ERROR",
					"Purchase order line create returned no row",
				);
			}
			return ok(mapLine(row));
		} catch (error) {
			if (isLineIdempotencyConflict(error)) {
				const reloaded = await this.getOrderById(
					record.organizationId,
					record.orderId,
				);
				if (!reloaded.ok) {
					return reloaded;
				}
				const line = reloaded.data?.lines.find(
					(row) => row.lineIdempotencyKey === record.lineIdempotencyKey,
				);
				if (line !== undefined) {
					return ok(line);
				}
			}
			return mapWriteError(
				error,
				"Purchase order line conflict",
				"Failed to add purchase order line",
			);
		}
	}

	async postOrder(
		record: OrderPostRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PurchaseOrder>> {
		const existing = await this.getOrderById(
			record.organizationId,
			record.orderId,
		);
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return fail(
				"NOT_FOUND",
				"Purchase order not found",
				purchasingErrorDetails(PURCHASING_ERROR_ORDER_NOT_FOUND),
			);
		}
		const currentOrder = existing.data;
		if (currentOrder.status === "posted") {
			if (currentOrder.postIdempotencyKey === record.postIdempotencyKey) {
				return ok(currentOrder);
			}
			return fail(
				"CONFLICT",
				"Purchase order is already posted",
				purchasingErrorDetails(PURCHASING_ERROR_ORDER_ALREADY_POSTED),
			);
		}
		if (currentOrder.status !== "draft") {
			return fail(
				"CONFLICT",
				"Purchase order cannot be posted",
				purchasingErrorDetails(PURCHASING_ERROR_ORDER_NOT_DRAFT),
			);
		}
		if (currentOrder.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Purchase order version conflict",
				purchasingErrorDetails(PURCHASING_ERROR_ORDER_VERSION_CONFLICT),
			);
		}
		if (currentOrder.lines.length === 0) {
			return fail(
				"CONFLICT",
				"Cannot post order without lines",
				purchasingErrorDetails(PURCHASING_ERROR_ORDER_EMPTY_LINES),
			);
		}

		const auditId = randomUUID();
		const eventId = randomUUID();
		const nextVersion = currentOrder.version + 1;
		const changesJson = fieldChangeJson("status", "draft", "posted");
		const oldValueJson = valueSnapshotJson({
			status: "draft",
			version: currentOrder.version,
		});
		const newValueJson = valueSnapshotJson({
			status: "posted",
			version: nextVersion,
		});
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "purchase_order",
			entityId: record.orderId,
			code: currentOrder.code,
			version: nextVersion,
			actorId: record.actorUserId,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await runNeonHttpTransaction<[OrderSqlRow[]]>((sql) => {
				const statements = [
					sql`
						WITH mutated AS (
							UPDATE purchase_order
							SET status = 'posted',
								party_code = ${record.partyCode},
								party_name = ${record.partyName},
								payment_term_id = ${record.paymentTermId},
								payment_term_code = ${record.paymentTermCode},
								payment_term_name = ${record.paymentTermName},
								net_days = ${record.netDays},
								warehouse_id = ${record.warehouseId},
								warehouse_code = ${record.warehouseCode},
								warehouse_name = ${record.warehouseName},
								subtotal_amount = ${record.subtotalAmount},
								discount_total = ${record.discountTotal},
								tax_total = ${record.taxTotal},
								document_total = ${record.documentTotal},
								post_idempotency_key = ${record.postIdempotencyKey},
								posted_at = now(),
								posted_by = ${record.actorUserId},
								updated_by = ${record.actorUserId},
								updated_at = now(),
								version = ${nextVersion}
							WHERE id = ${record.orderId}
								AND organization_id = ${record.organizationId}
								AND status = 'draft'
								AND version = ${record.expectedVersion}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value
							)
							SELECT
								${auditId}, organization_id, ${record.actorUserId}, ${meta.correlationId},
								'purchasing', 'purchase_order', id, 'UPDATE', ${changesJson}::jsonb,
								${oldValueJson}::jsonb, ${newValueJson}::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, 'purchasing.order.posted.v1', 'purchasing',
								${meta.correlationId}, ${record.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				];
				for (const snap of record.lineSnapshots) {
					const currentLine = currentOrder.lines.find(
						(line) => line.id === snap.lineId,
					);
					const nextLineVersion = (currentLine?.version ?? 1) + 1;
					// Gate on posted header version so a header miss cannot stamp lines.
					statements.push(sql`
						UPDATE purchase_order_line
						SET item_code = ${snap.itemCode},
							item_name = ${snap.itemName},
							base_uom_id = ${snap.baseUomId},
							base_uom_code = ${snap.baseUomCode},
							unit_price = ${snap.unitPrice},
							discount_amount = ${snap.discountAmount},
							tax_classification = ${snap.taxClassification},
							line_amount = ${snap.lineAmount},
							updated_by = ${record.actorUserId},
							updated_at = now(),
							version = ${nextLineVersion}
						WHERE id = ${snap.lineId}
							AND organization_id = ${record.organizationId}
							AND order_id = ${record.orderId}
							AND EXISTS (
								SELECT 1
								FROM purchase_order o
								WHERE o.id = ${record.orderId}
									AND o.organization_id = ${record.organizationId}
									AND o.status = 'posted'
									AND o.version = ${nextVersion}
							)
					`);
				}
				return statements;
			});
			const row = rows[0];
			if (row === undefined) {
				return fail(
					"CONFLICT",
					"Purchase order version conflict",
					purchasingErrorDetails(PURCHASING_ERROR_ORDER_VERSION_CONFLICT),
				);
			}
			const reloaded = await this.getOrderById(
				record.organizationId,
				record.orderId,
			);
			if (!reloaded.ok) {
				return reloaded;
			}
			if (reloaded.data === null) {
				return fail("INTERNAL_ERROR", "Posted purchase order missing after write");
			}
			return ok(reloaded.data);
		} catch (error) {
			return mapWriteError(
				error,
				"Purchase order post conflict",
				"Failed to post purchase order",
			);
		}
	}

	async cancelOrder(
		record: OrderCancelRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PurchaseOrder>> {
		const existing = await this.getOrderById(
			record.organizationId,
			record.orderId,
		);
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return fail(
				"NOT_FOUND",
				"Purchase order not found",
				purchasingErrorDetails(PURCHASING_ERROR_ORDER_NOT_FOUND),
			);
		}
		const currentOrder = existing.data;
		if (currentOrder.status === "cancelled") {
			if (currentOrder.cancelIdempotencyKey === record.cancelIdempotencyKey) {
				return ok(currentOrder);
			}
			return fail(
				"CONFLICT",
				"Purchase order is already cancelled",
				purchasingErrorDetails(PURCHASING_ERROR_ORDER_ALREADY_CANCELLED),
			);
		}
		if (currentOrder.status !== "draft") {
			return fail(
				"CONFLICT",
				"Only draft purchase orders can be cancelled",
				purchasingErrorDetails(PURCHASING_ERROR_ORDER_NOT_DRAFT),
			);
		}
		if (currentOrder.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Purchase order version conflict",
				purchasingErrorDetails(PURCHASING_ERROR_ORDER_VERSION_CONFLICT),
			);
		}

		const auditId = randomUUID();
		const eventId = randomUUID();
		const nextVersion = currentOrder.version + 1;
		const changesJson = fieldChangeJson(
			"status",
			currentOrder.status,
			"cancelled",
		);
		const oldValueJson = valueSnapshotJson({
			status: currentOrder.status,
			version: currentOrder.version,
		});
		const newValueJson = valueSnapshotJson({
			status: "cancelled",
			version: nextVersion,
		});
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "purchase_order",
			entityId: record.orderId,
			code: currentOrder.code,
			version: nextVersion,
			actorId: record.actorUserId,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await runNeonHttpTransaction<[OrderSqlRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE purchase_order
						SET status = 'cancelled',
							cancelled_at = now(),
							cancelled_by = ${record.actorUserId},
							cancel_idempotency_key = ${record.cancelIdempotencyKey},
							updated_by = ${record.actorUserId},
							updated_at = now(),
							version = ${nextVersion}
						WHERE id = ${record.orderId}
							AND organization_id = ${record.organizationId}
							AND status = 'draft'
							AND version = ${record.expectedVersion}
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value
						)
						SELECT
							${auditId}, organization_id, ${record.actorUserId}, ${meta.correlationId},
							'purchasing', 'purchase_order', id, 'UPDATE', ${changesJson}::jsonb,
							${oldValueJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, 'purchasing.order.cancelled.v1', 'purchasing',
							${meta.correlationId}, ${record.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			]);
			const row = rows[0];
			if (row === undefined) {
				return fail(
					"CONFLICT",
					"Purchase order version conflict",
					purchasingErrorDetails(PURCHASING_ERROR_ORDER_VERSION_CONFLICT),
				);
			}
			const reloaded = await this.getOrderById(
				record.organizationId,
				record.orderId,
			);
			if (!reloaded.ok) {
				return reloaded;
			}
			if (reloaded.data === null) {
				return fail(
					"INTERNAL_ERROR",
					"Cancelled purchase order missing after write",
				);
			}
			return ok(reloaded.data);
		} catch (error) {
			return mapWriteError(
				error,
				"Purchase order cancel conflict",
				"Failed to cancel purchase order",
			);
		}
	}

	async closeOrder(
		record: OrderCloseRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PurchaseOrder>> {
		const existing = await this.getOrderById(
			record.organizationId,
			record.orderId,
		);
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return fail(
				"NOT_FOUND",
				"Purchase order not found",
				purchasingErrorDetails(PURCHASING_ERROR_ORDER_NOT_FOUND),
			);
		}
		const currentOrder = existing.data;
		if (currentOrder.status === "closed") {
			if (currentOrder.closeIdempotencyKey === record.closeIdempotencyKey) {
				return ok(currentOrder);
			}
			return fail(
				"CONFLICT",
				"Purchase order is already closed",
				purchasingErrorDetails(PURCHASING_ERROR_ORDER_ALREADY_CLOSED),
			);
		}
		if (currentOrder.status !== "posted") {
			return fail(
				"CONFLICT",
				"Only posted purchase orders can be closed",
				purchasingErrorDetails(PURCHASING_ERROR_ORDER_NOT_POSTED),
			);
		}
		if (currentOrder.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Purchase order version conflict",
				purchasingErrorDetails(PURCHASING_ERROR_ORDER_VERSION_CONFLICT),
			);
		}

		const auditId = randomUUID();
		const eventId = randomUUID();
		const nextVersion = currentOrder.version + 1;
		const changesJson = fieldChangeJson("status", "posted", "closed");
		const oldValueJson = valueSnapshotJson({
			status: "posted",
			version: currentOrder.version,
		});
		const newValueJson = valueSnapshotJson({
			status: "closed",
			version: nextVersion,
		});
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "purchase_order",
			entityId: record.orderId,
			code: currentOrder.code,
			version: nextVersion,
			actorId: record.actorUserId,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await runNeonHttpTransaction<[OrderSqlRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE purchase_order
						SET status = 'closed',
							closed_at = now(),
							closed_by = ${record.actorUserId},
							close_idempotency_key = ${record.closeIdempotencyKey},
							updated_by = ${record.actorUserId},
							updated_at = now(),
							version = ${nextVersion}
						WHERE id = ${record.orderId}
							AND organization_id = ${record.organizationId}
							AND status = 'posted'
							AND version = ${record.expectedVersion}
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value
						)
						SELECT
							${auditId}, organization_id, ${record.actorUserId}, ${meta.correlationId},
							'purchasing', 'purchase_order', id, 'UPDATE', ${changesJson}::jsonb,
							${oldValueJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, 'purchasing.order.closed.v1', 'purchasing',
							${meta.correlationId}, ${record.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			]);
			const row = rows[0];
			if (row === undefined) {
				return fail(
					"CONFLICT",
					"Purchase order version conflict",
					purchasingErrorDetails(PURCHASING_ERROR_ORDER_VERSION_CONFLICT),
				);
			}
			const reloaded = await this.getOrderById(
				record.organizationId,
				record.orderId,
			);
			if (!reloaded.ok) {
				return reloaded;
			}
			if (reloaded.data === null) {
				return fail(
					"INTERNAL_ERROR",
					"Closed purchase order missing after write",
				);
			}
			return ok(reloaded.data);
		} catch (error) {
			return mapWriteError(
				error,
				"Purchase order close conflict",
				"Failed to close purchase order",
			);
		}
	}

	async getOrderById(
		organizationId: string,
		id: string,
	): Promise<Result<PurchaseOrder | null>> {
		try {
			const [header] = await db
				.select()
				.from(purchaseOrder)
				.where(
					and(
						eq(purchaseOrder.organizationId, organizationId),
						eq(purchaseOrder.id, id),
					),
				)
				.limit(1);
			if (header === undefined) {
				return ok(null);
			}
			const lines = await db
				.select()
				.from(purchaseOrderLine)
				.where(
					and(
						eq(purchaseOrderLine.organizationId, organizationId),
						eq(purchaseOrderLine.orderId, id),
					),
				)
				.orderBy(asc(purchaseOrderLine.lineNo));
			return ok(
				mapOrder(
					mapHeaderRow(header),
					lines.map((line) => mapLineFromSelect(line)),
				),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to load purchase order");
		}
	}

	async getOrderByCreateIdempotencyKey(
		organizationId: string,
		createIdempotencyKey: string,
	): Promise<Result<PurchaseOrder | null>> {
		try {
			const [header] = await db
				.select()
				.from(purchaseOrder)
				.where(
					and(
						eq(purchaseOrder.organizationId, organizationId),
						eq(purchaseOrder.createIdempotencyKey, createIdempotencyKey),
					),
				)
				.limit(1);
			if (header === undefined) {
				return ok(null);
			}
			const lines = await db
				.select()
				.from(purchaseOrderLine)
				.where(
					and(
						eq(purchaseOrderLine.organizationId, organizationId),
						eq(purchaseOrderLine.orderId, header.id),
					),
				)
				.orderBy(asc(purchaseOrderLine.lineNo));
			return ok(
				mapOrder(
					mapHeaderRow(header),
					lines.map((line) => mapLineFromSelect(line)),
				),
			);
		} catch (error) {
			return failFromUnknown(
				error,
				"Failed to load purchase order by create idempotency key",
			);
		}
	}

	async listOrders(filter: OrderListFilter): Promise<Result<PurchaseOrder[]>> {
		try {
			const conditions = [eq(purchaseOrder.organizationId, filter.organizationId)];
			if (filter.status !== undefined) {
				conditions.push(eq(purchaseOrder.status, filter.status));
			}
			const headers = await db
				.select()
				.from(purchaseOrder)
				.where(and(...conditions))
				.orderBy(desc(purchaseOrder.updatedAt), desc(purchaseOrder.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);

			if (headers.length === 0) {
				return ok([]);
			}

			const orderIds = headers.map((header) => header.id);
			const lineRows = await db
				.select()
				.from(purchaseOrderLine)
				.where(
					and(
						eq(purchaseOrderLine.organizationId, filter.organizationId),
						inArray(purchaseOrderLine.orderId, orderIds),
					),
				)
				.orderBy(asc(purchaseOrderLine.lineNo), asc(purchaseOrderLine.id));

			const linesByOrderId = new Map<string, PurchaseOrderLine[]>();
			for (const line of lineRows) {
				const mapped = mapLineFromSelect(line);
				const bucket = linesByOrderId.get(line.orderId);
				if (bucket === undefined) {
					linesByOrderId.set(line.orderId, [mapped]);
				} else {
					bucket.push(mapped);
				}
			}

			return ok(
				headers.map((header) =>
					mapOrder(mapHeaderRow(header), linesByOrderId.get(header.id) ?? []),
				),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to list purchase orders");
		}
	}
}

export function createDrizzlePurchasingStore(): DrizzlePurchasingStore {
	return new DrizzlePurchasingStore();
}
