import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";

import {
	SALES_ERROR_CODE_CONFLICT,
	SALES_ERROR_ORDER_ALREADY_CANCELLED,
	SALES_ERROR_ORDER_ALREADY_POSTED,
	SALES_ERROR_ORDER_EMPTY_LINES,
	SALES_ERROR_ORDER_NOT_DRAFT,
	SALES_ERROR_ORDER_NOT_FOUND,
	SALES_ERROR_ORDER_VERSION_CONFLICT,
	salesErrorDetails,
} from "./error-codes";
import type { MutationPorts } from "./ports";
import { compareSalesOrdersBySort } from "./shared/list-sort";
import type {
	OrderCancelRecord,
	OrderCreateRecord,
	OrderLineCreateRecord,
	OrderListFilter,
	OrderPostRecord,
	SalesStore,
} from "./store";
import type { SalesOrder, SalesOrderLine } from "./types";

function cloneOrder(order: SalesOrder): SalesOrder {
	return {
		...order,
		lines: order.lines.map((line) => ({ ...line })),
	};
}

function paginate<T>(items: T[], page: number, pageSize: number): T[] {
	const start = (page - 1) * pageSize;
	return items.slice(start, start + pageSize);
}

/** In-memory sales store for Vitest domain tests. */
export class MemorySalesStore implements SalesStore {
	private readonly orders = new Map<string, SalesOrder>();

	async createOrder(
		record: OrderCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SalesOrder>> {
		for (const existing of this.orders.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.createIdempotencyKey === record.createIdempotencyKey
			) {
				return ok(cloneOrder(existing));
			}
			if (
				existing.organizationId === record.organizationId &&
				existing.normalizedCode === record.normalizedCode
			) {
				return fail(
					"CONFLICT",
					"Sales order code already exists",
					salesErrorDetails(SALES_ERROR_CODE_CONFLICT),
				);
			}
		}
		const now = new Date();
		const order: SalesOrder = {
			id: randomUUID(),
			organizationId: record.organizationId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			status: "draft",
			partyId: record.partyId,
			partyCode: record.partyCode,
			partyName: record.partyName,
			billToAddressSnapshot: record.billToAddressSnapshot,
			shipToAddressSnapshot: record.shipToAddressSnapshot,
			paymentTermId: record.paymentTermId,
			paymentTermCode: record.paymentTermCode,
			paymentTermName: record.paymentTermName,
			netDays: record.netDays,
			currencyCode: record.currencyCode,
			exchangeRate: record.exchangeRate,
			subtotalAmount: null,
			discountTotal: null,
			taxTotal: null,
			documentTotal: null,
			createIdempotencyKey: record.createIdempotencyKey,
			postIdempotencyKey: null,
			cancelIdempotencyKey: null,
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
			entity: "sales_order",
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
			type: "sales.order.created.v1",
			payload: {
				organizationId: order.organizationId,
				entityType: "sales_order",
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
	): Promise<Result<SalesOrderLine>> {
		const order = this.orders.get(record.orderId);
		if (order === undefined || order.organizationId !== record.organizationId) {
			return fail(
				"NOT_FOUND",
				"Sales order not found",
				salesErrorDetails(SALES_ERROR_ORDER_NOT_FOUND),
			);
		}
		const replay = order.lines.find(
			(line) => line.lineIdempotencyKey === record.lineIdempotencyKey,
		);
		if (replay !== undefined) {
			return ok({ ...replay });
		}
		if (order.status !== "draft") {
			return fail(
				"CONFLICT",
				"Cannot add lines to a posted or cancelled order",
				salesErrorDetails(SALES_ERROR_ORDER_NOT_DRAFT),
			);
		}
		if (order.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Sales order version conflict",
				salesErrorDetails(SALES_ERROR_ORDER_VERSION_CONFLICT),
			);
		}
		const now = new Date();
		const line: SalesOrderLine = {
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
			entity: "sales_order_line",
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
			type: "sales.order.line_added.v1",
			payload: {
				organizationId: order.organizationId,
				entityType: "sales_order_line",
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
		return ok({ ...line });
	}

	async postOrder(
		record: OrderPostRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SalesOrder>> {
		const order = this.orders.get(record.orderId);
		if (order === undefined || order.organizationId !== record.organizationId) {
			return fail(
				"NOT_FOUND",
				"Sales order not found",
				salesErrorDetails(SALES_ERROR_ORDER_NOT_FOUND),
			);
		}
		if (order.status === "posted") {
			if (order.postIdempotencyKey === record.postIdempotencyKey) {
				return ok(cloneOrder(order));
			}
			return fail(
				"CONFLICT",
				"Sales order is already posted",
				salesErrorDetails(SALES_ERROR_ORDER_ALREADY_POSTED),
			);
		}
		if (order.status !== "draft") {
			return fail(
				"CONFLICT",
				"Sales order cannot be posted",
				salesErrorDetails(SALES_ERROR_ORDER_NOT_DRAFT),
			);
		}
		if (order.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Sales order version conflict",
				salesErrorDetails(SALES_ERROR_ORDER_VERSION_CONFLICT),
			);
		}
		if (order.lines.length === 0) {
			return fail(
				"CONFLICT",
				"Cannot post order without lines",
				salesErrorDetails(SALES_ERROR_ORDER_EMPTY_LINES),
			);
		}
		const now = new Date();
		const previous = cloneOrder(order);
		order.partyCode = record.partyCode;
		order.partyName = record.partyName;
		order.paymentTermId = record.paymentTermId;
		order.paymentTermCode = record.paymentTermCode;
		order.paymentTermName = record.paymentTermName;
		order.netDays = record.netDays;
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
			entity: "sales_order",
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
			type: "sales.order.posted.v1",
			payload: {
				organizationId: order.organizationId,
				entityType: "sales_order",
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
	): Promise<Result<SalesOrder>> {
		const order = this.orders.get(record.orderId);
		if (order === undefined || order.organizationId !== record.organizationId) {
			return fail(
				"NOT_FOUND",
				"Sales order not found",
				salesErrorDetails(SALES_ERROR_ORDER_NOT_FOUND),
			);
		}
		if (order.status === "cancelled") {
			if (order.cancelIdempotencyKey === record.cancelIdempotencyKey) {
				return ok(cloneOrder(order));
			}
			return fail(
				"CONFLICT",
				"Sales order is already cancelled",
				salesErrorDetails(SALES_ERROR_ORDER_ALREADY_CANCELLED),
			);
		}
		if (order.status !== "draft" && order.status !== "posted") {
			return fail("CONFLICT", "Sales order cannot be cancelled");
		}
		if (order.version !== record.expectedVersion) {
			return fail(
				"CONFLICT",
				"Sales order version conflict",
				salesErrorDetails(SALES_ERROR_ORDER_VERSION_CONFLICT),
			);
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
			entity: "sales_order",
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
			type: "sales.order.cancelled.v1",
			payload: {
				organizationId: order.organizationId,
				entityType: "sales_order",
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
	): Promise<Result<SalesOrder | null>> {
		const order = this.orders.get(id);
		if (order === undefined || order.organizationId !== organizationId) {
			return ok(null);
		}
		return ok(cloneOrder(order));
	}

	async getOrderByCreateIdempotencyKey(
		organizationId: string,
		createIdempotencyKey: string,
	): Promise<Result<SalesOrder | null>> {
		for (const order of this.orders.values()) {
			if (
				order.organizationId === organizationId &&
				order.createIdempotencyKey === createIdempotencyKey
			) {
				return ok(cloneOrder(order));
			}
		}
		return ok(null);
	}

	async listOrders(filter: OrderListFilter): Promise<Result<SalesOrder[]>> {
		const rows = [...this.orders.values()]
			.filter((order) => order.organizationId === filter.organizationId)
			.filter(
				(order) =>
					filter.status === undefined || order.status === filter.status,
			)
			.sort((a, b) => compareSalesOrdersBySort(a, b, filter.sort))
			.map(cloneOrder);
		return ok(paginate(rows, filter.page, filter.pageSize));
	}
}

export function createMemorySalesStore(): MemorySalesStore {
	return new MemorySalesStore();
}
