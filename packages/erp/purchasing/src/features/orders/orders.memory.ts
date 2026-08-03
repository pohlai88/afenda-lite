import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";
import type {
	PurchaseOrder,
	PurchaseOrderLine,
} from "../../kernel/contracts/domain";
import type { MutationPorts } from "../../kernel/contracts/ports";
import { resolveAsync } from "../../kernel/execution/async";
import type {
	OrderCancelRecord,
	OrderCloseRecord,
	OrderCreateRecord,
	OrderLineCreateRecord,
	OrderListFilter,
	OrderPostRecord,
	PurchasingStore,
} from "./orders.store";

function cloneOrder(order: PurchaseOrder): PurchaseOrder {
	return {
		...order,
		lines: order.lines.map((line) => ({ ...line })),
	};
}

function paginate<T>(items: T[], page: number, pageSize: number): T[] {
	const start = (page - 1) * pageSize;
	return items.slice(start, start + pageSize);
}

/** In-memory purchasing store for Vitest domain tests. */
export class MemoryPurchasingStore implements PurchasingStore {
	private readonly orders = new Map<string, PurchaseOrder>();

	async createOrder(
		record: OrderCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PurchaseOrder>> {
		for (const existing of this.orders.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.createIdempotencyKey === record.createIdempotencyKey
			) {
				return errorResult.ok(cloneOrder(existing));
			}
			if (
				existing.organizationId === record.organizationId &&
				existing.normalizedCode === record.normalizedCode
			) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Purchase order code already exists",
				});
			}
		}
		const now = new Date();
		const order: PurchaseOrder = {
			id: randomUUID(),
			organizationId: record.organizationId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			status: "draft",
			partyId: record.partyId,
			partyCode: record.partyCode,
			partyName: record.partyName,
			paymentTermId: record.paymentTermId,
			paymentTermCode: record.paymentTermCode,
			paymentTermName: record.paymentTermName,
			netDays: record.netDays,
			warehouseId: record.warehouseId,
			warehouseCode: record.warehouseCode,
			warehouseName: record.warehouseName,
			currencyCode: record.currencyCode,
			exchangeRate: record.exchangeRate,
			subtotalAmount: null,
			discountTotal: null,
			taxTotal: null,
			documentTotal: null,
			createIdempotencyKey: record.createIdempotencyKey,
			postIdempotencyKey: null,
			cancelIdempotencyKey: null,
			closeIdempotencyKey: null,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			postedAt: null,
			postedBy: null,
			cancelledAt: null,
			cancelledBy: null,
			closedAt: null,
			closedBy: null,
			createdAt: now,
			updatedAt: now,
			lines: [],
		};
		this.orders.set(order.id, order);

		const audit = await ports.audit.record({
			organizationId: order.organizationId,
			actorUserId: order.createdBy,
			correlationId: meta.correlationId,
			entity: "purchase_order",
			entityId: order.id,
			action: "CREATE",
			changes: [{ field: "code", oldValue: null, newValue: order.code }],
			newValue: { code: order.code, status: order.status },
		});
		if (!audit.ok) {
			this.orders.delete(order.id);
			return audit;
		}
		const outbox = await ports.outbox.append({
			organizationId: order.organizationId,
			actorUserId: order.createdBy,
			correlationId: meta.correlationId,
			type: "purchasing.order.created.v1",
			payload: {
				organizationId: order.organizationId,
				entityType: "purchase_order",
				entityId: order.id,
				code: order.code,
				version: order.version,
				actorId: order.createdBy,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			this.orders.delete(order.id);
			return outbox;
		}
		return errorResult.ok(cloneOrder(order));
	}

	async addLine(
		record: OrderLineCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PurchaseOrderLine>> {
		const order = this.orders.get(record.orderId);
		if (order === undefined || order.organizationId !== record.organizationId) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Purchase order not found",
			});
		}
		const replay = order.lines.find(
			(existingLine) =>
				existingLine.lineIdempotencyKey === record.lineIdempotencyKey,
		);
		if (replay !== undefined) {
			return errorResult.ok({ ...replay });
		}
		if (order.status !== "draft") {
			return errorResult.fail("CONFLICT", {
				publicMessage:
					"Cannot add lines to a posted, cancelled, or closed order",
			});
		}
		const now = new Date();
		const line: PurchaseOrderLine = {
			id: randomUUID(),
			organizationId: record.organizationId,
			orderId: record.orderId,
			lineNo: order.lines.length + 1,
			itemId: record.itemId,
			itemCode: record.itemCode,
			itemName: record.itemName,
			baseUomId: record.baseUomId,
			baseUomCode: record.baseUomCode,
			quantity: record.quantity,
			unitPrice: record.unitPrice,
			discountAmount: record.discountAmount,
			taxClassification: record.taxClassification,
			lineAmount: record.lineAmount,
			overReceiptPercent: record.overReceiptPercent,
			underReceiptPercent: record.underReceiptPercent,
			invoiceQuantityTolerancePercent: record.invoiceQuantityTolerancePercent,
			invoicePriceTolerancePercent: record.invoicePriceTolerancePercent,
			lineIdempotencyKey: record.lineIdempotencyKey,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		order.lines.push(line);
		order.updatedAt = now;
		order.updatedBy = record.createdBy;
		order.version += 1;

		const audit = await ports.audit.record({
			organizationId: order.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "purchase_order_line",
			entityId: line.id,
			action: "CREATE",
			changes: [
				{ field: "itemId", oldValue: null, newValue: line.itemId },
				{ field: "quantity", oldValue: null, newValue: line.quantity },
			],
			newValue: {
				orderId: line.orderId,
				itemId: line.itemId,
				quantity: line.quantity,
			},
		});
		if (!audit.ok) {
			order.lines.pop();
			order.version -= 1;
			return audit;
		}
		const outbox = await ports.outbox.append({
			organizationId: order.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			type: "purchasing.order.line_added.v1",
			payload: {
				organizationId: order.organizationId,
				entityType: "purchase_order_line",
				entityId: line.id,
				orderId: order.id,
				lineNo: line.lineNo,
				code: order.code,
				version: line.version,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			order.lines.pop();
			order.version -= 1;
			return outbox;
		}
		return errorResult.ok({ ...line });
	}

	async postOrder(
		record: OrderPostRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PurchaseOrder>> {
		const order = this.orders.get(record.orderId);
		if (order === undefined || order.organizationId !== record.organizationId) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Purchase order not found",
			});
		}
		if (order.status === "posted") {
			if (order.postIdempotencyKey === record.postIdempotencyKey) {
				return errorResult.ok(cloneOrder(order));
			}
			return errorResult.fail("CONFLICT", {
				publicMessage: "Purchase order is already posted",
			});
		}
		if (order.status !== "draft") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Purchase order cannot be posted",
			});
		}
		if (order.version !== record.expectedVersion) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Purchase order version conflict",
			});
		}
		if (order.lines.length === 0) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Cannot post purchase order without lines",
			});
		}
		const now = new Date();
		const previous = cloneOrder(order);
		order.partyCode = record.partyCode;
		order.partyName = record.partyName;
		order.paymentTermId = record.paymentTermId;
		order.paymentTermCode = record.paymentTermCode;
		order.paymentTermName = record.paymentTermName;
		order.netDays = record.netDays;
		order.warehouseId = record.warehouseId;
		order.warehouseCode = record.warehouseCode;
		order.warehouseName = record.warehouseName;
		order.subtotalAmount = record.subtotalAmount;
		order.discountTotal = record.discountTotal;
		order.taxTotal = record.taxTotal;
		order.documentTotal = record.documentTotal;
		order.postIdempotencyKey = record.postIdempotencyKey;
		for (const snap of record.lineSnapshots) {
			const line = order.lines.find((row) => row.id === snap.lineId);
			if (line === undefined) {
				continue;
			}
			line.itemCode = snap.itemCode;
			line.itemName = snap.itemName;
			line.baseUomId = snap.baseUomId;
			line.baseUomCode = snap.baseUomCode;
			line.unitPrice = snap.unitPrice;
			line.discountAmount = snap.discountAmount;
			line.taxClassification = snap.taxClassification;
			line.lineAmount = snap.lineAmount;
			line.updatedAt = now;
			line.updatedBy = record.actorUserId;
			line.version += 1;
		}
		order.status = "posted";
		order.postedAt = now;
		order.postedBy = record.actorUserId;
		order.updatedBy = record.actorUserId;
		order.updatedAt = now;
		order.version += 1;

		const audit = await ports.audit.record({
			organizationId: order.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "purchase_order",
			entityId: order.id,
			action: "UPDATE",
			changes: [{ field: "status", oldValue: "draft", newValue: "posted" }],
			oldValue: { status: previous.status, version: previous.version },
			newValue: { status: order.status, version: order.version },
		});
		if (!audit.ok) {
			Object.assign(order, previous);
			return audit;
		}
		const outbox = await ports.outbox.append({
			organizationId: order.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			type: "purchasing.order.posted.v1",
			payload: {
				organizationId: order.organizationId,
				entityType: "purchase_order",
				entityId: order.id,
				code: order.code,
				version: order.version,
				actorId: record.actorUserId,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			Object.assign(order, previous);
			return outbox;
		}
		return errorResult.ok(cloneOrder(order));
	}

	async cancelOrder(
		record: OrderCancelRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PurchaseOrder>> {
		const order = this.orders.get(record.orderId);
		if (order === undefined || order.organizationId !== record.organizationId) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Purchase order not found",
			});
		}
		if (order.status === "cancelled") {
			if (order.cancelIdempotencyKey === record.cancelIdempotencyKey) {
				return errorResult.ok(cloneOrder(order));
			}
			return errorResult.fail("CONFLICT", {
				publicMessage: "Purchase order is already cancelled",
			});
		}
		if (order.status !== "draft") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Only draft purchase orders can be cancelled",
			});
		}
		if (order.version !== record.expectedVersion) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Purchase order version conflict",
			});
		}
		const now = new Date();
		const previous = cloneOrder(order);
		order.status = "cancelled";
		order.cancelledAt = now;
		order.cancelledBy = record.actorUserId;
		order.cancelIdempotencyKey = record.cancelIdempotencyKey;
		order.updatedBy = record.actorUserId;
		order.updatedAt = now;
		order.version += 1;

		const audit = await ports.audit.record({
			organizationId: order.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "purchase_order",
			entityId: order.id,
			action: "UPDATE",
			changes: [
				{
					field: "status",
					oldValue: previous.status,
					newValue: "cancelled",
				},
			],
			oldValue: { status: previous.status, version: previous.version },
			newValue: { status: order.status, version: order.version },
		});
		if (!audit.ok) {
			Object.assign(order, previous);
			return audit;
		}
		const outbox = await ports.outbox.append({
			organizationId: order.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			type: "purchasing.order.cancelled.v1",
			payload: {
				organizationId: order.organizationId,
				entityType: "purchase_order",
				entityId: order.id,
				code: order.code,
				version: order.version,
				actorId: record.actorUserId,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			Object.assign(order, previous);
			return outbox;
		}
		return errorResult.ok(cloneOrder(order));
	}

	async closeOrder(
		record: OrderCloseRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PurchaseOrder>> {
		const order = this.orders.get(record.orderId);
		if (order === undefined || order.organizationId !== record.organizationId) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Purchase order not found",
			});
		}
		if (order.status === "closed") {
			if (order.closeIdempotencyKey === record.closeIdempotencyKey) {
				return errorResult.ok(cloneOrder(order));
			}
			return errorResult.fail("CONFLICT", {
				publicMessage: "Purchase order is already closed",
			});
		}
		if (order.status !== "posted") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Only posted purchase orders can be closed",
			});
		}
		if (order.version !== record.expectedVersion) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Purchase order version conflict",
			});
		}
		const now = new Date();
		const previous = cloneOrder(order);
		order.status = "closed";
		order.closedAt = now;
		order.closedBy = record.actorUserId;
		order.closeIdempotencyKey = record.closeIdempotencyKey;
		order.updatedBy = record.actorUserId;
		order.updatedAt = now;
		order.version += 1;

		const audit = await ports.audit.record({
			organizationId: order.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "purchase_order",
			entityId: order.id,
			action: "UPDATE",
			changes: [
				{
					field: "status",
					oldValue: previous.status,
					newValue: "closed",
				},
			],
			oldValue: { status: previous.status, version: previous.version },
			newValue: { status: order.status, version: order.version },
		});
		if (!audit.ok) {
			Object.assign(order, previous);
			return audit;
		}
		const outbox = await ports.outbox.append({
			organizationId: order.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			type: "purchasing.order.closed.v1",
			payload: {
				organizationId: order.organizationId,
				entityType: "purchase_order",
				entityId: order.id,
				code: order.code,
				version: order.version,
				actorId: record.actorUserId,
				correlationId: meta.correlationId,
			},
		});
		if (!outbox.ok) {
			Object.assign(order, previous);
			return outbox;
		}
		return errorResult.ok(cloneOrder(order));
	}

	getOrderById(
		organizationId: string,
		id: string,
	): Promise<Result<PurchaseOrder | null>> {
		return resolveAsync(() => {
			const order = this.orders.get(id);
			if (order === undefined || order.organizationId !== organizationId) {
				return errorResult.ok(null);
			}
			return errorResult.ok(cloneOrder(order));
		});
	}

	getOrderByCreateIdempotencyKey(
		organizationId: string,
		createIdempotencyKey: string,
	): Promise<Result<PurchaseOrder | null>> {
		return resolveAsync(() => {
			for (const order of this.orders.values()) {
				if (
					order.organizationId === organizationId &&
					order.createIdempotencyKey === createIdempotencyKey
				) {
					return errorResult.ok(cloneOrder(order));
				}
			}
			return errorResult.ok(null);
		});
	}

	listOrders(filter: OrderListFilter): Promise<Result<PurchaseOrder[]>> {
		return resolveAsync(() => {
			const rows = [...this.orders.values()]
				.filter((order) => order.organizationId === filter.organizationId)
				.filter(
					(order) =>
						filter.status === undefined || order.status === filter.status,
				)
				.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
				.map(cloneOrder);
			return errorResult.ok(paginate(rows, filter.page, filter.pageSize));
		});
	}
}

export function createMemoryPurchasingStore(): MemoryPurchasingStore {
	return new MemoryPurchasingStore();
}
