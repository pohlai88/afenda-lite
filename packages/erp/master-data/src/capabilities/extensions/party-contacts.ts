/** Party-contact commands and queries. */
import type { Result } from "@afenda/errors/result";

import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "../../authorization";
import type { MasterCommandOptions } from "../../command-options";
import {
	MASTER_COMMAND_PARTY_CONTACT_CREATE,
	MASTER_COMMAND_PARTY_CONTACT_UPDATE,
	MASTER_COMMAND_PARTY_CONTACT_VERIFY,
	MASTER_QUERY_PARTY_CONTACT_GET_PRIMARY,
	MASTER_QUERY_PARTY_CONTACT_LIST,
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import type { PartyContact } from "../../types";
import { normalizePartyContactValue } from "./contact-normalization";
import { resolvePartyExtensionDeps } from "./extension-deps";
import { requirePartyExtensionParent } from "./extension-policies";
import {
	createPartyContactInputSchema,
	getPrimaryPartyContactInputSchema,
	listPartyExtensionsInputSchema,
	updatePartyContactInputSchema,
	updatePartyContactVerificationInputSchema,
} from "./extension-schemas";

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
	const normalized = normalizePartyContactValue(
		parsed.data.contactType,
		parsed.data.value,
	);
	if (!normalized.ok) return normalized;
	const { store, roots, ports, authorization } = resolvePartyExtensionDeps(
		options,
		["createPartyContact"],
	);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PARTY_CONTACT_CREATE,
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
	return store.createPartyContact(
		{
			organizationId: parsed.data.organizationId,
			partyId: parsed.data.partyId,
			contactType: parsed.data.contactType,
			value: normalized.data.value,
			normalizedValue: normalized.data.normalizedValue,
			label: parsed.data.label,
			purpose: parsed.data.purpose,
			isPrimary: parsed.data.isPrimary,
			effectiveFrom: parsed.data.effectiveFrom,
			effectiveTo: parsed.data.effectiveTo,
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
	const normalized =
		parsed.data.contactType !== undefined && parsed.data.value !== undefined
			? normalizePartyContactValue(parsed.data.contactType, parsed.data.value)
			: null;
	if (normalized !== null && !normalized.ok) return normalized;
	const { store, ports, authorization } = resolvePartyExtensionDeps(options, [
		"updatePartyContact",
	]);
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
			value: normalized?.data.value,
			normalizedValue: normalized?.data.normalizedValue,
			label: parsed.data.label,
			purpose: parsed.data.purpose,
			isPrimary: parsed.data.isPrimary,
			effectiveFrom: parsed.data.effectiveFrom,
			effectiveTo: parsed.data.effectiveTo,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function updatePartyContactVerification(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PartyContact>> {
	const parsed = parseMasterInput(
		updatePartyContactVerificationInputSchema,
		input,
		"Invalid party contact verification input",
	);
	if (!parsed.ok) return parsed;
	const { store, ports, authorization } = resolvePartyExtensionDeps(options, [
		"updatePartyContactVerification",
	]);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PARTY_CONTACT_VERIFY,
	});
	if (!authorized.ok) return authorized;
	return store.updatePartyContactVerification(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			updatedBy: parsed.data.actorUserId,
			verificationStatus: parsed.data.verificationStatus,
			verifiedAt:
				parsed.data.verificationStatus === "verified"
					? ports.clock.now()
					: null,
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
		listPartyExtensionsInputSchema,
		input,
		"Invalid party contact list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolvePartyExtensionDeps(options, [
		"listPartyContacts",
	]);
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

export async function getPrimaryPartyContact(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PartyContact | null>> {
	const parsed = parseMasterInput(
		getPrimaryPartyContactInputSchema,
		input,
		"Invalid primary party contact input",
	);
	if (!parsed.ok) return parsed;
	const { store, authorization } = resolvePartyExtensionDeps(options, [
		"getPrimaryPartyContact",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PARTY_CONTACT_GET_PRIMARY,
	});
	if (!authorized.ok) return authorized;
	return store.getPrimaryPartyContact(
		parsed.data.organizationId,
		parsed.data.partyId,
		parsed.data.contactType,
		parsed.data.purpose ?? null,
	);
}
