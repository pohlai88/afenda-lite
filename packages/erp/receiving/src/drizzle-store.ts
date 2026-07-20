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
	isNull,
	ne,
	receivingDiscrepancy,
	runNeonHttpTransaction,
	sql,
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";

import {
	RECEIVING_ERROR_IDEMPOTENCY_CONFLICT,
	RECEIVING_ERROR_POSTED_RECEIPT_CANNOT_CANCEL,
	RECEIVING_ERROR_QUANTITY_EXCEEDS_TOLERANCE,
	RECEIVING_ERROR_RECEIPT_ALREADY_REVERSED,
	receivingErrorDetails,
} from "./error-codes";
import type { MutationPorts } from "./ports";
import type {
	DiscrepancyCreateRecord,
	DiscrepancyResolveRecord,
	PostedAcceptedByPoLine,
	ReceiptCancelRecord,
	ReceiptCreateRecord,
	ReceiptInventoryApplicationRecord,
	ReceiptLineCreateRecord,
	ReceiptListFilter,
	ReceiptPostRecord,
	ReceiptReverseRecord,
	ReceivingStore,
} from "./store";
import {
	GOODS_RECEIPT_SOURCE_TYPES,
	GOODS_RECEIPT_STATUSES,
	type GoodsReceipt,
	type GoodsReceiptLine,
	type GoodsReceiptSourceType,
	type GoodsReceiptStatus,
	INVENTORY_APPLICATION_STATUSES,
	type InventoryApplicationStatus,
	RECEIVING_DISCREPANCY_STATUSES,
	RECEIVING_DISCREPANCY_TYPES,
	type ReceivingDiscrepancy,
	type ReceivingDiscrepancyStatus,
	type ReceivingDiscrepancyType,
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
		quantityExpected: row.quantityExpected,
		quantityReceived: row.quantityReceived,
		quantityAccepted: row.quantityAccepted,
		quantityRejected: row.quantityRejected,
		quantityDamaged: row.quantityDamaged,
		purchaseOrderLineId: row.purchaseOrderLineId,
		lineIdempotencyKey: row.lineIdempotencyKey,
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
		) satisfies ReceivingDiscrepancyType,
		quantity: row.quantity,
		notes: row.notes,
		status: parseEnum(
			row.status,
			RECEIVING_DISCREPANCY_STATUSES,
			"receiving_discrepancy.status",
		) satisfies ReceivingDiscrepancyStatus,
		resolution: row.resolution,
		resolvedAt: row.resolvedAt,
		resolvedBy: row.resolvedBy,
		recordIdempotencyKey: row.recordIdempotencyKey,
		resolveIdempotencyKey: row.resolveIdempotencyKey,
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
		reversesReceiptId: row.reversesReceiptId,
		reversedByReceiptId: row.reversedByReceiptId,
		reverseReason: row.reverseReason,
		inventoryApplicationStatus: parseEnum(
			row.inventoryApplicationStatus,
			INVENTORY_APPLICATION_STATUSES,
			"goods_receipt.inventory_application_status",
		) satisfies InventoryApplicationStatus,
		inventoryMovementId: row.inventoryMovementId,
		inventoryApplicationError: row.inventoryApplicationError,
		createIdempotencyKey: row.createIdempotencyKey,
		postIdempotencyKey: row.postIdempotencyKey,
		cancelIdempotencyKey: row.cancelIdempotencyKey,
		reverseIdempotencyKey: row.reverseIdempotencyKey,
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

function writeErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

async function hydrateReceipts(
	organizationId: string,
	headers: Array<typeof goodsReceipt.$inferSelect>,
): Promise<GoodsReceipt[]> {
	if (headers.length === 0) return [];
	const ids = headers.map((row) => row.id);
	const [lines, discrepancies] = await Promise.all([
		db
			.select()
			.from(goodsReceiptLine)
			.where(
				and(
					eq(goodsReceiptLine.organizationId, organizationId),
					inArray(goodsReceiptLine.goodsReceiptId, ids),
				),
			)
			.orderBy(asc(goodsReceiptLine.lineNo)),
		db
			.select()
			.from(receivingDiscrepancy)
			.where(
				and(
					eq(receivingDiscrepancy.organizationId, organizationId),
					inArray(receivingDiscrepancy.goodsReceiptId, ids),
				),
			)
			.orderBy(asc(receivingDiscrepancy.createdAt)),
	]);
	const linesByReceipt = new Map<string, GoodsReceiptLine[]>();
	for (const row of lines) {
		const mapped = mapLine(row);
		const bucket = linesByReceipt.get(row.goodsReceiptId);
		if (bucket === undefined) linesByReceipt.set(row.goodsReceiptId, [mapped]);
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
	return headers.map((header) =>
		mapReceipt(
			header,
			linesByReceipt.get(header.id) ?? [],
			discrepanciesByReceipt.get(header.id) ?? [],
		),
	);
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
		const replay = await this.getReceiptByCreateIdempotencyKey(
			record.organizationId,
			record.createIdempotencyKey,
		);
		if (!replay.ok) return replay;
		if (replay.data !== null) return ok(replay.data);

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
			const [rows] = await runNeonHttpTransaction<[TxIdRow[]]>((txSql) => [
				txSql`
					WITH mutated AS (
						INSERT INTO goods_receipt (
							id, organization_id, code, normalized_code, status,
							source_type, source_id, warehouse_id, warehouse_code,
							warehouse_name, notes, inventory_application_status,
							create_idempotency_key, version, created_by, updated_by
						) VALUES (
							${id}, ${record.organizationId}, ${record.code},
							${record.normalizedCode}, 'draft', ${record.sourceType},
							${record.sourceId}, ${record.warehouseId}, ${record.warehouseCode},
							${record.warehouseName}, ${record.notes}, 'not_applicable',
							${record.createIdempotencyKey}, 1,
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
			if (/create_idempotency/i.test(writeErrorMessage(error))) {
				const existing = await this.getReceiptByCreateIdempotencyKey(
					record.organizationId,
					record.createIdempotencyKey,
				);
				if (!existing.ok) return existing;
				if (existing.data !== null) return ok(existing.data);
			}
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
		const replayLine = existing.data.lines.find(
			(line) => line.lineIdempotencyKey === record.lineIdempotencyKey,
		);
		if (replayLine !== undefined) return ok({ ...replayLine });
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
			quantity: record.quantityAccepted,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[TxIdRow[]]>((txSql) => [
				txSql`
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
							quantity_ordered, quantity_expected, quantity_received,
							quantity_accepted, quantity_rejected, quantity_damaged,
							purchase_order_line_id, line_idempotency_key,
							version, created_by, updated_by
						)
						SELECT ${id}, organization_id, id, ${lineNo}, ${record.itemId},
							${record.itemCode}, ${record.itemName}, ${record.baseUomId},
							${record.baseUomCode}, ${record.quantityOrdered},
							${record.quantityExpected}, ${record.quantityReceived},
							${record.quantityAccepted}, ${record.quantityRejected},
							${record.quantityDamaged}, ${record.purchaseOrderLineId},
							${record.lineIdempotencyKey},
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
			if (/line_idempotency/i.test(writeErrorMessage(error))) {
				const again = await this.getReceiptById(
					record.organizationId,
					record.receiptId,
				);
				if (!again.ok) return again;
				const found = again.data?.lines.find(
					(line) => line.lineIdempotencyKey === record.lineIdempotencyKey,
				);
				if (found !== undefined) return ok({ ...found });
			}
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
		if (existing.data.postIdempotencyKey === record.postIdempotencyKey) {
			return ok(existing.data);
		}
		if (existing.data.status !== "draft") {
			return fail("CONFLICT", "Goods receipt is not in draft status");
		}
		if (existing.data.version !== record.expectedVersion) {
			return fail("CONFLICT", "Goods receipt version conflict");
		}
		if (existing.data.lines.length === 0) {
			return fail("CONFLICT", "Cannot post goods receipt without lines");
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
		const guard = record.poConsumptionGuard;
		const guardLineIds =
			guard?.lines.map((line) => line.purchaseOrderLineId) ?? [];
		const guardThisAccepted =
			guard?.lines.map((line) => String(line.thisAccepted)) ?? [];
		const guardCeilings =
			guard?.lines.map((line) => String(line.ceiling)) ?? [];
		type PostGuardRow = { over_count: number; receipt_id: string | null };
		try {
			const txResults = await runNeonHttpTransaction<
				[unknown[], PostGuardRow[]] | [PostGuardRow[]]
			>((txSql) => {
				const statements = [];
				if (guard !== undefined) {
					// Serialize concurrent PO posts (neon-http cannot interleave JS).
					statements.push(txSql`
						SELECT pg_advisory_xact_lock(
							871234,
							hashtext(${`${record.organizationId}:${guard.purchaseOrderId}`})
						)
					`);
				}
				statements.push(txSql`
					WITH need AS (
						SELECT *
						FROM unnest(
							${guardLineIds}::uuid[],
							${guardThisAccepted}::numeric[],
							${guardCeilings}::numeric[]
						) AS t(line_id, this_qty, ceiling)
					),
					sums AS (
						SELECT grl.purchase_order_line_id AS line_id,
							coalesce(sum(grl.quantity_accepted::numeric), 0) AS accepted
						FROM goods_receipt_line grl
						INNER JOIN goods_receipt gr
							ON gr.id = grl.goods_receipt_id
						WHERE ${guard !== undefined}
							AND gr.organization_id = ${record.organizationId}
							AND gr.source_type = 'purchase_order'
							AND gr.source_id = ${guard?.purchaseOrderId ?? null}
							AND gr.status = 'posted'
							AND gr.reversed_by_receipt_id IS NULL
							AND gr.reverses_receipt_id IS NULL
							AND gr.id <> ${record.receiptId}
							AND grl.purchase_order_line_id = ANY(${guardLineIds}::uuid[])
						GROUP BY grl.purchase_order_line_id
					),
					over AS (
						SELECT need.line_id
						FROM need
						LEFT JOIN sums ON sums.line_id = need.line_id
						WHERE ${guard !== undefined}
							AND coalesce(sums.accepted, 0) + need.this_qty > need.ceiling
					),
					mutated AS (
						UPDATE goods_receipt
						SET status = 'posted', warehouse_code = ${record.warehouseCode},
							warehouse_name = ${record.warehouseName}, posted_at = now(),
							posted_by = ${record.actorUserId},
							post_idempotency_key = ${record.postIdempotencyKey},
							inventory_application_status = 'pending',
							updated_by = ${record.actorUserId},
							updated_at = now(), version = ${nextVersion}
						WHERE id = ${record.receiptId}
							AND organization_id = ${record.organizationId}
							AND status = 'draft' AND version = ${record.expectedVersion}
							AND NOT EXISTS (SELECT 1 FROM over)
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
					SELECT
						coalesce((SELECT count(*)::int FROM over), 0) AS over_count,
						(SELECT id FROM mutated LIMIT 1) AS receipt_id
				`);
				for (const snapshot of record.lineSnapshots) {
					statements.push(txSql`
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
			const rows = (
				guard !== undefined
					? (txResults as [unknown[], PostGuardRow[]])[1]
					: (txResults as [PostGuardRow[]])[0]
			) as PostGuardRow[];
			const outcome = rows[0];
			if (outcome === undefined) {
				return fail("CONFLICT", "Goods receipt version conflict");
			}
			if (Number(outcome.over_count) > 0) {
				return fail(
					"CONFLICT",
					"Accepted quantity exceeds remaining quantity plus over-receipt tolerance",
					receivingErrorDetails(RECEIVING_ERROR_QUANTITY_EXCEEDS_TOLERANCE),
				);
			}
			if (outcome.receipt_id === null) {
				return fail("CONFLICT", "Goods receipt version conflict");
			}
			return this.reload(
				record.organizationId,
				record.receiptId,
				"Posted goods receipt missing",
			);
		} catch (error) {
			if (/post_idempotency/i.test(writeErrorMessage(error))) {
				const again = await this.getReceiptById(
					record.organizationId,
					record.receiptId,
				);
				if (!again.ok) return again;
				if (
					again.data !== null &&
					again.data.postIdempotencyKey === record.postIdempotencyKey
				) {
					return ok(again.data);
				}
			}
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
		if (existing.data.cancelIdempotencyKey === record.cancelIdempotencyKey) {
			return ok(existing.data);
		}
		if (existing.data.status === "posted") {
			return fail(
				"CONFLICT",
				"Posted goods receipts cannot be cancelled; use reverse",
				receivingErrorDetails(RECEIVING_ERROR_POSTED_RECEIPT_CANNOT_CANCEL),
			);
		}
		if (existing.data.status !== "draft") {
			return fail("CONFLICT", "Goods receipt cannot be cancelled");
		}
		if (existing.data.version !== record.expectedVersion) {
			return fail("CONFLICT", "Goods receipt version conflict");
		}
		const nextVersion = record.expectedVersion + 1;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changes = json([
			{ field: "status", oldValue: "draft", newValue: "cancelled" },
		]);
		const oldValue = json({
			status: "draft",
			version: record.expectedVersion,
		});
		const newValue = json({ status: "cancelled", version: nextVersion });
		const payload = json({
			organizationId: record.organizationId,
			entityType: "goods_receipt",
			entityId: record.receiptId,
			code: existing.data.code,
			version: nextVersion,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			status: "cancelled",
			sourceType: existing.data.sourceType,
			warehouseId: existing.data.warehouseId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[TxIdRow[]]>((txSql) => [
				txSql`
					WITH mutated AS (
						UPDATE goods_receipt
						SET status = 'cancelled', cancelled_at = now(),
							cancelled_by = ${record.actorUserId},
							cancel_idempotency_key = ${record.cancelIdempotencyKey},
							updated_by = ${record.actorUserId}, updated_at = now(),
							version = ${nextVersion}
						WHERE id = ${record.receiptId}
							AND organization_id = ${record.organizationId}
							AND status = 'draft'
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
					), outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'receiving.receipt.cancelled.v1',
							'receiving', ${meta.correlationId}, ${record.actorUserId},
							${payload}::jsonb, 'pending', 0
						FROM mutated RETURNING id
					)
					SELECT mutated.id FROM mutated, audited, outboxed
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
			if (/cancel_idempotency/i.test(writeErrorMessage(error))) {
				const again = await this.getReceiptById(
					record.organizationId,
					record.receiptId,
				);
				if (!again.ok) return again;
				if (
					again.data !== null &&
					again.data.cancelIdempotencyKey === record.cancelIdempotencyKey
				) {
					return ok(again.data);
				}
			}
			return writeError(
				error,
				"Goods receipt cancel conflict",
				"Failed to cancel goods receipt",
			);
		}
	}

	async reverseReceipt(
		record: ReceiptReverseRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<GoodsReceipt>> {
		const [replayHeader] = await db
			.select()
			.from(goodsReceipt)
			.where(
				and(
					eq(goodsReceipt.organizationId, record.organizationId),
					eq(goodsReceipt.reverseIdempotencyKey, record.reverseIdempotencyKey),
				),
			)
			.limit(1);
		if (replayHeader !== undefined) {
			return this.reload(
				record.organizationId,
				replayHeader.id,
				"Reversed goods receipt missing",
			);
		}

		const originalResult = await this.getReceiptById(
			record.organizationId,
			record.originalReceiptId,
		);
		if (!originalResult.ok) return originalResult;
		if (originalResult.data === null) {
			return fail("NOT_FOUND", "Goods receipt not found");
		}
		const original = originalResult.data;
		if (original.status !== "posted") {
			return fail("CONFLICT", "Only posted goods receipts can be reversed");
		}
		if (original.reversedByReceiptId !== null) {
			return fail(
				"CONFLICT",
				"Goods receipt already reversed",
				receivingErrorDetails(RECEIVING_ERROR_RECEIPT_ALREADY_REVERSED),
			);
		}
		if (original.version !== record.expectedVersion) {
			return fail("CONFLICT", "Goods receipt version conflict");
		}

		const reverseId = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const nextOriginalVersion = record.expectedVersion + 1;
		const inventoryApplicationStatus =
			original.inventoryMovementId === null ? "not_applicable" : "pending";
		const changes = json([
			{
				field: "reverses_receipt_id",
				oldValue: null,
				newValue: original.id,
			},
		]);
		const snapshot = json({
			status: "posted",
			reversesReceiptId: original.id,
		});
		const payload = json({
			organizationId: record.organizationId,
			entityType: "goods_receipt",
			entityId: reverseId,
			code: record.code,
			version: 1,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			status: "posted",
			sourceType: original.sourceType,
			warehouseId: original.warehouseId,
			reversesReceiptId: original.id,
			reverseReason: record.reason,
		});

		try {
			const [rows] = await runNeonHttpTransaction<[TxIdRow[]]>((txSql) => {
				const statements = [
					txSql`
						WITH claimed AS (
							UPDATE goods_receipt
							SET version = ${nextOriginalVersion},
								reverse_reason = ${record.reason},
								updated_by = ${record.actorUserId},
								updated_at = now()
							WHERE id = ${record.originalReceiptId}
								AND organization_id = ${record.organizationId}
								AND status = 'posted'
								AND reversed_by_receipt_id IS NULL
								AND version = ${record.expectedVersion}
							RETURNING *
						), inserted AS (
							INSERT INTO goods_receipt (
								id, organization_id, code, normalized_code, status,
								source_type, source_id, warehouse_id, warehouse_code,
								warehouse_name, notes, reverses_receipt_id, reverse_reason,
								inventory_application_status, reverse_idempotency_key,
								version, created_by, updated_by, posted_at, posted_by
							)
							SELECT ${reverseId}, organization_id, ${record.code},
								${record.normalizedCode}, 'posted',
								source_type, source_id, warehouse_id, warehouse_code,
								warehouse_name, notes, id, ${record.reason},
								${inventoryApplicationStatus}, ${record.reverseIdempotencyKey},
								1, ${record.actorUserId}, ${record.actorUserId}, now(),
								${record.actorUserId}
							FROM claimed
							RETURNING *
						), linked AS (
							UPDATE goods_receipt
							SET reversed_by_receipt_id = ${reverseId}
							WHERE id = ${record.originalReceiptId}
								AND organization_id = ${record.organizationId}
								AND EXISTS (SELECT 1 FROM inserted)
							RETURNING id
						), audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module,
								entity, entity_id, action, changes, new_value
							)
							SELECT ${auditId}, organization_id, ${record.actorUserId},
								${meta.correlationId}, 'receiving', 'goods_receipt', id,
								'CREATE', ${changes}::jsonb, ${snapshot}::jsonb
							FROM inserted RETURNING id
						), outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT ${eventId}, organization_id,
								'receiving.receipt.reversed.v1', 'receiving',
								${meta.correlationId}, ${record.actorUserId},
								${payload}::jsonb, 'pending', 0
							FROM inserted RETURNING id
						)
						SELECT inserted.id FROM inserted, linked, audited, outboxed
					`,
				];
				for (const [index, line] of original.lines.entries()) {
					const lineId = randomUUID();
					const lineNo = index + 1;
					const lineIdempotencyKey = `${record.reverseIdempotencyKey}:line:${line.id}`;
					statements.push(txSql`
						INSERT INTO goods_receipt_line (
							id, organization_id, goods_receipt_id, line_no, item_id,
							item_code, item_name, base_uom_id, base_uom_code,
							quantity_ordered, quantity_expected, quantity_received,
							quantity_accepted, quantity_rejected, quantity_damaged,
							purchase_order_line_id, line_idempotency_key,
							version, created_by, updated_by
						)
						SELECT ${lineId}, ${record.organizationId}, ${reverseId}, ${lineNo},
							${line.itemId}, ${line.itemCode}, ${line.itemName},
							${line.baseUomId}, ${line.baseUomCode},
							${line.quantityOrdered}, ${line.quantityExpected},
							${line.quantityReceived}, ${line.quantityAccepted},
							${line.quantityRejected}, ${line.quantityDamaged},
							${line.purchaseOrderLineId}, ${lineIdempotencyKey},
							1, ${record.actorUserId}, ${record.actorUserId}
						WHERE EXISTS (
							SELECT 1 FROM goods_receipt
							WHERE id = ${reverseId}
								AND organization_id = ${record.organizationId}
								AND reverses_receipt_id = ${record.originalReceiptId}
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
				reverseId,
				"Reversed goods receipt missing",
			);
		} catch (error) {
			if (/reverse_idempotency/i.test(writeErrorMessage(error))) {
				const [again] = await db
					.select()
					.from(goodsReceipt)
					.where(
						and(
							eq(goodsReceipt.organizationId, record.organizationId),
							eq(
								goodsReceipt.reverseIdempotencyKey,
								record.reverseIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (again !== undefined) {
					return this.reload(
						record.organizationId,
						again.id,
						"Reversed goods receipt missing",
					);
				}
			}
			return writeError(
				error,
				"Goods receipt reverse conflict",
				"Failed to reverse goods receipt",
			);
		}
	}

	async setInventoryApplication(
		record: ReceiptInventoryApplicationRecord,
	): Promise<Result<GoodsReceipt>> {
		try {
			const [rows] = await runNeonHttpTransaction<[TxIdRow[]]>((txSql) => [
				txSql`
					UPDATE goods_receipt
					SET inventory_application_status = ${record.status},
						inventory_movement_id = ${record.inventoryMovementId},
						inventory_application_error = ${record.errorMessage},
						updated_by = ${record.actorUserId},
						updated_at = now()
					WHERE id = ${record.receiptId}
						AND organization_id = ${record.organizationId}
					RETURNING id
				`,
			]);
			if (rows[0] === undefined) {
				return fail("NOT_FOUND", "Goods receipt not found");
			}
			return this.reload(
				record.organizationId,
				record.receiptId,
				"Updated goods receipt missing",
			);
		} catch (error) {
			return writeError(
				error,
				"Goods receipt inventory application conflict",
				"Failed to set inventory application",
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
		const replay = existing.data.discrepancies.find(
			(row) => row.recordIdempotencyKey === record.recordIdempotencyKey,
		);
		if (replay !== undefined) return ok({ ...replay });
		if (existing.data.status !== "draft" && existing.data.status !== "posted") {
			return fail("CONFLICT", "Discrepancy requires a draft or posted receipt");
		}
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
			discrepancyStatus: "open",
		});
		try {
			const [rows] = await runNeonHttpTransaction<[TxIdRow[]]>((txSql) => [
				txSql`
					WITH parent AS (
						SELECT * FROM goods_receipt
						WHERE id = ${record.receiptId}
							AND organization_id = ${record.organizationId}
							AND status IN ('draft', 'posted')
					), mutated AS (
						INSERT INTO receiving_discrepancy (
							id, organization_id, goods_receipt_id, goods_receipt_line_id,
							discrepancy_type, quantity, notes, status,
							record_idempotency_key, version, created_by, updated_by
						)
						SELECT ${id}, organization_id, id, ${record.receiptLineId},
							${record.discrepancyType}, ${record.quantity}, ${record.notes},
							'open', ${record.recordIdempotencyKey},
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
			if (/record_idempotency/i.test(writeErrorMessage(error))) {
				const again = await this.getReceiptById(
					record.organizationId,
					record.receiptId,
				);
				if (!again.ok) return again;
				const found = again.data?.discrepancies.find(
					(row) => row.recordIdempotencyKey === record.recordIdempotencyKey,
				);
				if (found !== undefined) return ok({ ...found });
			}
			return writeError(
				error,
				"Receiving discrepancy conflict",
				"Failed to record receiving discrepancy",
			);
		}
	}

	async resolveDiscrepancy(
		record: DiscrepancyResolveRecord,
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
		const discrepancy = existing.data.discrepancies.find(
			(row) => row.id === record.discrepancyId,
		);
		if (discrepancy === undefined) {
			return fail("NOT_FOUND", "Receiving discrepancy not found");
		}
		if (discrepancy.resolveIdempotencyKey === record.resolveIdempotencyKey) {
			return ok({ ...discrepancy });
		}
		if (discrepancy.status === "resolved") {
			return fail(
				"CONFLICT",
				"Discrepancy already resolved",
				receivingErrorDetails(RECEIVING_ERROR_IDEMPOTENCY_CONFLICT),
			);
		}
		if (discrepancy.version !== record.expectedVersion) {
			return fail("CONFLICT", "Discrepancy version conflict");
		}
		const nextVersion = record.expectedVersion + 1;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changes = json([
			{ field: "status", oldValue: "open", newValue: "resolved" },
		]);
		const newValue = json({ resolution: record.resolution });
		const payload = json({
			organizationId: record.organizationId,
			entityType: "receiving_discrepancy",
			entityId: record.discrepancyId,
			code: existing.data.code,
			version: nextVersion,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			status: existing.data.status,
			sourceType: existing.data.sourceType,
			warehouseId: existing.data.warehouseId,
			receiptId: record.receiptId,
			discrepancyType: discrepancy.discrepancyType,
			quantity: discrepancy.quantity,
			discrepancyStatus: "resolved",
		});
		try {
			const [rows] = await runNeonHttpTransaction<[TxIdRow[]]>((txSql) => [
				txSql`
					WITH mutated AS (
						UPDATE receiving_discrepancy
						SET status = 'resolved',
							resolution = ${record.resolution},
							resolved_at = now(),
							resolved_by = ${record.actorUserId},
							resolve_idempotency_key = ${record.resolveIdempotencyKey},
							updated_by = ${record.actorUserId},
							updated_at = now(),
							version = ${nextVersion}
						WHERE id = ${record.discrepancyId}
							AND organization_id = ${record.organizationId}
							AND goods_receipt_id = ${record.receiptId}
							AND status = 'open'
							AND version = ${record.expectedVersion}
						RETURNING *
					), audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module,
							entity, entity_id, action, changes, new_value
						)
						SELECT ${auditId}, organization_id, ${record.actorUserId},
							${meta.correlationId}, 'receiving', 'receiving_discrepancy', id,
							'UPDATE', ${changes}::jsonb, ${newValue}::jsonb
						FROM mutated RETURNING id
					), outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id,
							'receiving.discrepancy.resolved.v1', 'receiving',
							${meta.correlationId}, ${record.actorUserId},
							${payload}::jsonb, 'pending', 0
						FROM mutated RETURNING id
					)
					SELECT mutated.id FROM mutated, audited, outboxed
				`,
			]);
			if (rows[0] === undefined) {
				return fail("CONFLICT", "Discrepancy version conflict");
			}
			const [row] = await db
				.select()
				.from(receivingDiscrepancy)
				.where(
					and(
						eq(receivingDiscrepancy.organizationId, record.organizationId),
						eq(receivingDiscrepancy.id, record.discrepancyId),
					),
				)
				.limit(1);
			return row === undefined
				? fail("INTERNAL_ERROR", "Resolved receiving discrepancy missing")
				: ok(mapDiscrepancy(row));
		} catch (error) {
			if (/resolve_idempotency/i.test(writeErrorMessage(error))) {
				const [row] = await db
					.select()
					.from(receivingDiscrepancy)
					.where(
						and(
							eq(receivingDiscrepancy.organizationId, record.organizationId),
							eq(
								receivingDiscrepancy.resolveIdempotencyKey,
								record.resolveIdempotencyKey,
							),
						),
					)
					.limit(1);
				if (row !== undefined) return ok(mapDiscrepancy(row));
			}
			return writeError(
				error,
				"Receiving discrepancy resolve conflict",
				"Failed to resolve receiving discrepancy",
			);
		}
	}

	async sumPostedAcceptedByPoLines(
		organizationId: string,
		purchaseOrderId: string,
		purchaseOrderLineIds: readonly string[],
		excludeReceiptId?: string,
	): Promise<Result<PostedAcceptedByPoLine[]>> {
		const totals = new Map<string, number>();
		for (const lineId of purchaseOrderLineIds) {
			totals.set(lineId, 0);
		}
		if (purchaseOrderLineIds.length === 0) {
			return ok([]);
		}
		try {
			const conditions = [
				eq(goodsReceipt.organizationId, organizationId),
				eq(goodsReceipt.sourceId, purchaseOrderId),
				eq(goodsReceipt.status, "posted"),
				isNull(goodsReceipt.reversedByReceiptId),
				isNull(goodsReceipt.reversesReceiptId),
				inArray(goodsReceiptLine.purchaseOrderLineId, [
					...purchaseOrderLineIds,
				]),
			];
			if (excludeReceiptId !== undefined) {
				conditions.push(ne(goodsReceipt.id, excludeReceiptId));
			}
			const rows = await db
				.select({
					purchaseOrderLineId: goodsReceiptLine.purchaseOrderLineId,
					acceptedQuantity: sql<string>`coalesce(sum(${goodsReceiptLine.quantityAccepted}::numeric), 0)`,
				})
				.from(goodsReceiptLine)
				.innerJoin(
					goodsReceipt,
					eq(goodsReceiptLine.goodsReceiptId, goodsReceipt.id),
				)
				.where(and(...conditions))
				.groupBy(goodsReceiptLine.purchaseOrderLineId);
			for (const row of rows) {
				if (row.purchaseOrderLineId === null) continue;
				if (!totals.has(row.purchaseOrderLineId)) continue;
				const qty = Number(row.acceptedQuantity);
				if (!Number.isFinite(qty)) continue;
				totals.set(row.purchaseOrderLineId, qty);
			}
			return ok(
				[...totals.entries()].map(
					([purchaseOrderLineId, acceptedQuantity]) => ({
						purchaseOrderLineId,
						acceptedQuantity,
					}),
				),
			);
		} catch (error) {
			return failFromUnknown(
				error,
				"Failed to sum posted accepted quantities by purchase order lines",
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
			const [hydrated] = await hydrateReceipts(organizationId, [header]);
			return ok(hydrated ?? null);
		} catch (error) {
			return failFromUnknown(error, "Failed to load goods receipt");
		}
	}

	async getReceiptByCreateIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<GoodsReceipt | null>> {
		try {
			const [header] = await db
				.select()
				.from(goodsReceipt)
				.where(
					and(
						eq(goodsReceipt.organizationId, organizationId),
						eq(goodsReceipt.createIdempotencyKey, idempotencyKey),
					),
				)
				.limit(1);
			if (header === undefined) return ok(null);
			const [hydrated] = await hydrateReceipts(organizationId, [header]);
			return ok(hydrated ?? null);
		} catch (error) {
			return failFromUnknown(
				error,
				"Failed to load goods receipt by create idempotency key",
			);
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
			return ok(await hydrateReceipts(filter.organizationId, headers));
		} catch (error) {
			return failFromUnknown(error, "Failed to list goods receipts");
		}
	}

	async listInventoryExceptions(
		filter: ReceiptListFilter,
	): Promise<Result<GoodsReceipt[]>> {
		try {
			const headers = await db
				.select()
				.from(goodsReceipt)
				.where(
					and(
						eq(goodsReceipt.organizationId, filter.organizationId),
						eq(goodsReceipt.status, "posted"),
						inArray(goodsReceipt.inventoryApplicationStatus, [
							"pending",
							"failed",
						]),
					),
				)
				.orderBy(desc(goodsReceipt.updatedAt), desc(goodsReceipt.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			return ok(await hydrateReceipts(filter.organizationId, headers));
		} catch (error) {
			return failFromUnknown(
				error,
				"Failed to list goods receipt inventory exceptions",
			);
		}
	}
}

export function createDrizzleReceivingStore(): DrizzleReceivingStore {
	return new DrizzleReceivingStore();
}
