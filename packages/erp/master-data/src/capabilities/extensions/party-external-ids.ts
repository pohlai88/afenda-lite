/** Party external-identifier commands and queries. */
import type { Result } from "@afenda/errors";

import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "../../authorization";
import type {
	MasterCommandOptions,
	MasterQueryOptions,
} from "../../command-options";
import {
	MASTER_COMMAND_PARTY_EXTERNAL_ID_CREATE,
	MASTER_COMMAND_PARTY_EXTERNAL_ID_CREATE_REGULATORY,
	MASTER_QUERY_PARTY_FIND_BY_EXTERNAL_ID,
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import type { Party, PartyExternalId } from "../../types";
import { isRegulatoryExternalIdType } from "./extension-authorization-policy";
import { resolvePartyExtensionDeps } from "./extension-deps";
import { requirePartyExtensionParent } from "./extension-policies";
import {
	createPartyExternalIdInputSchema,
	findPartyByExternalIdInputSchema,
} from "./extension-schemas";
import { normalizeExternalId } from "./external-id-normalization";

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
	const normalized = normalizeExternalId(parsed.data);
	if (!normalized.ok) {
		return normalized;
	}
	const { store, roots, ports, authorization } = resolvePartyExtensionDeps(
		options,
		["createPartyExternalId"],
	);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: isRegulatoryExternalIdType(normalized.data.externalIdType)
			? MASTER_COMMAND_PARTY_EXTERNAL_ID_CREATE_REGULATORY
			: MASTER_COMMAND_PARTY_EXTERNAL_ID_CREATE,
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
	return store.createPartyExternalId(
		{
			organizationId: parsed.data.organizationId,
			partyId: parsed.data.partyId,
			sourceSystem: normalized.data.sourceSystem,
			externalIdType: normalized.data.externalIdType,
			externalValue: normalized.data.externalValue,
			normalizedValue: normalized.data.normalizedValue,
			caseSensitivity: normalized.data.caseSensitivity,
			isPrimary: parsed.data.isPrimary,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function findPartyByExternalId(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<Party | null>> {
	const parsed = parseMasterInput(
		findPartyByExternalIdInputSchema,
		input,
		"Invalid find-by-external-id input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const normalized = normalizeExternalId(parsed.data);
	if (!normalized.ok) {
		return normalized;
	}
	const { store, authorization } = resolvePartyExtensionDeps(options, [
		"findPartyByExternalId",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PARTY_FIND_BY_EXTERNAL_ID,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.findPartyByExternalId({
		organizationId: parsed.data.organizationId,
		sourceSystem: normalized.data.sourceSystem,
		externalIdType: normalized.data.externalIdType,
		normalizedValue: normalized.data.normalizedValue,
		caseSensitivity: normalized.data.caseSensitivity,
	});
}
