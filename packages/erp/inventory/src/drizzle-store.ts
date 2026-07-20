import { randomUUID } from "node:crypto";

import {
	and,
	asc,
	db,
	desc,
	eq,
	inArray,
	runNeonHttpTransaction,
	stockBalance,
	stockMovement,
	stockMovementLine,
	stockReservation,
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";

import type { MutationPorts } from "./ports";
import {
	type AvailabilityFilter,
	computeBalanceEffects,
	formatQuantity,
	type InventoryStore,
	type MovementCreateRecord,
	type MovementLineCreateRecord,
	type MovementListFilter,
	type MovementPostRecord,
	parseQuantity,
} from "./store";
import {
	STOCK_MOVEMENT_STATUSES,
	STOCK_MOVEMENT_TYPES,
	STOCK_RESERVATION_STATUSES,
	type StockBalance,
	type StockMovement,
	type StockMovementLine,
	type StockMovementStatus,
	type StockMovementType,
	type StockReservation,
	type StockReservationStatus,
} from "./types";

type MovementSqlRow = {
	id: string;
	organization_id: string;
	code: string;
	normalized_code: string;
	movement_type: string;
	status: string;
	warehouse_id: string | null;
	warehouse_code: string | null;
	warehouse_name: string | null;
	from_warehouse_id: string | null;
	from_warehouse_code: string | null;
	from_warehouse_name: string | null;
	to_warehouse_id: string | null;
	to_warehouse_code: string | null;
	to_warehouse_name: string | null;
	reservation_id: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	posted_at: Date | null;
	posted_by: string | null;
	created_at: Date;
	updated_at: Date;
};

type LineSqlRow = {
	id: string;
	organization_id: string;
	movement_id: string;
	line_no: number;
	item_id: string;
	item_code: string;
	item_name: string;
	base_uom_id: string;
	base_uom_code: string;
	quantity: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function parseMovementType(value: string): StockMovementType {
	for (const candidate of STOCK_MOVEMENT_TYPES) {
		if (candidate === value) {
			return candidate;
		}
	}
	throw new Error(`Invalid stock_movement.movement_type: ${value}`);
}

function parseMovementStatus(value: string): StockMovementStatus {
	for (const candidate of STOCK_MOVEMENT_STATUSES) {
		if (candidate === value) {
			return candidate;
		}
	}
	throw new Error(`Invalid stock_movement.status: ${value}`);
}

function parseReservationStatus(value: string): StockReservationStatus {
	for (const candidate of STOCK_RESERVATION_STATUSES) {
		if (candidate === value) {
			return candidate;
		}
	}
	throw new Error(`Invalid stock_reservation.status: ${value}`);
}

function mapLine(row: LineSqlRow): StockMovementLine {
	return {
		id: row.id,
		organizationId: row.organization_id,
		movementId: row.movement_id,
		lineNo: row.line_no,
		itemId: row.item_id,
		itemCode: row.item_code,
		itemName: row.item_name,
		baseUomId: row.base_uom_id,
		baseUomCode: row.base_uom_code,
		quantity: row.quantity,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function mapMovement(
	row: MovementSqlRow,
	lines: StockMovementLine[],
): StockMovement {
	return {
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		normalizedCode: row.normalized_code,
		movementType: parseMovementType(row.movement_type),
		status: parseMovementStatus(row.status),
		warehouseId: row.warehouse_id,
		warehouseCode: row.warehouse_code,
		warehouseName: row.warehouse_name,
		fromWarehouseId: row.from_warehouse_id,
		fromWarehouseCode: row.from_warehouse_code,
		fromWarehouseName: row.from_warehouse_name,
		toWarehouseId: row.to_warehouse_id,
		toWarehouseCode: row.to_warehouse_code,
		toWarehouseName: row.to_warehouse_name,
		reservationId: row.reservation_id,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		postedAt: row.posted_at,
		postedBy: row.posted_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		lines,
	};
}

function mapHeaderRow(
	header: typeof stockMovement.$inferSelect,
): MovementSqlRow {
	return {
		id: header.id,
		organization_id: header.organizationId,
		code: header.code,
		normalized_code: header.normalizedCode,
		movement_type: header.movementType,
		status: header.status,
		warehouse_id: header.warehouseId,
		warehouse_code: header.warehouseCode,
		warehouse_name: header.warehouseName,
		from_warehouse_id: header.fromWarehouseId,
		from_warehouse_code: header.fromWarehouseCode,
		from_warehouse_name: header.fromWarehouseName,
		to_warehouse_id: header.toWarehouseId,
		to_warehouse_code: header.toWarehouseCode,
		to_warehouse_name: header.toWarehouseName,
		reservation_id: header.reservationId,
		version: header.version,
		created_by: header.createdBy,
		updated_by: header.updatedBy,
		posted_at: header.postedAt,
		posted_by: header.postedBy,
		created_at: header.createdAt,
		updated_at: header.updatedAt,
	};
}

function mapLineFromSelect(
	line: typeof stockMovementLine.$inferSelect,
): StockMovementLine {
	return mapLine({
		id: line.id,
		organization_id: line.organizationId,
		movement_id: line.movementId,
		line_no: line.lineNo,
		item_id: line.itemId,
		item_code: line.itemCode,
		item_name: line.itemName,
		base_uom_id: line.baseUomId,
		base_uom_code: line.baseUomCode,
		quantity: line.quantity,
		version: line.version,
		created_by: line.createdBy,
		updated_by: line.updatedBy,
		created_at: line.createdAt,
		updated_at: line.updatedAt,
	});
}

function mapBalance(row: typeof stockBalance.$inferSelect): StockBalance {
	return {
		id: row.id,
		organizationId: row.organizationId,
		warehouseId: row.warehouseId,
		warehouseCode: row.warehouseCode,
		itemId: row.itemId,
		itemCode: row.itemCode,
		onHand: row.onHand,
		reserved: row.reserved,
		available: row.available,
		version: row.version,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapReservation(
	row: typeof stockReservation.$inferSelect,
): StockReservation {
	return {
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		status: parseReservationStatus(row.status),
		warehouseId: row.warehouseId,
		warehouseCode: row.warehouseCode,
		warehouseName: row.warehouseName,
		itemId: row.itemId,
		itemCode: row.itemCode,
		itemName: row.itemName,
		baseUomId: row.baseUomId,
		baseUomCode: row.baseUomCode,
		quantity: row.quantity,
		sourceMovementId: row.sourceMovementId,
		releaseMovementId: row.releaseMovementId,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		releasedAt: row.releasedAt,
		releasedBy: row.releasedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function eventPayloadJson(input: Record<string, unknown>): string {
	return JSON.stringify(input);
}

function fieldChangeJson(
	field: string,
	oldValue: unknown,
	newValue: unknown,
): string {
	return JSON.stringify([{ field, oldValue, newValue }]);
}

function valueSnapshotJson(value: Record<string, unknown>): string {
	return JSON.stringify(value);
}

function mapWriteError(
	error: unknown,
	conflictMessage: string,
	fallbackMessage: string,
): Result<never> {
	const message = error instanceof Error ? error.message : String(error);
	if (/unique|duplicate/i.test(message)) {
		return fail("CONFLICT", conflictMessage);
	}
	if (/insufficient|negative|available/i.test(message)) {
		return fail("CONFLICT", conflictMessage);
	}
	return failFromUnknown(error, fallbackMessage);
}

export class DrizzleInventoryStore implements InventoryStore {
	async createMovement(
		record: MovementCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<StockMovement>> {
		const entityId = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changesJson = fieldChangeJson("code", null, record.code);
		const newValueJson = valueSnapshotJson({
			code: record.code,
			status: "draft",
			movementType: record.movementType,
		});
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "stock_movement",
			entityId,
			code: record.code,
			version: 1,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
			movementType: record.movementType,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[MovementSqlRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO stock_movement (
							id, organization_id, code, normalized_code, movement_type, status,
							warehouse_id, warehouse_code, warehouse_name,
							from_warehouse_id, from_warehouse_code, from_warehouse_name,
							to_warehouse_id, to_warehouse_code, to_warehouse_name,
							reservation_id, version, created_by, updated_by
						) VALUES (
							${entityId}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
							${record.movementType}, 'draft',
							${record.warehouseId}, ${record.warehouseCode}, ${record.warehouseName},
							${record.fromWarehouseId}, ${record.fromWarehouseCode}, ${record.fromWarehouseName},
							${record.toWarehouseId}, ${record.toWarehouseCode}, ${record.toWarehouseName},
							${record.reservationId}, 1, ${record.createdBy}, ${record.createdBy}
						)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'inventory', 'stock_movement', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, 'inventory.movement.created.v1', 'inventory',
							${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			]);
			const row = rows[0];
			if (row === undefined) {
				return fail("INTERNAL_ERROR", "Stock movement create returned no row");
			}
			return ok(mapMovement(row, []));
		} catch (error) {
			return mapWriteError(
				error,
				"Stock movement code already exists",
				"Failed to create stock movement",
			);
		}
	}

	async addLine(
		record: MovementLineCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<StockMovementLine>> {
		const movementResult = await this.getMovementById(
			record.organizationId,
			record.movementId,
		);
		if (!movementResult.ok) {
			return movementResult;
		}
		if (movementResult.data === null) {
			return fail("NOT_FOUND", "Stock movement not found");
		}
		if (movementResult.data.status !== "draft") {
			return fail("CONFLICT", "Cannot add lines to a non-draft stock movement");
		}
		const qty = parseQuantity(record.quantity);
		if (movementResult.data.movementType === "adjustment") {
			if (qty === 0) {
				return fail("BAD_REQUEST", "Adjustment quantity must be non-zero");
			}
		} else if (qty <= 0) {
			return fail("BAD_REQUEST", "Quantity must be a positive number");
		}

		const lineNo =
			movementResult.data.lines.reduce(
				(max, line) => Math.max(max, line.lineNo),
				0,
			) + 1;
		const lineId = randomUUID();
		const auditId = randomUUID();
		const changesJson = fieldChangeJson("item_code", null, record.itemCode);
		const newValueJson = valueSnapshotJson({
			movementId: record.movementId,
			lineNo,
			itemCode: record.itemCode,
			quantity: record.quantity,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[LineSqlRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO stock_movement_line (
							id, organization_id, movement_id, line_no,
							item_id, item_code, item_name, base_uom_id, base_uom_code,
							quantity, version, created_by, updated_by
						) VALUES (
							${lineId}, ${record.organizationId}, ${record.movementId}, ${lineNo},
							${record.itemId}, ${record.itemCode}, ${record.itemName},
							${record.baseUomId}, ${record.baseUomCode},
							${record.quantity}, 1, ${record.createdBy}, ${record.createdBy}
						)
						RETURNING *
					),
					bumped AS (
						UPDATE stock_movement
						SET version = version + 1,
							updated_by = ${record.createdBy},
							updated_at = now()
						WHERE id = ${record.movementId}
							AND organization_id = ${record.organizationId}
							AND status = 'draft'
						RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'inventory', 'stock_movement_line', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, bumped, audited
				`,
			]);
			const row = rows[0];
			if (row === undefined) {
				return fail(
					"INTERNAL_ERROR",
					"Stock movement line create returned no row",
				);
			}
			return ok(mapLine(row));
		} catch (error) {
			return mapWriteError(
				error,
				"Stock movement line conflict",
				"Failed to add stock movement line",
			);
		}
	}

	async postMovement(
		record: MovementPostRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<StockMovement>> {
		const existing = await this.getMovementById(
			record.organizationId,
			record.movementId,
		);
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return fail("NOT_FOUND", "Stock movement not found");
		}
		const current = existing.data;
		if (current.status !== "draft") {
			return fail("CONFLICT", "Stock movement is not in draft status");
		}
		if (current.version !== record.expectedVersion) {
			return fail("CONFLICT", "Stock movement version conflict");
		}
		if (current.lines.length === 0) {
			return fail("CONFLICT", "Cannot post stock movement without lines");
		}

		let reservationRow: StockReservation | null = null;
		if (current.movementType === "reservation_release") {
			if (current.reservationId === null) {
				return fail("CONFLICT", "Reservation release requires reservationId");
			}
			const reservationResult = await this.getReservationById(
				record.organizationId,
				current.reservationId,
			);
			if (!reservationResult.ok) {
				return reservationResult;
			}
			if (reservationResult.data === null) {
				return fail("NOT_FOUND", "Stock reservation not found");
			}
			reservationRow = reservationResult.data;
			if (reservationRow.status !== "active") {
				return fail("CONFLICT", "Stock reservation is not active");
			}
			if (
				record.reservationExpectedVersion !== undefined &&
				reservationRow.version !== record.reservationExpectedVersion
			) {
				return fail("CONFLICT", "Stock reservation version conflict");
			}
		}

		if (current.movementType === "reservation" && current.lines.length !== 1) {
			return fail(
				"CONFLICT",
				"Reservation movement must have exactly one line",
			);
		}

		const effects = computeBalanceEffects(current);
		const balanceCheck = await this.validateBalanceEffects(
			record.organizationId,
			effects,
		);
		if (!balanceCheck.ok) {
			return balanceCheck;
		}

		const nextVersion = current.version + 1;
		const auditId = randomUUID();
		const postedEventId = randomUUID();
		const reservationId =
			current.movementType === "reservation" ? randomUUID() : null;
		const reservedEventId =
			current.movementType === "reservation" ? randomUUID() : null;
		const releasedEventId =
			current.movementType === "reservation_release" ? randomUUID() : null;

		const changesJson = fieldChangeJson("status", "draft", "posted");
		const oldValueJson = valueSnapshotJson({
			status: "draft",
			version: current.version,
		});
		const newValueJson = valueSnapshotJson({
			status: "posted",
			version: nextVersion,
		});
		const postedPayloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "stock_movement",
			entityId: record.movementId,
			code: current.code,
			version: nextVersion,
			actorId: record.actorUserId,
			correlationId: meta.correlationId,
			movementType: current.movementType,
		});

		try {
			const resultSets = await runNeonHttpTransaction<unknown[][]>((sql) => {
				const statements = [
					sql`
						WITH mutated AS (
							UPDATE stock_movement
							SET status = 'posted',
								posted_at = now(),
								posted_by = ${record.actorUserId},
								updated_by = ${record.actorUserId},
								updated_at = now(),
								version = ${nextVersion},
								reservation_id = COALESCE(${reservationId}, reservation_id)
							WHERE id = ${record.movementId}
								AND organization_id = ${record.organizationId}
								AND status = 'draft'
								AND version = ${record.expectedVersion}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value
							)
							SELECT
								${auditId}, organization_id, ${record.actorUserId}, ${meta.correlationId},
								'inventory', 'stock_movement', id, 'UPDATE', ${changesJson}::jsonb,
								${oldValueJson}::jsonb, ${newValueJson}::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${postedEventId}, organization_id, 'inventory.movement.posted.v1', 'inventory',
								${meta.correlationId}, ${record.actorUserId}, ${postedPayloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				];

				for (const effect of effects) {
					const balanceId = randomUUID();
					const ledgerId = randomUUID();
					const onHandDelta = formatQuantity(effect.onHandDelta);
					const reservedDelta = formatQuantity(effect.reservedDelta);
					const availableDelta = formatQuantity(effect.availableDelta);
					const quantityDelta = formatQuantity(effect.quantityDelta);
					// Empty upserted (insufficient qty race) must abort the TX — raise via 1/0.
					statements.push(sql`
						WITH upserted AS (
							INSERT INTO stock_balance (
								id, organization_id, warehouse_id, warehouse_code, item_id, item_code,
								on_hand, reserved, available, version, updated_by
							) VALUES (
								${balanceId}, ${record.organizationId}, ${effect.warehouseId}, ${effect.warehouseCode},
								${effect.itemId}, ${effect.itemCode},
								${onHandDelta}, ${reservedDelta}, ${availableDelta}, 1, ${record.actorUserId}
							)
							ON CONFLICT (organization_id, warehouse_id, item_id)
							DO UPDATE SET
								on_hand = stock_balance.on_hand + EXCLUDED.on_hand,
								reserved = stock_balance.reserved + EXCLUDED.reserved,
								available = stock_balance.available + EXCLUDED.available,
								warehouse_code = EXCLUDED.warehouse_code,
								item_code = EXCLUDED.item_code,
								version = stock_balance.version + 1,
								updated_by = EXCLUDED.updated_by,
								updated_at = now()
							WHERE stock_balance.available + EXCLUDED.available >= 0
								AND stock_balance.reserved + EXCLUDED.reserved >= 0
								AND stock_balance.on_hand + EXCLUDED.on_hand >= 0
							RETURNING *
						),
						ledgered AS (
							INSERT INTO stock_ledger_entry (
								id, organization_id, movement_id, movement_line_id, movement_code, movement_type,
								warehouse_id, warehouse_code, item_id, item_code,
								quantity_delta, on_hand_after, reserved_after, available_after,
								actor_user_id, correlation_id
							)
							SELECT
								${ledgerId}, organization_id, ${record.movementId}, ${effect.movementLineId},
								${current.code}, ${current.movementType},
								warehouse_id, warehouse_code, item_id, item_code,
								${quantityDelta}, on_hand, reserved, available,
								${record.actorUserId}, ${meta.correlationId}
							FROM upserted
							RETURNING id
						)
						SELECT CASE
							WHEN EXISTS (SELECT 1 FROM upserted)
								THEN (SELECT id FROM upserted LIMIT 1)
							ELSE (SELECT (1 / 0)::uuid)
						END AS id
						FROM ledgered
					`);
				}

				if (
					current.movementType === "reservation" &&
					reservationId !== null &&
					reservedEventId !== null
				) {
					const line = current.lines[0];
					if (line === undefined) {
						throw new Error("Reservation line missing");
					}
					if (
						current.warehouseId === null ||
						current.warehouseCode === null ||
						current.warehouseName === null
					) {
						throw new Error("Reservation warehouse missing");
					}
					const reservedPayloadJson = eventPayloadJson({
						organizationId: record.organizationId,
						entityType: "stock_reservation",
						entityId: reservationId,
						code: current.code,
						version: 1,
						actorId: record.actorUserId,
						correlationId: meta.correlationId,
						warehouseId: current.warehouseId,
						itemId: line.itemId,
						quantity: line.quantity,
						movementId: record.movementId,
					});
					statements.push(sql`
						WITH created AS (
							INSERT INTO stock_reservation (
								id, organization_id, code, normalized_code, status,
								warehouse_id, warehouse_code, warehouse_name,
								item_id, item_code, item_name, base_uom_id, base_uom_code,
								quantity, source_movement_id, version, created_by, updated_by
							) VALUES (
								${reservationId}, ${record.organizationId}, ${current.code}, ${current.normalizedCode}, 'active',
								${current.warehouseId}, ${current.warehouseCode}, ${current.warehouseName},
								${line.itemId}, ${line.itemCode}, ${line.itemName}, ${line.baseUomId}, ${line.baseUomCode},
								${line.quantity}, ${record.movementId}, 1, ${record.actorUserId}, ${record.actorUserId}
							)
							RETURNING *
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${reservedEventId}, organization_id, 'inventory.stock.reserved.v1', 'inventory',
								${meta.correlationId}, ${record.actorUserId}, ${reservedPayloadJson}::jsonb, 'pending', 0
							FROM created
							RETURNING id
						)
						SELECT CASE
							WHEN EXISTS (SELECT 1 FROM created)
								THEN (SELECT id FROM created LIMIT 1)
							ELSE (SELECT (1 / 0)::uuid)
						END AS id
						FROM outboxed
					`);
				}

				if (
					current.movementType === "reservation_release" &&
					reservationRow !== null &&
					releasedEventId !== null
				) {
					const nextReservationVersion = reservationRow.version + 1;
					const releasedPayloadJson = eventPayloadJson({
						organizationId: record.organizationId,
						entityType: "stock_reservation",
						entityId: reservationRow.id,
						code: reservationRow.code,
						version: nextReservationVersion,
						actorId: record.actorUserId,
						correlationId: meta.correlationId,
						warehouseId: reservationRow.warehouseId,
						itemId: reservationRow.itemId,
						quantity: reservationRow.quantity,
						movementId: record.movementId,
					});
					const expectedReservationVersion =
						record.reservationExpectedVersion ?? reservationRow.version;
					statements.push(sql`
						WITH released AS (
							UPDATE stock_reservation
							SET status = 'released',
								release_movement_id = ${record.movementId},
								released_at = now(),
								released_by = ${record.actorUserId},
								updated_by = ${record.actorUserId},
								updated_at = now(),
								version = ${nextReservationVersion}
							WHERE id = ${reservationRow.id}
								AND organization_id = ${record.organizationId}
								AND status = 'active'
								AND version = ${expectedReservationVersion}
							RETURNING *
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${releasedEventId}, organization_id, 'inventory.reservation.released.v1', 'inventory',
								${meta.correlationId}, ${record.actorUserId}, ${releasedPayloadJson}::jsonb, 'pending', 0
							FROM released
							RETURNING id
						)
						SELECT CASE
							WHEN EXISTS (SELECT 1 FROM released)
								THEN (SELECT id FROM released LIMIT 1)
							ELSE (SELECT (1 / 0)::uuid)
						END AS id
						FROM outboxed
					`);
				}

				return statements;
			});

			const headerRows = resultSets[0];
			if (!Array.isArray(headerRows) || headerRows[0] === undefined) {
				return fail("CONFLICT", "Stock movement version conflict");
			}
			for (let index = 1; index < resultSets.length; index += 1) {
				const sideEffectRows = resultSets[index];
				if (
					!Array.isArray(sideEffectRows) ||
					sideEffectRows[0] === undefined
				) {
					return fail(
						"CONFLICT",
						"Stock balance or reservation side-effect failed during post",
					);
				}
			}
			const reloaded = await this.getMovementById(
				record.organizationId,
				record.movementId,
			);
			if (!reloaded.ok) {
				return reloaded;
			}
			if (reloaded.data === null) {
				return fail(
					"INTERNAL_ERROR",
					"Posted stock movement missing after write",
				);
			}
			return ok(reloaded.data);
		} catch (error) {
			return mapWriteError(
				error,
				"Insufficient available stock for movement post",
				"Failed to post stock movement",
			);
		}
	}

	async getMovementById(
		organizationId: string,
		id: string,
	): Promise<Result<StockMovement | null>> {
		try {
			const [header] = await db
				.select()
				.from(stockMovement)
				.where(
					and(
						eq(stockMovement.organizationId, organizationId),
						eq(stockMovement.id, id),
					),
				)
				.limit(1);
			if (header === undefined) {
				return ok(null);
			}
			const lines = await db
				.select()
				.from(stockMovementLine)
				.where(
					and(
						eq(stockMovementLine.organizationId, organizationId),
						eq(stockMovementLine.movementId, id),
					),
				)
				.orderBy(asc(stockMovementLine.lineNo));
			return ok(
				mapMovement(
					mapHeaderRow(header),
					lines.map((line) => mapLineFromSelect(line)),
				),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to load stock movement");
		}
	}

	async listMovements(
		filter: MovementListFilter,
	): Promise<Result<StockMovement[]>> {
		try {
			const conditions = [
				eq(stockMovement.organizationId, filter.organizationId),
			];
			if (filter.status !== undefined) {
				conditions.push(eq(stockMovement.status, filter.status));
			}
			if (filter.movementType !== undefined) {
				conditions.push(eq(stockMovement.movementType, filter.movementType));
			}
			const headers = await db
				.select()
				.from(stockMovement)
				.where(and(...conditions))
				.orderBy(desc(stockMovement.updatedAt), desc(stockMovement.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);

			if (headers.length === 0) {
				return ok([]);
			}

			const movementIds = headers.map((header) => header.id);
			const lineRows = await db
				.select()
				.from(stockMovementLine)
				.where(
					and(
						eq(stockMovementLine.organizationId, filter.organizationId),
						inArray(stockMovementLine.movementId, movementIds),
					),
				)
				.orderBy(asc(stockMovementLine.lineNo), asc(stockMovementLine.id));

			const linesByMovementId = new Map<string, StockMovementLine[]>();
			for (const line of lineRows) {
				const mapped = mapLineFromSelect(line);
				const bucket = linesByMovementId.get(line.movementId);
				if (bucket === undefined) {
					linesByMovementId.set(line.movementId, [mapped]);
				} else {
					bucket.push(mapped);
				}
			}

			return ok(
				headers.map((header) =>
					mapMovement(
						mapHeaderRow(header),
						linesByMovementId.get(header.id) ?? [],
					),
				),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to list stock movements");
		}
	}

	async getAvailability(
		filter: AvailabilityFilter,
	): Promise<Result<StockBalance[]>> {
		try {
			const conditions = [
				eq(stockBalance.organizationId, filter.organizationId),
			];
			if (filter.warehouseId !== undefined) {
				conditions.push(eq(stockBalance.warehouseId, filter.warehouseId));
			}
			if (filter.itemId !== undefined) {
				conditions.push(eq(stockBalance.itemId, filter.itemId));
			}
			const rows = await db
				.select()
				.from(stockBalance)
				.where(and(...conditions))
				.orderBy(asc(stockBalance.warehouseCode), asc(stockBalance.itemCode));
			return ok(rows.map(mapBalance));
		} catch (error) {
			return failFromUnknown(error, "Failed to load stock availability");
		}
	}

	private async validateBalanceEffects(
		organizationId: string,
		effects: ReturnType<typeof computeBalanceEffects>,
	): Promise<Result<void>> {
		for (const effect of effects) {
			const [row] = await db
				.select()
				.from(stockBalance)
				.where(
					and(
						eq(stockBalance.organizationId, organizationId),
						eq(stockBalance.warehouseId, effect.warehouseId),
						eq(stockBalance.itemId, effect.itemId),
					),
				)
				.limit(1);
			const onHand =
				(row === undefined ? 0 : parseQuantity(row.onHand)) +
				effect.onHandDelta;
			const reserved =
				(row === undefined ? 0 : parseQuantity(row.reserved)) +
				effect.reservedDelta;
			const available =
				(row === undefined ? 0 : parseQuantity(row.available)) +
				effect.availableDelta;
			if (available < 0) {
				return fail(
					"CONFLICT",
					"Insufficient available stock for movement post",
				);
			}
			if (reserved < 0) {
				return fail("CONFLICT", "Insufficient reserved stock for release");
			}
			if (onHand < 0) {
				return fail("CONFLICT", "Stock on-hand would become negative");
			}
		}
		return ok(undefined);
	}

	async getReservationById(
		organizationId: string,
		id: string,
	): Promise<Result<StockReservation | null>> {
		try {
			const [row] = await db
				.select()
				.from(stockReservation)
				.where(
					and(
						eq(stockReservation.organizationId, organizationId),
						eq(stockReservation.id, id),
					),
				)
				.limit(1);
			if (row === undefined) {
				return ok(null);
			}
			return ok(mapReservation(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load stock reservation");
		}
	}
}

export function createDrizzleInventoryStore(): DrizzleInventoryStore {
	return new DrizzleInventoryStore();
}
