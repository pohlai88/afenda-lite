/** Item UoM commands and queries. */
import type { Result } from "@afenda/errors/result";

import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "../../authorization";
import type { MasterCommandOptions } from "../../command-options";
import {
	MASTER_COMMAND_ITEM_UOM_CREATE,
	MASTER_QUERY_ITEM_UOM_GET_DEFAULT_PURCHASE,
	MASTER_QUERY_ITEM_UOM_GET_DEFAULT_SALES,
	MASTER_QUERY_ITEM_UOM_LIST,
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import type { ItemUom } from "../../types";
import { resolveItemExtensionDeps } from "./extension-deps";
import { requireItemExtensionParent } from "./extension-policies";
import {
	createItemUomInputSchema,
	getDefaultItemUomInputSchema,
	listItemUomsInputSchema,
} from "./extension-schemas";
import {
	assertItemUomCompatibility,
	normalizeItemUomConversionFactor,
} from "./item-uom-policy";
import type { ExtensionListPage, ItemExtensionStore } from "./store";

export async function createItemUom(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemUom>> {
	const parsed = parseMasterInput(
		createItemUomInputSchema,
		input,
		"Invalid item UoM create input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const factor = normalizeItemUomConversionFactor(parsed.data.conversionFactor);
	if (!factor.ok) {
		return factor;
	}
	const packagingApprovalReference =
		parsed.data.packagingApprovalReference ?? null;
	const { store, roots, ports, authorization } = resolveItemExtensionDeps(
		options,
		["createItemUom", "resolveItemUomCompatibilityContext"],
	);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_ITEM_UOM_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const parent = await requireItemExtensionParent(
		roots,
		parsed.data.organizationId,
		parsed.data.itemId,
	);
	if (!parent.ok) {
		return parent;
	}
	const context = await store.resolveItemUomCompatibilityContext({
		organizationId: parsed.data.organizationId,
		itemId: parsed.data.itemId,
		alternateUomId: parsed.data.alternateUomId,
	});
	if (!context.ok) {
		return context;
	}
	const compatible = assertItemUomCompatibility({
		baseDimensionCode: context.data.baseDimensionCode,
		alternateDimensionCode: context.data.alternateDimensionCode,
		compatibilityMode: parsed.data.compatibilityMode,
		packagingApprovalReference,
	});
	if (!compatible.ok) {
		return compatible;
	}
	return store.createItemUom(
		{
			organizationId: parsed.data.organizationId,
			itemId: parsed.data.itemId,
			alternateUomId: parsed.data.alternateUomId,
			conversionFactor: factor.data,
			roundingScale: parsed.data.roundingScale,
			isPurchaseUom: parsed.data.isPurchaseUom,
			isSalesUom: parsed.data.isSalesUom,
			isInventoryUom: parsed.data.isInventoryUom,
			isDefaultPurchaseUom: parsed.data.isDefaultPurchaseUom,
			isDefaultSalesUom: parsed.data.isDefaultSalesUom,
			compatibilityMode: parsed.data.compatibilityMode,
			packagingApprovalReference,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function listItemUoms(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ExtensionListPage<ItemUom>>> {
	const parsed = parseMasterInput(
		listItemUomsInputSchema,
		input,
		"Invalid item UoM list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveItemExtensionDeps(options, [
		"listItemUoms",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_UOM_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listItemUoms({
		organizationId: parsed.data.organizationId,
		itemId: parsed.data.itemId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
	});
}

interface DefaultItemUomDescriptor<Key extends keyof ItemExtensionStore> {
	capability: Key;
	query:
		| typeof MASTER_QUERY_ITEM_UOM_GET_DEFAULT_SALES
		| typeof MASTER_QUERY_ITEM_UOM_GET_DEFAULT_PURCHASE;
	usage: "sales" | "purchase";
}

async function getDefaultItemUom(
	input: unknown,
	descriptor: DefaultItemUomDescriptor<
		"getDefaultItemSalesUom" | "getDefaultItemPurchaseUom"
	>,
	options: MasterCommandOptions,
): Promise<Result<ItemUom | null>> {
	const parsed = parseMasterInput(
		getDefaultItemUomInputSchema,
		input,
		`Invalid default item ${descriptor.usage} UoM input`,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveItemExtensionDeps(options, [
		descriptor.capability,
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: descriptor.query,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store[descriptor.capability]({
		organizationId: parsed.data.organizationId,
		itemId: parsed.data.itemId,
	});
}

export function getDefaultItemSalesUom(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemUom | null>> {
	return getDefaultItemUom(
		input,
		{
			query: MASTER_QUERY_ITEM_UOM_GET_DEFAULT_SALES,
			usage: "sales",
			capability: "getDefaultItemSalesUom",
		},
		options,
	);
}

export function getDefaultItemPurchaseUom(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemUom | null>> {
	return getDefaultItemUom(
		input,
		{
			query: MASTER_QUERY_ITEM_UOM_GET_DEFAULT_PURCHASE,
			usage: "purchase",
			capability: "getDefaultItemPurchaseUom",
		},
		options,
	);
}
