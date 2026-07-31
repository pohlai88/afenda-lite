import { errorResult, type Result } from "@afenda/errors";
import {
	addStockMovementLine,
	createStockMovement,
	type InventoryCommandOptions,
	postStockMovement,
	reserveStock,
} from "@afenda/inventory";
import type { z } from "zod";

import { runSequentiallyUntil } from "./async-sequence";
import {
	requireFulfillmentCommandPermission,
	requireFulfillmentQueryPermission,
} from "./authorization";
import {
	type FulfillmentCommandOptions,
	resolveCommandDeps,
} from "./command-options";
import { requireMaster } from "./master-lookup";
import {
	FULFILLMENT_COMMAND_CANCEL,
	FULFILLMENT_COMMAND_CLOSE,
	FULFILLMENT_COMMAND_CREATE,
	FULFILLMENT_COMMAND_LINE_ADD,
	FULFILLMENT_COMMAND_PACK_CONFIRM,
	FULFILLMENT_COMMAND_PICK_CONFIRM,
	FULFILLMENT_COMMAND_PICK_START,
	FULFILLMENT_COMMAND_POD_RECORD,
	FULFILLMENT_COMMAND_POST,
	FULFILLMENT_QUERY_GET,
	FULFILLMENT_QUERY_LIST,
} from "./module-ids";
import { parseFulfillmentInput } from "./parse-input";
import type { SalesFulfillmentQueryPort } from "./ports";
import {
	addDeliveryLineInputSchema,
	cancelDeliveryInputSchema,
	closeDeliveryInputSchema,
	confirmPackInputSchema,
	confirmPickInputSchema,
	createDraftDeliveryInputSchema,
	getDeliveryByIdInputSchema,
	listDeliveriesInputSchema,
	postDeliveryInputSchema,
	recordProofOfDeliveryInputSchema,
	startPickingInputSchema,
} from "./schemas";
import { normalizeDeliveryCode } from "./shared/code";
import type { FulfillmentStore } from "./store";
import type {
	Delivery,
	DeliveryLine,
	DeliveryPack,
	DeliveryPick,
	ProofOfDelivery,
} from "./types";

const _DELIVERY_INVENTORY_POST_FAILED_MESSAGE =
	"Delivery posted but inventory stock movement failed";

type AddDeliveryLineInput = z.infer<typeof addDeliveryLineInputSchema>;
type ConfirmPickInput = z.infer<typeof confirmPickInputSchema>;
type CreateDraftDeliveryInput = z.infer<typeof createDraftDeliveryInputSchema>;

interface ShipToSnapshot {
	shipToPartyCode: string | null;
	shipToPartyId: string | null;
	shipToPartyName: string | null;
}

async function resolveShipToSnapshot(
	data: CreateDraftDeliveryInput,
	sales: SalesFulfillmentQueryPort | undefined,
): Promise<Result<ShipToSnapshot>> {
	const provided = {
		shipToPartyId: data.shipToPartyId ?? null,
		shipToPartyCode: data.shipToPartyCode ?? null,
		shipToPartyName: data.shipToPartyName ?? null,
	};
	if (!data.salesOrderId) {
		return errorResult.ok(provided);
	}
	if (!sales) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	const salesOrder = await sales.getFulfillableSalesOrder({
		organizationId: data.organizationId,
		salesOrderId: data.salesOrderId,
		actorUserId: data.actorUserId,
	});
	if (!salesOrder.ok) {
		return salesOrder;
	}
	if (salesOrder.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Sales order not found",
		});
	}
	if (salesOrder.data.status !== "posted") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Sales order is not fulfillable",
		});
	}
	if (
		provided.shipToPartyId !== null ||
		provided.shipToPartyCode !== null ||
		provided.shipToPartyName !== null ||
		!salesOrder.data.shipToSnapshot
	) {
		return errorResult.ok(provided);
	}
	return errorResult.ok({
		shipToPartyId: salesOrder.data.customerPartyId,
		shipToPartyCode: salesOrder.data.customerPartyCode,
		shipToPartyName: salesOrder.data.shipToSnapshot.name,
	});
}

async function validateSalesOrderLine(
	data: AddDeliveryLineInput,
	delivery: Delivery,
	sales: SalesFulfillmentQueryPort | undefined,
	store: FulfillmentStore,
): Promise<Result<void>> {
	if (!delivery.salesOrderId) {
		return data.salesOrderLineId
			? errorResult.fail("CONFLICT", {
					publicMessage:
						"Sales order line ID cannot be set when delivery is not linked to a sales order",
				})
			: errorResult.ok(undefined);
	}
	if (!sales) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	if (!data.salesOrderLineId) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage:
				"Sales order line ID is required when delivery is linked to a sales order",
		});
	}
	const salesOrder = await sales.getFulfillableSalesOrder({
		organizationId: data.organizationId,
		salesOrderId: delivery.salesOrderId,
		actorUserId: data.actorUserId,
	});
	if (!salesOrder.ok) {
		return salesOrder;
	}
	if (!salesOrder.data) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Sales order not found",
		});
	}
	const salesLine = salesOrder.data.lines.find(
		(line) => line.salesOrderLineId === data.salesOrderLineId,
	);
	if (!salesLine) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Sales order line not found",
		});
	}
	if (salesLine.itemId !== data.itemId) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Item must match sales order line item",
		});
	}
	const sumResult = await store.sumPostedQuantityForSalesOrderLine(
		data.organizationId,
		data.salesOrderLineId,
	);
	if (!sumResult.ok) {
		return sumResult;
	}
	const remaining = Number(salesLine.orderedQuantity) - Number(sumResult.data);
	const toDeliver = Number(data.quantityToDeliver);
	return toDeliver > remaining
		? errorResult.fail("CONFLICT", {
				publicMessage: "The request conflicts with current state",
			})
		: errorResult.ok(undefined);
}

async function reservePickStock(
	data: ConfirmPickInput,
	delivery: Delivery,
	line: DeliveryLine,
	inventory: InventoryCommandOptions | undefined,
): Promise<Result<string>> {
	if (!inventory) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	const reserved = await reserveStock(
		{
			organizationId: data.organizationId,
			actorUserId: data.actorUserId,
			correlationId: data.correlationId,
			idempotencyKey: `ful-pick-reserve:${data.idempotencyKey}`,
			code: `RSV-${delivery.code}-${line.lineNo}`,
			warehouseId: delivery.warehouseId,
			itemId: line.itemId,
			quantity: data.quantityPicked,
		},
		inventory,
	);
	return reserved.ok ? errorResult.ok(reserved.data.id) : reserved;
}

async function validatePickReservation(
	data: ConfirmPickInput,
	delivery: Delivery,
	line: DeliveryLine,
	reservationId: string,
	inventory: InventoryCommandOptions,
): Promise<Result<string>> {
	if (!inventory.store) {
		return errorResult.ok(reservationId);
	}
	const reservation = await inventory.store.getReservationById(
		data.organizationId,
		reservationId,
	);
	if (!reservation.ok) {
		return reservation;
	}
	if (!reservation.data) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Reservation not found in organization",
		});
	}
	if (
		reservation.data.status !== "active" &&
		reservation.data.status !== "partially_consumed"
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Reservation must be active or partially consumed",
		});
	}
	if (reservation.data.organizationId !== data.organizationId) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Reservation must belong to the same organization",
		});
	}
	if (reservation.data.itemId !== line.itemId) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Reservation item must match delivery line item",
		});
	}
	if (reservation.data.warehouseId !== delivery.warehouseId) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Reservation warehouse must match delivery warehouse",
		});
	}
	const remaining =
		Number(reservation.data.quantity) -
		Number(reservation.data.consumedQuantity);
	const pickQuantity = Number(data.quantityPicked);
	return remaining < pickQuantity
		? errorResult.fail("CONFLICT", {
				publicMessage: "The request conflicts with current state",
			})
		: errorResult.ok(reservationId);
}

async function postDeliveryInventoryMovement(
	delivery: Delivery,
	actorUserId: string,
	correlationId: string,
	inventory: InventoryCommandOptions | undefined,
): Promise<Result<void>> {
	if (!inventory) {
		return errorResult.fail("INTERNAL_ERROR");
	}

	// Check if all picks share the same reservationId
	const reservationIds = new Set(
		delivery.picks.map((p) => p.reservationId).filter((id) => id !== null),
	);
	const singleReservationId =
		reservationIds.size === 1 ? [...reservationIds][0] : null;

	const created = await createStockMovement(
		{
			organizationId: delivery.organizationId,
			actorUserId,
			correlationId,
			idempotencyKey: `ful-post:${delivery.id}`,
			code: delivery.code,
			movementType: "issue",
			source: "fulfillment",
			warehouseId: delivery.warehouseId,
			reservationId: singleReservationId ?? undefined,
			sourceModule: "fulfillment",
			sourceAggregateId: delivery.id,
			sourceEventId: `fulfillment.delivery.posted:${delivery.id}:${delivery.version}`,
			sourceEventVersion: delivery.version,
		},
		inventory,
	);
	if (!created.ok) {
		return created;
	}

	let expectedVersion = created.data.version;
	const lineFailure = await runSequentiallyUntil<DeliveryLine, Result<void>>(
		delivery.lines,
		async (line) => {
			const added = await addStockMovementLine(
				{
					organizationId: delivery.organizationId,
					actorUserId,
					correlationId,
					idempotencyKey: `ful-post:${delivery.id}:line:${line.id}`,
					movementId: created.data.id,
					itemId: line.itemId,
					quantity: line.quantityToDeliver,
					expectedVersion,
				},
				inventory,
			);
			if (!added.ok) {
				return added;
			}
			expectedVersion += 1;
		},
	);
	if (lineFailure !== undefined) {
		return lineFailure;
	}

	const posted = await postStockMovement(
		{
			organizationId: delivery.organizationId,
			actorUserId,
			correlationId,
			idempotencyKey: `ful-post-finalize:${delivery.id}`,
			movementId: created.data.id,
			expectedVersion,
		},
		inventory,
	);
	if (!posted.ok) {
		return posted;
	}

	return errorResult.ok(undefined);
}

export async function createDraftDelivery(
	input: unknown,
	options: FulfillmentCommandOptions = {},
): Promise<Result<Delivery>> {
	const parsed = parseFulfillmentInput(
		createDraftDeliveryInputSchema,
		input,
		"Invalid delivery create input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, masters, authorization, sales } =
		resolveCommandDeps(options);
	const authorized = await requireFulfillmentCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: FULFILLMENT_COMMAND_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const code = normalizeDeliveryCode(parsed.data.code);
	if (!code.ok) {
		return code;
	}
	const warehouse = requireMaster(
		await masters.getWarehouseById(
			parsed.data.organizationId,
			parsed.data.warehouseId,
			parsed.data.actorUserId,
		),
		"Warehouse not found in organization",
	);
	if (!warehouse.ok) {
		return warehouse;
	}
	if (warehouse.data.status !== "active") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Warehouse must be active",
		});
	}

	const shipTo = await resolveShipToSnapshot(parsed.data, sales);
	if (!shipTo.ok) {
		return shipTo;
	}

	return store.createDelivery(
		{
			organizationId: parsed.data.organizationId,
			idempotencyKey: parsed.data.idempotencyKey,
			code: code.data.code,
			normalizedCode: code.data.normalizedCode,
			salesOrderId: parsed.data.salesOrderId ?? null,
			warehouseId: warehouse.data.id,
			warehouseCode: warehouse.data.code,
			warehouseName: warehouse.data.name,
			shipToPartyId: shipTo.data.shipToPartyId,
			shipToPartyCode: shipTo.data.shipToPartyCode,
			shipToPartyName: shipTo.data.shipToPartyName,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function addDeliveryLine(
	input: unknown,
	options: FulfillmentCommandOptions = {},
): Promise<Result<DeliveryLine>> {
	const parsed = parseFulfillmentInput(
		addDeliveryLineInputSchema,
		input,
		"Invalid delivery line input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, masters, authorization, sales } =
		resolveCommandDeps(options);
	const authorized = await requireFulfillmentCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: FULFILLMENT_COMMAND_LINE_ADD,
	});
	if (!authorized.ok) {
		return authorized;
	}

	// Load delivery to check if it has salesOrderId
	const delivery = await store.getDeliveryById(
		parsed.data.organizationId,
		parsed.data.deliveryId,
	);
	if (!delivery.ok) {
		return delivery;
	}
	if (!delivery.data) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Delivery not found",
		});
	}

	const salesLine = await validateSalesOrderLine(
		parsed.data,
		delivery.data,
		sales,
		store,
	);
	if (!salesLine.ok) {
		return salesLine;
	}

	const item = requireMaster(
		await masters.getItemById(
			parsed.data.organizationId,
			parsed.data.itemId,
			parsed.data.actorUserId,
		),
		"Item not found in organization",
	);
	if (!item.ok) {
		return item;
	}
	if (item.data.status !== "active") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Item must be active",
		});
	}
	const uom = requireMaster(
		await masters.getRefUomById(
			parsed.data.organizationId,
			item.data.baseUomId,
			parsed.data.actorUserId,
		),
		"Base UoM not found for item",
	);
	if (!uom.ok) {
		return uom;
	}
	return store.addLine(
		{
			organizationId: parsed.data.organizationId,
			idempotencyKey: parsed.data.idempotencyKey,
			deliveryId: parsed.data.deliveryId,
			expectedVersion: parsed.data.expectedVersion,
			itemId: item.data.id,
			itemCode: item.data.code,
			itemName: item.data.name,
			baseUomId: item.data.baseUomId,
			baseUomCode: uom.data.code,
			quantityOrdered: parsed.data.quantityOrdered ?? null,
			quantityToDeliver: parsed.data.quantityToDeliver,
			salesOrderLineId: parsed.data.salesOrderLineId ?? null,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

async function loadAndAuthorizeStateChange(
	input: unknown,
	schema:
		| typeof startPickingInputSchema
		| typeof postDeliveryInputSchema
		| typeof cancelDeliveryInputSchema
		| typeof closeDeliveryInputSchema,
	command:
		| typeof FULFILLMENT_COMMAND_PICK_START
		| typeof FULFILLMENT_COMMAND_POST
		| typeof FULFILLMENT_COMMAND_CANCEL
		| typeof FULFILLMENT_COMMAND_CLOSE,
	options: FulfillmentCommandOptions,
): Promise<
	Result<{
		data: {
			organizationId: string;
			actorUserId: string;
			correlationId: string;
			idempotencyKey: string;
			deliveryId: string;
			expectedVersion: number;
		};
		deps: ReturnType<typeof resolveCommandDeps>;
	}>
> {
	const parsed = parseFulfillmentInput(schema, input, "Invalid delivery input");
	if (!parsed.ok) {
		return parsed;
	}
	const deps = resolveCommandDeps(options);
	const authorized = await requireFulfillmentCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}
	return { ok: true, data: { data: parsed.data, deps } };
}

export async function startPicking(
	input: unknown,
	options: FulfillmentCommandOptions = {},
): Promise<Result<Delivery>> {
	const context = await loadAndAuthorizeStateChange(
		input,
		startPickingInputSchema,
		FULFILLMENT_COMMAND_PICK_START,
		options,
	);
	if (!context.ok) {
		return context;
	}
	const { data, deps } = context.data;
	return deps.store.startPicking(
		{
			organizationId: data.organizationId,
			deliveryId: data.deliveryId,
			expectedVersion: data.expectedVersion,
			actorUserId: data.actorUserId,
			idempotencyKey: data.idempotencyKey,
		},
		deps.ports,
		{
			correlationId: data.correlationId,
		},
	);
}

export async function confirmPick(
	input: unknown,
	options: FulfillmentCommandOptions = {},
): Promise<Result<DeliveryPick>> {
	const parsed = parseFulfillmentInput(
		confirmPickInputSchema,
		input,
		"Invalid pick confirmation input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const deps = resolveCommandDeps(options);
	const authorized = await requireFulfillmentCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: FULFILLMENT_COMMAND_PICK_CONFIRM,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	// Load delivery and line to validate reservation
	const delivery = await deps.store.getDeliveryById(
		parsed.data.organizationId,
		parsed.data.deliveryId,
	);
	if (!delivery.ok) {
		return delivery;
	}
	if (!delivery.data) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Delivery not found",
		});
	}
	const line = delivery.data.lines.find(
		(l) => l.id === parsed.data.deliveryLineId,
	);
	if (!line) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Delivery line not found",
		});
	}

	const { reservationId: requestedReservationId } = parsed.data;
	const reservation =
		requestedReservationId === undefined
			? await reservePickStock(parsed.data, delivery.data, line, deps.inventory)
			: await validatePickReservation(
					parsed.data,
					delivery.data,
					line,
					requestedReservationId,
					deps.inventory ?? {},
				);
	if (!reservation.ok) {
		return reservation;
	}

	return deps.store.confirmPick(
		{
			organizationId: parsed.data.organizationId,
			deliveryId: parsed.data.deliveryId,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			idempotencyKey: parsed.data.idempotencyKey,
			deliveryLineId: parsed.data.deliveryLineId,
			quantityPicked: parsed.data.quantityPicked,
			reservationId: reservation.data,
		},
		deps.ports,
		{
			correlationId: parsed.data.correlationId,
		},
	);
}

export async function confirmPack(
	input: unknown,
	options: FulfillmentCommandOptions = {},
): Promise<Result<DeliveryPack>> {
	const parsed = parseFulfillmentInput(
		confirmPackInputSchema,
		input,
		"Invalid pack confirmation input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const deps = resolveCommandDeps(options);
	const authorized = await requireFulfillmentCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: FULFILLMENT_COMMAND_PACK_CONFIRM,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}
	return deps.store.confirmPack(
		{
			organizationId: parsed.data.organizationId,
			deliveryId: parsed.data.deliveryId,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			idempotencyKey: parsed.data.idempotencyKey,
			packageCode: parsed.data.packageCode ?? null,
			notes: parsed.data.notes ?? null,
		},
		deps.ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function postDelivery(
	input: unknown,
	options: FulfillmentCommandOptions = {},
): Promise<Result<Delivery>> {
	const context = await loadAndAuthorizeStateChange(
		input,
		postDeliveryInputSchema,
		FULFILLMENT_COMMAND_POST,
		options,
	);
	if (!context.ok) {
		return context;
	}
	const { data, deps } = context.data;
	if (!deps.inventory) {
		return errorResult.fail("INTERNAL_ERROR");
	}

	// Load delivery to check if it has salesOrderId
	const delivery = await deps.store.getDeliveryById(
		data.organizationId,
		data.deliveryId,
	);
	if (!delivery.ok) {
		return delivery;
	}
	if (!delivery.data) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Delivery not found",
		});
	}

	// If salesOrderId, re-validate sales still posted
	if (delivery.data.salesOrderId) {
		if (!deps.sales) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		const salesOrder = await deps.sales.getFulfillableSalesOrder({
			organizationId: data.organizationId,
			salesOrderId: delivery.data.salesOrderId,
			actorUserId: data.actorUserId,
		});
		if (!salesOrder.ok) {
			return salesOrder;
		}
		if (!salesOrder.data) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Sales order not found",
			});
		}
		if (salesOrder.data.status !== "posted") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Sales order is no longer posted",
			});
		}
	}

	const posted = await deps.store.postDelivery(
		{
			organizationId: data.organizationId,
			deliveryId: data.deliveryId,
			expectedVersion: data.expectedVersion,
			actorUserId: data.actorUserId,
			idempotencyKey: data.idempotencyKey,
		},
		deps.ports,
		{
			correlationId: data.correlationId,
		},
	);
	if (!posted.ok) {
		return posted;
	}

	const inventoryPosted = await postDeliveryInventoryMovement(
		posted.data,
		data.actorUserId,
		data.correlationId,
		deps.inventory,
	);
	if (!inventoryPosted.ok) {
		return inventoryPosted.code === "CONFLICT"
			? errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
				})
			: errorResult.fail("INTERNAL_ERROR");
	}

	return posted;
}

export async function recordProofOfDelivery(
	input: unknown,
	options: FulfillmentCommandOptions = {},
): Promise<Result<ProofOfDelivery>> {
	const parsed = parseFulfillmentInput(
		recordProofOfDeliveryInputSchema,
		input,
		"Invalid proof of delivery input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const deps = resolveCommandDeps(options);
	const authorized = await requireFulfillmentCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: FULFILLMENT_COMMAND_POD_RECORD,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}
	return deps.store.recordProofOfDelivery(
		{
			organizationId: parsed.data.organizationId,
			deliveryId: parsed.data.deliveryId,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			idempotencyKey: parsed.data.idempotencyKey,
			receivedByName: parsed.data.receivedByName,
			outcome: parsed.data.outcome,
			proofType: parsed.data.proofType ?? null,
			evidenceRef: parsed.data.evidenceRef ?? null,
			carrierRef: parsed.data.carrierRef ?? null,
			notes: parsed.data.notes ?? null,
			recordedAt: parsed.data.recordedAt ?? new Date(),
		},
		deps.ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function cancelDelivery(
	input: unknown,
	options: FulfillmentCommandOptions = {},
): Promise<Result<Delivery>> {
	const context = await loadAndAuthorizeStateChange(
		input,
		cancelDeliveryInputSchema,
		FULFILLMENT_COMMAND_CANCEL,
		options,
	);
	if (!context.ok) {
		return context;
	}
	const { data, deps } = context.data;
	return deps.store.cancelDelivery(
		{
			organizationId: data.organizationId,
			deliveryId: data.deliveryId,
			expectedVersion: data.expectedVersion,
			actorUserId: data.actorUserId,
			idempotencyKey: data.idempotencyKey,
		},
		deps.ports,
		{
			correlationId: data.correlationId,
		},
	);
}

export async function closeDelivery(
	input: unknown,
	options: FulfillmentCommandOptions = {},
): Promise<Result<Delivery>> {
	const context = await loadAndAuthorizeStateChange(
		input,
		closeDeliveryInputSchema,
		FULFILLMENT_COMMAND_CLOSE,
		options,
	);
	if (!context.ok) {
		return context;
	}
	const { data, deps } = context.data;
	return deps.store.closeDelivery(
		{
			organizationId: data.organizationId,
			deliveryId: data.deliveryId,
			expectedVersion: data.expectedVersion,
			actorUserId: data.actorUserId,
			idempotencyKey: data.idempotencyKey,
		},
		deps.ports,
		{
			correlationId: data.correlationId,
		},
	);
}

export async function getDeliveryById(
	input: unknown,
	options: FulfillmentCommandOptions = {},
): Promise<Result<Delivery | null>> {
	const parsed = parseFulfillmentInput(
		getDeliveryByIdInputSchema,
		input,
		"Invalid delivery get input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireFulfillmentQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: FULFILLMENT_QUERY_GET,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.getDeliveryById(parsed.data.organizationId, parsed.data.id);
}

export async function listDeliveries(
	input: unknown,
	options: FulfillmentCommandOptions = {},
): Promise<Result<Delivery[]>> {
	const parsed = parseFulfillmentInput(
		listDeliveriesInputSchema,
		input,
		"Invalid delivery list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireFulfillmentQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: FULFILLMENT_QUERY_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listDeliveries({
		organizationId: parsed.data.organizationId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
		status: parsed.data.status,
		warehouseId: parsed.data.warehouseId,
		salesOrderId: parsed.data.salesOrderId,
		sort: parsed.data.sort,
	});
}

export async function getInvoiceableDelivery(
	input: {
		organizationId: string;
		deliveryId: string;
		actorUserId: string;
	},
	options: FulfillmentCommandOptions = {},
): Promise<
	Result<{
		deliveryId: string;
		status: string;
		salesOrderId: string | null;
		customerPartyId: string;
		customerPartyCode: string;
		customerPartyName: string;
		lines: Array<{
			deliveryLineId: string;
			salesOrderLineId: string | null;
			itemId: string;
			itemCode: string;
			itemName: string;
			authorizedQuantity: string;
			remainingInvoiceableQuantity: string;
		}>;
	} | null>
> {
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireFulfillmentQueryPermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		query: FULFILLMENT_QUERY_GET,
	});
	if (!authorized.ok) {
		return authorized;
	}

	const delivery = await store.getDeliveryById(
		input.organizationId,
		input.deliveryId,
	);
	if (!delivery.ok) {
		return delivery;
	}
	if (delivery.data === null) {
		return errorResult.ok(null);
	}
	if (
		delivery.data.status !== "posted" &&
		delivery.data.status !== "delivered" &&
		delivery.data.status !== "closed"
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Delivery is not invoiceable",
		});
	}

	return errorResult.ok({
		deliveryId: delivery.data.id,
		status: delivery.data.status,
		salesOrderId: delivery.data.salesOrderId,
		customerPartyId: delivery.data.shipToPartyId ?? "",
		customerPartyCode: delivery.data.shipToPartyCode ?? "",
		customerPartyName: delivery.data.shipToPartyName ?? "",
		lines: delivery.data.lines.map((line) => ({
			deliveryLineId: line.id,
			salesOrderLineId: line.salesOrderLineId,
			itemId: line.itemId,
			itemCode: line.itemCode,
			itemName: line.itemName,
			authorizedQuantity: line.quantityToDeliver,
			remainingInvoiceableQuantity: line.quantityToDeliver,
		})),
	});
}
