/** Party role commands and queries. */
import { errorResult, type Result } from "@afenda/errors";

import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "../../authorization";
import type {
	MasterCommandOptions,
	MasterQueryOptions,
} from "../../command-options";
import {
	MASTER_COMMAND_PARTY_ROLE_ACTIVATE,
	MASTER_COMMAND_PARTY_ROLE_ARCHIVE,
	MASTER_COMMAND_PARTY_ROLE_CREATE,
	MASTER_COMMAND_PARTY_ROLE_INACTIVE,
	MASTER_COMMAND_PARTY_ROLE_RETIRE,
	MASTER_COMMAND_PARTY_ROLE_UPDATE,
	MASTER_QUERY_PARTY_ROLE_GET,
	MASTER_QUERY_PARTY_ROLE_LIST,
	MASTER_QUERY_PARTY_ROLE_LIST_ACTIVE,
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import type { PartyRole } from "../../types";
import { resolvePartyExtensionDeps } from "./extension-deps";
import { requirePartyExtensionParent } from "./extension-policies";
import {
	createPartyRoleInputSchema,
	getPartyRoleInputSchema,
	listPartyRolesInputSchema,
	type PartyRoleLifecycleInput,
	partyRoleLifecycleInputSchema,
	updatePartyRoleInputSchema,
} from "./extension-schemas";
import type { ExtensionListPage, PartyExtensionStore } from "./store";

async function assertPartyCanLoseActiveRole(
	store: Pick<
		PartyExtensionStore,
		"getPartyRoleLifecycleContext" | "transitionPartyRole"
	>,
	input: PartyRoleLifecycleInput,
): Promise<Result<void>> {
	const context = await store.getPartyRoleLifecycleContext(
		input.organizationId,
		input.id,
	);
	if (!context.ok) {
		return context;
	}
	if (context.data.role === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Party role not found",
		});
	}
	if (
		context.data.role.status === "active" &&
		context.data.party?.status === "active" &&
		context.data.activeRoleCount <= 1
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "An active party cannot lose its final active role",
		});
	}
	return errorResult.ok(undefined);
}

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
	const { store, roots, ports, authorization } = resolvePartyExtensionDeps(
		options,
		["createPartyRole"],
	);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PARTY_ROLE_CREATE,
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

export async function updatePartyRole(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<PartyRole>> {
	const parsed = parseMasterInput(
		updatePartyRoleInputSchema,
		input,
		"Invalid party role update input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolvePartyExtensionDeps(options, [
		"updatePartyRole",
	]);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PARTY_ROLE_UPDATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.updatePartyRole(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			updatedBy: parsed.data.actorUserId,
			roleCode: parsed.data.roleCode,
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
	const { store, ports, authorization } = resolvePartyExtensionDeps(options, [
		"transitionPartyRole",
	]);
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
			reason: parsed.data.reason ?? null,
		},
		ports,
		{ correlationId: parsed.data.correlationId, eventSuffix: "activated" },
	);
}

export async function deactivatePartyRole(
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
	const { store, ports, authorization } = resolvePartyExtensionDeps(options, [
		"getPartyRoleLifecycleContext",
		"transitionPartyRole",
	]);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PARTY_ROLE_INACTIVE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const activeRoleInvariant = await assertPartyCanLoseActiveRole(
		store,
		parsed.data,
	);
	if (!activeRoleInvariant.ok) {
		return activeRoleInvariant;
	}
	return store.transitionPartyRole(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			toStatus: "inactive",
			reason: parsed.data.reason ?? null,
		},
		ports,
		{ correlationId: parsed.data.correlationId, eventSuffix: "deactivated" },
	);
}

export async function archivePartyRole(
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
	const { store, ports, authorization } = resolvePartyExtensionDeps(options, [
		"getPartyRoleLifecycleContext",
		"transitionPartyRole",
	]);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PARTY_ROLE_ARCHIVE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const activeRoleInvariant = await assertPartyCanLoseActiveRole(
		store,
		parsed.data,
	);
	if (!activeRoleInvariant.ok) {
		return activeRoleInvariant;
	}
	return store.transitionPartyRole(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			toStatus: "archived",
			reason: parsed.data.reason ?? null,
		},
		ports,
		{ correlationId: parsed.data.correlationId, eventSuffix: "archived" },
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
	const { store, ports, authorization } = resolvePartyExtensionDeps(options, [
		"getPartyRoleLifecycleContext",
		"transitionPartyRole",
	]);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PARTY_ROLE_RETIRE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const activeRoleInvariant = await assertPartyCanLoseActiveRole(
		store,
		parsed.data,
	);
	if (!activeRoleInvariant.ok) {
		return activeRoleInvariant;
	}
	return store.transitionPartyRole(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			toStatus: "retired",
			reason: parsed.data.reason ?? null,
		},
		ports,
		{ correlationId: parsed.data.correlationId, eventSuffix: "retired" },
	);
}

export async function listPartyRoles(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<ExtensionListPage<PartyRole>>> {
	const parsed = parseMasterInput(
		listPartyRolesInputSchema,
		input,
		"Invalid party role list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolvePartyExtensionDeps(options, [
		"listPartyRoles",
	]);
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
		partyId: parsed.data.partyId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
	});
}

export async function listActivePartyRoles(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<ExtensionListPage<PartyRole>>> {
	const parsed = parseMasterInput(
		listPartyRolesInputSchema,
		input,
		"Invalid active party role list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolvePartyExtensionDeps(options, [
		"listActivePartyRoles",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PARTY_ROLE_LIST_ACTIVE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listActivePartyRoles({
		organizationId: parsed.data.organizationId,
		partyId: parsed.data.partyId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
	});
}

export async function getPartyRoleById(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<PartyRole | null>> {
	const parsed = parseMasterInput(
		getPartyRoleInputSchema,
		input,
		"Invalid party role get input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolvePartyExtensionDeps(options, [
		"getPartyRoleById",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PARTY_ROLE_GET,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.getPartyRoleById(
		parsed.data.organizationId,
		parsed.data.partyId,
		parsed.data.id,
	);
}

/** @deprecated Use getPartyRoleById for explicit lookup semantics. */
export const getPartyRole = getPartyRoleById;
