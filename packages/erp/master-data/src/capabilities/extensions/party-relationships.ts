/** Party relationship commands and queries. */
import type { Result } from "@afenda/errors/result";

import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "../../authorization";
import type {
	MasterCommandOptions,
	MasterQueryOptions,
} from "../../command-options";
import {
	MASTER_COMMAND_PARTY_RELATIONSHIP_CREATE,
	MASTER_COMMAND_PARTY_RELATIONSHIP_CREATE_CONTROL,
	MASTER_QUERY_PARTY_RELATIONSHIP_LIST,
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import type { PartyRelationship } from "../../types";
import { isControlRelationshipType } from "./extension-authorization-policy";
import { resolvePartyExtensionDeps } from "./extension-deps";
import { requirePartyRelationshipParents } from "./extension-policies";
import {
	createPartyRelationshipInputSchema,
	listPartyRelationshipsInputSchema,
} from "./extension-schemas";
import { canonicalizePartyRelationship } from "./party-relationship-policy";
import type { ExtensionListPage } from "./store";

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
	const canonical = canonicalizePartyRelationship(parsed.data);
	if (!canonical.ok) return canonical;
	const { store, roots, ports, authorization } = resolvePartyExtensionDeps(
		options,
		["createPartyRelationship"],
	);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: isControlRelationshipType(canonical.data.relationshipType)
			? MASTER_COMMAND_PARTY_RELATIONSHIP_CREATE_CONTROL
			: MASTER_COMMAND_PARTY_RELATIONSHIP_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const parents = await requirePartyRelationshipParents(
		roots,
		parsed.data.organizationId,
		canonical.data.sourcePartyId,
		canonical.data.targetPartyId,
	);
	if (!parents.ok) return parents;
	return store.createPartyRelationship(
		{
			organizationId: parsed.data.organizationId,
			sourcePartyId: canonical.data.sourcePartyId,
			targetPartyId: canonical.data.targetPartyId,
			relationshipType: canonical.data.relationshipType,
			direction: canonical.data.direction,
			effectiveFrom: parsed.data.effectiveFrom ?? null,
			effectiveTo: parsed.data.effectiveTo ?? null,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function listPartyRelationships(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<ExtensionListPage<PartyRelationship>>> {
	const parsed = parseMasterInput(
		listPartyRelationshipsInputSchema,
		input,
		"Invalid party relationship list input",
	);
	if (!parsed.ok) return parsed;
	const { store, authorization } = resolvePartyExtensionDeps(options, [
		"listPartyRelationships",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PARTY_RELATIONSHIP_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listPartyRelationships({
		organizationId: parsed.data.organizationId,
		partyId: parsed.data.partyId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
	});
}
