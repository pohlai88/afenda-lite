import { randomUUID } from "node:crypto";

import { audit as afendaAudit } from "@afenda/audit";
import {
	database as afendaDatabase,
	and,
	asc,
	desc,
	eq,
	goodsReceipt,
	goodsReceiptLine,
	inArray,
	isNull,
	type NeonHttpSql,
	ne,
	receivingDiscrepancy,
	sql,
} from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";
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
} from "../../kernel/contracts/domain";
import type { MutationPorts } from "../../kernel/contracts/ports";
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
} from "./receipts.store";

const RECEIVING_AUDIT_SOURCE = "receiving.drizzle-store";

function failFromPersistence(error: unknown, _fallbackMessage: string) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

interface PostGuardRow {
	over_count: number;
	receipt_id: string | null;
}

interface PostGuardSqlParams {
	ceilings: string[];
	lineIds: string[];
	purchaseOrderId: string | null;
	thisAccepted: string[];
}

function postGuardSqlParams(
	guard: ReceiptPostRecord["poConsumptionGuard"],
): PostGuardSqlParams {
	if (guard === undefined) {
		return {
			ceilings: [],
			lineIds: [],
			purchaseOrderId: null,
			thisAccepted: [],
		};
	}
	return {
		ceilings: guard.lines.map((line) => String(line.ceiling)),
		lineIds: guard.lines.map((line) => line.purchaseOrderLineId),
		purchaseOrderId: guard.purchaseOrderId,
		thisAccepted: guard.lines.map((line) => String(line.thisAccepted)),
	};
}

function decideDrizzleReceiptPost(
	receipt: GoodsReceipt,
	record: ReceiptPostRecord,
): Result<"proceed" | "replay"> {
	if (receipt.postIdempotencyKey === record.postIdempotencyKey) {
		return errorResult.ok("replay");
	}
	if (receipt.status !== "draft") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Goods receipt is not in draft status",
		});
	}
	if (receipt.version !== record.expectedVersion) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Goods receipt version conflict",
		});
	}
	if (receipt.lines.length === 0) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Cannot post goods receipt without lines",
		});
	}
	return errorResult.ok("proceed");
}

function parseEnum<T extends string>(
	value: string,
	values: readonly T[],
	field: string,
): T {
	const found = values.find((candidate) => candidate === value);
	if (found === undefined) {
		throw new Error(`Invalid ${field}: ${value}`);
	}
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

function writeError(
	error: unknown,
	_conflictMessage: string,
	fallbackMessage: string,
): Result<never> {
	return failFromPersistence(error, fallbackMessage);
}

function isIdempotencyConflict(error: unknown, key: string): boolean {
	return readConstraintName(error).includes(key);
}

async function hydrateReceipts(
	organizationId: string,
	headers: (typeof goodsReceipt.$inferSelect)[],
): Promise<GoodsReceipt[]> {
	if (headers.length === 0) {
		return [];
	}
	const ids = headers.map((row) => row.id);
	const [lines, discrepancies] = await Promise.all([
		afendaDatabase.client
			.select()
			.from(goodsReceiptLine)
			.where(
				and(
					eq(goodsReceiptLine.organizationId, organizationId),
					inArray(goodsReceiptLine.goodsReceiptId, ids),
				),
			)
			.orderBy(asc(goodsReceiptLine.lineNo)),
		afendaDatabase.client
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
		if (bucket === undefined) {
			linesByReceipt.set(row.goodsReceiptId, [mapped]);
		} else {
			bucket.push(mapped);
		}
	}
	const discrepanciesByReceipt = new Map<string, ReceivingDiscrepancy[]>();
	for (const row of discrepancies) {
		const mapped = mapDiscrepancy(row);
		const bucket = discrepanciesByReceipt.get(row.goodsReceiptId);
		if (bucket === undefined) {
			discrepanciesByReceipt.set(row.goodsReceiptId, [mapped]);
		} else {
			bucket.push(mapped);
		}
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
		_message: string,
	): Promise<Result<GoodsReceipt>> {
		const result = await this.getReceiptById(organizationId, id);
		if (!result.ok) {
			return result;
		}
		return result.data === null
			? errorResult.fail("INTERNAL_ERROR")
			: errorResult.ok(result.data);
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
		if (!replay.ok) {
			return replay;
		}
		if (replay.data !== null) {
			return errorResult.ok(replay.data);
		}

		const id = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const preparedAudit = afendaAudit.transaction.prepare({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			module: "receiving",
			entity: "goods_receipt",
			entityId: id,
			action: "CREATE",
			changes: [{ field: "code", oldValue: null, newValue: record.code }],
			newValue: { code: record.code, status: "draft" },
			eventContext: {
				version: 1,
				outcome: "SUCCEEDED",
				source: RECEIVING_AUDIT_SOURCE,
				causationId: record.createIdempotencyKey,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
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
			const [rows] = await afendaDatabase.transaction((txSql) => [
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
							entity, entity_id, action, changes, old_value, new_value,
							metadata, ip_address, user_agent
						)
						SELECT ${auditId}, ${audit.organizationId}, ${audit.actorUserId},
							${audit.correlationId}, ${audit.module}, ${audit.entity},
							${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
							${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
							${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
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
				return errorResult.fail("INTERNAL_ERROR");
			}
			return this.reload(
				record.organizationId,
				id,
				"Created goods receipt missing",
			);
		} catch (error) {
			if (isIdempotencyConflict(error, "create_idempotency")) {
				const existing = await this.getReceiptByCreateIdempotencyKey(
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
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Goods receipt not found",
			});
		}
		const replayLine = existing.data.lines.find(
			(line) => line.lineIdempotencyKey === record.lineIdempotencyKey,
		);
		if (replayLine !== undefined) {
			return errorResult.ok({ ...replayLine });
		}
		if (existing.data.status !== "draft") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Cannot add lines to a non-draft goods receipt",
			});
		}
		const lineNo =
			existing.data.lines.reduce((max, row) => Math.max(max, row.lineNo), 0) +
			1;
		const id = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const currentReceiptVersion = existing.data.version;
		const preparedAudit = afendaAudit.transaction.prepare({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			module: "receiving",
			entity: "goods_receipt_line",
			entityId: id,
			action: "CREATE",
			changes: [
				{ field: "item_code", oldValue: null, newValue: record.itemCode },
			],
			newValue: { receiptId: record.receiptId, lineNo },
			eventContext: {
				version: 1,
				outcome: "SUCCEEDED",
				source: RECEIVING_AUDIT_SOURCE,
				causationId: record.lineIdempotencyKey,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
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
			const [rows] = await afendaDatabase.transaction((txSql) => [
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
							entity, entity_id, action, changes, old_value, new_value,
							metadata, ip_address, user_agent
						)
						SELECT ${auditId}, ${audit.organizationId}, ${audit.actorUserId},
							${audit.correlationId}, ${audit.module}, ${audit.entity},
							${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
							${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
							${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
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
				return errorResult.fail("CONFLICT", {
					publicMessage: "Goods receipt line add conflict",
				});
			}
			const [line] = await afendaDatabase.client
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
				? errorResult.fail("INTERNAL_ERROR")
				: errorResult.ok(mapLine(line));
		} catch (error) {
			if (isIdempotencyConflict(error, "line_idempotency")) {
				const again = await this.getReceiptById(
					record.organizationId,
					record.receiptId,
				);
				if (!again.ok) {
					return again;
				}
				const found = again.data?.lines.find(
					(line) => line.lineIdempotencyKey === record.lineIdempotencyKey,
				);
				if (found !== undefined) {
					return errorResult.ok({ ...found });
				}
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
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Goods receipt not found",
			});
		}
		const decision = decideDrizzleReceiptPost(existing.data, record);
		if (!decision.ok) {
			return decision;
		}
		if (decision.data === "replay") {
			return errorResult.ok(existing.data);
		}
		const nextVersion = record.expectedVersion + 1;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const preparedAudit = afendaAudit.transaction.prepare({
			organizationId: record.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			module: "receiving",
			entity: "goods_receipt",
			entityId: record.receiptId,
			action: "UPDATE",
			changes: [{ field: "status", oldValue: "draft", newValue: "posted" }],
			oldValue: { status: "draft", version: record.expectedVersion },
			newValue: { status: "posted", version: nextVersion },
			eventContext: {
				version: 1,
				outcome: "SUCCEEDED",
				source: RECEIVING_AUDIT_SOURCE,
				causationId: record.postIdempotencyKey,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
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
		const guardParams = postGuardSqlParams(guard);
		try {
			const txResults = await afendaDatabase.transaction((txSql) => {
				const statements: ReturnType<NeonHttpSql>[] = [];
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
						${guardParams.lineIds}::uuid[],
						${guardParams.thisAccepted}::numeric[],
						${guardParams.ceilings}::numeric[]
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
						AND grl.organization_id = ${record.organizationId}
						AND gr.source_type = 'purchase_order'
					AND gr.source_id = ${guardParams.purchaseOrderId}
						AND gr.status = 'posted'
						AND gr.reversed_by_receipt_id IS NULL
						AND gr.reverses_receipt_id IS NULL
						AND gr.id <> ${record.receiptId}
					AND grl.purchase_order_line_id = ANY(${guardParams.lineIds}::uuid[])
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
						AND goods_receipt.organization_id = ${record.organizationId}
						AND status = 'draft' AND version = ${record.expectedVersion}
						AND NOT EXISTS (SELECT 1 FROM over)
					RETURNING *
					), audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module,
							entity, entity_id, action, changes, old_value, new_value,
							metadata, ip_address, user_agent
						)
						SELECT ${auditId}, ${audit.organizationId}, ${audit.actorUserId},
							${audit.correlationId}, ${audit.module}, ${audit.entity},
							${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
							${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
							${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
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
						AND goods_receipt_line.organization_id = ${record.organizationId}
						AND goods_receipt_id = ${record.receiptId}
						AND EXISTS (
							SELECT 1 FROM goods_receipt
							WHERE id = ${record.receiptId}
								AND goods_receipt.organization_id = ${record.organizationId}
								AND status = 'posted' AND version = ${nextVersion}
						)
				`);
				}
				return statements;
			});
			const rows = (
				guard === undefined
					? (txResults as [PostGuardRow[]])[0]
					: (txResults as [unknown[], PostGuardRow[]])[1]
			) as PostGuardRow[];
			const [outcome] = rows;
			if (outcome === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Goods receipt version conflict",
				});
			}
			if (Number(outcome.over_count) > 0) {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Accepted quantity exceeds remaining quantity plus over-receipt tolerance",
				});
			}
			if (outcome.receipt_id === null) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Goods receipt version conflict",
				});
			}
			return this.reload(
				record.organizationId,
				record.receiptId,
				"Posted goods receipt missing",
			);
		} catch (error) {
			if (isIdempotencyConflict(error, "post_idempotency")) {
				const again = await this.getReceiptById(
					record.organizationId,
					record.receiptId,
				);
				if (!again.ok) {
					return again;
				}
				if (
					again.data !== null &&
					again.data.postIdempotencyKey === record.postIdempotencyKey
				) {
					return errorResult.ok(again.data);
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
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Goods receipt not found",
			});
		}
		if (existing.data.cancelIdempotencyKey === record.cancelIdempotencyKey) {
			return errorResult.ok(existing.data);
		}
		if (existing.data.status === "posted") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Posted goods receipts cannot be cancelled; use reverse",
			});
		}
		if (existing.data.status !== "draft") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Goods receipt cannot be cancelled",
			});
		}
		if (existing.data.version !== record.expectedVersion) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Goods receipt version conflict",
			});
		}
		const nextVersion = record.expectedVersion + 1;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const preparedAudit = afendaAudit.transaction.prepare({
			organizationId: record.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			module: "receiving",
			entity: "goods_receipt",
			entityId: record.receiptId,
			action: "UPDATE",
			changes: [{ field: "status", oldValue: "draft", newValue: "cancelled" }],
			oldValue: { status: "draft", version: record.expectedVersion },
			newValue: { status: "cancelled", version: nextVersion },
			eventContext: {
				version: 1,
				outcome: "SUCCEEDED",
				source: RECEIVING_AUDIT_SOURCE,
				causationId: record.cancelIdempotencyKey,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
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
			const [rows] = await afendaDatabase.transaction((txSql) => [
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
							entity, entity_id, action, changes, old_value, new_value,
							metadata, ip_address, user_agent
						)
						SELECT ${auditId}, ${audit.organizationId}, ${audit.actorUserId},
							${audit.correlationId}, ${audit.module}, ${audit.entity},
							${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
							${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
							${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
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
				return errorResult.fail("CONFLICT", {
					publicMessage: "Goods receipt version conflict",
				});
			}
			return this.reload(
				record.organizationId,
				record.receiptId,
				"Cancelled goods receipt missing",
			);
		} catch (error) {
			if (isIdempotencyConflict(error, "cancel_idempotency")) {
				const again = await this.getReceiptById(
					record.organizationId,
					record.receiptId,
				);
				if (!again.ok) {
					return again;
				}
				if (
					again.data !== null &&
					again.data.cancelIdempotencyKey === record.cancelIdempotencyKey
				) {
					return errorResult.ok(again.data);
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
		const [replayHeader] = await afendaDatabase.client
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
		if (!originalResult.ok) {
			return originalResult;
		}
		if (originalResult.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Goods receipt not found",
			});
		}
		const original = originalResult.data;
		if (original.status !== "posted") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Only posted goods receipts can be reversed",
			});
		}
		if (original.reversedByReceiptId !== null) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Goods receipt already reversed",
			});
		}
		if (original.version !== record.expectedVersion) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Goods receipt version conflict",
			});
		}

		const reverseId = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const nextOriginalVersion = record.expectedVersion + 1;
		const inventoryApplicationStatus =
			original.inventoryMovementId === null ? "not_applicable" : "pending";
		const preparedAudit = afendaAudit.transaction.prepare({
			organizationId: record.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			module: "receiving",
			entity: "goods_receipt",
			entityId: reverseId,
			action: "CREATE",
			changes: [
				{
					field: "reverses_receipt_id",
					oldValue: null,
					newValue: original.id,
				},
			],
			newValue: {
				status: "posted",
				reversesReceiptId: original.id,
			},
			eventContext: {
				version: 1,
				outcome: "SUCCEEDED",
				source: RECEIVING_AUDIT_SOURCE,
				causationId: record.reverseIdempotencyKey,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
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
			const [rows] = await afendaDatabase.transaction((txSql) => {
				const statements = [
					txSql`
					WITH claimed AS (
						UPDATE goods_receipt
						SET version = ${nextOriginalVersion},
							reverse_reason = ${record.reason},
							updated_by = ${record.actorUserId},
							updated_at = now()
						WHERE id = ${record.originalReceiptId}
							AND goods_receipt.organization_id = ${record.organizationId}
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
							AND goods_receipt.organization_id = ${record.organizationId}
							AND EXISTS (SELECT 1 FROM inserted)
						RETURNING id
					), audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module,
								entity, entity_id, action, changes, old_value, new_value,
								metadata, ip_address, user_agent
							)
							SELECT ${auditId}, ${audit.organizationId}, ${audit.actorUserId},
								${audit.correlationId}, ${audit.module}, ${audit.entity},
								${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
								${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
								${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
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
				return errorResult.fail("CONFLICT", {
					publicMessage: "Goods receipt version conflict",
				});
			}
			return this.reload(
				record.organizationId,
				reverseId,
				"Reversed goods receipt missing",
			);
		} catch (error) {
			if (isIdempotencyConflict(error, "reverse_idempotency")) {
				const [again] = await afendaDatabase.client
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
			const [rows] = await afendaDatabase.transaction((txSql) => [
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
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Goods receipt not found",
				});
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
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Goods receipt not found",
			});
		}
		const replay = existing.data.discrepancies.find(
			(row) => row.recordIdempotencyKey === record.recordIdempotencyKey,
		);
		if (replay !== undefined) {
			return errorResult.ok({ ...replay });
		}
		if (existing.data.status !== "draft" && existing.data.status !== "posted") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Discrepancy requires a draft or posted receipt",
			});
		}
		const id = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const preparedAudit = afendaAudit.transaction.prepare({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			module: "receiving",
			entity: "receiving_discrepancy",
			entityId: id,
			action: "CREATE",
			changes: [
				{
					field: "discrepancy_type",
					oldValue: null,
					newValue: record.discrepancyType,
				},
			],
			newValue: {
				receiptId: record.receiptId,
				quantity: record.quantity,
			},
			eventContext: {
				version: 1,
				outcome: "SUCCEEDED",
				source: RECEIVING_AUDIT_SOURCE,
				causationId: record.recordIdempotencyKey,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
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
			const [rows] = await afendaDatabase.transaction((txSql) => [
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
							entity, entity_id, action, changes, old_value, new_value,
							metadata, ip_address, user_agent
						)
						SELECT ${auditId}, ${audit.organizationId}, ${audit.actorUserId},
							${audit.correlationId}, ${audit.module}, ${audit.entity},
							${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
							${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
							${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
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
				return errorResult.fail("CONFLICT", {
					publicMessage: "Receiving discrepancy create conflict",
				});
			}
			const [row] = await afendaDatabase.client
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
				? errorResult.fail("INTERNAL_ERROR")
				: errorResult.ok(mapDiscrepancy(row));
		} catch (error) {
			if (isIdempotencyConflict(error, "record_idempotency")) {
				const again = await this.getReceiptById(
					record.organizationId,
					record.receiptId,
				);
				if (!again.ok) {
					return again;
				}
				const found = again.data?.discrepancies.find(
					(row) => row.recordIdempotencyKey === record.recordIdempotencyKey,
				);
				if (found !== undefined) {
					return errorResult.ok({ ...found });
				}
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
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Goods receipt not found",
			});
		}
		const discrepancy = existing.data.discrepancies.find(
			(row) => row.id === record.discrepancyId,
		);
		if (discrepancy === undefined) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Receiving discrepancy not found",
			});
		}
		if (discrepancy.resolveIdempotencyKey === record.resolveIdempotencyKey) {
			return errorResult.ok({ ...discrepancy });
		}
		if (discrepancy.status === "resolved") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Discrepancy already resolved",
			});
		}
		if (discrepancy.version !== record.expectedVersion) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Discrepancy version conflict",
			});
		}
		const nextVersion = record.expectedVersion + 1;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const preparedAudit = afendaAudit.transaction.prepare({
			organizationId: record.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			module: "receiving",
			entity: "receiving_discrepancy",
			entityId: record.discrepancyId,
			action: "UPDATE",
			changes: [{ field: "status", oldValue: "open", newValue: "resolved" }],
			newValue: { resolution: record.resolution },
			eventContext: {
				version: 1,
				outcome: "SUCCEEDED",
				source: RECEIVING_AUDIT_SOURCE,
				causationId: record.resolveIdempotencyKey,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
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
			const [rows] = await afendaDatabase.transaction((txSql) => [
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
							entity, entity_id, action, changes, old_value, new_value,
							metadata, ip_address, user_agent
						)
						SELECT ${auditId}, ${audit.organizationId}, ${audit.actorUserId},
							${audit.correlationId}, ${audit.module}, ${audit.entity},
							${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
							${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
							${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
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
				return errorResult.fail("CONFLICT", {
					publicMessage: "Discrepancy version conflict",
				});
			}
			const [row] = await afendaDatabase.client
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
				? errorResult.fail("INTERNAL_ERROR")
				: errorResult.ok(mapDiscrepancy(row));
		} catch (error) {
			if (isIdempotencyConflict(error, "resolve_idempotency")) {
				const [row] = await afendaDatabase.client
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
				if (row !== undefined) {
					return errorResult.ok(mapDiscrepancy(row));
				}
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
			return errorResult.ok([]);
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
			const rows = await afendaDatabase.client
				.select({
					purchaseOrderLineId: goodsReceiptLine.purchaseOrderLineId,
					acceptedQuantity: sql<string>`coalesce(sum(${goodsReceiptLine.quantityAccepted}::numeric), 0)`,
				})
				.from(goodsReceiptLine)
				.innerJoin(
					goodsReceipt,
					and(
						eq(goodsReceiptLine.goodsReceiptId, goodsReceipt.id),
						eq(goodsReceiptLine.organizationId, organizationId),
					),
				)
				.where(and(...conditions))
				.groupBy(goodsReceiptLine.purchaseOrderLineId);
			for (const row of rows) {
				if (row.purchaseOrderLineId === null) {
					continue;
				}
				if (!totals.has(row.purchaseOrderLineId)) {
					continue;
				}
				const qty = Number(row.acceptedQuantity);
				if (!Number.isFinite(qty)) {
					continue;
				}
				totals.set(row.purchaseOrderLineId, qty);
			}
			return errorResult.ok(
				[...totals.entries()].map(
					([purchaseOrderLineId, acceptedQuantity]) => ({
						purchaseOrderLineId,
						acceptedQuantity,
					}),
				),
			);
		} catch (error) {
			return failFromPersistence(
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
			const [header] = await afendaDatabase.client
				.select()
				.from(goodsReceipt)
				.where(
					and(
						eq(goodsReceipt.organizationId, organizationId),
						eq(goodsReceipt.id, id),
					),
				)
				.limit(1);
			if (header === undefined) {
				return errorResult.ok(null);
			}
			const [hydrated] = await hydrateReceipts(organizationId, [header]);
			return errorResult.ok(hydrated ?? null);
		} catch (error) {
			return failFromPersistence(error, "Failed to load goods receipt");
		}
	}

	async getReceiptByCreateIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<GoodsReceipt | null>> {
		try {
			const [header] = await afendaDatabase.client
				.select()
				.from(goodsReceipt)
				.where(
					and(
						eq(goodsReceipt.organizationId, organizationId),
						eq(goodsReceipt.createIdempotencyKey, idempotencyKey),
					),
				)
				.limit(1);
			if (header === undefined) {
				return errorResult.ok(null);
			}
			const [hydrated] = await hydrateReceipts(organizationId, [header]);
			return errorResult.ok(hydrated ?? null);
		} catch (error) {
			return failFromPersistence(
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
			const headers = await afendaDatabase.client
				.select()
				.from(goodsReceipt)
				.where(and(...conditions))
				.orderBy(desc(goodsReceipt.updatedAt), desc(goodsReceipt.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			return errorResult.ok(
				await hydrateReceipts(filter.organizationId, headers),
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to list goods receipts");
		}
	}

	async listInventoryExceptions(
		filter: ReceiptListFilter,
	): Promise<Result<GoodsReceipt[]>> {
		try {
			const headers = await afendaDatabase.client
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
			return errorResult.ok(
				await hydrateReceipts(filter.organizationId, headers),
			);
		} catch (error) {
			return failFromPersistence(
				error,
				"Failed to list goods receipt inventory exceptions",
			);
		}
	}
}

export function createDrizzleReceivingStore(): DrizzleReceivingStore {
	return new DrizzleReceivingStore();
}
