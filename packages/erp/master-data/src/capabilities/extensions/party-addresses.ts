/** Party role commands and queries. */

/** Party-owned extension commands and queries. */
import type { Result } from "@afenda/errors/result";

import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "../../authorization";
import type { MasterCommandOptions } from "../../command-options";
import {
	MASTER_COMMAND_PARTY_ADDRESS_CREATE,
	MASTER_COMMAND_PARTY_ADDRESS_UPDATE,
	MASTER_QUERY_PARTY_ADDRESS_GET,
	MASTER_QUERY_PARTY_ADDRESS_GET_PRIMARY,
	MASTER_QUERY_PARTY_ADDRESS_LIST,
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import type { PartyAddress } from "../../types";
import { resolvePartyExtensionDeps } from "./extension-deps";
import { requirePartyExtensionParent } from "./extension-policies";
import {
	createPartyAddressInputSchema,
	getPartyAddressInputSchema,
	getPrimaryPartyAddressInputSchema,
	listPartyExtensionsInputSchema,
	updatePartyAddressInputSchema,
} from "./extension-schemas";

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
	const { store, roots, ports, authorization } = resolvePartyExtensionDeps(
		options,
		["createPartyAddress"],
	);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PARTY_ADDRESS_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const parent = await requirePartyExtensionParent(
		roots,
		parsed.data.organizationId,
		parsed.data.partyId,
	);
	if (!parent.ok) return parent;
	return store.createPartyAddress(
		{
			organizationId: parsed.data.organizationId,
			partyId: parsed.data.partyId,
			addressType: parsed.data.addressType,
			purpose: parsed.data.purpose,
			line1: parsed.data.line1,
			line2: parsed.data.line2,
			line3: parsed.data.line3,
			city: parsed.data.city,
			administrativeArea: parsed.data.administrativeArea,
			postalCode: parsed.data.postalCode,
			countryId: parsed.data.countryId,
			attention: parsed.data.attention,
			isPrimary: parsed.data.isPrimary,
			validationStatus: parsed.data.validationStatus,
			effectiveFrom: parsed.data.effectiveFrom,
			effectiveTo: parsed.data.effectiveTo,
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
	const { store, ports, authorization } = resolvePartyExtensionDeps(options, [
		"updatePartyAddress",
	]);
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
			purpose: parsed.data.purpose,
			line1: parsed.data.line1,
			line2: parsed.data.line2,
			line3: parsed.data.line3,
			city: parsed.data.city,
			administrativeArea: parsed.data.administrativeArea,
			postalCode: parsed.data.postalCode,
			countryId: parsed.data.countryId,
			attention: parsed.data.attention,
			isPrimary: parsed.data.isPrimary,
			validationStatus: parsed.data.validationStatus,
			effectiveFrom: parsed.data.effectiveFrom,
			effectiveTo: parsed.data.effectiveTo,
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
		listPartyExtensionsInputSchema,
		input,
		"Invalid party address list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolvePartyExtensionDeps(options, [
		"listPartyAddresses",
	]);
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

export async function getPartyAddressById(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PartyAddress | null>> {
	const parsed = parseMasterInput(
		getPartyAddressInputSchema,
		input,
		"Invalid party address get input",
	);
	if (!parsed.ok) return parsed;
	const { store, authorization } = resolvePartyExtensionDeps(options, [
		"getPartyAddressById",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PARTY_ADDRESS_GET,
	});
	if (!authorized.ok) return authorized;
	return store.getPartyAddressById(
		parsed.data.organizationId,
		parsed.data.partyId,
		parsed.data.id,
	);
}

export async function getPrimaryPartyAddress(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PartyAddress | null>> {
	const parsed = parseMasterInput(
		getPrimaryPartyAddressInputSchema,
		input,
		"Invalid primary party address input",
	);
	if (!parsed.ok) return parsed;
	const { store, authorization } = resolvePartyExtensionDeps(options, [
		"getPrimaryPartyAddress",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PARTY_ADDRESS_GET_PRIMARY,
	});
	if (!authorized.ok) return authorized;
	return store.getPrimaryPartyAddress(
		parsed.data.organizationId,
		parsed.data.partyId,
		parsed.data.purpose,
	);
}
