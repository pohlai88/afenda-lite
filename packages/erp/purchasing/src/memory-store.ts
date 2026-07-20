import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";

import type { MutationPorts } from "./ports";
import type {
	OrderCancelRecord,
	OrderCreateRecord,
	OrderLineCreateRecord,
	OrderListFilter,
	OrderPostRecord,
	PurchasingStore,
} from "./store";
import type { PurchaseOrder, PurchaseOrderLine } from "./types";

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
				existing.normalizedCode === record.normalizedCode
			) {
				return fail("CONFLICT", "Purchase order code already exists");
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
			netDays: record.netDays,
			warehouseId: record.warehouseId,
			warehouseCode: record.warehouseCode,
			warehouseName: record.warehouseName,
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
		return ok(cloneOrder(order));
	}

	async addLine(
		record: OrderLineCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PurchaseOrderLine>> {
		const order = this.orders.get(record.orderId);
		if (order === undefined || order.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Purchase order not found");
		}
		if (order.status !== "draft") {
			return fail("CONFLICT", "Cannot add lines to a non-draft purchase order");
		}
		const now = new Date();
		const lineNo =
			order.lines.reduce((max, line) => Math.max(max, line.lineNo), 0) + 1;
		const line: PurchaseOrderLine = {
			id: randomUUID(),
			organizationId: record.organizationId,
			orderId: record.orderId,
			lineNo,
			itemId: record.itemId,
			itemCode: record.itemCode,
			itemName: record.itemName,
			baseUomId: record.baseUomId,
			baseUomCode: record.baseUomCode,
			quantity: record.quantity,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		order.lines.push(line);
		order.version += 1;
		order.updatedBy = record.createdBy;
		order.updatedAt = now;

		const audit = await ports.audit.record({
			organizationId: order.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "purchase_order_line",
			entityId: line.id,
			action: "CREATE",
			changes: [
				{ field: "item_code", oldValue: null, newValue: line.itemCode },
			],
			newValue: {
				orderId: line.orderId,
				lineNo: line.lineNo,
				itemCode: line.itemCode,
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
				code: order.code,
				version: line.version,
				actorId: record.createdBy,
				correlationId: meta.correlationId,
				orderId: order.id,
				lineNo: line.lineNo,
			},
		});
		if (!outbox.ok) {
			order.lines.pop();
			order.version -= 1;
			return outbox;
		}
		return ok({ ...line });
	}

	async postOrder(
		record: OrderPostRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PurchaseOrder>> {
		const order = this.orders.get(record.orderId);
		if (order === undefined || order.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Purchase order not found");
		}
		if (order.status !== "draft") {
			return fail("CONFLICT", "Purchase order is not in draft status");
		}
		if (order.version !== record.expectedVersion) {
			return fail("CONFLICT", "Purchase order version conflict");
		}
		if (order.lines.length === 0) {
			return fail("CONFLICT", "Cannot post purchase order without lines");
		}
		const now = new Date();
		const previous = cloneOrder(order);
		order.partyCode = record.partyCode;
		order.partyName = record.partyName;
		order.paymentTermId = record.paymentTermId;
		order.paymentTermCode = record.paymentTermCode;
		order.netDays = record.netDays;
		order.warehouseId = record.warehouseId;
		order.warehouseCode = record.warehouseCode;
		order.warehouseName = record.warehouseName;
		for (const snap of record.lineSnapshots) {
			const line = order.lines.find((row) => row.id === snap.lineId);
			if (line === undefined) {
				continue;
			}
			line.itemCode = snap.itemCode;
			line.itemName = snap.itemName;
			line.baseUomId = snap.baseUomId;
			line.baseUomCode = snap.baseUomCode;
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
		return ok(cloneOrder(order));
	}

	async cancelOrder(
		record: OrderCancelRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PurchaseOrder>> {
		const order = this.orders.get(record.orderId);
		if (order === undefined || order.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Purchase order not found");
		}
		if (order.status === "cancelled") {
			return fail("CONFLICT", "Purchase order is already cancelled");
		}
		if (order.status !== "draft" && order.status !== "posted") {
			return fail("CONFLICT", "Purchase order cannot be cancelled");
		}
		if (order.version !== record.expectedVersion) {
			return fail("CONFLICT", "Purchase order version conflict");
		}
		const now = new Date();
		const previous = cloneOrder(order);
		order.status = "cancelled";
		order.cancelledAt = now;
		order.cancelledBy = record.actorUserId;
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
		return ok(cloneOrder(order));
	}

	async getOrderById(
		organizationId: string,
		id: string,
	): Promise<Result<PurchaseOrder | null>> {
		const order = this.orders.get(id);
		if (order === undefined || order.organizationId !== organizationId) {
			return ok(null);
		}
		return ok(cloneOrder(order));
	}

	async listOrders(filter: OrderListFilter): Promise<Result<PurchaseOrder[]>> {
		const rows = [...this.orders.values()]
			.filter((order) => order.organizationId === filter.organizationId)
			.filter(
				(order) =>
					filter.status === undefined || order.status === filter.status,
			)
			.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
			.map(cloneOrder);
		return ok(paginate(rows, filter.page, filter.pageSize));
	}
}

export function createMemoryPurchasingStore(): MemoryPurchasingStore {
	return new MemoryPurchasingStore();
}
