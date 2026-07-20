import { randomUUID } from "node:crypto";
import { fail, ok, type Result } from "@afenda/errors/result";
import {
	FULFILLMENT_DELIVERY_CANCELLED_EVENT,
	FULFILLMENT_DELIVERY_CLOSED_EVENT,
	FULFILLMENT_DELIVERY_COMPLETED_EVENT,
	FULFILLMENT_DELIVERY_CREATED_EVENT,
	FULFILLMENT_DELIVERY_POSTED_EVENT,
	FULFILLMENT_PACK_CONFIRMED_EVENT,
	FULFILLMENT_PICK_CONFIRMED_EVENT,
	FULFILLMENT_POD_RECORDED_EVENT,
} from "@afenda/events/schemas";

import type { MutationPorts } from "./ports";
import type {
	DeliveryCreateRecord,
	DeliveryLineCreateRecord,
	DeliveryListFilter,
	DeliveryPackCreateRecord,
	DeliveryPickCreateRecord,
	DeliveryStateRecord,
	FulfillmentStore,
	MutationMeta,
	ProofOfDeliveryCreateRecord,
} from "./store";
import type {
	Delivery,
	DeliveryLine,
	DeliveryPack,
	DeliveryPick,
	ProofOfDelivery,
} from "./types";

function cloneDelivery(value: Delivery): Delivery {
	return {
		...value,
		lines: value.lines.map((row) => ({ ...row })),
		picks: value.picks.map((row) => ({ ...row })),
		packs: value.packs.map((row) => ({ ...row })),
		proofOfDelivery:
			value.proofOfDelivery === null ? null : { ...value.proofOfDelivery },
	};
}

function eventPayload(
	value: Delivery,
	actorUserId: string,
	correlationId: string,
): Record<string, unknown> {
	return {
		organizationId: value.organizationId,
		entityType: "delivery",
		entityId: value.id,
		code: value.code,
		version: value.version,
		actorUserId,
		correlationId,
		status: value.status,
		sourceType: value.salesOrderId === null ? "manual" : "sales_order",
		warehouseId: value.warehouseId,
	};
}

async function auditStatus(
	ports: MutationPorts,
	value: Delivery,
	actorUserId: string,
	correlationId: string,
	oldStatus: Delivery["status"],
): Promise<Result<{ id: string }>> {
	return ports.audit.record({
		organizationId: value.organizationId,
		actorUserId,
		correlationId,
		entity: "delivery",
		entityId: value.id,
		action: "UPDATE",
		changes: [{ field: "status", oldValue: oldStatus, newValue: value.status }],
		oldValue: { status: oldStatus, version: value.version - 1 },
		newValue: { status: value.status, version: value.version },
	});
}

export class MemoryFulfillmentStore implements FulfillmentStore {
	private readonly deliveries = new Map<string, Delivery>();

	async createDelivery(
		record: DeliveryCreateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<Delivery>> {
		// Idempotency check: if org+createIdempotencyKey exists, return clone
		for (const value of this.deliveries.values()) {
			if (
				value.organizationId === record.organizationId &&
				value.createIdempotencyKey === record.idempotencyKey
			) {
				// Same key same code → replay
				if (
					value.normalizedCode === record.normalizedCode &&
					value.code === record.code
				) {
					return ok(cloneDelivery(value));
				}
				// Same key different code → CONFLICT
				return fail(
					"CONFLICT",
					"Create idempotency key already used with different code",
				);
			}
		}
		// Check for duplicate code
		for (const value of this.deliveries.values()) {
			if (
				value.organizationId === record.organizationId &&
				value.normalizedCode === record.normalizedCode
			) {
				return fail("CONFLICT", "Delivery code already exists");
			}
		}
		const now = new Date();
		const value: Delivery = {
			id: randomUUID(),
			...record,
			createIdempotencyKey: record.idempotencyKey,
			pickStartIdempotencyKey: null,
			packIdempotencyKey: null,
			postIdempotencyKey: null,
			podIdempotencyKey: null,
			cancelIdempotencyKey: null,
			closeIdempotencyKey: null,
			status: "draft",
			version: 1,
			updatedBy: record.createdBy,
			postedAt: null,
			postedBy: null,
			deliveredAt: null,
			deliveredBy: null,
			cancelledAt: null,
			cancelledBy: null,
			closedAt: null,
			closedBy: null,
			createdAt: now,
			updatedAt: now,
			lines: [],
			picks: [],
			packs: [],
			proofOfDelivery: null,
		};
		this.deliveries.set(value.id, value);
		const audit = await ports.audit.record({
			organizationId: value.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "delivery",
			entityId: value.id,
			action: "CREATE",
			changes: [{ field: "code", oldValue: null, newValue: value.code }],
			newValue: { code: value.code, status: value.status },
		});
		if (!audit.ok) {
			this.deliveries.delete(value.id);
			return audit;
		}
		const outbox = await ports.outbox.append({
			organizationId: value.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			type: FULFILLMENT_DELIVERY_CREATED_EVENT,
			payload: eventPayload(value, record.createdBy, meta.correlationId),
		});
		if (!outbox.ok) {
			this.deliveries.delete(value.id);
			return outbox;
		}
		return ok(cloneDelivery(value));
	}

	async addLine(
		record: DeliveryLineCreateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<DeliveryLine>> {
		const value = this.deliveries.get(record.deliveryId);
		if (value === undefined || value.organizationId !== record.organizationId) {
			return fail("NOT_FOUND", "Delivery not found");
		}
		// Idempotency: if line with same lineIdempotencyKey on delivery → return that line
		for (const existing of value.lines) {
			if (existing.lineIdempotencyKey === record.idempotencyKey) {
				return ok({ ...existing });
			}
		}
		if (value.status !== "draft")
			return fail("CONFLICT", "Cannot add lines outside draft");
		if (value.version !== record.expectedVersion)
			return fail("CONFLICT", "Delivery version conflict");
		const previous = cloneDelivery(value);
		const now = new Date();
		const line: DeliveryLine = {
			id: randomUUID(),
			organizationId: record.organizationId,
			deliveryId: record.deliveryId,
			lineNo:
				value.lines.reduce((max, row) => Math.max(max, row.lineNo), 0) + 1,
			itemId: record.itemId,
			itemCode: record.itemCode,
			itemName: record.itemName,
			baseUomId: record.baseUomId,
			baseUomCode: record.baseUomCode,
			quantityOrdered: record.quantityOrdered,
			quantityToDeliver: record.quantityToDeliver,
			salesOrderLineId: record.salesOrderLineId,
			lineIdempotencyKey: record.idempotencyKey,
			version: 1,
			createdBy: record.createdBy,
			updatedBy: record.createdBy,
			createdAt: now,
			updatedAt: now,
		};
		value.lines.push(line);
		value.version += 1;
		value.updatedBy = record.createdBy;
		value.updatedAt = now;
		const audit = await ports.audit.record({
			organizationId: value.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "delivery_line",
			entityId: line.id,
			action: "CREATE",
			changes: [
				{ field: "item_code", oldValue: null, newValue: line.itemCode },
			],
			newValue: { deliveryId: value.id, lineNo: line.lineNo },
		});
		if (!audit.ok) {
			this.deliveries.set(value.id, previous);
			return audit;
		}
		return ok({ ...line });
	}

	async startPicking(
		record: DeliveryStateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<Delivery>> {
		const value = this.deliveries.get(record.deliveryId);
		if (value === undefined || value.organizationId !== record.organizationId)
			return fail("NOT_FOUND", "Delivery not found");
		// Idempotency: if pickStartIdempotencyKey matches → return delivery
		if (value.pickStartIdempotencyKey === record.idempotencyKey) {
			return ok(cloneDelivery(value));
		}
		// Already picking with different key → CONFLICT
		if (
			value.status === "picking" &&
			value.pickStartIdempotencyKey !== null &&
			value.pickStartIdempotencyKey !== record.idempotencyKey
		) {
			return fail(
				"CONFLICT",
				"Delivery is already picking with different idempotency key",
			);
		}
		if (value.status !== "draft" || value.lines.length === 0)
			return fail("CONFLICT", "Picking requires a draft delivery with lines");
		if (value.version !== record.expectedVersion)
			return fail("CONFLICT", "Delivery version conflict");
		const previous = cloneDelivery(value);
		value.status = "picking";
		value.pickStartIdempotencyKey = record.idempotencyKey;
		value.version += 1;
		value.updatedBy = record.actorUserId;
		value.updatedAt = new Date();
		const audit = await auditStatus(
			ports,
			value,
			record.actorUserId,
			meta.correlationId,
			"draft",
		);
		if (!audit.ok) {
			this.deliveries.set(value.id, previous);
			return audit;
		}
		return ok(cloneDelivery(value));
	}

	async confirmPick(
		record: DeliveryPickCreateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<DeliveryPick>> {
		const value = this.deliveries.get(record.deliveryId);
		if (value === undefined || value.organizationId !== record.organizationId)
			return fail("NOT_FOUND", "Delivery not found");
		// Idempotency: if pick with same pickIdempotencyKey → return that pick
		for (const existing of value.picks) {
			if (existing.pickIdempotencyKey === record.idempotencyKey) {
				return ok({ ...existing });
			}
		}
		if (value.status !== "picking")
			return fail("CONFLICT", "Pick confirmation requires picking status");
		if (value.version !== record.expectedVersion)
			return fail("CONFLICT", "Delivery version conflict");
		const line = value.lines.find((row) => row.id === record.deliveryLineId);
		if (line === undefined) return fail("NOT_FOUND", "Delivery line not found");
		const picked = value.picks
			.filter((row) => row.deliveryLineId === line.id)
			.reduce((sum, row) => sum + Number(row.quantityPicked), 0);
		if (
			picked + Number(record.quantityPicked) >
			Number(line.quantityToDeliver)
		) {
			return fail("CONFLICT", "Picked quantity exceeds quantity to deliver");
		}
		const previous = cloneDelivery(value);
		const now = new Date();
		const pick: DeliveryPick = {
			id: randomUUID(),
			organizationId: value.organizationId,
			deliveryId: value.id,
			deliveryLineId: line.id,
			quantityPicked: record.quantityPicked,
			reservationId: record.reservationId,
			pickIdempotencyKey: record.idempotencyKey,
			pickedAt: now,
			pickedBy: record.actorUserId,
			version: 1,
			createdBy: record.actorUserId,
			updatedBy: record.actorUserId,
			createdAt: now,
			updatedAt: now,
		};
		value.picks.push(pick);
		value.version += 1;
		value.updatedBy = record.actorUserId;
		value.updatedAt = now;
		const audit = await ports.audit.record({
			organizationId: value.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "delivery_pick",
			entityId: pick.id,
			action: "CREATE",
			changes: [
				{
					field: "quantity_picked",
					oldValue: null,
					newValue: pick.quantityPicked,
				},
			],
			newValue: { deliveryId: value.id, deliveryLineId: line.id },
		});
		if (!audit.ok) {
			this.deliveries.set(value.id, previous);
			return audit;
		}
		const outbox = await ports.outbox.append({
			organizationId: value.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			type: FULFILLMENT_PICK_CONFIRMED_EVENT,
			payload: {
				...eventPayload(value, record.actorUserId, meta.correlationId),
				entityType: "pick",
				entityId: pick.id,
				deliveryId: value.id,
				lineNo: line.lineNo,
				quantity: pick.quantityPicked,
			},
		});
		if (!outbox.ok) {
			this.deliveries.set(value.id, previous);
			return outbox;
		}
		return ok({ ...pick });
	}

	async confirmPack(
		record: DeliveryPackCreateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<DeliveryPack>> {
		const value = this.deliveries.get(record.deliveryId);
		if (value === undefined || value.organizationId !== record.organizationId)
			return fail("NOT_FOUND", "Delivery not found");
		// Idempotency: if packIdempotencyKey matches → return last pack
		if (value.packIdempotencyKey === record.idempotencyKey) {
			const lastPack = value.packs[value.packs.length - 1];
			if (lastPack) return ok({ ...lastPack });
		}
		if (value.status !== "picking" || value.picks.length === 0)
			return fail("CONFLICT", "Packing requires at least one confirmed pick");
		if (value.version !== record.expectedVersion)
			return fail("CONFLICT", "Delivery version conflict");
		// Pack gate F4: for each line, sum(picks) >= quantityToDeliver
		for (const line of value.lines) {
			const picked = value.picks
				.filter((row) => row.deliveryLineId === line.id)
				.reduce((sum, row) => sum + Number(row.quantityPicked), 0);
			if (picked < Number(line.quantityToDeliver)) {
				return fail(
					"CONFLICT",
					`Line ${line.lineNo} has not been fully picked (${picked} < ${line.quantityToDeliver})`,
				);
			}
		}
		const previous = cloneDelivery(value);
		const now = new Date();
		const pack: DeliveryPack = {
			id: randomUUID(),
			organizationId: value.organizationId,
			deliveryId: value.id,
			packageCode: record.packageCode,
			notes: record.notes,
			packedAt: now,
			packedBy: record.actorUserId,
			version: 1,
			createdBy: record.actorUserId,
			updatedBy: record.actorUserId,
			createdAt: now,
			updatedAt: now,
		};
		value.packs.push(pack);
		value.packIdempotencyKey = record.idempotencyKey;
		value.status = "packed";
		value.version += 1;
		value.updatedBy = record.actorUserId;
		value.updatedAt = now;
		const audit = await auditStatus(
			ports,
			value,
			record.actorUserId,
			meta.correlationId,
			"picking",
		);
		if (!audit.ok) {
			this.deliveries.set(value.id, previous);
			return audit;
		}
		const outbox = await ports.outbox.append({
			organizationId: value.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			type: FULFILLMENT_PACK_CONFIRMED_EVENT,
			payload: {
				...eventPayload(value, record.actorUserId, meta.correlationId),
				entityType: "pack",
				entityId: pack.id,
				deliveryId: value.id,
				packageCode: pack.packageCode ?? undefined,
			},
		});
		if (!outbox.ok) {
			this.deliveries.set(value.id, previous);
			return outbox;
		}
		return ok({ ...pack });
	}

	async postDelivery(
		record: DeliveryStateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<Delivery>> {
		const value = this.deliveries.get(record.deliveryId);
		if (value === undefined || value.organizationId !== record.organizationId)
			return fail("NOT_FOUND", "Delivery not found");
		// Idempotency: if postIdempotencyKey matches → return delivery
		if (value.postIdempotencyKey === record.idempotencyKey) {
			return ok(cloneDelivery(value));
		}
		if (value.status !== "packed")
			return fail("CONFLICT", "Delivery must be packed");
		if (value.version !== record.expectedVersion)
			return fail("CONFLICT", "Delivery version conflict");
		const previous = cloneDelivery(value);
		const now = new Date();
		value.status = "posted";
		value.postIdempotencyKey = record.idempotencyKey;
		value.postedAt = now;
		value.postedBy = record.actorUserId;
		value.version += 1;
		value.updatedBy = record.actorUserId;
		value.updatedAt = now;
		const audit = await auditStatus(
			ports,
			value,
			record.actorUserId,
			meta.correlationId,
			"packed",
		);
		if (!audit.ok) {
			this.deliveries.set(value.id, previous);
			return audit;
		}
		const outbox = await ports.outbox.append({
			organizationId: value.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			type: FULFILLMENT_DELIVERY_POSTED_EVENT,
			payload: eventPayload(value, record.actorUserId, meta.correlationId),
		});
		if (!outbox.ok) {
			this.deliveries.set(value.id, previous);
			return outbox;
		}
		return ok(cloneDelivery(value));
	}

	async recordProofOfDelivery(
		record: ProofOfDeliveryCreateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<ProofOfDelivery>> {
		const value = this.deliveries.get(record.deliveryId);
		if (value === undefined || value.organizationId !== record.organizationId)
			return fail("NOT_FOUND", "Delivery not found");
		// Idempotency: if podIdempotencyKey matches → return existing POD
		if (value.podIdempotencyKey === record.idempotencyKey) {
			if (value.proofOfDelivery) return ok({ ...value.proofOfDelivery });
		}
		// If POD exists with different key → CONFLICT
		if (
			value.proofOfDelivery !== null &&
			value.podIdempotencyKey !== record.idempotencyKey
		) {
			return fail("CONFLICT", "Proof of delivery already exists");
		}
		if (value.status !== "posted")
			return fail("CONFLICT", "Proof of delivery requires posted status");
		if (value.version !== record.expectedVersion)
			return fail("CONFLICT", "Delivery version conflict");
		const previous = cloneDelivery(value);
		const proof: ProofOfDelivery = {
			id: randomUUID(),
			organizationId: value.organizationId,
			deliveryId: value.id,
			receivedByName: record.receivedByName,
			outcome: record.outcome,
			proofType: record.proofType,
			evidenceRef: record.evidenceRef,
			carrierRef: record.carrierRef,
			notes: record.notes,
			recordedAt: record.recordedAt,
			recordedBy: record.actorUserId,
			version: 1,
			createdBy: record.actorUserId,
			updatedBy: record.actorUserId,
			createdAt: record.recordedAt,
			updatedAt: record.recordedAt,
		};
		value.proofOfDelivery = proof;
		value.podIdempotencyKey = record.idempotencyKey;
		// Only set status to delivered if outcome==='delivered'
		if (record.outcome === "delivered") {
			value.status = "delivered";
			value.deliveredAt = record.recordedAt;
			value.deliveredBy = record.actorUserId;
		}
		value.version += 1;
		value.updatedBy = record.actorUserId;
		value.updatedAt = record.recordedAt;
		const oldStatus: typeof value.status =
			record.outcome === "delivered" ? "posted" : value.status;
		const audit = await auditStatus(
			ports,
			value,
			record.actorUserId,
			meta.correlationId,
			oldStatus,
		);
		if (!audit.ok) {
			this.deliveries.set(value.id, previous);
			return audit;
		}
		// Always emit pod.recorded
		const podRecorded = await ports.outbox.append({
			organizationId: value.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			type: FULFILLMENT_POD_RECORDED_EVENT,
			payload: eventPayload(value, record.actorUserId, meta.correlationId),
		});
		if (!podRecorded.ok) {
			this.deliveries.set(value.id, previous);
			return podRecorded;
		}
		// Also emit completed ONLY if outcome==='delivered'
		if (record.outcome === "delivered") {
			const completed = await ports.outbox.append({
				organizationId: value.organizationId,
				actorUserId: record.actorUserId,
				correlationId: meta.correlationId,
				type: FULFILLMENT_DELIVERY_COMPLETED_EVENT,
				payload: eventPayload(value, record.actorUserId, meta.correlationId),
			});
			if (!completed.ok) {
				this.deliveries.set(value.id, previous);
				return completed;
			}
		}
		return ok({ ...proof });
	}

	async cancelDelivery(
		record: DeliveryStateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<Delivery>> {
		const value = this.deliveries.get(record.deliveryId);
		if (value === undefined || value.organizationId !== record.organizationId)
			return fail("NOT_FOUND", "Delivery not found");
		// Idempotency: if cancelIdempotencyKey matches → return delivery
		if (value.cancelIdempotencyKey === record.idempotencyKey) {
			return ok(cloneDelivery(value));
		}
		if (!["draft", "picking", "packed"].includes(value.status))
			return fail("CONFLICT", "Delivery cannot be cancelled after posting");
		if (value.version !== record.expectedVersion)
			return fail("CONFLICT", "Delivery version conflict");
		const previous = cloneDelivery(value);
		const oldStatus = value.status;
		const now = new Date();
		value.status = "cancelled";
		value.cancelIdempotencyKey = record.idempotencyKey;
		value.cancelledAt = now;
		value.cancelledBy = record.actorUserId;
		value.version += 1;
		value.updatedBy = record.actorUserId;
		value.updatedAt = now;
		const audit = await auditStatus(
			ports,
			value,
			record.actorUserId,
			meta.correlationId,
			oldStatus,
		);
		if (!audit.ok) {
			this.deliveries.set(value.id, previous);
			return audit;
		}
		const outbox = await ports.outbox.append({
			organizationId: value.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			type: FULFILLMENT_DELIVERY_CANCELLED_EVENT,
			payload: eventPayload(value, record.actorUserId, meta.correlationId),
		});
		if (!outbox.ok) {
			this.deliveries.set(value.id, previous);
			return outbox;
		}
		return ok(cloneDelivery(value));
	}

	async closeDelivery(
		record: DeliveryStateRecord,
		ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<Delivery>> {
		const value = this.deliveries.get(record.deliveryId);
		if (value === undefined || value.organizationId !== record.organizationId)
			return fail("NOT_FOUND", "Delivery not found");
		// Idempotency: if closeIdempotencyKey matches → return delivery
		if (value.closeIdempotencyKey === record.idempotencyKey) {
			return ok(cloneDelivery(value));
		}
		if (value.status !== "delivered")
			return fail("CONFLICT", "Delivery must be delivered");
		if (value.version !== record.expectedVersion)
			return fail("CONFLICT", "Delivery version conflict");
		const previous = cloneDelivery(value);
		const now = new Date();
		value.status = "closed";
		value.closeIdempotencyKey = record.idempotencyKey;
		value.closedAt = now;
		value.closedBy = record.actorUserId;
		value.version += 1;
		value.updatedBy = record.actorUserId;
		value.updatedAt = now;
		const audit = await auditStatus(
			ports,
			value,
			record.actorUserId,
			meta.correlationId,
			"delivered",
		);
		if (!audit.ok) {
			this.deliveries.set(value.id, previous);
			return audit;
		}
		const outbox = await ports.outbox.append({
			organizationId: value.organizationId,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			type: FULFILLMENT_DELIVERY_CLOSED_EVENT,
			payload: eventPayload(value, record.actorUserId, meta.correlationId),
		});
		if (!outbox.ok) {
			this.deliveries.set(value.id, previous);
			return outbox;
		}
		return ok(cloneDelivery(value));
	}

	async getDeliveryById(
		organizationId: string,
		id: string,
	): Promise<Result<Delivery | null>> {
		const value = this.deliveries.get(id);
		return ok(
			value === undefined || value.organizationId !== organizationId
				? null
				: cloneDelivery(value),
		);
	}

	async listDeliveries(
		filter: DeliveryListFilter,
	): Promise<Result<Delivery[]>> {
		const start = (filter.page - 1) * filter.pageSize;
		const sort = filter.sort ?? "created_at";
		const items = [...this.deliveries.values()]
			.filter((row) => row.organizationId === filter.organizationId)
			.filter(
				(row) => filter.status === undefined || row.status === filter.status,
			)
			.filter(
				(row) =>
					filter.warehouseId === undefined ||
					row.warehouseId === filter.warehouseId,
			)
			.filter(
				(row) =>
					filter.salesOrderId === undefined ||
					row.salesOrderId === filter.salesOrderId,
			);
		// Sort by created_at|code|status with id secondary desc as tie-breaker. Default created_at.
		items.sort((a, b) => {
			let cmp = 0;
			if (sort === "created_at") {
				cmp = b.createdAt.getTime() - a.createdAt.getTime();
			} else if (sort === "code") {
				cmp = a.code.localeCompare(b.code);
			} else if (sort === "status") {
				cmp = a.status.localeCompare(b.status);
			}
			if (cmp !== 0) return cmp;
			// Tie-breaker: id desc
			return b.id.localeCompare(a.id);
		});
		return ok(items.slice(start, start + filter.pageSize).map(cloneDelivery));
	}

	async sumPostedQuantityForSalesOrderLine(
		organizationId: string,
		salesOrderLineId: string,
	): Promise<Result<string>> {
		let sum = 0;
		for (const delivery of this.deliveries.values()) {
			if (
				delivery.organizationId !== organizationId ||
				!["posted", "delivered", "closed"].includes(delivery.status)
			) {
				continue;
			}
			for (const line of delivery.lines) {
				if (line.salesOrderLineId === salesOrderLineId) {
					sum += Number(line.quantityToDeliver);
				}
			}
		}
		return ok(String(sum));
	}
}

export function createMemoryFulfillmentStore(): MemoryFulfillmentStore {
	return new MemoryFulfillmentStore();
}
