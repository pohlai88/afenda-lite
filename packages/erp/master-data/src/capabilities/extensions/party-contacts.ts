/** Party-contact commands and queries. */
import { errorResult, type Result } from "@afenda/errors";

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
	MASTER_QUERY_PARTY_CONTACT_GET_SENSITIVE_PRIMARY,
	MASTER_QUERY_PARTY_CONTACT_LIST,
	MASTER_QUERY_PARTY_CONTACT_LIST_SENSITIVE,
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
import {
	type PartyContactProjection,
	type SensitivePartyContactProjection,
	toPartyContactProjection,
	toSensitivePartyContactProjection,
} from "./party-contact-projection";

export async function createPartyContact(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PartyContactProjection>> {
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
	if (!normalized.ok) {
		return normalized;
	}
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
	if (!parent.ok) {
		return parent;
	}
	return projectPartyContactResult(
		await store.createPartyContact(
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
		),
	);
}

export async function updatePartyContact(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PartyContactProjection>> {
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
	if (normalized !== null && !normalized.ok) {
		return normalized;
	}
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
	return projectPartyContactResult(
		await store.updatePartyContact(
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
		),
	);
}

export async function updatePartyContactVerification(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PartyContactProjection>> {
	const parsed = parseMasterInput(
		updatePartyContactVerificationInputSchema,
		input,
		"Invalid party contact verification input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolvePartyExtensionDeps(options, [
		"updatePartyContactVerification",
	]);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PARTY_CONTACT_VERIFY,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return projectPartyContactResult(
		await store.updatePartyContactVerification(
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
		),
	);
}

function projectPartyContactResult(
	result: Result<PartyContact>,
): Result<PartyContactProjection> {
	if (!result.ok) {
		return result;
	}
	return errorResult.ok(toPartyContactProjection(result.data));
}

export async function listPartyContacts(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PartyContactProjection[]>> {
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
	const result = await store.listPartyContacts({
		organizationId: parsed.data.organizationId,
		parentId: parsed.data.parentId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
	});
	if (!result.ok) {
		return result;
	}
	return errorResult.ok(result.data.map(toPartyContactProjection));
}

export async function getPrimaryPartyContact(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PartyContactProjection | null>> {
	const parsed = parseMasterInput(
		getPrimaryPartyContactInputSchema,
		input,
		"Invalid primary party contact input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolvePartyExtensionDeps(options, [
		"getPrimaryPartyContact",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PARTY_CONTACT_GET_PRIMARY,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const result = await store.getPrimaryPartyContact(
		parsed.data.organizationId,
		parsed.data.partyId,
		parsed.data.contactType,
		parsed.data.purpose ?? null,
	);
	if (!result.ok) {
		return result;
	}
	if (result.data === null) {
		return errorResult.ok(null);
	}
	return errorResult.ok(toPartyContactProjection(result.data));
}

export async function listSensitivePartyContacts(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<SensitivePartyContactProjection[]>> {
	const parsed = parseMasterInput(
		listPartyExtensionsInputSchema,
		input,
		"Invalid sensitive party contact list input",
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
		query: MASTER_QUERY_PARTY_CONTACT_LIST_SENSITIVE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const result = await store.listPartyContacts({
		organizationId: parsed.data.organizationId,
		parentId: parsed.data.parentId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
	});
	if (!result.ok) {
		return result;
	}
	return errorResult.ok(result.data.map(toSensitivePartyContactProjection));
}

export async function getSensitivePrimaryPartyContact(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<SensitivePartyContactProjection | null>> {
	const parsed = parseMasterInput(
		getPrimaryPartyContactInputSchema,
		input,
		"Invalid sensitive primary party contact input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolvePartyExtensionDeps(options, [
		"getPrimaryPartyContact",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PARTY_CONTACT_GET_SENSITIVE_PRIMARY,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const result = await store.getPrimaryPartyContact(
		parsed.data.organizationId,
		parsed.data.partyId,
		parsed.data.contactType,
		parsed.data.purpose ?? null,
	);
	if (!result.ok) {
		return result;
	}
	if (result.data === null) {
		return errorResult.ok(null);
	}
	return errorResult.ok(toSensitivePartyContactProjection(result.data));
}
