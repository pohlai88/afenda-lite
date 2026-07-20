import { randomUUID } from "node:crypto";
import {
	and,
	asc,
	db,
	desc,
	eq,
	goodsReceipt,
	goodsReceiptLine,
	inArray,
	receivingDiscrepancy,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";

import type { MutationPorts } from "./ports";
import type {
	DiscrepancyCreateRecord,
	ReceiptCancelRecord,
	ReceiptCreateRecord,
	ReceiptLineCreateRecord,
	ReceiptListFilter,
	ReceiptPostRecord,
	ReceivingStore,
} from "./store";
import {
	GOODS_RECEIPT_SOURCE_TYPES,
	GOODS_RECEIPT_STATUSES,
	type GoodsReceipt,
	type GoodsReceiptLine,
	type GoodsReceiptSourceType,
	type GoodsReceiptStatus,
	RECEIVING_DISCREPANCY_TYPES,
	type ReceivingDiscrepancy,
} from "./types";

type TxIdRow = { id: string };

function parseEnum<T extends string>(
	value: string,
	values: readonly T[],
	field: string,
): T {
	const found = values.find((candidate) => candidate === value);
	if (found === undefined) throw new Error(`Invalid ${field}: ${value}`);
	return found;
}

function mapLine(row: typeof goodsReceiptLine.$inferSelect): GoodsReceiptLine {
	return {
		id: row.id,
		organizationId: row.organizationId,
		receiptId: row.goodsReceiptId,
		lineNo: row.lineNo,
		itemId: row.itemId,
		itemCode: row.itemCode,
		itemName: row.itemName,
		baseUomId: row.baseUomId,
		baseUomCode: row.baseUomCode,
		quantityOrdered: row.quantityOrdered,
		quantityReceived: row.quantityReceived,
		purchaseOrderLineId: row.purchaseOrderLineId,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapDiscrepancy(
	row: typeof receivingDiscrepancy.$inferSelect,
): ReceivingDiscrepancy {
	return {
		id: row.id,
		organizationId: row.organizationId,
		receiptId: row.goodsReceiptId,
		receiptLineId: row.goodsReceiptLineId,
		discrepancyType: parseEnum(
			row.discrepancyType,
			RECEIVING_DISCREPANCY_TYPES,
			"receiving_discrepancy.discrepancy_type",
		),
		quantity: row.quantity,
		notes: row.notes,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapReceipt(
	row: typeof goodsReceipt.$inferSelect,
	lines: GoodsReceiptLine[],
	discrepancies: ReceivingDiscrepancy[],
): GoodsReceipt {
	return {
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		status: parseEnum(
			row.status,
			GOODS_RECEIPT_STATUSES,
			"goods_receipt.status",
		) satisfies GoodsReceiptStatus,
		sourceType: parseEnum(
			row.sourceType,
			GOODS_RECEIPT_SOURCE_TYPES,
			"goods_receipt.source_type",
		) satisfies GoodsReceiptSourceType,
		sourceId: row.sourceId,
		warehouseId: row.warehouseId,
		warehouseCode: row.warehouseCode,
		warehouseName: row.warehouseName,
		notes: row.notes,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		postedAt: row.postedAt,
		postedBy: row.postedBy,
		cancelledAt: row.cancelledAt,
		cancelledBy: row.cancelledBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		lines,
		discrepancies,
	};
}

function json(value: unknown): string {
	return JSON.stringify(value);
}

function writeError(
	error: unknown,
	conflictMessage: string,
	fallbackMessage: string,
): Result<never> {
	const message = error instanceof Error ? error.message : String(error);
	return /unique|duplicate|foreign key/i.test(message)
		? fail("CONFLICT", conflictMessage)
		: failFromUnknown(error, fallbackMessage);
}

export class DrizzleReceivingStore implements ReceivingStore {
	private async reload(
		organizationId: string,
		id: string,
		message: string,
	): Promise<Result<GoodsReceipt>> {
		const result = await this.getReceiptById(organizationId, id);
		if (!result.ok) return result;
		return result.data === null
			? fail("INTERNAL_ERROR", message)
			: ok(result.data);
	}

	async createReceipt(
		record: ReceiptCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<GoodsReceipt>> {
		const id = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changes = json([
			{ field: "code", oldValue: null, newValue: record.code },
		]);
		const snapshot = json({ code: record.code, status: "draft" });
		const payload = json({
			organizationId: record.organizationId,
			entityType: "goods_receipt",
			entityId: id,
			code: record.code,
			version: 1,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			status: "draft",
			sourceType: record.sourceType,
			warehouseId: record.warehouseId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[TxIdRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO goods_receipt (
							id, organization_id, code, normalized_code, status,
							source_type, source_id, warehouse_id, warehouse_code,
							warehouse_name, notes, version, created_by, updated_by
						) VALUES (
							${id}, ${record.organizationId}, ${record.code},
							${record.normalizedCode}, 'draft', ${record.sourceType},
							${record.sourceId}, ${record.warehouseId}, ${record.warehouseCode},
							${record.warehouseName}, ${record.notes}, 1,
							${record.createdBy}, ${record.createdBy}
						) RETURNING *
					), audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module,
							entity, entity_id, action, changes, new_value
						)
						SELECT ${auditId}, organization_id, created_by, ${meta.correlationId},
							'receiving', 'goods_receipt', id, 'CREATE',
							${changes}::jsonb, ${snapshot}::jsonb
						FROM mutated RETURNING id
					), outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'receiving.receipt.created.v1',
							'receiving', ${meta.correlationId}, created_by,
							${payload}::jsonb, 'pending', 0
						FROM mutated RETURNING id
					)
					SELECT mutated.id FROM mutated, audited, outboxed
				`,
			]);
			if (rows[0] === undefined) {
				return fail("INTERNAL_ERROR", "Goods receipt create returned no row");
			}
			return this.reload(
				record.organizationId,
				id,
				"Created goods receipt missing",
			);
		} catch (error) {
			return writeError(
				error,
				"Goods receipt code already exists",
				"Failed to create goods receipt",
			);
		}
	}

	async addLine(
		record: ReceiptLineCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<GoodsReceiptLine>> {
		const existing = await this.getReceiptById(
			record.organizationId,
			record.receiptId,
		);
		if (!existing.ok) return existing;
		if (existing.data === null)
			return fail("NOT_FOUND", "Goods receipt not found");
		if (existing.data.status !== "draft") {
			return fail("CONFLICT", "Cannot add lines to a non-draft goods receipt");
		}
		const lineNo =
			existing.data.lines.reduce((max, row) => Math.max(max, row.lineNo), 0) +
			1;
		const id = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const currentReceiptVersion = existing.data.version;
		const changes = json([
			{ field: "item_code", oldValue: null, newValue: record.itemCode },
		]);
		const snapshot = json({ receiptId: record.receiptId, lineNo });
		const payload = json({
			organizationId: record.organizationId,
			entityType: "goods_receipt_line",
			entityId: id,
			code: existing.data.code,
			version: 1,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			status: "draft",
			sourceType: existing.data.sourceType,
			warehouseId: existing.data.warehouseId,
			receiptId: record.receiptId,
			lineNo,
			quantity: record.quantityReceived,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[TxIdRow[]]>((sql) => [
				sql`
					WITH parent AS (
						UPDATE goods_receipt
						SET version = version + 1, updated_by = ${record.createdBy},
							updated_at = now()
						WHERE id = ${record.receiptId}
							AND organization_id = ${record.organizationId}
							AND status = 'draft'
							AND version = ${currentReceiptVersion}
						RETURNING *
					), mutated AS (
						INSERT INTO goods_receipt_line (
							id, organization_id, goods_receipt_id, line_no, item_id,
							item_code, item_name, base_uom_id, base_uom_code,
							quantity_ordered, quantity_received, purchase_order_line_id,
							version, created_by, updated_by
						)
						SELECT ${id}, organization_id, id, ${lineNo}, ${record.itemId},
							${record.itemCode}, ${record.itemName}, ${record.baseUomId},
							${record.baseUomCode}, ${record.quantityOrdered},
							${record.quantityReceived}, ${record.purchaseOrderLineId},
							1, ${record.createdBy}, ${record.createdBy}
						FROM parent RETURNING *
					), audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module,
							entity, entity_id, action, changes, new_value
						)
						SELECT ${auditId}, organization_id, created_by, ${meta.correlationId},
							'receiving', 'goods_receipt_line', id, 'CREATE',
							${changes}::jsonb, ${snapshot}::jsonb
						FROM mutated RETURNING id
					), outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id,
							'receiving.receipt.line_added.v1', 'receiving',
							${meta.correlationId}, created_by, ${payload}::jsonb, 'pending', 0
						FROM mutated RETURNING id
					)
					SELECT mutated.id FROM mutated, audited, outboxed
				`,
			]);
			if (rows[0] === undefined) {
				return fail("CONFLICT", "Goods receipt line add conflict");
			}
			const [line] = await db
				.select()
				.from(goodsReceiptLine)
				.where(
					and(
						eq(goodsReceiptLine.organizationId, record.organizationId),
						eq(goodsReceiptLine.id, id),
					),
				)
				.limit(1);
			return line === undefined
				? fail("INTERNAL_ERROR", "Created goods receipt line missing")
				: ok(mapLine(line));
		} catch (error) {
			return writeError(
				error,
				"Goods receipt line conflict",
				"Failed to add goods receipt line",
			);
		}
	}

	async postReceipt(
		record: ReceiptPostRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<GoodsReceipt>> {
		const existing = await this.getReceiptById(
			record.organizationId,
			record.receiptId,
		);
		if (!existing.ok) return existing;
		if (existing.data === null)
			return fail("NOT_FOUND", "Goods receipt not found");
		if (existing.data.status !== "draft" || existing.data.lines.length === 0) {
			return fail("CONFLICT", "Goods receipt cannot be posted");
		}
		if (existing.data.version !== record.expectedVersion) {
			return fail("CONFLICT", "Goods receipt version conflict");
		}
		const nextVersion = record.expectedVersion + 1;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changes = json([
			{ field: "status", oldValue: "draft", newValue: "posted" },
		]);
		const oldValue = json({ status: "draft", version: record.expectedVersion });
		const newValue = json({ status: "posted", version: nextVersion });
		const payload = json({
			organizationId: record.organizationId,
			entityType: "goods_receipt",
			entityId: record.receiptId,
			code: existing.data.code,
			version: nextVersion,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			status: "posted",
			sourceType: existing.data.sourceType,
			warehouseId: existing.data.warehouseId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[TxIdRow[]]>((sql) => {
				const statements = [
					sql`
						WITH mutated AS (
							UPDATE goods_receipt
							SET status = 'posted', warehouse_code = ${record.warehouseCode},
								warehouse_name = ${record.warehouseName}, posted_at = now(),
								posted_by = ${record.actorUserId}, updated_by = ${record.actorUserId},
								updated_at = now(), version = ${nextVersion}
							WHERE id = ${record.receiptId}
								AND organization_id = ${record.organizationId}
								AND status = 'draft' AND version = ${record.expectedVersion}
							RETURNING *
						), audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module,
								entity, entity_id, action, changes, old_value, new_value
							)
							SELECT ${auditId}, organization_id, ${record.actorUserId},
								${meta.correlationId}, 'receiving', 'goods_receipt', id,
								'UPDATE', ${changes}::jsonb, ${oldValue}::jsonb, ${newValue}::jsonb
							FROM mutated RETURNING id
						), outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT ${eventId}, organization_id, 'receiving.receipt.posted.v1',
								'receiving', ${meta.correlationId}, ${record.actorUserId},
								${payload}::jsonb, 'pending', 0
							FROM mutated RETURNING id
						)
						SELECT mutated.id FROM mutated, audited, outboxed
					`,
				];
				for (const snapshot of record.lineSnapshots) {
					statements.push(sql`
						UPDATE goods_receipt_line
						SET item_code = ${snapshot.itemCode},
							item_name = ${snapshot.itemName},
							base_uom_id = ${snapshot.baseUomId},
							base_uom_code = ${snapshot.baseUomCode},
							updated_by = ${record.actorUserId}, updated_at = now(),
							version = version + 1
						WHERE id = ${snapshot.lineId}
							AND organization_id = ${record.organizationId}
							AND goods_receipt_id = ${record.receiptId}
							AND EXISTS (
								SELECT 1 FROM goods_receipt
								WHERE id = ${record.receiptId}
									AND organization_id = ${record.organizationId}
									AND status = 'posted' AND version = ${nextVersion}
							)
					`);
				}
				return statements;
			});
			if (rows[0] === undefined) {
				return fail("CONFLICT", "Goods receipt version conflict");
			}
			return this.reload(
				record.organizationId,
				record.receiptId,
				"Posted goods receipt missing",
			);
		} catch (error) {
			return writeError(
				error,
				"Goods receipt post conflict",
				"Failed to post goods receipt",
			);
		}
	}

	async cancelReceipt(
		record: ReceiptCancelRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<GoodsReceipt>> {
		const existing = await this.getReceiptById(
			record.organizationId,
			record.receiptId,
		);
		if (!existing.ok) return existing;
		if (existing.data === null)
			return fail("NOT_FOUND", "Goods receipt not found");
		if (existing.data.status !== "draft" && existing.data.status !== "posted") {
			return fail("CONFLICT", "Goods receipt cannot be cancelled");
		}
		if (existing.data.version !== record.expectedVersion) {
			return fail("CONFLICT", "Goods receipt version conflict");
		}
		const nextVersion = record.expectedVersion + 1;
		const auditId = randomUUID();
		const changes = json([
			{
				field: "status",
				oldValue: existing.data.status,
				newValue: "cancelled",
			},
		]);
		const oldValue = json({
			status: existing.data.status,
			version: record.expectedVersion,
		});
		const newValue = json({ status: "cancelled", version: nextVersion });
		try {
			const [rows] = await runNeonHttpTransaction<[TxIdRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE goods_receipt
						SET status = 'cancelled', cancelled_at = now(),
							cancelled_by = ${record.actorUserId},
							updated_by = ${record.actorUserId}, updated_at = now(),
							version = ${nextVersion}
						WHERE id = ${record.receiptId}
							AND organization_id = ${record.organizationId}
							AND status IN ('draft', 'posted')
							AND version = ${record.expectedVersion}
						RETURNING *
					), audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module,
							entity, entity_id, action, changes, old_value, new_value
						)
						SELECT ${auditId}, organization_id, ${record.actorUserId},
							${meta.correlationId}, 'receiving', 'goods_receipt', id,
							'UPDATE', ${changes}::jsonb, ${oldValue}::jsonb, ${newValue}::jsonb
						FROM mutated RETURNING id
					)
					SELECT mutated.id FROM mutated, audited
				`,
			]);
			if (rows[0] === undefined) {
				return fail("CONFLICT", "Goods receipt version conflict");
			}
			return this.reload(
				record.organizationId,
				record.receiptId,
				"Cancelled goods receipt missing",
			);
		} catch (error) {
			return writeError(
				error,
				"Goods receipt cancel conflict",
				"Failed to cancel goods receipt",
			);
		}
	}

	async recordDiscrepancy(
		record: DiscrepancyCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ReceivingDiscrepancy>> {
		const existing = await this.getReceiptById(
			record.organizationId,
			record.receiptId,
		);
		if (!existing.ok) return existing;
		if (existing.data === null)
			return fail("NOT_FOUND", "Goods receipt not found");
		const id = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changes = json([
			{
				field: "discrepancy_type",
				oldValue: null,
				newValue: record.discrepancyType,
			},
		]);
		const snapshot = json({
			receiptId: record.receiptId,
			quantity: record.quantity,
		});
		const payload = json({
			organizationId: record.organizationId,
			entityType: "receiving_discrepancy",
			entityId: id,
			code: existing.data.code,
			version: 1,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			status: existing.data.status,
			sourceType: existing.data.sourceType,
			warehouseId: existing.data.warehouseId,
			receiptId: record.receiptId,
			discrepancyType: record.discrepancyType,
			quantity: record.quantity,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[TxIdRow[]]>((sql) => [
				sql`
					WITH parent AS (
						SELECT * FROM goods_receipt
						WHERE id = ${record.receiptId}
							AND organization_id = ${record.organizationId}
							AND status IN ('draft', 'posted')
					), mutated AS (
						INSERT INTO receiving_discrepancy (
							id, organization_id, goods_receipt_id, goods_receipt_line_id,
							discrepancy_type, quantity, notes, version, created_by, updated_by
						)
						SELECT ${id}, organization_id, id, ${record.receiptLineId},
							${record.discrepancyType}, ${record.quantity}, ${record.notes},
							1, ${record.createdBy}, ${record.createdBy}
						FROM parent RETURNING *
					), audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module,
							entity, entity_id, action, changes, new_value
						)
						SELECT ${auditId}, organization_id, created_by, ${meta.correlationId},
							'receiving', 'receiving_discrepancy', id, 'CREATE',
							${changes}::jsonb, ${snapshot}::jsonb
						FROM mutated RETURNING id
					), outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id,
							'receiving.discrepancy.recorded.v1', 'receiving',
							${meta.correlationId}, created_by, ${payload}::jsonb, 'pending', 0
						FROM mutated RETURNING id
					)
					SELECT mutated.id FROM mutated, audited, outboxed
				`,
			]);
			if (rows[0] === undefined) {
				return fail("CONFLICT", "Receiving discrepancy create conflict");
			}
			const [row] = await db
				.select()
				.from(receivingDiscrepancy)
				.where(
					and(
						eq(receivingDiscrepancy.organizationId, record.organizationId),
						eq(receivingDiscrepancy.id, id),
					),
				)
				.limit(1);
			return row === undefined
				? fail("INTERNAL_ERROR", "Created receiving discrepancy missing")
				: ok(mapDiscrepancy(row));
		} catch (error) {
			return writeError(
				error,
				"Receiving discrepancy conflict",
				"Failed to record receiving discrepancy",
			);
		}
	}

	async getReceiptById(
		organizationId: string,
		id: string,
	): Promise<Result<GoodsReceipt | null>> {
		try {
			const [header] = await db
				.select()
				.from(goodsReceipt)
				.where(
					and(
						eq(goodsReceipt.organizationId, organizationId),
						eq(goodsReceipt.id, id),
					),
				)
				.limit(1);
			if (header === undefined) return ok(null);
			const [lines, discrepancies] = await Promise.all([
				db
					.select()
					.from(goodsReceiptLine)
					.where(
						and(
							eq(goodsReceiptLine.organizationId, organizationId),
							eq(goodsReceiptLine.goodsReceiptId, id),
						),
					)
					.orderBy(asc(goodsReceiptLine.lineNo)),
				db
					.select()
					.from(receivingDiscrepancy)
					.where(
						and(
							eq(receivingDiscrepancy.organizationId, organizationId),
							eq(receivingDiscrepancy.goodsReceiptId, id),
						),
					)
					.orderBy(asc(receivingDiscrepancy.createdAt)),
			]);
			return ok(
				mapReceipt(
					header,
					lines.map(mapLine),
					discrepancies.map(mapDiscrepancy),
				),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to load goods receipt");
		}
	}

	async listReceipts(
		filter: ReceiptListFilter,
	): Promise<Result<GoodsReceipt[]>> {
		try {
			const conditions = [
				eq(goodsReceipt.organizationId, filter.organizationId),
			];
			if (filter.status !== undefined) {
				conditions.push(eq(goodsReceipt.status, filter.status));
			}
			if (filter.sourceType !== undefined) {
				conditions.push(eq(goodsReceipt.sourceType, filter.sourceType));
			}
			const headers = await db
				.select()
				.from(goodsReceipt)
				.where(and(...conditions))
				.orderBy(desc(goodsReceipt.updatedAt), desc(goodsReceipt.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			if (headers.length === 0) return ok([]);
			const ids = headers.map((row) => row.id);
			const [lines, discrepancies] = await Promise.all([
				db
					.select()
					.from(goodsReceiptLine)
					.where(
						and(
							eq(goodsReceiptLine.organizationId, filter.organizationId),
							inArray(goodsReceiptLine.goodsReceiptId, ids),
						),
					)
					.orderBy(asc(goodsReceiptLine.lineNo)),
				db
					.select()
					.from(receivingDiscrepancy)
					.where(
						and(
							eq(receivingDiscrepancy.organizationId, filter.organizationId),
							inArray(receivingDiscrepancy.goodsReceiptId, ids),
						),
					)
					.orderBy(asc(receivingDiscrepancy.createdAt)),
			]);
			const linesByReceipt = new Map<string, GoodsReceiptLine[]>();
			for (const row of lines) {
				const mapped = mapLine(row);
				const bucket = linesByReceipt.get(row.goodsReceiptId);
				if (bucket === undefined)
					linesByReceipt.set(row.goodsReceiptId, [mapped]);
				else bucket.push(mapped);
			}
			const discrepanciesByReceipt = new Map<string, ReceivingDiscrepancy[]>();
			for (const row of discrepancies) {
				const mapped = mapDiscrepancy(row);
				const bucket = discrepanciesByReceipt.get(row.goodsReceiptId);
				if (bucket === undefined) {
					discrepanciesByReceipt.set(row.goodsReceiptId, [mapped]);
				} else bucket.push(mapped);
			}
			return ok(
				headers.map((header) =>
					mapReceipt(
						header,
						linesByReceipt.get(header.id) ?? [],
						discrepanciesByReceipt.get(header.id) ?? [],
					),
				),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to list goods receipts");
		}
	}
}

export function createDrizzleReceivingStore(): DrizzleReceivingStore {
	return new DrizzleReceivingStore();
}
