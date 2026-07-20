import { randomUUID } from "node:crypto";

import {
	and,
	asc,
	db,
	desc,
	eq,
	inArray,
	runNeonHttpTransaction,
	salesOrder,
	salesOrderLine,
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";

import type { MutationPorts } from "./ports";
import type {
	OrderCreateRecord,
	OrderLineCreateRecord,
	OrderListFilter,
	OrderPostRecord,
	SalesStore,
} from "./store";
import {
	SALES_ORDER_STATUSES,
	type SalesOrder,
	type SalesOrderLine,
	type SalesOrderStatus,
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
	net_days: number | null;
	version: number;
	created_by: string;
	updated_by: string;
	posted_at: Date | null;
	posted_by: string | null;
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
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapLine(row: LineSqlRow): SalesOrderLine {
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
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function parseOrderStatus(status: string): SalesOrderStatus {
	for (const candidate of SALES_ORDER_STATUSES) {
		if (candidate === status) {
			return candidate;
		}
	}
	throw new Error(`Invalid sales_order.status: ${status}`);
}

function mapOrder(row: OrderSqlRow, lines: SalesOrderLine[]): SalesOrder {
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
		netDays: row.net_days,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		postedAt: row.posted_at,
		postedBy: row.posted_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		lines,
	};
}

function mapHeaderRow(header: typeof salesOrder.$inferSelect): OrderSqlRow {
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
		net_days: header.netDays,
		version: header.version,
		created_by: header.createdBy,
		updated_by: header.updatedBy,
		posted_at: header.postedAt,
		posted_by: header.postedBy,
		created_at: header.createdAt,
		updated_at: header.updatedAt,
	};
}

function mapLineFromSelect(
	line: typeof salesOrderLine.$inferSelect,
): SalesOrderLine {
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

function mapWriteError(
	error: unknown,
	conflictMessage: string,
	fallbackMessage: string,
): Result<never> {
	const message = error instanceof Error ? error.message : String(error);
	if (/unique|duplicate/i.test(message)) {
		return fail("CONFLICT", conflictMessage);
	}
	return failFromUnknown(error, fallbackMessage);
}

export class DrizzleSalesStore implements SalesStore {
	async createOrder(
		record: OrderCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SalesOrder>> {
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
			entityType: "sales_order",
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
						INSERT INTO sales_order (
							id, organization_id, code, normalized_code, status,
							party_id, party_code, party_name,
							payment_term_id, payment_term_code, net_days,
							version, created_by, updated_by
						) VALUES (
							${entityId}, ${record.organizationId}, ${record.code}, ${record.normalizedCode}, 'draft',
							${record.partyId}, ${record.partyCode}, ${record.partyName},
							${record.paymentTermId}, ${record.paymentTermCode}, ${record.netDays},
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
							'sales', 'sales_order', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, 'sales.order.created.v1', 'sales',
							${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			]);
			const row = rows[0];
			if (row === undefined) {
				return fail("INTERNAL_ERROR", "Sales order create returned no row");
			}
			return ok(mapOrder(row, []));
		} catch (error) {
			return mapWriteError(
				error,
				"Sales order code already exists",
				"Failed to create sales order",
			);
		}
	}

	async addLine(
		record: OrderLineCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SalesOrderLine>> {
		const orderResult = await this.getOrderById(
			record.organizationId,
			record.orderId,
		);
		if (!orderResult.ok) {
			return orderResult;
		}
		if (orderResult.data === null) {
			return fail("NOT_FOUND", "Sales order not found");
		}
		if (orderResult.data.status !== "draft") {
			return fail("CONFLICT", "Cannot add lines to a posted order");
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
			entityType: "sales_order_line",
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
						INSERT INTO sales_order_line (
							id, organization_id, order_id, line_no,
							item_id, item_code, item_name, base_uom_id, base_uom_code,
							quantity, version, created_by, updated_by
						) VALUES (
							${lineId}, ${record.organizationId}, ${record.orderId}, ${lineNo},
							${record.itemId}, ${record.itemCode}, ${record.itemName},
							${record.baseUomId}, ${record.baseUomCode},
							${record.quantity}, 1, ${record.createdBy}, ${record.createdBy}
						)
						RETURNING *
					),
					bumped AS (
						UPDATE sales_order
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
							'sales', 'sales_order_line', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, 'sales.order.line_added.v1', 'sales',
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
					"Sales order line create returned no row",
				);
			}
			return ok(mapLine(row));
		} catch (error) {
			return mapWriteError(
				error,
				"Sales order line conflict",
				"Failed to add sales order line",
			);
		}
	}

	async postOrder(
		record: OrderPostRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SalesOrder>> {
		const existing = await this.getOrderById(
			record.organizationId,
			record.orderId,
		);
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return fail("NOT_FOUND", "Sales order not found");
		}
		const currentOrder = existing.data;
		if (currentOrder.status !== "draft") {
			return fail("CONFLICT", "Sales order is already posted");
		}
		if (currentOrder.version !== record.expectedVersion) {
			return fail("CONFLICT", "Sales order version conflict");
		}
		if (currentOrder.lines.length === 0) {
			return fail("CONFLICT", "Cannot post order without lines");
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
			entityType: "sales_order",
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
							UPDATE sales_order
							SET status = 'posted',
								party_code = ${record.partyCode},
								party_name = ${record.partyName},
								payment_term_id = ${record.paymentTermId},
								payment_term_code = ${record.paymentTermCode},
								net_days = ${record.netDays},
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
								'sales', 'sales_order', id, 'UPDATE', ${changesJson}::jsonb,
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
								${eventId}, organization_id, 'sales.order.posted.v1', 'sales',
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
						UPDATE sales_order_line
						SET item_code = ${snap.itemCode},
							item_name = ${snap.itemName},
							base_uom_id = ${snap.baseUomId},
							base_uom_code = ${snap.baseUomCode},
							updated_by = ${record.actorUserId},
							updated_at = now(),
							version = ${nextLineVersion}
						WHERE id = ${snap.lineId}
							AND organization_id = ${record.organizationId}
							AND order_id = ${record.orderId}
							AND EXISTS (
								SELECT 1
								FROM sales_order o
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
				return fail("CONFLICT", "Sales order version conflict");
			}
			const reloaded = await this.getOrderById(
				record.organizationId,
				record.orderId,
			);
			if (!reloaded.ok) {
				return reloaded;
			}
			if (reloaded.data === null) {
				return fail("INTERNAL_ERROR", "Posted order missing after write");
			}
			return ok(reloaded.data);
		} catch (error) {
			return mapWriteError(
				error,
				"Sales order post conflict",
				"Failed to post sales order",
			);
		}
	}

	async getOrderById(
		organizationId: string,
		id: string,
	): Promise<Result<SalesOrder | null>> {
		try {
			const [header] = await db
				.select()
				.from(salesOrder)
				.where(
					and(
						eq(salesOrder.organizationId, organizationId),
						eq(salesOrder.id, id),
					),
				)
				.limit(1);
			if (header === undefined) {
				return ok(null);
			}
			const lines = await db
				.select()
				.from(salesOrderLine)
				.where(
					and(
						eq(salesOrderLine.organizationId, organizationId),
						eq(salesOrderLine.orderId, id),
					),
				)
				.orderBy(asc(salesOrderLine.lineNo));
			return ok(
				mapOrder(
					mapHeaderRow(header),
					lines.map((line) => mapLineFromSelect(line)),
				),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to load sales order");
		}
	}

	async listOrders(filter: OrderListFilter): Promise<Result<SalesOrder[]>> {
		try {
			const conditions = [eq(salesOrder.organizationId, filter.organizationId)];
			if (filter.status !== undefined) {
				conditions.push(eq(salesOrder.status, filter.status));
			}
			const headers = await db
				.select()
				.from(salesOrder)
				.where(and(...conditions))
				.orderBy(desc(salesOrder.updatedAt), desc(salesOrder.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);

			if (headers.length === 0) {
				return ok([]);
			}

			const orderIds = headers.map((header) => header.id);
			const lineRows = await db
				.select()
				.from(salesOrderLine)
				.where(
					and(
						eq(salesOrderLine.organizationId, filter.organizationId),
						inArray(salesOrderLine.orderId, orderIds),
					),
				)
				.orderBy(asc(salesOrderLine.lineNo), asc(salesOrderLine.id));

			const linesByOrderId = new Map<string, SalesOrderLine[]>();
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
			return failFromUnknown(error, "Failed to list sales orders");
		}
	}
}

export function createDrizzleSalesStore(): DrizzleSalesStore {
	return new DrizzleSalesStore();
}
