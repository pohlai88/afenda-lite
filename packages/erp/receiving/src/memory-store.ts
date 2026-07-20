import { randomUUID } from "node:crypto";
import { fail, ok, type Result } from "@afenda/errors/result";

import {
	RECEIVING_ERROR_IDEMPOTENCY_CONFLICT,
	RECEIVING_ERROR_POSTED_RECEIPT_CANNOT_CANCEL,
	RECEIVING_ERROR_RECEIPT_ALREADY_REVERSED,
	receivingErrorDetails,
} from "./error-codes";
import { assertAcceptedWithinPoCeilings } from "./po-receiving-guard";
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
import type {
	GoodsReceipt,
	GoodsReceiptLine,
	ReceivingDiscrepancy,
} from "./types";

function cloneReceipt(receipt: GoodsReceipt): GoodsReceipt {
	return {
		...receipt,
		lines: receipt.lines.map((line) => ({ ...line })),
		discrepancies: receipt.discrepancies.map((row) => ({ ...row })),
	};
}

function eventPayload(
	receipt: GoodsReceipt,
	actorUserId: string,
	correlationId: string,
): Record<string, unknown> {
	return {
		organizationId: receipt.organizationId,
		entityType: "goods_receipt",
		entityId: receipt.id,
		code: receipt.code,
		version: receipt.version,
		actorUserId,
		correlationId,
		status: receipt.status,
		sourceType: receipt.sourceType,
		warehouseId: receipt.warehouseId,
	};
}

function consumesPo(receipt: GoodsReceipt): boolean {
	return (
		receipt.status === "posted" &&
		receipt.reversedByReceiptId === null &&
		receipt.reversesReceiptId === null
	);
}

export class MemoryReceivingStore implements ReceivingStore {
	private readonly receipts = new Map<string, GoodsReceipt>();
	/** Serializes PO post consumption checks (mirrors pg_advisory_xact_lock). */
	private readonly poPostChains = new Map<string, Promise<unknown>>();

	private async withPoPostLock<T>(
		organizationId: string,
		purchaseOrderId: string,
		run: () => Promise<T>,
	): Promise<T> {
		const key = `${organizationId}:${purchaseOrderId}`;
		const previous = this.poPostChains.get(key) ?? Promise.resolve();
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const chained = previous.then(() => gate);
		this.poPostChains.set(key, chained);
		await previous.then(
			() => undefined,
			() => undefined,
		);
		try {
			return await run();
		} finally {
			release();
			if (this.poPostChains.get(key) === chained) {
				this.poPostChains.delete(key);
			}
		}
	}

	async createReceipt(
		record: ReceiptCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<GoodsReceipt>> {
		for (const receipt of this.receipts.values()) {
			if (
				receipt.organizationId === record.organizationId &&
				receipt.createIdempotencyKey === record.createIdempotencyKey
			) {
				return ok(cloneReceipt(receipt));
			}
			if (
				receipt.organizationId === record.organizationId &&
				receipt.normalizedCode === record.normalizedCode
			) {
				return fail("CONFLICT", "Goods receipt code already exists");
			}
		}
		const now = new Date();
		const receipt: GoodsReceipt = {
			id: randomUUID(),
			organizationId: record.organizationId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			status: "draft",
			sourceType: record.sourceType,
			sourceId: record.sourceId,
			warehouseId: record.warehouseId,
			warehouseCode: record.warehouseCode,
			warehouseName: record.warehouseName,
			notes: record.notes,
			reversesReceiptId: null,
			reversedByReceiptId: null,
			reverseReason: null,
			inventoryApplicationStatus: "not_applicable",
			inventoryMovementId: null,
			inventoryApplicationError: null,
			createIdempotencyKey: record.createIdempotencyKey,
			postIdempotencyKey: null,
			cancelIdempotencyKey: null,
			reverseIdempotencyKey: null,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			postedAt: null,
			postedBy: null,
			cancelledAt: null,
			cancelledBy: null,
			createdAt: now,
			updatedAt: now,
			lines: [],
			discrepancies: [],
		};
		this.receipts.set(receipt.id, receipt);
		const audit = await ports.audit.record({
			organizationId: receipt.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "goods_receipt",
			entityId: receipt.id,
			action: "CREATE",
			changes: [{ field: "code", oldValue: null, newValue: receipt.code }],
			newValue: { code: receipt.code, status: receipt.status },
		});
		if (!audit.ok) {
			this.receipts.delete(receipt.id);
			return audit;
		}
		const outbox = await ports.outbox.append({
			organizationId: receipt.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			type: "receiving.receipt.created.v1",
			payload: eventPayload(receipt, record.createdBy, meta.correlationId),
		});
		if (!outbox.ok) {
			this.receipts.delete(receipt.id);
			return outbox;
		}
		return ok(cloneReceipt(receipt));
	}

	async addLine(
		record: ReceiptLineCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<GoodsReceiptLine>> {
		const receipt = this.receipts.get(record.receiptId);
		if (
			receipt === undefined ||
			receipt.organizationId !== record.organizationId
		) {
			return fail("NOT_FOUND", "Goods receipt not found");
		}
		const existingLine = receipt.lines.find(
			(line) => line.lineIdempotencyKey === record.lineIdempotencyKey,
		);
		if (existingLine !== undefined) {
			return ok({ ...existingLine });
		}
		if (receipt.status !== "draft") {
			return fail("CONFLICT", "Cannot add lines to a non-draft goods receipt");
		}
		const previous = cloneReceipt(receipt);
		const now = new Date();
		const line: GoodsReceiptLine = {
			id: randomUUID(),
			organizationId: record.organizationId,
			receiptId: record.receiptId,
			lineNo:
				receipt.lines.reduce((max, row) => Math.max(max, row.lineNo), 0) + 1,
			itemId: record.itemId,
			itemCode: record.itemCode,
			itemName: record.itemName,
			baseUomId: record.baseUomId,
			baseUomCode: record.baseUomCode,
			quantityOrdered: record.quantityOrdered,
			quantityExpected: record.quantityExpected,
			quantityReceived: record.quantityReceived,
			quantityAccepted: record.quantityAccepted,
			quantityRejected: record.quantityRejected,
			quantityDamaged: record.quantityDamaged,
			purchaseOrderLineId: record.purchaseOrderLineId,
			lineIdempotencyKey: record.lineIdempotencyKey,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		receipt.lines.push(line);
		receipt.version += 1;
		receipt.updatedBy = record.createdBy;
		receipt.updatedAt = now;
		const audit = await ports.audit.record({
			organizationId: receipt.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "goods_receipt_line",
			entityId: line.id,
			action: "CREATE",
			changes: [
				{ field: "item_code", oldValue: null, newValue: line.itemCode },
			],
			newValue: { receiptId: receipt.id, lineNo: line.lineNo },
		});
		if (!audit.ok) {
			this.receipts.set(receipt.id, previous);
			return audit;
		}
		const outbox = await ports.outbox.append({
			organizationId: receipt.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			type: "receiving.receipt.line_added.v1",
			payload: {
				...eventPayload(receipt, record.createdBy, meta.correlationId),
				entityType: "goods_receipt_line",
				entityId: line.id,
				version: line.version,
				receiptId: receipt.id,
				lineNo: line.lineNo,
				quantity: line.quantityAccepted,
			},
		});
		if (!outbox.ok) {
			this.receipts.set(receipt.id, previous);
			return outbox;
		}
		return ok({ ...line });
	}

	async postReceipt(
		record: ReceiptPostRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<GoodsReceipt>> {
		const execute = async (): Promise<Result<GoodsReceipt>> => {
			const receipt = this.receipts.get(record.receiptId);
			if (
				receipt === undefined ||
				receipt.organizationId !== record.organizationId
			)
				return fail("NOT_FOUND", "Goods receipt not found");
			if (receipt.postIdempotencyKey === record.postIdempotencyKey) {
				return ok(cloneReceipt(receipt));
			}
			if (receipt.status !== "draft") {
				return fail("CONFLICT", "Goods receipt is not in draft status");
			}
			if (receipt.version !== record.expectedVersion) {
				return fail("CONFLICT", "Goods receipt version conflict");
			}
			if (receipt.lines.length === 0) {
				return fail("CONFLICT", "Cannot post goods receipt without lines");
			}
			if (record.poConsumptionGuard !== undefined) {
				const lineIds = record.poConsumptionGuard.lines.map(
					(line) => line.purchaseOrderLineId,
				);
				const owning = await this.sumPostedAcceptedByPoLines(
					record.organizationId,
					record.poConsumptionGuard.purchaseOrderId,
					lineIds,
					record.receiptId,
				);
				if (!owning.ok) return owning;
				const alreadyAcceptedByLine = new Map(
					owning.data.map((row) => [
						row.purchaseOrderLineId,
						row.acceptedQuantity,
					]),
				);
				const within = assertAcceptedWithinPoCeilings(
					record.poConsumptionGuard,
					alreadyAcceptedByLine,
				);
				if (!within.ok) return within;
			}
			const previous = cloneReceipt(receipt);
			const now = new Date();
			receipt.warehouseCode = record.warehouseCode;
			receipt.warehouseName = record.warehouseName;
			for (const snapshot of record.lineSnapshots) {
				const line = receipt.lines.find((row) => row.id === snapshot.lineId);
				if (line !== undefined) {
					Object.assign(line, snapshot, {
						updatedBy: record.actorUserId,
						updatedAt: now,
						version: line.version + 1,
					});
				}
			}
			receipt.status = "posted";
			receipt.postedAt = now;
			receipt.postedBy = record.actorUserId;
			receipt.postIdempotencyKey = record.postIdempotencyKey;
			receipt.inventoryApplicationStatus = "pending";
			receipt.updatedBy = record.actorUserId;
			receipt.updatedAt = now;
			receipt.version += 1;
			const audit = await ports.audit.record({
				organizationId: receipt.organizationId,
				actorUserId: record.actorUserId,
				correlationId: meta.correlationId,
				entity: "goods_receipt",
				entityId: receipt.id,
				action: "UPDATE",
				changes: [{ field: "status", oldValue: "draft", newValue: "posted" }],
				oldValue: { status: previous.status, version: previous.version },
				newValue: { status: receipt.status, version: receipt.version },
			});
			if (!audit.ok) {
				this.receipts.set(receipt.id, previous);
				return audit;
			}
			const outbox = await ports.outbox.append({
				organizationId: receipt.organizationId,
				actorUserId: record.actorUserId,
				correlationId: meta.correlationId,
				type: "receiving.receipt.posted.v1",
				payload: eventPayload(receipt, record.actorUserId, meta.correlationId),
			});
			if (!outbox.ok) {
				this.receipts.set(receipt.id, previous);
				return outbox;
			}
			return ok(cloneReceipt(receipt));
		};
		if (record.poConsumptionGuard !== undefined) {
			return this.withPoPostLock(
				record.organizationId,
				record.poConsumptionGuard.purchaseOrderId,
				execute,
			);
		}
		return execute();
	}

	async cancelReceipt(
		record: ReceiptCancelRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<GoodsReceipt>> {
		const receipt = this.receipts.get(record.receiptId);
		if (
			receipt === undefined ||
			receipt.organizationId !== record.organizationId
		)
			return fail("NOT_FOUND", "Goods receipt not found");
		if (receipt.cancelIdempotencyKey === record.cancelIdempotencyKey) {
			return ok(cloneReceipt(receipt));
		}
		if (receipt.status === "posted") {
			return fail(
				"CONFLICT",
				"Posted goods receipts cannot be cancelled; use reverse",
				receivingErrorDetails(RECEIVING_ERROR_POSTED_RECEIPT_CANNOT_CANCEL),
			);
		}
		if (receipt.status !== "draft") {
			return fail("CONFLICT", "Goods receipt cannot be cancelled");
		}
		if (receipt.version !== record.expectedVersion) {
			return fail("CONFLICT", "Goods receipt version conflict");
		}
		const previous = cloneReceipt(receipt);
		const now = new Date();
		receipt.status = "cancelled";
		receipt.cancelledAt = now;
		receipt.cancelledBy = record.actorUserId;
		receipt.cancelIdempotencyKey = record.cancelIdempotencyKey;
		receipt.updatedBy = record.actorUserId;
		receipt.updatedAt = now;
		receipt.version += 1;
		const audit = await ports.audit.record({
			organizationId: receipt.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "goods_receipt",
			entityId: receipt.id,
			action: "UPDATE",
			changes: [
				{ field: "status", oldValue: previous.status, newValue: "cancelled" },
			],
			oldValue: { status: previous.status, version: previous.version },
			newValue: { status: receipt.status, version: receipt.version },
		});
		if (!audit.ok) {
			this.receipts.set(receipt.id, previous);
			return audit;
		}
		const outbox = await ports.outbox.append({
			organizationId: receipt.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			type: "receiving.receipt.cancelled.v1",
			payload: eventPayload(receipt, record.actorUserId, meta.correlationId),
		});
		if (!outbox.ok) {
			this.receipts.set(receipt.id, previous);
			return outbox;
		}
		return ok(cloneReceipt(receipt));
	}

	async reverseReceipt(
		record: ReceiptReverseRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<GoodsReceipt>> {
		for (const existing of this.receipts.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.reverseIdempotencyKey === record.reverseIdempotencyKey
			) {
				return ok(cloneReceipt(existing));
			}
		}
		const original = this.receipts.get(record.originalReceiptId);
		if (
			original === undefined ||
			original.organizationId !== record.organizationId
		) {
			return fail("NOT_FOUND", "Goods receipt not found");
		}
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
		const previous = cloneReceipt(original);
		const now = new Date();
		const reverseId = randomUUID();
		const reverseReceipt: GoodsReceipt = {
			id: reverseId,
			organizationId: original.organizationId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			status: "posted",
			sourceType: original.sourceType,
			sourceId: original.sourceId,
			warehouseId: original.warehouseId,
			warehouseCode: original.warehouseCode,
			warehouseName: original.warehouseName,
			notes: original.notes,
			reversesReceiptId: original.id,
			reversedByReceiptId: null,
			reverseReason: record.reason,
			inventoryApplicationStatus:
				original.inventoryMovementId === null ? "not_applicable" : "pending",
			inventoryMovementId: null,
			inventoryApplicationError: null,
			createIdempotencyKey: null,
			postIdempotencyKey: null,
			cancelIdempotencyKey: null,
			reverseIdempotencyKey: record.reverseIdempotencyKey,
			version: 1,
			createdBy: record.actorUserId,
			updatedBy: record.actorUserId,
			postedAt: now,
			postedBy: record.actorUserId,
			cancelledAt: null,
			cancelledBy: null,
			createdAt: now,
			updatedAt: now,
			lines: original.lines.map((line, index) => ({
				...line,
				id: randomUUID(),
				receiptId: reverseId,
				lineNo: index + 1,
				lineIdempotencyKey: `${record.reverseIdempotencyKey}:line:${line.id}`,
				createdBy: record.actorUserId,
				updatedBy: record.actorUserId,
				createdAt: now,
				updatedAt: now,
				version: 1,
			})),
			discrepancies: [],
		};
		original.reversedByReceiptId = reverseId;
		original.reverseReason = record.reason;
		original.updatedBy = record.actorUserId;
		original.updatedAt = now;
		original.version += 1;
		this.receipts.set(reverseId, reverseReceipt);
		const audit = await ports.audit.record({
			organizationId: original.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
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
			newValue: { status: "posted", reversesReceiptId: original.id },
		});
		if (!audit.ok) {
			this.receipts.set(original.id, previous);
			this.receipts.delete(reverseId);
			return audit;
		}
		const outbox = await ports.outbox.append({
			organizationId: original.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			type: "receiving.receipt.reversed.v1",
			payload: {
				...eventPayload(reverseReceipt, record.actorUserId, meta.correlationId),
				reversesReceiptId: original.id,
				reverseReason: record.reason,
			},
		});
		if (!outbox.ok) {
			this.receipts.set(original.id, previous);
			this.receipts.delete(reverseId);
			return outbox;
		}
		return ok(cloneReceipt(reverseReceipt));
	}

	async setInventoryApplication(
		record: ReceiptInventoryApplicationRecord,
	): Promise<Result<GoodsReceipt>> {
		const receipt = this.receipts.get(record.receiptId);
		if (
			receipt === undefined ||
			receipt.organizationId !== record.organizationId
		) {
			return fail("NOT_FOUND", "Goods receipt not found");
		}
		receipt.inventoryApplicationStatus = record.status;
		receipt.inventoryMovementId = record.inventoryMovementId;
		receipt.inventoryApplicationError = record.errorMessage;
		receipt.updatedBy = record.actorUserId;
		receipt.updatedAt = new Date();
		return ok(cloneReceipt(receipt));
	}

	async recordDiscrepancy(
		record: DiscrepancyCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ReceivingDiscrepancy>> {
		const receipt = this.receipts.get(record.receiptId);
		if (
			receipt === undefined ||
			receipt.organizationId !== record.organizationId
		)
			return fail("NOT_FOUND", "Goods receipt not found");
		const existing = receipt.discrepancies.find(
			(row) => row.recordIdempotencyKey === record.recordIdempotencyKey,
		);
		if (existing !== undefined) {
			return ok({ ...existing });
		}
		if (receipt.status !== "draft" && receipt.status !== "posted") {
			return fail("CONFLICT", "Discrepancy requires a draft or posted receipt");
		}
		const previous = cloneReceipt(receipt);
		const now = new Date();
		const discrepancy: ReceivingDiscrepancy = {
			id: randomUUID(),
			organizationId: record.organizationId,
			receiptId: record.receiptId,
			receiptLineId: record.receiptLineId,
			discrepancyType: record.discrepancyType,
			quantity: record.quantity,
			notes: record.notes,
			status: "open",
			resolution: null,
			resolvedAt: null,
			resolvedBy: null,
			recordIdempotencyKey: record.recordIdempotencyKey,
			resolveIdempotencyKey: null,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		receipt.discrepancies.push(discrepancy);
		const audit = await ports.audit.record({
			organizationId: receipt.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "receiving_discrepancy",
			entityId: discrepancy.id,
			action: "CREATE",
			changes: [
				{
					field: "discrepancy_type",
					oldValue: null,
					newValue: discrepancy.discrepancyType,
				},
			],
			newValue: { receiptId: receipt.id, quantity: discrepancy.quantity },
		});
		if (!audit.ok) {
			this.receipts.set(receipt.id, previous);
			return audit;
		}
		const outbox = await ports.outbox.append({
			organizationId: receipt.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			type: "receiving.discrepancy.recorded.v1",
			payload: {
				...eventPayload(receipt, record.createdBy, meta.correlationId),
				entityType: "receiving_discrepancy",
				entityId: discrepancy.id,
				version: discrepancy.version,
				receiptId: receipt.id,
				discrepancyType: discrepancy.discrepancyType,
				quantity: discrepancy.quantity,
				discrepancyStatus: discrepancy.status,
			},
		});
		if (!outbox.ok) {
			this.receipts.set(receipt.id, previous);
			return outbox;
		}
		return ok({ ...discrepancy });
	}

	async resolveDiscrepancy(
		record: DiscrepancyResolveRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ReceivingDiscrepancy>> {
		const receipt = this.receipts.get(record.receiptId);
		if (
			receipt === undefined ||
			receipt.organizationId !== record.organizationId
		) {
			return fail("NOT_FOUND", "Goods receipt not found");
		}
		const discrepancy = receipt.discrepancies.find(
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
		const previous = cloneReceipt(receipt);
		const now = new Date();
		discrepancy.status = "resolved";
		discrepancy.resolution = record.resolution;
		discrepancy.resolvedAt = now;
		discrepancy.resolvedBy = record.actorUserId;
		discrepancy.resolveIdempotencyKey = record.resolveIdempotencyKey;
		discrepancy.updatedBy = record.actorUserId;
		discrepancy.updatedAt = now;
		discrepancy.version += 1;
		const audit = await ports.audit.record({
			organizationId: receipt.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "receiving_discrepancy",
			entityId: discrepancy.id,
			action: "UPDATE",
			changes: [{ field: "status", oldValue: "open", newValue: "resolved" }],
			newValue: { resolution: record.resolution },
		});
		if (!audit.ok) {
			this.receipts.set(receipt.id, previous);
			return audit;
		}
		const outbox = await ports.outbox.append({
			organizationId: receipt.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			type: "receiving.discrepancy.resolved.v1",
			payload: {
				...eventPayload(receipt, record.actorUserId, meta.correlationId),
				entityType: "receiving_discrepancy",
				entityId: discrepancy.id,
				version: discrepancy.version,
				receiptId: receipt.id,
				discrepancyType: discrepancy.discrepancyType,
				quantity: discrepancy.quantity,
				discrepancyStatus: discrepancy.status,
			},
		});
		if (!outbox.ok) {
			this.receipts.set(receipt.id, previous);
			return outbox;
		}
		return ok({ ...discrepancy });
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
		for (const receipt of this.receipts.values()) {
			if (receipt.organizationId !== organizationId) continue;
			if (receipt.sourceId !== purchaseOrderId) continue;
			if (!consumesPo(receipt)) continue;
			if (excludeReceiptId !== undefined && receipt.id === excludeReceiptId) {
				continue;
			}
			for (const line of receipt.lines) {
				if (line.purchaseOrderLineId === null) continue;
				if (!totals.has(line.purchaseOrderLineId)) continue;
				const qty = Number(line.quantityAccepted);
				if (!Number.isFinite(qty)) continue;
				totals.set(
					line.purchaseOrderLineId,
					(totals.get(line.purchaseOrderLineId) ?? 0) + qty,
				);
			}
		}
		return ok(
			[...totals.entries()].map(([purchaseOrderLineId, acceptedQuantity]) => ({
				purchaseOrderLineId,
				acceptedQuantity,
			})),
		);
	}

	async getReceiptById(
		organizationId: string,
		id: string,
	): Promise<Result<GoodsReceipt | null>> {
		const receipt = this.receipts.get(id);
		return ok(
			receipt === undefined || receipt.organizationId !== organizationId
				? null
				: cloneReceipt(receipt),
		);
	}

	async getReceiptByCreateIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<GoodsReceipt | null>> {
		for (const receipt of this.receipts.values()) {
			if (
				receipt.organizationId === organizationId &&
				receipt.createIdempotencyKey === idempotencyKey
			) {
				return ok(cloneReceipt(receipt));
			}
		}
		return ok(null);
	}

	async listReceipts(
		filter: ReceiptListFilter,
	): Promise<Result<GoodsReceipt[]>> {
		const start = (filter.page - 1) * filter.pageSize;
		const rows = [...this.receipts.values()]
			.filter((row) => row.organizationId === filter.organizationId)
			.filter(
				(row) => filter.status === undefined || row.status === filter.status,
			)
			.filter(
				(row) =>
					filter.sourceType === undefined ||
					row.sourceType === filter.sourceType,
			)
			.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
			.slice(start, start + filter.pageSize)
			.map(cloneReceipt);
		return ok(rows);
	}

	async listInventoryExceptions(
		filter: ReceiptListFilter,
	): Promise<Result<GoodsReceipt[]>> {
		const start = (filter.page - 1) * filter.pageSize;
		const rows = [...this.receipts.values()]
			.filter((row) => row.organizationId === filter.organizationId)
			.filter((row) => row.status === "posted")
			.filter(
				(row) =>
					row.inventoryApplicationStatus === "pending" ||
					row.inventoryApplicationStatus === "failed",
			)
			.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
			.slice(start, start + filter.pageSize)
			.map(cloneReceipt);
		return ok(rows);
	}
}

export function createMemoryReceivingStore(): MemoryReceivingStore {
	return new MemoryReceivingStore();
}
