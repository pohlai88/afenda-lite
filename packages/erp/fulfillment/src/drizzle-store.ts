import { randomUUID } from "node:crypto";
import {
	and,
	asc,
	db,
	delivery,
	deliveryLine,
	deliveryPack,
	deliveryPick,
	desc,
	eq,
	inArray,
	proofOfDelivery,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";
import {
	FULFILLMENT_DELIVERY_COMPLETED_EVENT,
	FULFILLMENT_DELIVERY_CREATED_EVENT,
	FULFILLMENT_DELIVERY_POSTED_EVENT,
	FULFILLMENT_PICK_CONFIRMED_EVENT,
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
import {
	DELIVERY_STATUSES,
	type Delivery,
	type DeliveryLine,
	type DeliveryPack,
	type DeliveryPick,
	type DeliveryStatus,
	type ProofOfDelivery,
} from "./types";

type TxIdRow = { id: string };

function parseStatus(value: string): DeliveryStatus {
	const found = DELIVERY_STATUSES.find((candidate) => candidate === value);
	if (found === undefined) throw new Error(`Invalid delivery.status: ${value}`);
	return found;
}

function mapLine(row: typeof deliveryLine.$inferSelect): DeliveryLine {
	return {
		id: row.id,
		organizationId: row.organizationId,
		deliveryId: row.deliveryId,
		lineNo: row.lineNo,
		itemId: row.itemId,
		itemCode: row.itemCode,
		itemName: row.itemName,
		baseUomId: row.baseUomId,
		baseUomCode: row.baseUomCode,
		quantityOrdered: row.quantityOrdered,
		quantityToDeliver: row.quantityToDeliver,
		salesOrderLineId: row.salesOrderLineId,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapPick(row: typeof deliveryPick.$inferSelect): DeliveryPick {
	return { ...row };
}

function mapPack(row: typeof deliveryPack.$inferSelect): DeliveryPack {
	return { ...row };
}

function mapProof(row: typeof proofOfDelivery.$inferSelect): ProofOfDelivery {
	return { ...row };
}

function mapDelivery(
	row: typeof delivery.$inferSelect,
	lines: DeliveryLine[],
	picks: DeliveryPick[],
	packs: DeliveryPack[],
	proof: ProofOfDelivery | null,
): Delivery {
	return {
		...row,
		status: parseStatus(row.status),
		lines,
		picks,
		packs,
		proofOfDelivery: proof,
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

function payload(
	value: {
		organizationId: string;
		id: string;
		code: string;
		version: number;
		status: string;
		salesOrderId: string | null;
		warehouseId: string;
	},
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

export class DrizzleFulfillmentStore implements FulfillmentStore {
	private async reload(
		organizationId: string,
		id: string,
		message: string,
	): Promise<Result<Delivery>> {
		const result = await this.getDeliveryById(organizationId, id);
		if (!result.ok) return result;
		return result.data === null
			? fail("INTERNAL_ERROR", message)
			: ok(result.data);
	}

	async createDelivery(
		record: DeliveryCreateRecord,
		_ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<Delivery>> {
		const id = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const eventPayload = json(
			payload(
				{
					organizationId: record.organizationId,
					id,
					code: record.code,
					version: 1,
					status: "draft",
					salesOrderId: record.salesOrderId,
					warehouseId: record.warehouseId,
				},
				record.createdBy,
				meta.correlationId,
			),
		);
		try {
			const [rows] = await runNeonHttpTransaction<[TxIdRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO delivery (
							id, organization_id, code, normalized_code, status,
							sales_order_id, warehouse_id, warehouse_code, warehouse_name,
							ship_to_party_id, ship_to_party_code, ship_to_party_name,
							version, created_by, updated_by
						) VALUES (
							${id}, ${record.organizationId}, ${record.code},
							${record.normalizedCode}, 'draft', ${record.salesOrderId},
							${record.warehouseId}, ${record.warehouseCode},
							${record.warehouseName}, ${record.shipToPartyId},
							${record.shipToPartyCode}, ${record.shipToPartyName},
							1, ${record.createdBy}, ${record.createdBy}
						) RETURNING *
					), audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module,
							entity, entity_id, action, changes, new_value
						)
						SELECT ${auditId}, organization_id, created_by, ${meta.correlationId},
							'fulfillment', 'delivery', id, 'CREATE',
							${json([{ field: "code", oldValue: null, newValue: record.code }])}::jsonb,
							${json({ code: record.code, status: "draft" })}::jsonb
						FROM mutated RETURNING id
					), outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id,
							${FULFILLMENT_DELIVERY_CREATED_EVENT}, 'fulfillment',
							${meta.correlationId}, created_by, ${eventPayload}::jsonb,
							'pending', 0
						FROM mutated RETURNING id
					)
					SELECT mutated.id FROM mutated, audited, outboxed
				`,
			]);
			if (rows[0] === undefined)
				return fail("INTERNAL_ERROR", "Delivery create returned no row");
			return this.reload(record.organizationId, id, "Created delivery missing");
		} catch (error) {
			return writeError(
				error,
				"Delivery code already exists",
				"Failed to create delivery",
			);
		}
	}

	async addLine(
		record: DeliveryLineCreateRecord,
		_ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<DeliveryLine>> {
		const id = randomUUID();
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[TxIdRow[]]>((sql) => [
				sql`
					WITH parent AS (
						UPDATE delivery
						SET version = version + 1, updated_by = ${record.createdBy},
							updated_at = now()
						WHERE id = ${record.deliveryId}
							AND organization_id = ${record.organizationId}
							AND status = 'draft' AND version = ${record.expectedVersion}
						RETURNING *
					), numbered AS (
						SELECT COALESCE(MAX(line_no), 0) + 1 AS line_no
						FROM delivery_line
						WHERE organization_id = ${record.organizationId}
							AND delivery_id = ${record.deliveryId}
					), mutated AS (
						INSERT INTO delivery_line (
							id, organization_id, delivery_id, line_no, item_id,
							item_code, item_name, base_uom_id, base_uom_code,
							quantity_ordered, quantity_to_deliver, sales_order_line_id,
							version, created_by, updated_by
						)
						SELECT ${id}, parent.organization_id, parent.id, numbered.line_no,
							${record.itemId}, ${record.itemCode}, ${record.itemName},
							${record.baseUomId}, ${record.baseUomCode},
							${record.quantityOrdered}, ${record.quantityToDeliver},
							${record.salesOrderLineId}, 1, ${record.createdBy},
							${record.createdBy}
						FROM parent, numbered RETURNING *
					), audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module,
							entity, entity_id, action, changes, new_value
						)
						SELECT ${auditId}, organization_id, created_by, ${meta.correlationId},
							'fulfillment', 'delivery_line', id, 'CREATE',
							${json([{ field: "item_code", oldValue: null, newValue: record.itemCode }])}::jsonb,
							jsonb_build_object('deliveryId', delivery_id, 'lineNo', line_no)
						FROM mutated RETURNING id
					)
					SELECT mutated.id FROM mutated, audited
				`,
			]);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Delivery line add conflict");
			const [row] = await db
				.select()
				.from(deliveryLine)
				.where(
					and(
						eq(deliveryLine.organizationId, record.organizationId),
						eq(deliveryLine.id, id),
					),
				)
				.limit(1);
			return row === undefined
				? fail("INTERNAL_ERROR", "Created delivery line missing")
				: ok(mapLine(row));
		} catch (error) {
			return writeError(
				error,
				"Delivery line conflict",
				"Failed to add delivery line",
			);
		}
	}

	async startPicking(
		record: DeliveryStateRecord,
		_ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<Delivery>> {
		return this.transition(record, meta, "draft", "picking", null, true);
	}

	async confirmPick(
		record: DeliveryPickCreateRecord,
		_ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<DeliveryPick>> {
		const existing = await this.getDeliveryById(
			record.organizationId,
			record.deliveryId,
		);
		if (!existing.ok) return existing;
		if (existing.data === null) return fail("NOT_FOUND", "Delivery not found");
		const line = existing.data.lines.find(
			(row) => row.id === record.deliveryLineId,
		);
		if (line === undefined) return fail("NOT_FOUND", "Delivery line not found");
		const total = existing.data.picks
			.filter((row) => row.deliveryLineId === line.id)
			.reduce((sum, row) => sum + Number(row.quantityPicked), 0);
		if (total + Number(record.quantityPicked) > Number(line.quantityToDeliver))
			return fail("CONFLICT", "Picked quantity exceeds quantity to deliver");
		const id = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const nextVersion = record.expectedVersion + 1;
		const eventPayload = json({
			...payload(
				{
					organizationId: existing.data.organizationId,
					id: existing.data.id,
					code: existing.data.code,
					version: nextVersion,
					status: "picking",
					salesOrderId: existing.data.salesOrderId,
					warehouseId: existing.data.warehouseId,
				},
				record.actorUserId,
				meta.correlationId,
			),
			entityType: "pick",
			entityId: id,
			deliveryId: record.deliveryId,
			lineNo: line.lineNo,
			quantity: record.quantityPicked,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[TxIdRow[]]>((sql) => [
				sql`
					WITH parent AS (
						UPDATE delivery
						SET version = ${nextVersion}, updated_by = ${record.actorUserId},
							updated_at = now()
						WHERE id = ${record.deliveryId}
							AND organization_id = ${record.organizationId}
							AND status = 'picking' AND version = ${record.expectedVersion}
						RETURNING *
					), mutated AS (
						INSERT INTO delivery_pick (
							id, organization_id, delivery_id, delivery_line_id,
							quantity_picked, picked_at, picked_by, version,
							created_by, updated_by
						)
						SELECT ${id}, organization_id, id, ${record.deliveryLineId},
							${record.quantityPicked}, now(), ${record.actorUserId}, 1,
							${record.actorUserId}, ${record.actorUserId}
						FROM parent RETURNING *
					), audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module,
							entity, entity_id, action, changes, new_value
						)
						SELECT ${auditId}, organization_id, ${record.actorUserId},
							${meta.correlationId}, 'fulfillment', 'delivery_pick', id,
							'CREATE',
							${json([{ field: "quantity_picked", oldValue: null, newValue: record.quantityPicked }])}::jsonb,
							jsonb_build_object('deliveryId', delivery_id, 'deliveryLineId', delivery_line_id)
						FROM mutated RETURNING id
					), outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id,
							${FULFILLMENT_PICK_CONFIRMED_EVENT}, 'fulfillment',
							${meta.correlationId}, ${record.actorUserId},
							${eventPayload}::jsonb, 'pending', 0
						FROM mutated RETURNING id
					)
					SELECT mutated.id FROM mutated, audited, outboxed
				`,
			]);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Delivery pick confirmation conflict");
			const [row] = await db
				.select()
				.from(deliveryPick)
				.where(
					and(
						eq(deliveryPick.organizationId, record.organizationId),
						eq(deliveryPick.id, id),
					),
				)
				.limit(1);
			return row === undefined
				? fail("INTERNAL_ERROR", "Created delivery pick missing")
				: ok(mapPick(row));
		} catch (error) {
			return writeError(
				error,
				"Delivery pick conflict",
				"Failed to confirm delivery pick",
			);
		}
	}

	async confirmPack(
		record: DeliveryPackCreateRecord,
		_ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<DeliveryPack>> {
		const id = randomUUID();
		const auditId = randomUUID();
		const nextVersion = record.expectedVersion + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[TxIdRow[]]>((sql) => [
				sql`
					WITH parent AS (
						UPDATE delivery
						SET status = 'packed', version = ${nextVersion},
							updated_by = ${record.actorUserId}, updated_at = now()
						WHERE id = ${record.deliveryId}
							AND organization_id = ${record.organizationId}
							AND status = 'picking' AND version = ${record.expectedVersion}
							AND EXISTS (
								SELECT 1 FROM delivery_pick
								WHERE organization_id = ${record.organizationId}
									AND delivery_id = ${record.deliveryId}
							)
						RETURNING *
					), mutated AS (
						INSERT INTO delivery_pack (
							id, organization_id, delivery_id, package_code, notes,
							packed_at, packed_by, version, created_by, updated_by
						)
						SELECT ${id}, organization_id, id, ${record.packageCode},
							${record.notes}, now(), ${record.actorUserId}, 1,
							${record.actorUserId}, ${record.actorUserId}
						FROM parent RETURNING *
					), audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module,
							entity, entity_id, action, changes, old_value, new_value
						)
						SELECT ${auditId}, organization_id, ${record.actorUserId},
							${meta.correlationId}, 'fulfillment', 'delivery', delivery_id,
							'UPDATE',
							${json([{ field: "status", oldValue: "picking", newValue: "packed" }])}::jsonb,
							${json({ status: "picking", version: record.expectedVersion })}::jsonb,
							${json({ status: "packed", version: nextVersion })}::jsonb
						FROM mutated RETURNING id
					)
					SELECT mutated.id FROM mutated, audited
				`,
			]);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Delivery pack confirmation conflict");
			const [row] = await db
				.select()
				.from(deliveryPack)
				.where(
					and(
						eq(deliveryPack.organizationId, record.organizationId),
						eq(deliveryPack.id, id),
					),
				)
				.limit(1);
			return row === undefined
				? fail("INTERNAL_ERROR", "Created delivery pack missing")
				: ok(mapPack(row));
		} catch (error) {
			return writeError(
				error,
				"Delivery pack conflict",
				"Failed to confirm delivery pack",
			);
		}
	}

	async postDelivery(
		record: DeliveryStateRecord,
		_ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<Delivery>> {
		return this.transition(
			record,
			meta,
			"packed",
			"posted",
			FULFILLMENT_DELIVERY_POSTED_EVENT,
			false,
		);
	}

	async recordProofOfDelivery(
		record: ProofOfDeliveryCreateRecord,
		_ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<ProofOfDelivery>> {
		const existing = await this.getDeliveryById(
			record.organizationId,
			record.deliveryId,
		);
		if (!existing.ok) return existing;
		if (existing.data === null) return fail("NOT_FOUND", "Delivery not found");
		const id = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const nextVersion = record.expectedVersion + 1;
		const eventPayload = json(
			payload(
				{
					...existing.data,
					version: nextVersion,
					status: "delivered",
				},
				record.actorUserId,
				meta.correlationId,
			),
		);
		try {
			const [rows] = await runNeonHttpTransaction<[TxIdRow[]]>((sql) => [
				sql`
					WITH parent AS (
						UPDATE delivery
						SET status = 'delivered', delivered_at = ${record.recordedAt},
							delivered_by = ${record.actorUserId}, version = ${nextVersion},
							updated_by = ${record.actorUserId}, updated_at = ${record.recordedAt}
						WHERE id = ${record.deliveryId}
							AND organization_id = ${record.organizationId}
							AND status = 'posted' AND version = ${record.expectedVersion}
						RETURNING *
					), mutated AS (
						INSERT INTO proof_of_delivery (
							id, organization_id, delivery_id, received_by_name, notes,
							recorded_at, recorded_by, version, created_by, updated_by
						)
						SELECT ${id}, organization_id, id, ${record.receivedByName},
							${record.notes}, ${record.recordedAt}, ${record.actorUserId}, 1,
							${record.actorUserId}, ${record.actorUserId}
						FROM parent RETURNING *
					), audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module,
							entity, entity_id, action, changes, old_value, new_value
						)
						SELECT ${auditId}, organization_id, ${record.actorUserId},
							${meta.correlationId}, 'fulfillment', 'delivery', delivery_id,
							'UPDATE',
							${json([{ field: "status", oldValue: "posted", newValue: "delivered" }])}::jsonb,
							${json({ status: "posted", version: record.expectedVersion })}::jsonb,
							${json({ status: "delivered", version: nextVersion })}::jsonb
						FROM mutated RETURNING id
					), outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id,
							${FULFILLMENT_DELIVERY_COMPLETED_EVENT}, 'fulfillment',
							${meta.correlationId}, ${record.actorUserId},
							${eventPayload}::jsonb, 'pending', 0
						FROM mutated RETURNING id
					)
					SELECT mutated.id FROM mutated, audited, outboxed
				`,
			]);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Proof of delivery record conflict");
			const [row] = await db
				.select()
				.from(proofOfDelivery)
				.where(
					and(
						eq(proofOfDelivery.organizationId, record.organizationId),
						eq(proofOfDelivery.id, id),
					),
				)
				.limit(1);
			return row === undefined
				? fail("INTERNAL_ERROR", "Created proof of delivery missing")
				: ok(mapProof(row));
		} catch (error) {
			return writeError(
				error,
				"Proof of delivery already exists",
				"Failed to record proof of delivery",
			);
		}
	}

	async cancelDelivery(
		record: DeliveryStateRecord,
		_ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<Delivery>> {
		const existing = await this.getDeliveryById(
			record.organizationId,
			record.deliveryId,
		);
		if (!existing.ok) return existing;
		if (existing.data === null) return fail("NOT_FOUND", "Delivery not found");
		if (!["draft", "picking", "packed"].includes(existing.data.status))
			return fail("CONFLICT", "Delivery cannot be cancelled after posting");
		return this.transition(
			record,
			meta,
			existing.data.status,
			"cancelled",
			null,
			false,
		);
	}

	async getDeliveryById(
		organizationId: string,
		id: string,
	): Promise<Result<Delivery | null>> {
		try {
			const [header] = await db
				.select()
				.from(delivery)
				.where(
					and(eq(delivery.organizationId, organizationId), eq(delivery.id, id)),
				)
				.limit(1);
			if (header === undefined) return ok(null);
			const [lines, picks, packs, proofs] = await Promise.all([
				db
					.select()
					.from(deliveryLine)
					.where(
						and(
							eq(deliveryLine.organizationId, organizationId),
							eq(deliveryLine.deliveryId, id),
						),
					)
					.orderBy(asc(deliveryLine.lineNo)),
				db
					.select()
					.from(deliveryPick)
					.where(
						and(
							eq(deliveryPick.organizationId, organizationId),
							eq(deliveryPick.deliveryId, id),
						),
					)
					.orderBy(asc(deliveryPick.pickedAt)),
				db
					.select()
					.from(deliveryPack)
					.where(
						and(
							eq(deliveryPack.organizationId, organizationId),
							eq(deliveryPack.deliveryId, id),
						),
					)
					.orderBy(asc(deliveryPack.packedAt)),
				db
					.select()
					.from(proofOfDelivery)
					.where(
						and(
							eq(proofOfDelivery.organizationId, organizationId),
							eq(proofOfDelivery.deliveryId, id),
						),
					)
					.limit(1),
			]);
			return ok(
				mapDelivery(
					header,
					lines.map(mapLine),
					picks.map(mapPick),
					packs.map(mapPack),
					proofs[0] === undefined ? null : mapProof(proofs[0]),
				),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to load delivery");
		}
	}

	async listDeliveries(
		filter: DeliveryListFilter,
	): Promise<Result<Delivery[]>> {
		try {
			const conditions = [eq(delivery.organizationId, filter.organizationId)];
			if (filter.status !== undefined)
				conditions.push(eq(delivery.status, filter.status));
			if (filter.warehouseId !== undefined)
				conditions.push(eq(delivery.warehouseId, filter.warehouseId));
			if (filter.salesOrderId !== undefined)
				conditions.push(eq(delivery.salesOrderId, filter.salesOrderId));
			const headers = await db
				.select()
				.from(delivery)
				.where(and(...conditions))
				.orderBy(desc(delivery.updatedAt), desc(delivery.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			if (headers.length === 0) return ok([]);
			const ids = headers.map((row) => row.id);
			const [lines, picks, packs, proofs] = await Promise.all([
				db
					.select()
					.from(deliveryLine)
					.where(
						and(
							eq(deliveryLine.organizationId, filter.organizationId),
							inArray(deliveryLine.deliveryId, ids),
						),
					)
					.orderBy(asc(deliveryLine.lineNo)),
				db
					.select()
					.from(deliveryPick)
					.where(
						and(
							eq(deliveryPick.organizationId, filter.organizationId),
							inArray(deliveryPick.deliveryId, ids),
						),
					),
				db
					.select()
					.from(deliveryPack)
					.where(
						and(
							eq(deliveryPack.organizationId, filter.organizationId),
							inArray(deliveryPack.deliveryId, ids),
						),
					),
				db
					.select()
					.from(proofOfDelivery)
					.where(
						and(
							eq(proofOfDelivery.organizationId, filter.organizationId),
							inArray(proofOfDelivery.deliveryId, ids),
						),
					),
			]);
			const group = <T extends { deliveryId: string }>(rows: T[]) => {
				const values = new Map<string, T[]>();
				for (const row of rows) {
					const bucket = values.get(row.deliveryId);
					if (bucket === undefined) values.set(row.deliveryId, [row]);
					else bucket.push(row);
				}
				return values;
			};
			const linesById = group(lines.map(mapLine));
			const picksById = group(picks.map(mapPick));
			const packsById = group(packs.map(mapPack));
			const proofsById = new Map(
				proofs.map((row) => [row.deliveryId, mapProof(row)]),
			);
			return ok(
				headers.map((header) =>
					mapDelivery(
						header,
						linesById.get(header.id) ?? [],
						picksById.get(header.id) ?? [],
						packsById.get(header.id) ?? [],
						proofsById.get(header.id) ?? null,
					),
				),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to list deliveries");
		}
	}

	private async transition(
		record: DeliveryStateRecord,
		meta: MutationMeta,
		from: DeliveryStatus,
		to: DeliveryStatus,
		eventType: typeof FULFILLMENT_DELIVERY_POSTED_EVENT | null,
		requireLines: boolean,
	): Promise<Result<Delivery>> {
		const existing = await this.getDeliveryById(
			record.organizationId,
			record.deliveryId,
		);
		if (!existing.ok) return existing;
		if (existing.data === null) return fail("NOT_FOUND", "Delivery not found");
		if (existing.data.status !== from)
			return fail("CONFLICT", `Delivery must be ${from}`);
		if (requireLines && existing.data.lines.length === 0)
			return fail("CONFLICT", "Picking requires at least one delivery line");
		if (existing.data.version !== record.expectedVersion)
			return fail("CONFLICT", "Delivery version conflict");
		const nextVersion = record.expectedVersion + 1;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const eventPayload = json(
			payload(
				{ ...existing.data, version: nextVersion, status: to },
				record.actorUserId,
				meta.correlationId,
			),
		);
		try {
			const [rows] = await runNeonHttpTransaction<[TxIdRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE delivery
						SET status = ${to}, version = ${nextVersion},
							updated_by = ${record.actorUserId}, updated_at = now(),
							posted_at = CASE WHEN ${to} = 'posted' THEN now() ELSE posted_at END,
							posted_by = CASE WHEN ${to} = 'posted' THEN ${record.actorUserId} ELSE posted_by END,
							cancelled_at = CASE WHEN ${to} = 'cancelled' THEN now() ELSE cancelled_at END,
							cancelled_by = CASE WHEN ${to} = 'cancelled' THEN ${record.actorUserId} ELSE cancelled_by END
						WHERE id = ${record.deliveryId}
							AND organization_id = ${record.organizationId}
							AND status = ${from} AND version = ${record.expectedVersion}
							AND (
								${requireLines} = false OR EXISTS (
									SELECT 1 FROM delivery_line
									WHERE organization_id = ${record.organizationId}
										AND delivery_id = ${record.deliveryId}
								)
							)
						RETURNING *
					), audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module,
							entity, entity_id, action, changes, old_value, new_value
						)
						SELECT ${auditId}, organization_id, ${record.actorUserId},
							${meta.correlationId}, 'fulfillment', 'delivery', id, 'UPDATE',
							${json([{ field: "status", oldValue: from, newValue: to }])}::jsonb,
							${json({ status: from, version: record.expectedVersion })}::jsonb,
							${json({ status: to, version: nextVersion })}::jsonb
						FROM mutated RETURNING id
					), outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id, ${eventType}, 'fulfillment',
							${meta.correlationId}, ${record.actorUserId},
							${eventPayload}::jsonb, 'pending', 0
						FROM mutated WHERE ${eventType}::text IS NOT NULL RETURNING id
					)
					SELECT mutated.id FROM mutated, audited
					WHERE ${eventType}::text IS NULL
						OR EXISTS (SELECT 1 FROM outboxed)
				`,
			]);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Delivery transition conflict");
			return this.reload(
				record.organizationId,
				record.deliveryId,
				"Transitioned delivery missing",
			);
		} catch (error) {
			return writeError(
				error,
				"Delivery transition conflict",
				"Failed to transition delivery",
			);
		}
	}
}

export function createDrizzleFulfillmentStore(): DrizzleFulfillmentStore {
	return new DrizzleFulfillmentStore();
}
