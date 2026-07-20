import { randomUUID } from "node:crypto";
import { fail, ok, type Result } from "@afenda/errors/result";

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

export class MemoryReceivingStore implements ReceivingStore {
	private readonly receipts = new Map<string, GoodsReceipt>();

	async createReceipt(
		record: ReceiptCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<GoodsReceipt>> {
		for (const receipt of this.receipts.values()) {
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
			quantityReceived: record.quantityReceived,
			purchaseOrderLineId: record.purchaseOrderLineId,
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
				quantity: line.quantityReceived,
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
		const receipt = this.receipts.get(record.receiptId);
		if (
			receipt === undefined ||
			receipt.organizationId !== record.organizationId
		)
			return fail("NOT_FOUND", "Goods receipt not found");
		if (receipt.status !== "draft") {
			return fail("CONFLICT", "Goods receipt is not in draft status");
		}
		if (receipt.version !== record.expectedVersion) {
			return fail("CONFLICT", "Goods receipt version conflict");
		}
		if (receipt.lines.length === 0) {
			return fail("CONFLICT", "Cannot post goods receipt without lines");
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
		if (receipt.status !== "draft" && receipt.status !== "posted") {
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
			},
		});
		if (!outbox.ok) {
			this.receipts.set(receipt.id, previous);
			return outbox;
		}
		return ok({ ...discrepancy });
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
}

export function createMemoryReceivingStore(): MemoryReceivingStore {
	return new MemoryReceivingStore();
}
