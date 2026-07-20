import { fail, type Result } from "@afenda/errors/result";

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
	const { store, ports, masters, authorization } = resolveCommandDeps(options);
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
	return store.createDelivery(
		{
			organizationId: parsed.data.organizationId,
			code: code.data.code,
			normalizedCode: code.data.normalizedCode,
			salesOrderId: parsed.data.salesOrderId ?? null,
			warehouseId: warehouse.data.id,
			warehouseCode: warehouse.data.code,
			warehouseName: warehouse.data.name,
			shipToPartyId: parsed.data.shipToPartyId ?? null,
			shipToPartyCode: parsed.data.shipToPartyCode ?? null,
			shipToPartyName: parsed.data.shipToPartyName ?? null,
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
	const { store, ports, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireFulfillmentCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: FULFILLMENT_COMMAND_LINE_ADD,
	});
	if (!authorized.ok) return authorized;
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
		await masters.getRefUomById(item.data.baseUomId),
		"Base UoM not found for item",
	);
	if (!uom.ok) return uom;
	return store.addLine(
		{
			organizationId: parsed.data.organizationId,
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
	schema: typeof startPickingInputSchema,
	command:
		| typeof FULFILLMENT_COMMAND_PICK_START
		| typeof FULFILLMENT_COMMAND_POST
		| typeof FULFILLMENT_COMMAND_CANCEL,
	options: FulfillmentCommandOptions,
): Promise<
	Result<{
		data: {
			organizationId: string;
			actorUserId: string;
			correlationId: string;
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
	return deps.store.startPicking(data, deps.ports, {
		correlationId: data.correlationId,
	});
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
	return deps.store.confirmPick(parsed.data, deps.ports, {
		correlationId: parsed.data.correlationId,
	});
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
			...parsed.data,
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
	return deps.store.postDelivery(data, deps.ports, {
		correlationId: data.correlationId,
	});
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
			...parsed.data,
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
	return deps.store.cancelDelivery(data, deps.ports, {
		correlationId: data.correlationId,
	});
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
	return store.listDeliveries(parsed.data);
}
