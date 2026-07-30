import { randomUUID } from "node:crypto";
import { fail, ok, type Result } from "@afenda/errors/result";
import {
	priceBookEntryIdSchema,
	priceBookIdSchema,
	returnAuthorizationIdSchema,
	returnAuthorizationLineIdSchema,
	salesHoldIdSchema,
	salesOrderIdSchema,
	salesOrderLineIdSchema,
	salesOrderScheduleIdSchema,
	salesQuotationIdSchema,
	salesQuotationLineIdSchema,
} from "../brands";
import { addDecimals } from "../contracts/money";
import type { MutationEvidence, SalesStore } from "../ports";
import type {
	AuditStamp,
	PriceBook,
	PriceBookEntry,
	ReturnAuthorization,
	ReturnAuthorizationLine,
	SalesHold,
	SalesOrder,
	SalesOrderLine,
	SalesOrderSchedule,
	SalesQuotation,
	SalesQuotationLine,
} from "../types";

type EvidenceSeed = Omit<MutationEvidence, "entityId" | "version">;
const QUOTE_TRANSITIONS: Record<
	SalesQuotation["status"],
	readonly SalesQuotation["status"][]
> = {
	draft: ["submitted", "cancelled"],
	submitted: ["approved", "rejected", "cancelled"],
	approved: ["sent", "cancelled"],
	sent: ["accepted", "expired", "rejected", "cancelled"],
	accepted: ["converted", "expired", "cancelled"],
	expired: [],
	rejected: [],
	cancelled: [],
	converted: [],
};
const ORDER_TRANSITIONS: Record<
	SalesOrder["status"],
	readonly SalesOrder["status"][]
> = {
	draft: ["submitted", "cancelled"],
	submitted: ["approved", "cancelled"],
	approved: ["confirmed", "released", "cancelled"],
	confirmed: ["released", "cancelled"],
	released: ["partially_fulfilled", "fulfilled", "cancelled"],
	partially_fulfilled: ["fulfilled", "cancelled"],
	fulfilled: ["closed"],
	cancelled: ["closed"],
	closed: [],
};
const RETURN_TRANSITIONS: Record<
	ReturnAuthorization["status"],
	readonly ReturnAuthorization["status"][]
> = {
	draft: ["submitted", "cancelled"],
	submitted: ["approved", "rejected", "cancelled"],
	approved: ["closed", "cancelled"],
	rejected: [],
	cancelled: [],
	closed: [],
};

function initialStamp(actor: string, now = new Date()): AuditStamp {
	return {
		version: 1,
		createdAt: now,
		createdBy: actor,
		updatedAt: now,
		updatedBy: actor,
	};
}
function updatedStamp(
	current: AuditStamp,
	actor: string,
	now = new Date(),
): Pick<AuditStamp, "version" | "updatedAt" | "updatedBy"> {
	return {
		version: current.version + 1,
		updatedAt: now,
		updatedBy: actor,
	};
}
function conflict(current: AuditStamp, expected: number): Result<never> {
	return fail("CONFLICT", "The record was changed by another operation", {
		reason: "SALES_VERSION_CONFLICT",
		expectedVersion: expected,
		actualVersion: current.version,
	});
}

function resolveAsync<T>(operation: () => T | PromiseLike<T>): Promise<T> {
	return Promise.resolve().then(operation);
}

export class MemorySalesStore implements SalesStore {
	readonly evidence: MutationEvidence[] = [];
	private readonly idempotency = new Map<string, unknown>();
	private readonly books = new Map<string, PriceBook>();
	private readonly entries = new Map<string, PriceBookEntry>();
	private readonly quotations = new Map<string, SalesQuotation>();
	private readonly quotationLines = new Map<string, SalesQuotationLine>();
	private readonly orders = new Map<string, SalesOrder>();
	private readonly orderLines = new Map<string, SalesOrderLine>();
	private readonly schedules = new Map<string, SalesOrderSchedule>();
	private readonly holds = new Map<string, SalesHold>();
	private readonly returns = new Map<string, ReturnAuthorization>();
	private readonly returnLines = new Map<string, ReturnAuthorizationLine>();

	private key(org: string, id: string) {
		return `${org}:${id}`;
	}
	private idem(org: string, key: string) {
		return `${org}:${key}`;
	}
	private existing<T>(org: string, key: string): T | undefined {
		return this.idempotency.get(this.idem(org, key)) as T | undefined;
	}
	private remember<T>(
		org: string,
		key: string,
		value: T,
		seed: EvidenceSeed,
		entityId: string,
		version: number,
	): Result<T> {
		this.idempotency.set(this.idem(org, key), value);
		this.evidence.push({ ...seed, entityId, version });
		return ok(value);
	}

	createPriceBook(
		input: Parameters<SalesStore["createPriceBook"]>[0],
		evidence: EvidenceSeed,
	) {
		return resolveAsync(() => {
			const replay = this.existing<PriceBook>(
				input.organizationId,
				input.idempotencyKey,
			);
			if (replay) {
				return ok(replay);
			}
			if (
				[...this.books.values()].some(
					(v) =>
						v.organizationId === input.organizationId &&
						v.normalizedCode === input.normalizedCode,
				)
			) {
				return fail("CONFLICT", "Price-book code already exists", {
					reason: "SALES_DUPLICATE_CODE",
				});
			}
			const value: PriceBook = {
				...input,
				id: priceBookIdSchema.parse(randomUUID()),
				...initialStamp(input.actorUserId),
			};
			this.books.set(this.key(input.organizationId, value.id), value);
			return this.remember(
				input.organizationId,
				input.idempotencyKey,
				value,
				evidence,
				value.id,
				value.version,
			);
		});
	}
	addPriceBookEntry(
		input: Parameters<SalesStore["addPriceBookEntry"]>[0],
		evidence: EvidenceSeed,
	) {
		return resolveAsync(() => {
			const replay = this.existing<PriceBookEntry>(
				input.organizationId,
				input.idempotencyKey,
			);
			if (replay) {
				return ok(replay);
			}
			const book = this.books.get(
				this.key(input.organizationId, input.priceBookId),
			);
			if (!book || book.status === "archived") {
				return fail("NOT_FOUND", "Price book not found", {
					reason: "SALES_NOT_FOUND",
				});
			}
			const value: PriceBookEntry = {
				...input,
				id: priceBookEntryIdSchema.parse(randomUUID()),
				...initialStamp(input.actorUserId),
			};
			this.entries.set(this.key(input.organizationId, value.id), value);
			return this.remember(
				input.organizationId,
				input.idempotencyKey,
				value,
				evidence,
				value.id,
				value.version,
			);
		});
	}
	getPriceBook(input: Parameters<SalesStore["getPriceBook"]>[0]) {
		return resolveAsync(() =>
			ok(this.books.get(this.key(input.organizationId, input.id)) ?? null),
		);
	}
	listPriceBooks(input: Parameters<SalesStore["listPriceBooks"]>[0]) {
		return resolveAsync(() => {
			const rows = [...this.books.values()]
				.filter(
					(value) =>
						value.organizationId === input.organizationId &&
						(!input.cursor || value.id > input.cursor),
				)
				.sort((a, b) => a.id.localeCompare(b.id));
			const items = rows.slice(0, input.pageSize);
			return ok({
				items,
				nextCursor: rows.length > input.pageSize ? items.at(-1)?.id : undefined,
			});
		});
	}
	updatePriceBookStatus(
		input: Parameters<SalesStore["updatePriceBookStatus"]>[0],
		evidence: EvidenceSeed,
	) {
		return resolveAsync(() => {
			const current = this.books.get(this.key(input.organizationId, input.id));
			if (!current) {
				return fail("NOT_FOUND", "Price book not found");
			}
			if (current.version !== input.expectedVersion) {
				return conflict(current, input.expectedVersion);
			}
			const value = {
				...current,
				status: input.status,
				...updatedStamp(current, input.actorUserId),
			};
			this.books.set(this.key(input.organizationId, input.id), value);
			this.evidence.push({
				...evidence,
				entityId: value.id,
				version: value.version,
			});
			return ok(value);
		});
	}
	findPriceEntries(input: Parameters<SalesStore["findPriceEntries"]>[0]) {
		return resolveAsync(() => {
			const values = [...this.entries.values()].flatMap((entry) => {
				const book = this.books.get(
					this.key(input.organizationId, entry.priceBookId),
				);
				if (
					book?.status !== "active" ||
					book.currencyCode !== input.currencyCode ||
					entry.organizationId !== input.organizationId ||
					entry.itemId !== input.itemId ||
					entry.uomId !== input.uomId ||
					entry.validFrom > input.at ||
					(entry.validTo && entry.validTo < input.at) ||
					book.validFrom > input.at ||
					(book.validTo && book.validTo < input.at)
				) {
					return [];
				}
				return [{ book, entry }];
			});
			return ok(values);
		});
	}

	createQuotation(
		input: Parameters<SalesStore["createQuotation"]>[0],
		evidence: EvidenceSeed,
	) {
		return resolveAsync(() => {
			const replay = this.existing<SalesQuotation>(
				input.organizationId,
				input.idempotencyKey,
			);
			if (replay) {
				return ok(replay);
			}
			if (
				[...this.quotations.values()].some(
					(v) =>
						v.organizationId === input.organizationId &&
						v.normalizedCode === input.normalizedCode &&
						v.revision === input.revision,
				)
			) {
				return fail("CONFLICT", "Quotation code and revision already exist", {
					reason: "SALES_DUPLICATE_CODE",
				});
			}
			const value: SalesQuotation = {
				...input,
				id: salesQuotationIdSchema.parse(randomUUID()),
				...initialStamp(input.actorUserId),
			};
			this.quotations.set(this.key(input.organizationId, value.id), value);
			return this.remember(
				input.organizationId,
				input.idempotencyKey,
				value,
				evidence,
				value.id,
				value.version,
			);
		});
	}
	async addQuotationLine(
		input: Parameters<SalesStore["addQuotationLine"]>[0],
		evidence: EvidenceSeed,
	) {
		const replay = this.existing<SalesQuotationLine>(
			input.organizationId,
			input.idempotencyKey,
		);
		if (replay) {
			return ok(replay);
		}
		const quotation = this.quotations.get(
			this.key(input.organizationId, input.quotationId),
		);
		if (!quotation) {
			return fail("NOT_FOUND", "Sales quotation not found");
		}
		if (quotation.version !== input.expectedVersion) {
			return conflict(quotation, input.expectedVersion);
		}
		if (quotation.status !== "draft") {
			return fail("CONFLICT", "Only draft quotations can be changed", {
				reason: "SALES_INVALID_STATE",
			});
		}
		const lineNo =
			[...this.quotationLines.values()].filter(
				(v) =>
					v.organizationId === input.organizationId &&
					v.quotationId === input.quotationId,
			).length + 1;
		const value: SalesQuotationLine = {
			...input,
			lineNo,
			id: salesQuotationLineIdSchema.parse(randomUUID()),
			...initialStamp(input.actorUserId),
		};
		this.quotationLines.set(this.key(input.organizationId, value.id), value);
		const totals = await this.quotationTotals(
			input.organizationId,
			input.quotationId,
		);
		const next = {
			...quotation,
			...totals,
			...updatedStamp(quotation, input.actorUserId),
		};
		this.quotations.set(this.key(input.organizationId, quotation.id), next);
		return this.remember(
			input.organizationId,
			input.idempotencyKey,
			value,
			evidence,
			value.id,
			value.version,
		);
	}
	transitionQuotation(
		input: Parameters<SalesStore["transitionQuotation"]>[0],
		evidence: EvidenceSeed,
	) {
		return resolveAsync(() => {
			const current = this.quotations.get(
				this.key(input.organizationId, input.id),
			);
			if (!current) {
				return fail("NOT_FOUND", "Sales quotation not found");
			}
			if (current.version !== input.expectedVersion) {
				return conflict(current, input.expectedVersion);
			}
			if (!QUOTE_TRANSITIONS[current.status].includes(input.status)) {
				return fail("CONFLICT", "Invalid quotation lifecycle transition", {
					reason: "SALES_INVALID_STATE",
					from: current.status,
					to: input.status,
				});
			}
			const value = {
				...current,
				status: input.status,
				convertedOrderId: input.convertedOrderId ?? current.convertedOrderId,
				...updatedStamp(current, input.actorUserId),
			};
			this.quotations.set(this.key(input.organizationId, input.id), value);
			this.evidence.push({
				...evidence,
				entityId: value.id,
				version: value.version,
			});
			return ok(value);
		});
	}
	getQuotation(input: Parameters<SalesStore["getQuotation"]>[0]) {
		return resolveAsync(() =>
			ok(this.quotations.get(this.key(input.organizationId, input.id)) ?? null),
		);
	}
	listQuotationLines(input: Parameters<SalesStore["listQuotationLines"]>[0]) {
		return resolveAsync(() =>
			ok(
				[...this.quotationLines.values()]
					.filter(
						(v) =>
							v.organizationId === input.organizationId &&
							v.quotationId === input.quotationId,
					)
					.sort((a, b) => a.lineNo - b.lineNo),
			),
		);
	}

	listQuotations(input: Parameters<SalesStore["listQuotations"]>[0]) {
		return resolveAsync(() => {
			const rows = [...this.quotations.values()]
				.filter(
					(value) =>
						value.organizationId === input.organizationId &&
						(!input.cursor || value.id > input.cursor),
				)
				.sort((a, b) => a.id.localeCompare(b.id));
			const items = rows.slice(0, input.pageSize);
			return ok({
				items,
				nextCursor: rows.length > input.pageSize ? items.at(-1)?.id : undefined,
			});
		});
	}
	createOrder(
		input: Parameters<SalesStore["createOrder"]>[0],
		evidence: EvidenceSeed,
	) {
		return resolveAsync(() => {
			const replay = this.existing<SalesOrder>(
				input.organizationId,
				input.idempotencyKey,
			);
			if (replay) {
				return ok(replay);
			}
			if (
				[...this.orders.values()].some(
					(v) =>
						v.organizationId === input.organizationId &&
						v.normalizedCode === input.normalizedCode,
				)
			) {
				return fail("CONFLICT", "Sales-order code already exists", {
					reason: "SALES_DUPLICATE_CODE",
				});
			}
			const value: SalesOrder = {
				...input,
				id: salesOrderIdSchema.parse(randomUUID()),
				...initialStamp(input.actorUserId),
			};
			this.orders.set(this.key(input.organizationId, value.id), value);
			return this.remember(
				input.organizationId,
				input.idempotencyKey,
				value,
				evidence,
				value.id,
				value.version,
			);
		});
	}
	async addOrderLine(
		input: Parameters<SalesStore["addOrderLine"]>[0],
		schedule: { requestedDate: Date },
		evidence: EvidenceSeed,
	) {
		const replay = this.existing<SalesOrderLine>(
			input.organizationId,
			input.idempotencyKey,
		);
		if (replay) {
			return ok(replay);
		}
		const order = this.orders.get(
			this.key(input.organizationId, input.orderId),
		);
		if (!order) {
			return fail("NOT_FOUND", "Sales order not found");
		}
		if (order.version !== input.expectedVersion) {
			return conflict(order, input.expectedVersion);
		}
		if (order.status !== "draft") {
			return fail("CONFLICT", "Only draft orders can be changed", {
				reason: "SALES_INVALID_STATE",
			});
		}
		const lineNo =
			[...this.orderLines.values()].filter(
				(v) =>
					v.organizationId === input.organizationId &&
					v.orderId === input.orderId,
			).length + 1;
		const value: SalesOrderLine = {
			...input,
			lineNo,
			id: salesOrderLineIdSchema.parse(randomUUID()),
			...initialStamp(input.actorUserId),
		};
		this.orderLines.set(this.key(input.organizationId, value.id), value);
		const scheduleValue: SalesOrderSchedule = {
			id: salesOrderScheduleIdSchema.parse(randomUUID()),
			organizationId: input.organizationId,
			orderId: input.orderId,
			orderLineId: value.id,
			requestedDate: schedule.requestedDate,
			quantity: input.quantity,
			releasedQuantity: "0",
			fulfilledQuantity: "0",
			...initialStamp(input.actorUserId),
		};
		this.schedules.set(
			this.key(input.organizationId, scheduleValue.id),
			scheduleValue,
		);
		const totals = await this.orderTotals(
			input.organizationId,
			input.orderId,
			order.taxTotal,
		);
		this.orders.set(this.key(input.organizationId, order.id), {
			...order,
			...totals,
			...updatedStamp(order, input.actorUserId),
		});
		return this.remember(
			input.organizationId,
			input.idempotencyKey,
			value,
			evidence,
			value.id,
			value.version,
		);
	}
	transitionOrder(
		input: Parameters<SalesStore["transitionOrder"]>[0],
		evidence: EvidenceSeed,
	) {
		return resolveAsync(() => {
			const current = this.orders.get(this.key(input.organizationId, input.id));
			if (!current) {
				return fail("NOT_FOUND", "Sales order not found");
			}
			if (current.version !== input.expectedVersion) {
				return conflict(current, input.expectedVersion);
			}
			if (!ORDER_TRANSITIONS[current.status].includes(input.status)) {
				return fail("CONFLICT", "Invalid sales-order lifecycle transition", {
					reason: "SALES_INVALID_STATE",
					from: current.status,
					to: input.status,
				});
			}
			const value: SalesOrder = {
				...current,
				status: input.status,
				confirmedAt:
					input.status === "confirmed" ? input.at : current.confirmedAt,
				releasedAt: input.status === "released" ? input.at : current.releasedAt,
				cancelledAt:
					input.status === "cancelled" ? input.at : current.cancelledAt,
				closedAt: input.status === "closed" ? input.at : current.closedAt,
				...updatedStamp(current, input.actorUserId, input.at),
			};
			this.orders.set(this.key(input.organizationId, input.id), value);
			this.evidence.push({
				...evidence,
				entityId: value.id,
				version: value.version,
			});
			return ok(value);
		});
	}
	async releaseOrder(
		input: Parameters<SalesStore["releaseOrder"]>[0],
		evidence: EvidenceSeed,
	) {
		const current = this.orders.get(this.key(input.organizationId, input.id));
		if (!current) {
			return fail("NOT_FOUND", "Sales order not found");
		}
		if (current.version !== input.expectedVersion) {
			return conflict(current, input.expectedVersion);
		}
		if (!ORDER_TRANSITIONS[current.status].includes("released")) {
			return fail(
				"CONFLICT",
				"Sales order cannot be released from its current state",
				{ reason: "SALES_INVALID_STATE", status: current.status },
			);
		}
		const totals = await this.orderTotals(
			input.organizationId,
			input.id,
			input.taxTotal,
		);
		const value: SalesOrder = {
			...current,
			...totals,
			status: "released",
			confirmedAt: current.confirmedAt ?? input.at,
			releasedAt: input.at,
			...updatedStamp(current, input.actorUserId, input.at),
		};
		this.orders.set(this.key(input.organizationId, input.id), value);
		for (const schedule of this.schedules.values()) {
			if (
				schedule.organizationId === input.organizationId &&
				schedule.orderId === input.id
			) {
				this.schedules.set(this.key(input.organizationId, schedule.id), {
					...schedule,
					releasedQuantity: schedule.quantity,
					...updatedStamp(schedule, input.actorUserId, input.at),
				});
			}
		}
		this.evidence.push({
			...evidence,
			entityId: value.id,
			version: value.version,
		});
		return ok(value);
	}
	getOrder(input: Parameters<SalesStore["getOrder"]>[0]) {
		return resolveAsync(() =>
			ok(this.orders.get(this.key(input.organizationId, input.id)) ?? null),
		);
	}
	listOrders(input: Parameters<SalesStore["listOrders"]>[0]) {
		return resolveAsync(() => {
			const sorted = [...this.orders.values()]
				.filter(
					(v) =>
						v.organizationId === input.organizationId &&
						(!input.status || v.status === input.status),
				)
				.sort((a, b) => a.id.localeCompare(b.id));
			const start = input.cursor
				? Math.max(0, sorted.findIndex((v) => v.id === input.cursor) + 1)
				: 0;
			const items = sorted.slice(start, start + input.pageSize);
			const nextCursor =
				start + input.pageSize < sorted.length ? items.at(-1)?.id : undefined;
			return ok(nextCursor ? { items, nextCursor } : { items });
		});
	}
	listOrderLines(input: Parameters<SalesStore["listOrderLines"]>[0]) {
		return resolveAsync(() =>
			ok(
				[...this.orderLines.values()]
					.filter(
						(v) =>
							v.organizationId === input.organizationId &&
							v.orderId === input.orderId,
					)
					.sort((a, b) => a.lineNo - b.lineNo),
			),
		);
	}
	listOrderSchedules(input: Parameters<SalesStore["listOrderSchedules"]>[0]) {
		return resolveAsync(() =>
			ok(
				[...this.schedules.values()].filter(
					(v) =>
						v.organizationId === input.organizationId &&
						v.orderId === input.orderId,
				),
			),
		);
	}
	placeHold(
		input: Parameters<SalesStore["placeHold"]>[0],
		evidence: EvidenceSeed,
	) {
		return resolveAsync(() => {
			const replay = this.existing<SalesHold>(
				input.organizationId,
				input.idempotencyKey,
			);
			if (replay) {
				return ok(replay);
			}
			const order = this.orders.get(
				this.key(input.organizationId, input.orderId),
			);
			if (!order) {
				return fail("NOT_FOUND", "Sales order not found");
			}
			const value: SalesHold = {
				id: salesHoldIdSchema.parse(randomUUID()),
				organizationId: input.organizationId,
				orderId: input.orderId,
				kind: input.kind,
				reason: input.reason,
				status: "open",
				...initialStamp(input.actorUserId),
			};
			this.holds.set(this.key(input.organizationId, value.id), value);
			return this.remember(
				input.organizationId,
				input.idempotencyKey,
				value,
				evidence,
				value.id,
				value.version,
			);
		});
	}
	resolveHold(
		input: Parameters<SalesStore["resolveHold"]>[0],
		evidence: EvidenceSeed,
	) {
		return resolveAsync(() => {
			const current = this.holds.get(this.key(input.organizationId, input.id));
			if (!current) {
				return fail("NOT_FOUND", "Sales-order hold not found");
			}
			if (current.status === "resolved") {
				return ok(current);
			}
			const now = new Date();
			const value: SalesHold = {
				...current,
				status: "resolved",
				resolvedAt: now,
				resolvedBy: input.actorUserId,
				...updatedStamp(current, input.actorUserId, now),
			};
			this.holds.set(this.key(input.organizationId, input.id), value);
			this.evidence.push({
				...evidence,
				entityId: value.id,
				version: value.version,
			});
			return ok(value);
		});
	}
	listOpenHolds(input: Parameters<SalesStore["listOpenHolds"]>[0]) {
		return resolveAsync(() =>
			ok(
				[...this.holds.values()].filter(
					(v) =>
						v.organizationId === input.organizationId &&
						v.orderId === input.orderId &&
						v.status === "open",
				),
			),
		);
	}
	async recordFulfillment(
		input: Parameters<SalesStore["recordFulfillment"]>[0],
		evidence: EvidenceSeed,
	) {
		const order = this.orders.get(
			this.key(input.organizationId, input.orderId),
		);
		const line = this.orderLines.get(
			this.key(input.organizationId, input.lineId),
		);
		if (!(order && line) || line.orderId !== input.orderId) {
			return fail("NOT_FOUND", "Sales order line not found");
		}
		if (order.version !== input.expectedVersion) {
			return conflict(order, input.expectedVersion);
		}
		if (
			!(order.status === "released" || order.status === "partially_fulfilled")
		) {
			return fail("CONFLICT", "Sales order is not open for fulfillment", {
				reason: "SALES_INVALID_STATE",
			});
		}
		const fulfilled = await addDecimals([
			line.fulfilledQuantity,
			input.fulfilledQuantity,
		]);
		if (!fulfilled.ok) {
			return fulfilled;
		}
		if (Number(fulfilled.data) > Number(line.quantity)) {
			return fail("CONFLICT", "Fulfilled quantity exceeds ordered quantity", {
				reason: "SALES_INVALID_STATE",
			});
		}
		this.orderLines.set(this.key(input.organizationId, line.id), {
			...line,
			fulfilledQuantity: fulfilled.data,
			...updatedStamp(line, input.actorUserId),
		});
		const all = [...this.orderLines.values()]
			.filter(
				(v) =>
					v.organizationId === input.organizationId &&
					v.orderId === input.orderId,
			)
			.map((v) =>
				v.id === line.id ? { ...v, fulfilledQuantity: fulfilled.data } : v,
			);
		const status = all.every(
			(v) => Number(v.fulfilledQuantity) >= Number(v.quantity),
		)
			? "fulfilled"
			: "partially_fulfilled";
		const value: SalesOrder = {
			...order,
			status,
			...updatedStamp(order, input.actorUserId),
		};
		this.orders.set(this.key(input.organizationId, order.id), value);
		this.evidence.push({
			...evidence,
			entityId: value.id,
			version: value.version,
		});
		return ok(value);
	}

	createReturnAuthorization(
		input: Parameters<SalesStore["createReturnAuthorization"]>[0],
		evidence: EvidenceSeed,
	) {
		return resolveAsync(() => {
			const replay = this.existing<ReturnAuthorization>(
				input.organizationId,
				input.idempotencyKey,
			);
			if (replay) {
				return ok(replay);
			}
			if (!this.orders.has(this.key(input.organizationId, input.orderId))) {
				return fail("NOT_FOUND", "Sales order not found");
			}
			const value: ReturnAuthorization = {
				...input,
				id: returnAuthorizationIdSchema.parse(randomUUID()),
				...initialStamp(input.actorUserId),
			};
			this.returns.set(this.key(input.organizationId, value.id), value);
			return this.remember(
				input.organizationId,
				input.idempotencyKey,
				value,
				evidence,
				value.id,
				value.version,
			);
		});
	}
	addReturnLine(
		input: Parameters<SalesStore["addReturnLine"]>[0],
		evidence: EvidenceSeed,
	) {
		return resolveAsync(() => {
			const replay = this.existing<ReturnAuthorizationLine>(
				input.organizationId,
				input.idempotencyKey,
			);
			if (replay) {
				return ok(replay);
			}
			const parent = this.returns.get(
				this.key(input.organizationId, input.returnAuthorizationId),
			);
			if (!parent) {
				return fail("NOT_FOUND", "Return authorization was not found", {
					reason: "SALES_NOT_FOUND",
				});
			}
			if (parent.version !== input.expectedVersion) {
				return conflict(parent, input.expectedVersion);
			}
			if (parent?.status !== "draft") {
				return fail("CONFLICT", "Return authorization is not editable", {
					reason: "SALES_INVALID_STATE",
				});
			}
			const line = this.orderLines.get(
				this.key(input.organizationId, input.orderLineId),
			);
			if (
				!line ||
				line.orderId !== parent.orderId ||
				Number(input.quantity) > Number(line.fulfilledQuantity)
			) {
				return fail("CONFLICT", "Return quantity exceeds fulfilled quantity", {
					reason: "SALES_INVALID_STATE",
				});
			}
			const value: ReturnAuthorizationLine = {
				...input,
				id: returnAuthorizationLineIdSchema.parse(randomUUID()),
				...initialStamp(input.actorUserId),
			};
			this.returnLines.set(this.key(input.organizationId, value.id), value);
			this.returns.set(this.key(input.organizationId, parent.id), {
				...parent,
				...updatedStamp(parent, input.actorUserId),
			});
			return this.remember(
				input.organizationId,
				input.idempotencyKey,
				value,
				evidence,
				value.id,
				value.version,
			);
		});
	}
	getReturnAuthorization(
		input: Parameters<SalesStore["getReturnAuthorization"]>[0],
	) {
		return resolveAsync(() =>
			ok(this.returns.get(this.key(input.organizationId, input.id)) ?? null),
		);
	}
	listReturnAuthorizations(
		input: Parameters<SalesStore["listReturnAuthorizations"]>[0],
	) {
		return resolveAsync(() => {
			const rows = [...this.returns.values()]
				.filter(
					(value) =>
						value.organizationId === input.organizationId &&
						(!input.cursor || value.id > input.cursor),
				)
				.sort((a, b) => a.id.localeCompare(b.id));
			const items = rows.slice(0, input.pageSize);
			return ok({
				items,
				nextCursor: rows.length > input.pageSize ? items.at(-1)?.id : undefined,
			});
		});
	}
	listReturnLines(input: Parameters<SalesStore["listReturnLines"]>[0]) {
		return resolveAsync(() =>
			ok(
				[...this.returnLines.values()].filter(
					(value) =>
						value.organizationId === input.organizationId &&
						value.returnAuthorizationId === input.returnAuthorizationId,
				),
			),
		);
	}
	transitionReturn(
		input: Parameters<SalesStore["transitionReturn"]>[0],
		evidence: EvidenceSeed,
	) {
		return resolveAsync(() => {
			const current = this.returns.get(
				this.key(input.organizationId, input.id),
			);
			if (!current) {
				return fail("NOT_FOUND", "Return authorization not found");
			}
			if (current.version !== input.expectedVersion) {
				return conflict(current, input.expectedVersion);
			}
			if (!RETURN_TRANSITIONS[current.status].includes(input.status)) {
				return fail("CONFLICT", "Invalid return lifecycle transition", {
					reason: "SALES_INVALID_STATE",
				});
			}
			const value = {
				...current,
				status: input.status,
				...updatedStamp(current, input.actorUserId),
			};
			this.returns.set(this.key(input.organizationId, input.id), value);
			this.evidence.push({
				...evidence,
				entityId: value.id,
				version: value.version,
			});
			return ok(value);
		});
	}

	private async orderTotals(org: string, orderId: string, taxTotal: string) {
		const lines = [...this.orderLines.values()].filter(
			(v) => v.organizationId === org && v.orderId === orderId,
		);
		const subtotal = await addDecimals(lines.map((v) => v.lineAmount));
		const discount = await addDecimals(lines.map((v) => v.discountAmount));
		const document = subtotal.ok
			? await addDecimals([subtotal.data, taxTotal])
			: subtotal;
		return {
			subtotalAmount: subtotal.ok ? subtotal.data : "0",
			discountTotal: discount.ok ? discount.data : "0",
			taxTotal,
			documentTotal: document.ok ? document.data : "0",
		};
	}
	private async quotationTotals(org: string, id: string) {
		const lines = [...this.quotationLines.values()].filter(
			(v) => v.organizationId === org && v.quotationId === id,
		);
		const subtotal = await addDecimals(lines.map((v) => v.lineAmount));
		const discount = await addDecimals(lines.map((v) => v.discountAmount));
		const tax = await addDecimals(lines.map((v) => v.taxAmount));
		return {
			subtotalAmount: subtotal.ok ? subtotal.data : "0",
			discountTotal: discount.ok ? discount.data : "0",
			taxTotal: tax.ok ? tax.data : "0",
			documentTotal: subtotal.ok ? subtotal.data : "0",
		};
	}
}

export function createMemorySalesStore(): MemorySalesStore {
	return new MemorySalesStore();
}
