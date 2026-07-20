import { fail, ok, type Result } from "@afenda/errors/result";
import {
	addStockMovementLine,
	createStockMovement,
	type InventoryCommandOptions,
	postStockMovement,
} from "@afenda/inventory";

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
import type {
	Delivery,
	DeliveryLine,
	DeliveryPack,
	DeliveryPick,
	ProofOfDelivery,
} from "./types";

async function postDeliveryInventoryMovement(
	delivery: Delivery,
	actorUserId: string,
	correlationId: string,
	inventory: InventoryCommandOptions | undefined,
): Promise<Result<void>> {
	if (!inventory) {
		return fail(
			"INTERNAL_ERROR",
			"Inventory command options are required to post delivery stock",
		);
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
	for (const line of delivery.lines) {
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

	return ok(undefined);
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
	if (!parsed.ok) return parsed;
	const { store, ports, masters, authorization, sales } =
		resolveCommandDeps(options);
	const authorized = await requireFulfillmentCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: FULFILLMENT_COMMAND_CREATE,
	});
	if (!authorized.ok) return authorized;
	const code = normalizeDeliveryCode(parsed.data.code);
	if (!code.ok) return code;
	const warehouse = requireMaster(
		await masters.getWarehouseById(
			parsed.data.organizationId,
			parsed.data.warehouseId,
			parsed.data.actorUserId,
		),
		"Warehouse not found in organization",
	);
	if (!warehouse.ok) return warehouse;
	if (warehouse.data.status !== "active")
		return fail("CONFLICT", "Warehouse must be active");

	// If salesOrderId set, require options.sales and validate
	let shipToPartyId = parsed.data.shipToPartyId ?? null;
	let shipToPartyCode = parsed.data.shipToPartyCode ?? null;
	let shipToPartyName = parsed.data.shipToPartyName ?? null;

	if (parsed.data.salesOrderId) {
		if (!sales) {
			return fail(
				"INTERNAL_ERROR",
				"Sales query port is required when fulfilling a sales order",
			);
		}
		const salesOrder = await sales.getFulfillableSalesOrder({
			organizationId: parsed.data.organizationId,
			salesOrderId: parsed.data.salesOrderId,
			actorUserId: parsed.data.actorUserId,
		});
		if (!salesOrder.ok) return salesOrder;
		if (salesOrder.data === null) {
			return fail("NOT_FOUND", "Sales order not found");
		}
		if (salesOrder.data.status !== "posted") {
			return fail("CONFLICT", "Sales order is not fulfillable");
		}
		// Snapshot ship-to from sales if not provided
		if (
			shipToPartyId === null &&
			shipToPartyCode === null &&
			shipToPartyName === null &&
			salesOrder.data.shipToSnapshot
		) {
			shipToPartyId = salesOrder.data.customerPartyId;
			shipToPartyCode = salesOrder.data.customerPartyCode;
			shipToPartyName = salesOrder.data.shipToSnapshot.name;
		}
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
			shipToPartyId,
			shipToPartyCode,
			shipToPartyName,
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
	if (!parsed.ok) return parsed;
	const { store, ports, masters, authorization, sales } =
		resolveCommandDeps(options);
	const authorized = await requireFulfillmentCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: FULFILLMENT_COMMAND_LINE_ADD,
	});
	if (!authorized.ok) return authorized;

	// Load delivery to check if it has salesOrderId
	const delivery = await store.getDeliveryById(
		parsed.data.organizationId,
		parsed.data.deliveryId,
	);
	if (!delivery.ok) return delivery;
	if (!delivery.data) {
		return fail("NOT_FOUND", "Delivery not found");
	}

	// Validate sales order line if delivery has salesOrderId
	if (delivery.data.salesOrderId) {
		if (!sales) {
			return fail(
				"INTERNAL_ERROR",
				"Sales query port is required when fulfilling a sales order",
			);
		}
		if (!parsed.data.salesOrderLineId) {
			return fail(
				"CONFLICT",
				"Sales order line ID is required when delivery is linked to a sales order",
			);
		}
		const salesOrder = await sales.getFulfillableSalesOrder({
			organizationId: parsed.data.organizationId,
			salesOrderId: delivery.data.salesOrderId,
			actorUserId: parsed.data.actorUserId,
		});
		if (!salesOrder.ok) return salesOrder;
		if (!salesOrder.data) {
			return fail("NOT_FOUND", "Sales order not found");
		}
		// Find the sales order line
		const salesLine = salesOrder.data.lines.find(
			(l) => l.salesOrderLineId === parsed.data.salesOrderLineId,
		);
		if (!salesLine) {
			return fail("NOT_FOUND", "Sales order line not found");
		}
		// Validate item matches
		if (salesLine.itemId !== parsed.data.itemId) {
			return fail("CONFLICT", "Item must match sales order line item");
		}
		// Compute remaining quantity via store.sumPostedQuantityForSalesOrderLine
		const sumResult = await store.sumPostedQuantityForSalesOrderLine(
			parsed.data.organizationId,
			parsed.data.salesOrderLineId,
		);
		if (!sumResult.ok) return sumResult;
		const alreadyFulfilled = Number(sumResult.data);
		const ordered = Number(salesLine.orderedQuantity);
		const remaining = ordered - alreadyFulfilled;
		const toDeliver = Number(parsed.data.quantityToDeliver);
		if (toDeliver > remaining) {
			return fail(
				"CONFLICT",
				`Delivery quantity ${toDeliver} exceeds remaining ${remaining} for sales order line`,
			);
		}
	} else if (parsed.data.salesOrderLineId) {
		return fail(
			"CONFLICT",
			"Sales order line ID cannot be set when delivery is not linked to a sales order",
		);
	}

	const item = requireMaster(
		await masters.getItemById(
			parsed.data.organizationId,
			parsed.data.itemId,
			parsed.data.actorUserId,
		),
		"Item not found in organization",
	);
	if (!item.ok) return item;
	if (item.data.status !== "active")
		return fail("CONFLICT", "Item must be active");
	const uom = requireMaster(
		await masters.getRefUomById(
			parsed.data.organizationId,
			item.data.baseUomId,
			parsed.data.actorUserId,
		),
		"Base UoM not found for item",
	);
	if (!uom.ok) return uom;
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
	if (!parsed.ok) return parsed;
	const deps = resolveCommandDeps(options);
	const authorized = await requireFulfillmentCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command,
		},
	);
	if (!authorized.ok) return authorized;
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
	if (!context.ok) return context;
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
	if (!parsed.ok) return parsed;
	const deps = resolveCommandDeps(options);
	const authorized = await requireFulfillmentCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: FULFILLMENT_COMMAND_PICK_CONFIRM,
		},
	);
	if (!authorized.ok) return authorized;

	// Load delivery and line to validate reservation
	const delivery = await deps.store.getDeliveryById(
		parsed.data.organizationId,
		parsed.data.deliveryId,
	);
	if (!delivery.ok) return delivery;
	if (!delivery.data) {
		return fail("NOT_FOUND", "Delivery not found");
	}
	const line = delivery.data.lines.find(
		(l) => l.id === parsed.data.deliveryLineId,
	);
	if (!line) {
		return fail("NOT_FOUND", "Delivery line not found");
	}

	if (deps.inventory?.store) {
		const reservation = await deps.inventory.store.getReservationById(
			parsed.data.organizationId,
			parsed.data.reservationId,
		);
		if (!reservation.ok) return reservation;
		if (!reservation.data) {
			return fail("NOT_FOUND", "Reservation not found in organization");
		}
		// Validate status
		if (
			reservation.data.status !== "active" &&
			reservation.data.status !== "partially_consumed"
		) {
			return fail(
				"CONFLICT",
				"Reservation must be active or partially consumed",
			);
		}
		// Validate same org
		if (reservation.data.organizationId !== parsed.data.organizationId) {
			return fail(
				"CONFLICT",
				"Reservation must belong to the same organization",
			);
		}
		// Validate item matches line
		if (reservation.data.itemId !== line.itemId) {
			return fail("CONFLICT", "Reservation item must match delivery line item");
		}
		// Validate warehouse matches delivery
		if (reservation.data.warehouseId !== delivery.data.warehouseId) {
			return fail(
				"CONFLICT",
				"Reservation warehouse must match delivery warehouse",
			);
		}
		// Validate remaining qty >= pick
		const remaining =
			Number(reservation.data.quantity) -
			Number(reservation.data.consumedQuantity);
		const pickQty = Number(parsed.data.quantityPicked);
		if (remaining < pickQty) {
			return fail(
				"CONFLICT",
				`Insufficient reservation quantity: ${remaining} available, ${pickQty} requested`,
			);
		}
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
			reservationId: parsed.data.reservationId,
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
	if (!parsed.ok) return parsed;
	const deps = resolveCommandDeps(options);
	const authorized = await requireFulfillmentCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: FULFILLMENT_COMMAND_PACK_CONFIRM,
		},
	);
	if (!authorized.ok) return authorized;
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
	if (!context.ok) return context;
	const { data, deps } = context.data;
	if (!deps.inventory) {
		return fail(
			"INTERNAL_ERROR",
			"Inventory command options are required to post delivery stock",
		);
	}

	// Load delivery to check if it has salesOrderId
	const delivery = await deps.store.getDeliveryById(
		data.organizationId,
		data.deliveryId,
	);
	if (!delivery.ok) return delivery;
	if (!delivery.data) {
		return fail("NOT_FOUND", "Delivery not found");
	}

	// If salesOrderId, re-validate sales still posted
	if (delivery.data.salesOrderId) {
		if (!deps.sales) {
			return fail(
				"INTERNAL_ERROR",
				"Sales query port is required when posting a delivery linked to a sales order",
			);
		}
		const salesOrder = await deps.sales.getFulfillableSalesOrder({
			organizationId: data.organizationId,
			salesOrderId: delivery.data.salesOrderId,
			actorUserId: data.actorUserId,
		});
		if (!salesOrder.ok) return salesOrder;
		if (!salesOrder.data) {
			return fail("NOT_FOUND", "Sales order not found");
		}
		if (salesOrder.data.status !== "posted") {
			return fail("CONFLICT", "Sales order is no longer posted");
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
	if (!posted.ok) return posted;

	const inventoryPosted = await postDeliveryInventoryMovement(
		posted.data,
		data.actorUserId,
		data.correlationId,
		deps.inventory,
	);
	if (!inventoryPosted.ok) {
		return fail(
			inventoryPosted.code === "CONFLICT" ? "CONFLICT" : "INTERNAL_ERROR",
			`Delivery posted but inventory stock movement failed: ${inventoryPosted.message}`,
			inventoryPosted.details,
		);
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
	if (!parsed.ok) return parsed;
	const deps = resolveCommandDeps(options);
	const authorized = await requireFulfillmentCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: FULFILLMENT_COMMAND_POD_RECORD,
		},
	);
	if (!authorized.ok) return authorized;
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
	if (!context.ok) return context;
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
	if (!context.ok) return context;
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
	if (!parsed.ok) return parsed;
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireFulfillmentQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: FULFILLMENT_QUERY_GET,
	});
	if (!authorized.ok) return authorized;
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
	if (!parsed.ok) return parsed;
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireFulfillmentQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: FULFILLMENT_QUERY_LIST,
	});
	if (!authorized.ok) return authorized;
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
	if (!authorized.ok) return authorized;

	const delivery = await store.getDeliveryById(
		input.organizationId,
		input.deliveryId,
	);
	if (!delivery.ok) return delivery;
	if (delivery.data === null) return ok(null);
	if (
		delivery.data.status !== "posted" &&
		delivery.data.status !== "delivered" &&
		delivery.data.status !== "closed"
	) {
		return fail("CONFLICT", "Delivery is not invoiceable");
	}

	return ok({
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
