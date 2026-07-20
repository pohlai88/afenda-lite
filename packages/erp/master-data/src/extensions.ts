/**
 * Aggregate extension commands (roles, addresses, contacts, external IDs, UoMs, aliases).
 */
import type { Result } from "@afenda/errors/result";

import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "./authorization";
import {
	type MasterCommandOptions,
	resolveCommandDeps,
} from "./command-options";
import {
	createItemAliasInputSchema,
	createItemBarcodeInputSchema,
	createItemExternalIdInputSchema,
	createItemUomInputSchema,
	createPartyAddressInputSchema,
	createPartyContactInputSchema,
	createPartyExternalIdInputSchema,
	createPartyRelationshipInputSchema,
	createPartyRoleInputSchema,
	createWarehouseExternalIdInputSchema,
	findByExternalIdInputSchema,
	findItemByAliasInputSchema,
	listByParentInputSchema,
	partyRoleLifecycleInputSchema,
	updatePartyAddressInputSchema,
	updatePartyContactInputSchema,
} from "./extension-schemas";
import {
	MASTER_COMMAND_ITEM_ALIAS_CREATE,
	MASTER_COMMAND_ITEM_BARCODE_CREATE,
	MASTER_COMMAND_ITEM_EXTERNAL_ID_CREATE,
	MASTER_COMMAND_ITEM_UOM_CREATE,
	MASTER_COMMAND_PARTY_ADDRESS_CREATE,
	MASTER_COMMAND_PARTY_ADDRESS_UPDATE,
	MASTER_COMMAND_PARTY_CONTACT_CREATE,
	MASTER_COMMAND_PARTY_CONTACT_UPDATE,
	MASTER_COMMAND_PARTY_EXTERNAL_ID_CREATE,
	MASTER_COMMAND_PARTY_RELATIONSHIP_CREATE,
	MASTER_COMMAND_PARTY_ROLE_ACTIVATE,
	MASTER_COMMAND_PARTY_ROLE_CREATE,
	MASTER_COMMAND_PARTY_ROLE_RETIRE,
	MASTER_COMMAND_WAREHOUSE_EXTERNAL_ID_CREATE,
	MASTER_QUERY_ITEM_FIND_BY_ALIAS,
	MASTER_QUERY_ITEM_FIND_BY_EXTERNAL_ID,
	MASTER_QUERY_ITEM_UOM_LIST,
	MASTER_QUERY_PARTY_ADDRESS_LIST,
	MASTER_QUERY_PARTY_CONTACT_LIST,
	MASTER_QUERY_PARTY_FIND_BY_EXTERNAL_ID,
	MASTER_QUERY_PARTY_ROLE_LIST,
	MASTER_QUERY_WAREHOUSE_FIND_BY_EXTERNAL_ID,
} from "./module-ids";
import { parseMasterInput } from "./parse-input";
import { normalizeMasterCode } from "./shared/code";
import type {
	Item,
	ItemAlias,
	ItemBarcode,
	ItemExternalId,
	ItemUom,
	Party,
	PartyAddress,
	PartyContact,
	PartyExternalId,
	PartyRelationship,
	PartyRole,
	Warehouse,
	WarehouseExternalId,
} from "./types";

export async function createPartyRole(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PartyRole>> {
	const parsed = parseMasterInput(
		createPartyRoleInputSchema,
		input,
		"Invalid party role create input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PARTY_ROLE_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.createPartyRole(
		{
			organizationId: parsed.data.organizationId,
			partyId: parsed.data.partyId,
			roleCode: parsed.data.roleCode,
			createdBy: parsed.data.actorUserId,
			validFrom: parsed.data.validFrom,
			validTo: parsed.data.validTo,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function activatePartyRole(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PartyRole>> {
	const parsed = parseMasterInput(
		partyRoleLifecycleInputSchema,
		input,
		"Invalid party role lifecycle input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PARTY_ROLE_ACTIVATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.transitionPartyRole(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			toStatus: "active",
		},
		ports,
		{ correlationId: parsed.data.correlationId, eventSuffix: "activated" },
	);
}

export async function retirePartyRole(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PartyRole>> {
	const parsed = parseMasterInput(
		partyRoleLifecycleInputSchema,
		input,
		"Invalid party role lifecycle input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PARTY_ROLE_RETIRE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.transitionPartyRole(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			toStatus: "retired",
		},
		ports,
		{ correlationId: parsed.data.correlationId, eventSuffix: "retired" },
	);
}

export async function listPartyRoles(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PartyRole[]>> {
	const parsed = parseMasterInput(
		listByParentInputSchema,
		input,
		"Invalid party role list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PARTY_ROLE_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listPartyRoles({
		organizationId: parsed.data.organizationId,
		parentId: parsed.data.parentId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
	});
}

export async function createPartyAddress(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PartyAddress>> {
	const parsed = parseMasterInput(
		createPartyAddressInputSchema,
		input,
		"Invalid party address create input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PARTY_ADDRESS_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.createPartyAddress(
		{
			organizationId: parsed.data.organizationId,
			partyId: parsed.data.partyId,
			addressType: parsed.data.addressType,
			line1: parsed.data.line1,
			line2: parsed.data.line2,
			city: parsed.data.city,
			region: parsed.data.region,
			postalCode: parsed.data.postalCode,
			countryId: parsed.data.countryId,
			isDefault: parsed.data.isDefault,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function updatePartyAddress(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PartyAddress>> {
	const parsed = parseMasterInput(
		updatePartyAddressInputSchema,
		input,
		"Invalid party address update input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PARTY_ADDRESS_UPDATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.updatePartyAddress(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			updatedBy: parsed.data.actorUserId,
			addressType: parsed.data.addressType,
			line1: parsed.data.line1,
			line2: parsed.data.line2,
			city: parsed.data.city,
			region: parsed.data.region,
			postalCode: parsed.data.postalCode,
			countryId: parsed.data.countryId,
			isDefault: parsed.data.isDefault,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function listPartyAddresses(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PartyAddress[]>> {
	const parsed = parseMasterInput(
		listByParentInputSchema,
		input,
		"Invalid party address list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PARTY_ADDRESS_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listPartyAddresses({
		organizationId: parsed.data.organizationId,
		parentId: parsed.data.parentId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
	});
}

export async function createPartyContact(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PartyContact>> {
	const parsed = parseMasterInput(
		createPartyContactInputSchema,
		input,
		"Invalid party contact create input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PARTY_CONTACT_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.createPartyContact(
		{
			organizationId: parsed.data.organizationId,
			partyId: parsed.data.partyId,
			contactType: parsed.data.contactType,
			value: parsed.data.value,
			purpose: parsed.data.purpose,
			isPrimary: parsed.data.isPrimary,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function updatePartyContact(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PartyContact>> {
	const parsed = parseMasterInput(
		updatePartyContactInputSchema,
		input,
		"Invalid party contact update input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PARTY_CONTACT_UPDATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.updatePartyContact(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			updatedBy: parsed.data.actorUserId,
			contactType: parsed.data.contactType,
			value: parsed.data.value,
			purpose: parsed.data.purpose,
			isPrimary: parsed.data.isPrimary,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function listPartyContacts(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PartyContact[]>> {
	const parsed = parseMasterInput(
		listByParentInputSchema,
		input,
		"Invalid party contact list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PARTY_CONTACT_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listPartyContacts({
		organizationId: parsed.data.organizationId,
		parentId: parsed.data.parentId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
	});
}

export async function createPartyExternalId(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PartyExternalId>> {
	const parsed = parseMasterInput(
		createPartyExternalIdInputSchema,
		input,
		"Invalid party external id create input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PARTY_EXTERNAL_ID_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.createPartyExternalId(
		{
			organizationId: parsed.data.organizationId,
			partyId: parsed.data.partyId,
			system: parsed.data.system,
			namespace: parsed.data.namespace ?? "",
			externalId: parsed.data.externalId,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function findPartyByExternalId(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Party | null>> {
	const parsed = parseMasterInput(
		findByExternalIdInputSchema,
		input,
		"Invalid find-by-external-id input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PARTY_FIND_BY_EXTERNAL_ID,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.findPartyByExternalId(
		parsed.data.organizationId,
		parsed.data.system,
		parsed.data.namespace ?? "",
		parsed.data.externalId,
	);
}

export async function createPartyRelationship(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PartyRelationship>> {
	const parsed = parseMasterInput(
		createPartyRelationshipInputSchema,
		input,
		"Invalid party relationship create input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PARTY_RELATIONSHIP_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.createPartyRelationship(
		{
			organizationId: parsed.data.organizationId,
			fromPartyId: parsed.data.fromPartyId,
			toPartyId: parsed.data.toPartyId,
			relationshipType: parsed.data.relationshipType,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

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
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_ITEM_UOM_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.createItemUom(
		{
			organizationId: parsed.data.organizationId,
			itemId: parsed.data.itemId,
			uomId: parsed.data.uomId,
			toBaseNumerator: parsed.data.toBaseNumerator,
			toBaseDenominator: parsed.data.toBaseDenominator,
			usage: parsed.data.usage,
			barcode: parsed.data.barcode,
			roundingRule: parsed.data.roundingRule,
			minQuantity: parsed.data.minQuantity,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function listItemUoms(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemUom[]>> {
	const parsed = parseMasterInput(
		listByParentInputSchema,
		input,
		"Invalid item UoM list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
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
		parentId: parsed.data.parentId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
	});
}

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
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_ITEM_BARCODE_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.createItemBarcode(
		{
			organizationId: parsed.data.organizationId,
			itemId: parsed.data.itemId,
			barcode: parsed.data.barcode,
			barcodeType: parsed.data.barcodeType ?? "generic",
			isPrimary: parsed.data.isPrimary,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function createItemExternalId(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemExternalId>> {
	const parsed = parseMasterInput(
		createItemExternalIdInputSchema,
		input,
		"Invalid item external id create input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_ITEM_EXTERNAL_ID_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.createItemExternalId(
		{
			organizationId: parsed.data.organizationId,
			itemId: parsed.data.itemId,
			system: parsed.data.system,
			namespace: parsed.data.namespace ?? "",
			externalId: parsed.data.externalId,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function findItemByExternalId(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Item | null>> {
	const parsed = parseMasterInput(
		findByExternalIdInputSchema,
		input,
		"Invalid find-by-external-id input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_FIND_BY_EXTERNAL_ID,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.findItemByExternalId(
		parsed.data.organizationId,
		parsed.data.system,
		parsed.data.namespace ?? "",
		parsed.data.externalId,
	);
}

export async function createItemAlias(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemAlias>> {
	const parsed = parseMasterInput(
		createItemAliasInputSchema,
		input,
		"Invalid item alias create input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const codeResult = normalizeMasterCode(parsed.data.aliasCode);
	if (!codeResult.ok) {
		return codeResult;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_ITEM_ALIAS_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.createItemAlias(
		{
			organizationId: parsed.data.organizationId,
			itemId: parsed.data.itemId,
			aliasCode: codeResult.data.code,
			normalizedAlias: codeResult.data.normalizedCode,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function findItemByAlias(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Item | null>> {
	const parsed = parseMasterInput(
		findItemByAliasInputSchema,
		input,
		"Invalid find-by-alias input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const codeResult = normalizeMasterCode(parsed.data.aliasCode);
	if (!codeResult.ok) {
		return codeResult;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_FIND_BY_ALIAS,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.findItemByAlias(
		parsed.data.organizationId,
		codeResult.data.normalizedCode,
	);
}

export async function createWarehouseExternalId(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<WarehouseExternalId>> {
	const parsed = parseMasterInput(
		createWarehouseExternalIdInputSchema,
		input,
		"Invalid warehouse external id create input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_WAREHOUSE_EXTERNAL_ID_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.createWarehouseExternalId(
		{
			organizationId: parsed.data.organizationId,
			warehouseId: parsed.data.warehouseId,
			system: parsed.data.system,
			namespace: parsed.data.namespace ?? "",
			externalId: parsed.data.externalId,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function findWarehouseByExternalId(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Warehouse | null>> {
	const parsed = parseMasterInput(
		findByExternalIdInputSchema,
		input,
		"Invalid find-by-external-id input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_WAREHOUSE_FIND_BY_EXTERNAL_ID,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.findWarehouseByExternalId(
		parsed.data.organizationId,
		parsed.data.system,
		parsed.data.namespace ?? "",
		parsed.data.externalId,
	);
}
