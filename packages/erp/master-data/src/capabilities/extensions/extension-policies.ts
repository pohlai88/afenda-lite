import { errorResult, type Result } from "@afenda/errors";
import type { Item, Party, Warehouse } from "../../types";
import {
	type ExtensionParentStatus,
	type ExtensionParentType,
	extensionParentNotFound,
	extensionParentStateFailure,
} from "./extension-errors";
import type { ExtensionParentStateRequirement } from "./extension-lifecycle";

export const EXTENSION_AGGREGATE_ROOTS = {
	party_role: ["party"],
	party_address: ["party"],
	party_contact: ["party"],
	party_external_id: ["party"],
	party_relationship: ["party", "related_party"],
	item_uom: ["item"],
	item_barcode: ["item"],
	item_external_id: ["item"],
	item_alias: ["item"],
	warehouse_external_id: ["warehouse"],
	item_template_attribute: ["item_template"],
	item_template_attribute_option: ["item_template_attribute"],
	item_variant_attribute_value: ["item_variant"],
} as const;

export type ExtensionKind = keyof typeof EXTENSION_AGGREGATE_ROOTS;
export type ExtensionAggregateRoot =
	(typeof EXTENSION_AGGREGATE_ROOTS)[ExtensionKind][number];

export interface PartyExtensionRootReader {
	getPartyById: (
		organizationId: string,
		id: string,
	) => Promise<Result<Party | null>>;
}

export interface ItemExtensionRootReader {
	getItemById: (
		organizationId: string,
		id: string,
	) => Promise<Result<Item | null>>;
}

export interface WarehouseExtensionRootReader {
	getWarehouseById: (
		organizationId: string,
		id: string,
	) => Promise<Result<Warehouse | null>>;
}

interface ExtensionCapableParent {
	status: ExtensionParentStatus;
}

function parentSatisfiesRequirement(
	status: ExtensionParentStatus,
	requirement: ExtensionParentStateRequirement,
): boolean {
	switch (requirement) {
		case "parent_exists":
			return true;
		case "parent_not_retired":
			return status !== "retired";
		case "parent_active":
			return status === "active";
		default: {
			const exhaustive: never = requirement;
			return exhaustive;
		}
	}
}

function requireUsableParent<T extends ExtensionCapableParent>(
	parent: T | null,
	parentType: ExtensionParentType,
	requirement: ExtensionParentStateRequirement,
): Result<T> {
	if (parent === null) {
		return extensionParentNotFound(parentType);
	}
	if (!parentSatisfiesRequirement(parent.status, requirement)) {
		return extensionParentStateFailure(parentType, parent.status);
	}
	return errorResult.ok(parent);
}

function partyMergedFailure(
	_parentType: "party" | "related_party",
	_party: Party,
): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Party has been merged into another party",
	});
}

export function requirePartyExtensionParent(
	reader: PartyExtensionRootReader,
	organizationId: string,
	partyId: string,
	requirement: ExtensionParentStateRequirement = "parent_not_retired",
): Promise<Result<Party>> {
	return requirePartyParent(
		reader,
		organizationId,
		partyId,
		"party",
		requirement,
	);
}

async function requirePartyParent(
	reader: PartyExtensionRootReader,
	organizationId: string,
	partyId: string,
	parentType: "party" | "related_party",
	requirement: ExtensionParentStateRequirement,
): Promise<Result<Party>> {
	const result = await reader.getPartyById(organizationId, partyId);
	if (!result.ok) {
		return result;
	}
	const usable = requireUsableParent(result.data, parentType, requirement);
	if (!usable.ok) {
		return usable;
	}
	if (usable.data.mergedIntoId !== null) {
		return partyMergedFailure(parentType, usable.data);
	}
	return usable;
}

export async function requireItemExtensionParent(
	reader: ItemExtensionRootReader,
	organizationId: string,
	itemId: string,
	requirement: ExtensionParentStateRequirement = "parent_not_retired",
): Promise<Result<Item>> {
	const result = await reader.getItemById(organizationId, itemId);
	if (!result.ok) {
		return result;
	}
	return requireUsableParent(result.data, "item", requirement);
}

export async function requireWarehouseExtensionParent(
	reader: WarehouseExtensionRootReader,
	organizationId: string,
	warehouseId: string,
	requirement: ExtensionParentStateRequirement = "parent_not_retired",
): Promise<Result<Warehouse>> {
	const result = await reader.getWarehouseById(organizationId, warehouseId);
	if (!result.ok) {
		return result;
	}
	return requireUsableParent(result.data, "warehouse", requirement);
}

export type RequiredPartyRelationshipParents = Readonly<{
	party: Party;
	relatedParty: Party;
}>;

export async function requirePartyRelationshipParents(
	reader: PartyExtensionRootReader,
	organizationId: string,
	partyId: string,
	relatedPartyId: string,
	requirement: ExtensionParentStateRequirement = "parent_active",
): Promise<Result<RequiredPartyRelationshipParents>> {
	if (partyId === relatedPartyId) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage:
				"A party relationship cannot reference the same party twice",
		});
	}
	const [partyResult, relatedPartyResult] = await Promise.all([
		requirePartyParent(reader, organizationId, partyId, "party", requirement),
		requirePartyParent(
			reader,
			organizationId,
			relatedPartyId,
			"related_party",
			requirement,
		),
	]);
	if (!partyResult.ok) {
		return partyResult;
	}
	if (!relatedPartyResult.ok) {
		return relatedPartyResult;
	}
	return errorResult.ok({
		party: partyResult.data,
		relatedParty: relatedPartyResult.data,
	});
}
