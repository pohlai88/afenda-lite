import { randomUUID } from "node:crypto";

import { audit as afendaAudit } from "@afenda/audit";
import {
	database as afendaDatabase,
	and,
	asc,
	desc,
	eq,
	inArray,
	purchaseOrder,
	purchaseOrderLine,
} from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";
import {
	PURCHASE_ORDER_STATUSES,
	type PurchaseOrder,
	type PurchaseOrderLine,
	type PurchaseOrderStatus,
} from "../../kernel/contracts/domain";
import type { MutationPorts } from "../../kernel/contracts/ports";
import type {
	OrderCancelRecord,
	OrderCloseRecord,
	OrderCreateRecord,
	OrderLineCreateRecord,
	OrderListFilter,
	OrderPostRecord,
	PurchasingStore,
} from "./orders.store";

const PURCHASING_AUDIT_SOURCE = "purchasing.drizzle-store";

function failFromPersistence(error: unknown, _fallbackMessage: string) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

interface OrderSqlRow {
	cancel_idempotency_key: string | null;
	cancelled_at: Date | null;
	cancelled_by: string | null;
	close_idempotency_key: string | null;
	closed_at: Date | null;
	closed_by: string | null;
	code: string;
	create_idempotency_key: string;
	created_at: Date;
	created_by: string;
	currency_code: string;
	discount_total: string | null;
	document_total: string | null;
	exchange_rate: string | null;
	id: string;
	net_days: number | null;
	normalized_code: string;
	organization_id: string;
	party_code: string;
	party_id: string;
	party_name: string;
	payment_term_code: string | null;
	payment_term_id: string | null;
	payment_term_name: string | null;
	post_idempotency_key: string | null;
	posted_at: Date | null;
	posted_by: string | null;
	status: string;
	subtotal_amount: string | null;
	tax_total: string | null;
	updated_at: Date;
	updated_by: string;
	version: number;
	warehouse_code: string | null;
	warehouse_id: string | null;
	warehouse_name: string | null;
}

interface LineSqlRow {
	base_uom_code: string;
	base_uom_id: string;
	created_at: Date;
	created_by: string;
	discount_amount: string;
	id: string;
	invoice_price_tolerance_percent: string;
	invoice_quantity_tolerance_percent: string;
	item_code: string;
	item_id: string;
	item_name: string;
	line_amount: string;
	line_idempotency_key: string;
	line_no: number;
	order_id: string;
	organization_id: string;
	over_receipt_percent: string;
	quantity: string;
	tax_classification: string | null;
	under_receipt_percent: string;
	unit_price: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

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

const CREATE_IDEMPOTENCY_CONSTRAINT_PATTERN =
	/purchase_order_org_create_idempotency_uidx|create_idempotency_key/i;
const LINE_IDEMPOTENCY_CONSTRAINT_PATTERN =
	/purchase_order_line_org_order_idempotency_uidx|line_idempotency_key/i;

function readErrorStringProperty(
	error: unknown,
	key: PropertyKey,
): string | undefined {
	if (typeof error !== "object" || error === null) {
		return;
	}
	try {
		const value = Reflect.get(error, key);
		return typeof value === "string" ? value : undefined;
	} catch {
		// Proxies may reject property reads; an unreadable field is treated as absent.
	}
}

function readConstraintName(error: unknown): string {
	return (
		readErrorStringProperty(error, "constraint") ??
		readErrorStringProperty(error, "constraint_name") ??
		""
	);
}

function isCreateIdempotencyConflict(error: unknown): boolean {
	return CREATE_IDEMPOTENCY_CONSTRAINT_PATTERN.test(readConstraintName(error));
}

function isLineIdempotencyConflict(error: unknown): boolean {
	return LINE_IDEMPOTENCY_CONSTRAINT_PATTERN.test(readConstraintName(error));
}

function mapWriteError(
	error: unknown,
	_conflictMessage: string,
	fallbackMessage: string,
): Result<never> {
	return failFromPersistence(error, fallbackMessage);
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
		const preparedAudit = afendaAudit.transaction.prepare({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			module: "purchasing",
			entity: "purchase_order",
			entityId,
			action: "CREATE",
			changes: [{ field: "code", oldValue: null, newValue: record.code }],
			newValue: { code: record.code, status: "draft" },
			eventContext: {
				version: 1,
				outcome: "SUCCEEDED",
				source: PURCHASING_AUDIT_SOURCE,
				causationId: record.createIdempotencyKey,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
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
			const [rows] = await afendaDatabase.transaction((sql) => [
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditId}, ${audit.organizationId}, ${audit.actorUserId},
							${audit.correlationId}, ${audit.module}, ${audit.entity},
							${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
							${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
							${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
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
			const [row] = rows;
			if (row === undefined) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok(mapOrder(row, []));
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
					return errorResult.ok(existing.data);
				}
			}
			return failFromPersistence(error, "Failed to create purchase order");
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
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Purchase order not found",
			});
		}
		const replay = orderResult.data.lines.find(
			(line) => line.lineIdempotencyKey === record.lineIdempotencyKey,
		);
		if (replay !== undefined) {
			return errorResult.ok(replay);
		}
		if (orderResult.data.status !== "draft") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Cannot add lines to a posted or cancelled order",
			});
		}
		const lineNo =
			orderResult.data.lines.reduce(
				(max, line) => Math.max(max, line.lineNo),
				0,
			) + 1;
		const lineId = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const preparedAudit = afendaAudit.transaction.prepare({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			module: "purchasing",
			entity: "purchase_order_line",
			entityId: lineId,
			action: "CREATE",
			changes: [
				{ field: "item_code", oldValue: null, newValue: record.itemCode },
			],
			newValue: {
				orderId: record.orderId,
				lineNo,
				itemCode: record.itemCode,
				quantity: record.quantity,
			},
			eventContext: {
				version: 1,
				outcome: "SUCCEEDED",
				source: PURCHASING_AUDIT_SOURCE,
				causationId: record.lineIdempotencyKey,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
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
			const [rows] = await afendaDatabase.transaction((sql) => [
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditId}, ${audit.organizationId}, ${audit.actorUserId},
							${audit.correlationId}, ${audit.module}, ${audit.entity},
							${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
							${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
							${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
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
			const [row] = rows;
			if (row === undefined) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok(mapLine(row));
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
					return errorResult.ok(line);
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
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Purchase order not found",
			});
		}
		const currentOrder = existing.data;
		if (currentOrder.status === "posted") {
			if (currentOrder.postIdempotencyKey === record.postIdempotencyKey) {
				return errorResult.ok(currentOrder);
			}
			return errorResult.fail("CONFLICT", {
				publicMessage: "Purchase order is already posted",
			});
		}
		if (currentOrder.status !== "draft") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Purchase order cannot be posted",
			});
		}
		if (currentOrder.version !== record.expectedVersion) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Purchase order version conflict",
			});
		}
		if (currentOrder.lines.length === 0) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Cannot post order without lines",
			});
		}

		const auditId = randomUUID();
		const eventId = randomUUID();
		const nextVersion = currentOrder.version + 1;
		const preparedAudit = afendaAudit.transaction.prepare({
			organizationId: record.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			module: "purchasing",
			entity: "purchase_order",
			entityId: record.orderId,
			action: "UPDATE",
			changes: [{ field: "status", oldValue: "draft", newValue: "posted" }],
			oldValue: { status: "draft", version: currentOrder.version },
			newValue: { status: "posted", version: nextVersion },
			eventContext: {
				version: 1,
				outcome: "SUCCEEDED",
				source: PURCHASING_AUDIT_SOURCE,
				causationId: record.postIdempotencyKey,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
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
			const [rows] = await afendaDatabase.transaction((sql) => {
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId},
								${audit.correlationId}, ${audit.module}, ${audit.entity},
								${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
								${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
								${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
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
						AND purchase_order_line.organization_id = ${record.organizationId}
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
			const [row] = rows;
			if (row === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Purchase order version conflict",
				});
			}
			const reloaded = await this.getOrderById(
				record.organizationId,
				record.orderId,
			);
			if (!reloaded.ok) {
				return reloaded;
			}
			if (reloaded.data === null) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok(reloaded.data);
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
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Purchase order not found",
			});
		}
		const currentOrder = existing.data;
		if (currentOrder.status === "cancelled") {
			if (currentOrder.cancelIdempotencyKey === record.cancelIdempotencyKey) {
				return errorResult.ok(currentOrder);
			}
			return errorResult.fail("CONFLICT", {
				publicMessage: "Purchase order is already cancelled",
			});
		}
		if (currentOrder.status !== "draft") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Only draft purchase orders can be cancelled",
			});
		}
		if (currentOrder.version !== record.expectedVersion) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Purchase order version conflict",
			});
		}

		const auditId = randomUUID();
		const eventId = randomUUID();
		const nextVersion = currentOrder.version + 1;
		const preparedAudit = afendaAudit.transaction.prepare({
			organizationId: record.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			module: "purchasing",
			entity: "purchase_order",
			entityId: record.orderId,
			action: "UPDATE",
			changes: [
				{
					field: "status",
					oldValue: currentOrder.status,
					newValue: "cancelled",
				},
			],
			oldValue: {
				status: currentOrder.status,
				version: currentOrder.version,
			},
			newValue: { status: "cancelled", version: nextVersion },
			eventContext: {
				version: 1,
				outcome: "SUCCEEDED",
				source: PURCHASING_AUDIT_SOURCE,
				causationId: record.cancelIdempotencyKey,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
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
			const [rows] = await afendaDatabase.transaction((sql) => [
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditId}, ${audit.organizationId}, ${audit.actorUserId},
							${audit.correlationId}, ${audit.module}, ${audit.entity},
							${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
							${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
							${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
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
			const [row] = rows;
			if (row === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Purchase order version conflict",
				});
			}
			const reloaded = await this.getOrderById(
				record.organizationId,
				record.orderId,
			);
			if (!reloaded.ok) {
				return reloaded;
			}
			if (reloaded.data === null) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok(reloaded.data);
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
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Purchase order not found",
			});
		}
		const currentOrder = existing.data;
		if (currentOrder.status === "closed") {
			if (currentOrder.closeIdempotencyKey === record.closeIdempotencyKey) {
				return errorResult.ok(currentOrder);
			}
			return errorResult.fail("CONFLICT", {
				publicMessage: "Purchase order is already closed",
			});
		}
		if (currentOrder.status !== "posted") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Only posted purchase orders can be closed",
			});
		}
		if (currentOrder.version !== record.expectedVersion) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Purchase order version conflict",
			});
		}

		const auditId = randomUUID();
		const eventId = randomUUID();
		const nextVersion = currentOrder.version + 1;
		const preparedAudit = afendaAudit.transaction.prepare({
			organizationId: record.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			module: "purchasing",
			entity: "purchase_order",
			entityId: record.orderId,
			action: "UPDATE",
			changes: [{ field: "status", oldValue: "posted", newValue: "closed" }],
			oldValue: { status: "posted", version: currentOrder.version },
			newValue: { status: "closed", version: nextVersion },
			eventContext: {
				version: 1,
				outcome: "SUCCEEDED",
				source: PURCHASING_AUDIT_SOURCE,
				causationId: record.closeIdempotencyKey,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
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
			const [rows] = await afendaDatabase.transaction((sql) => [
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditId}, ${audit.organizationId}, ${audit.actorUserId},
							${audit.correlationId}, ${audit.module}, ${audit.entity},
							${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
							${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
							${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
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
			const [row] = rows;
			if (row === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Purchase order version conflict",
				});
			}
			const reloaded = await this.getOrderById(
				record.organizationId,
				record.orderId,
			);
			if (!reloaded.ok) {
				return reloaded;
			}
			if (reloaded.data === null) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok(reloaded.data);
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
			const [header] = await afendaDatabase.client
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
				return errorResult.ok(null);
			}
			const lines = await afendaDatabase.client
				.select()
				.from(purchaseOrderLine)
				.where(
					and(
						eq(purchaseOrderLine.organizationId, organizationId),
						eq(purchaseOrderLine.orderId, id),
					),
				)
				.orderBy(asc(purchaseOrderLine.lineNo));
			return errorResult.ok(
				mapOrder(
					mapHeaderRow(header),
					lines.map((line) => mapLineFromSelect(line)),
				),
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to load purchase order");
		}
	}

	async getOrderByCreateIdempotencyKey(
		organizationId: string,
		createIdempotencyKey: string,
	): Promise<Result<PurchaseOrder | null>> {
		try {
			const [header] = await afendaDatabase.client
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
				return errorResult.ok(null);
			}
			const lines = await afendaDatabase.client
				.select()
				.from(purchaseOrderLine)
				.where(
					and(
						eq(purchaseOrderLine.organizationId, organizationId),
						eq(purchaseOrderLine.orderId, header.id),
					),
				)
				.orderBy(asc(purchaseOrderLine.lineNo));
			return errorResult.ok(
				mapOrder(
					mapHeaderRow(header),
					lines.map((line) => mapLineFromSelect(line)),
				),
			);
		} catch (error) {
			return failFromPersistence(
				error,
				"Failed to load purchase order by create idempotency key",
			);
		}
	}

	async listOrders(filter: OrderListFilter): Promise<Result<PurchaseOrder[]>> {
		try {
			const conditions = [
				eq(purchaseOrder.organizationId, filter.organizationId),
			];
			if (filter.status !== undefined) {
				conditions.push(eq(purchaseOrder.status, filter.status));
			}
			const headers = await afendaDatabase.client
				.select()
				.from(purchaseOrder)
				.where(and(...conditions))
				.orderBy(desc(purchaseOrder.updatedAt), desc(purchaseOrder.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);

			if (headers.length === 0) {
				return errorResult.ok([]);
			}

			const orderIds = headers.map((header) => header.id);
			const lineRows = await afendaDatabase.client
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

			return errorResult.ok(
				headers.map((header) =>
					mapOrder(mapHeaderRow(header), linesByOrderId.get(header.id) ?? []),
				),
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to list purchase orders");
		}
	}
}

export function createDrizzlePurchasingStore(): DrizzlePurchasingStore {
	return new DrizzlePurchasingStore();
}
