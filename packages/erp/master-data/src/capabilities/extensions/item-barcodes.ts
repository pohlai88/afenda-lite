/** Item-barcode commands and queries. */
import type { Result } from "@afenda/errors/result";

import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "../../authorization";
import type { MasterCommandOptions } from "../../command-options";
import {
	MASTER_COMMAND_ITEM_BARCODE_CREATE,
	MASTER_QUERY_ITEM_FIND_BY_BARCODE,
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import type { Item, ItemBarcode } from "../../types";
import { resolveItemExtensionDeps } from "./extension-deps";
import { requireItemExtensionParent } from "./extension-policies";
import {
	createItemBarcodeInputSchema,
	findItemByBarcodeInputSchema,
} from "./extension-schemas";
import {
	normalizeBarcode,
	normalizeBarcodePackQuantity,
} from "./item-barcode-policy";

export async function createItemBarcode(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemBarcode>> {
	const parsed = parseMasterInput(
		createItemBarcodeInputSchema,
		input,
		"Invalid item barcode create input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const normalized = normalizeBarcode({
		rawValue: parsed.data.barcodeValue,
		symbology: parsed.data.symbology,
	});
	if (!normalized.ok) return normalized;
	let packQuantity: string | null = null;
	if (parsed.data.packQuantity !== undefined) {
		const result = normalizeBarcodePackQuantity(parsed.data.packQuantity);
		if (!result.ok) return result;
		packQuantity = result.data;
	}
	const { store, roots, ports, authorization } = resolveItemExtensionDeps(
		options,
		["createItemBarcode"],
	);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_ITEM_BARCODE_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const parent = await requireItemExtensionParent(
		roots,
		parsed.data.organizationId,
		parsed.data.itemId,
	);
	if (!parent.ok) return parent;
	return store.createItemBarcode(
		{
			organizationId: parsed.data.organizationId,
			itemId: parsed.data.itemId,
			barcodeValue: normalized.data.barcodeValue,
			normalizedValue: normalized.data.normalizedValue,
			symbology: parsed.data.symbology,
			uomId: parsed.data.uomId ?? null,
			packQuantity,
			isPrimary: parsed.data.isPrimary ?? false,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function findItemByBarcode(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Item | null>> {
	const parsed = parseMasterInput(
		findItemByBarcodeInputSchema,
		input,
		"Invalid item barcode lookup input",
	);
	if (!parsed.ok) return parsed;
	const normalized = normalizeBarcode({
		rawValue: parsed.data.barcodeValue,
		symbology: parsed.data.symbology,
	});
	if (!normalized.ok) return normalized;

	const { store, authorization } = resolveItemExtensionDeps(options, [
		"findItemByBarcode",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_FIND_BY_BARCODE,
	});
	if (!authorized.ok) return authorized;
	return store.findItemByBarcode({
		organizationId: parsed.data.organizationId,
		symbology: parsed.data.symbology,
		normalizedValue: normalized.data.normalizedValue,
		includeArchived: parsed.data.includeArchived ?? false,
	});
}
