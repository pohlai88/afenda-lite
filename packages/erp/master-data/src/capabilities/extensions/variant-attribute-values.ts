/** Item variant attribute value queries. */

/**
 * Item templates + concrete variant items (DNA §7.3 / R1).
 * Sellable identity = md_item; attribute values are typed rows — never JSON bag.
 */
import { fail, ok, type Result } from "@afenda/errors/result";

import { requireMasterQueryPermission } from "../../authorization";
import type { MasterQueryOptions } from "../../command-options";
import type { MasterFailureDetails } from "../../contracts/reasons";
import {
	MASTER_QUERY_ITEM_VARIANT_ATTRIBUTE_VALUE_LIST,
	MASTER_QUERY_ITEM_VARIANT_CONFIGURATION_GET,
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import type { ItemVariant, ItemVariantAttributeValue } from "../../types";
import { resolveItemVariantExtensionDeps } from "./extension-deps";
import { getItemVariantByIdInputSchema } from "./extension-schemas";

export async function listVariantAttributeValues(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<ItemVariantAttributeValue[]>> {
	const parsed = parseMasterInput(
		getItemVariantByIdInputSchema,
		input,
		"Invalid variant attribute value list input",
	);
	if (!parsed.ok) return parsed;
	const { store, authorization } = resolveItemVariantExtensionDeps(options, [
		"getItemVariantById",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_VARIANT_ATTRIBUTE_VALUE_LIST,
	});
	if (!authorized.ok) return authorized;
	const variant = await store.getItemVariantById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!variant.ok) return variant;
	if (variant.data === null) {
		return fail("NOT_FOUND", "Item variant not found", {
			reason: "MASTER_NOT_FOUND",
			field: "id",
		} satisfies MasterFailureDetails);
	}
	return ok(variant.data.values);
}

export async function getVariantConfiguration(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<ItemVariant>> {
	const parsed = parseMasterInput(
		getItemVariantByIdInputSchema,
		input,
		"Invalid variant configuration input",
	);
	if (!parsed.ok) return parsed;
	const { store, authorization } = resolveItemVariantExtensionDeps(options, [
		"getItemVariantById",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_VARIANT_CONFIGURATION_GET,
	});
	if (!authorized.ok) return authorized;
	const variant = await store.getItemVariantById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!variant.ok) return variant;
	if (variant.data === null) {
		return fail("NOT_FOUND", "Item variant not found", {
			reason: "MASTER_NOT_FOUND",
			field: "id",
		} satisfies MasterFailureDetails);
	}
	return ok(variant.data);
}
