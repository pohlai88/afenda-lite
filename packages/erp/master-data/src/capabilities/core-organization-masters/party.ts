import { fail, ok, type Result } from "@afenda/errors/result";
import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "../../authorization";
import {
	type MasterCommandOptions,
	type MasterQueryOptions,
	resolveCommandDeps,
	resolveStore,
} from "../../command-options";
import type { MasterFailureDetails } from "../../contracts/reasons";
import {
	MASTER_COMMAND_PARTY_ACTIVATE,
	MASTER_COMMAND_PARTY_BLOCK,
	MASTER_COMMAND_PARTY_CREATE,
	MASTER_COMMAND_PARTY_INACTIVE,
	MASTER_COMMAND_PARTY_RESTORE,
	MASTER_COMMAND_PARTY_RETIRE,
	MASTER_COMMAND_PARTY_UPDATE,
	MASTER_QUERY_PARTY_GET_BY_CODE,
	MASTER_QUERY_PARTY_GET_BY_ID,
	MASTER_QUERY_PARTY_LIST,
	MASTER_QUERY_PARTY_SEARCH,
	type MasterCommandId,
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import { resolveAsync } from "../../resolve-async";
import type { Party } from "../../types";
import { assertApprovedChangeRequestForApply } from "../data-governance-workflows/change-request-commands";
import {
	MASTER_SEARCH_ENTITY,
	syncMasterRootProjection,
} from "../integration-projections/search-projector-commands";
import { assertNoLifecycleControlledFieldMutation } from "../lifecycle-governance";
import type { PartyLifecycleEventSuffix } from "./core-master-events";
import {
	assertLifecycleTransition,
	assertRestoreTransition,
} from "./lifecycle";
import { normalizeMasterCode } from "./normalized-code";
import {
	activatePartyInputSchema,
	createPartyInputSchema,
	findPartyByTaxRegistrationInputSchema,
	getByCodeInputSchema,
	getByIdInputSchema,
	listByStatusInputSchema,
	listPartiesByRoleInputSchema,
	listUpdatedSinceInputSchema,
	masterListOptionsSchema,
	partyLifecycleInputSchema,
	searchPartiesInputSchema,
	updatePartyInputSchema,
} from "./schemas";
import { normalizeTaxRegistrationNumber } from "./tax-registration-number";
import { assertExpectedVersion } from "./version-cas";

async function afterPartyMutation(
	result: Result<Party>,
	options: MasterCommandOptions,
): Promise<Result<Party>> {
	if (!result.ok) {
		return result;
	}

	try {
		await syncMasterRootProjection(
			MASTER_SEARCH_ENTITY.party,
			result.data,
			options.searchStore,
		);
	} catch {
		// Search is derived; committed mutation events/rebuild provide recovery.
	}

	return result;
}

export async function createParty(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Party>> {
	const parsed = parseMasterInput(
		createPartyInputSchema,
		input,
		"Invalid party create input",
	);
	if (!parsed.ok) {
		return Promise.resolve(parsed);
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PARTY_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const codeResult = normalizeMasterCode(parsed.data.code);
	if (!codeResult.ok) {
		return codeResult;
	}
	const result = await store.createParty(
		{
			organizationId: parsed.data.organizationId,
			code: codeResult.data.code,
			normalizedCode: codeResult.data.normalizedCode,
			name: parsed.data.name,
			partyKind: parsed.data.partyKind,
			createdBy: parsed.data.actorUserId,
			legalName: parsed.data.legalName,
			tradingName: parsed.data.tradingName,
			registrationNumber: parsed.data.registrationNumber,
			registrationCountryId: parsed.data.registrationCountryId,
			preferredLanguageId: parsed.data.preferredLanguageId,
			defaultCurrencyId: parsed.data.defaultCurrencyId,
		},
		ports,
		{
			correlationId: parsed.data.correlationId,
			importMutation: options.importMutation,
		},
	);
	return afterPartyMutation(result, options);
}

export async function updateParty(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Party>> {
	const lifecycleFields = assertNoLifecycleControlledFieldMutation(input, {
		entityType: "party",
	});
	if (!lifecycleFields.ok) {
		return lifecycleFields;
	}
	const parsed = parseMasterInput(
		updatePartyInputSchema,
		input,
		"Invalid party update input",
	);
	if (!parsed.ok) {
		return Promise.resolve(parsed);
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PARTY_UPDATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	// Party code is immutable after creation; identity changes need a governed command.
	const result = await store.updateParty(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			updatedBy: parsed.data.actorUserId,
			name: parsed.data.name,
			legalName: parsed.data.legalName,
			tradingName: parsed.data.tradingName,
			registrationNumber: parsed.data.registrationNumber,
			registrationCountryId: parsed.data.registrationCountryId,
			preferredLanguageId: parsed.data.preferredLanguageId,
			defaultCurrencyId: parsed.data.defaultCurrencyId,
		},
		ports,
		{
			correlationId: parsed.data.correlationId,
			importMutation: options.importMutation,
		},
	);
	return afterPartyMutation(result, options);
}

async function transitionPartyStatus(
	input: unknown,
	toStatus: Exclude<Party["status"], "active">,
	eventSuffix: Exclude<PartyLifecycleEventSuffix, "activated">,
	command: MasterCommandId,
	options: MasterCommandOptions,
	transitionKind: "lifecycle" | "restore" = "lifecycle",
): Promise<Result<Party>> {
	const parsed = parseMasterInput(
		partyLifecycleInputSchema,
		input,
		"Invalid party lifecycle input",
	);
	if (!parsed.ok) {
		return Promise.resolve(parsed);
	}
	const { store, ports, dependencyInspector, authorization } =
		resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const current = await store.getPartyById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return fail("NOT_FOUND", "Party not found", {
			reason: "MASTER_NOT_FOUND",
		} satisfies MasterFailureDetails);
	}
	const lifecycle =
		transitionKind === "restore"
			? assertRestoreTransition(current.data.status, "draft")
			: assertLifecycleTransition(current.data.status, toStatus);
	if (!lifecycle.ok) {
		return lifecycle;
	}
	if (toStatus === "retired") {
		const blockers = await dependencyInspector.listBlockers({
			organizationId: parsed.data.organizationId,
			entityType: "party",
			entityId: parsed.data.id,
		});
		if (blockers.length > 0) {
			return fail("CONFLICT", "Party has dependency blockers", {
				reason: "MASTER_DEPENDENCY_BLOCKED",
				blockers,
			} satisfies MasterFailureDetails);
		}
	}
	const result = await store.transitionParty(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			toStatus,
		},
		ports,
		{ correlationId: parsed.data.correlationId, eventSuffix },
	);
	return afterPartyMutation(result, options);
}

export async function activateParty(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Party>> {
	const parsed = parseMasterInput(
		activatePartyInputSchema,
		input,
		"Invalid party activate input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_PARTY_ACTIVATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const current = await store.getPartyById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return fail("NOT_FOUND", "Party not found", {
			reason: "MASTER_NOT_FOUND",
		} satisfies MasterFailureDetails);
	}
	const version = assertExpectedVersion(
		current.data,
		parsed.data.expectedVersion,
	);
	if (!version.ok) {
		return version;
	}
	if (current.data.mergedIntoId !== null) {
		return fail("CONFLICT", "Merged party cannot be activated", {
			reason: "MASTER_INVALID_STATE",
			mergedIntoId: current.data.mergedIntoId,
		} satisfies MasterFailureDetails);
	}
	const lifecycle = assertLifecycleTransition(current.data.status, "active");
	if (!lifecycle.ok) {
		return lifecycle;
	}
	const roleCount = await store.countActivePartyRoles(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!roleCount.ok) {
		return roleCount;
	}
	if (roleCount.data < 1) {
		return fail(
			"CONFLICT",
			"Party activation requires at least one active role",
			{
				reason: "MASTER_INVALID_STATE",
			} satisfies MasterFailureDetails,
		);
	}
	const approved = await assertApprovedChangeRequestForApply(
		{
			organizationId: parsed.data.organizationId,
			changeRequestId: parsed.data.changeRequestId,
			commandKind: "activate_party",
			match: (payload) =>
				"partyId" in payload && payload.partyId === parsed.data.id,
		},
		options,
	);
	if (!approved.ok) {
		return approved;
	}
	const result = await store.transitionParty(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			toStatus: "active",
			changeRequestId: approved.data.id,
			requireActiveRole: true,
		},
		ports,
		{ correlationId: parsed.data.correlationId, eventSuffix: "activated" },
	);
	return afterPartyMutation(result, options);
}

export function inactiveParty(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Party>> {
	return transitionPartyStatus(
		input,
		"inactive",
		"inactive",
		MASTER_COMMAND_PARTY_INACTIVE,
		options,
	);
}

export function blockParty(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Party>> {
	return transitionPartyStatus(
		input,
		"blocked",
		"blocked",
		MASTER_COMMAND_PARTY_BLOCK,
		options,
	);
}

export const suspendParty = blockParty;

export function retireParty(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Party>> {
	return transitionPartyStatus(
		input,
		"retired",
		"retired",
		MASTER_COMMAND_PARTY_RETIRE,
		options,
	);
}

export const archiveParty = retireParty;

export function restoreParty(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Party>> {
	return transitionPartyStatus(
		input,
		"draft",
		"restored",
		MASTER_COMMAND_PARTY_RESTORE,
		options,
		"restore",
	);
}

export async function getPartyById(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<Party | null>> {
	const parsed = parseMasterInput(
		getByIdInputSchema,
		input,
		"Invalid party get-by-id input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const store = resolveStore(options.store);
	const authorized = await requireMasterQueryPermission(options.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PARTY_GET_BY_ID,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.getPartyById(parsed.data.organizationId, parsed.data.id);
}

export const getParty = getPartyById;

export async function getPartyByCode(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<Party | null>> {
	const parsed = parseMasterInput(
		getByCodeInputSchema,
		input,
		"Invalid party get-by-code input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const store = resolveStore(options.store);
	const authorized = await requireMasterQueryPermission(options.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PARTY_GET_BY_CODE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const codeResult = normalizeMasterCode(parsed.data.code);
	if (!codeResult.ok) {
		return codeResult;
	}
	return store.getPartyByCode(
		parsed.data.organizationId,
		codeResult.data.normalizedCode,
	);
}

export async function existsPartyByCode(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<boolean>> {
	const result = await getPartyByCode(input, options);
	if (!result.ok) {
		return result;
	}
	return ok(result.data !== null);
}

export async function listParties(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<Party[]>> {
	const parsed = parseMasterInput(
		masterListOptionsSchema,
		input,
		"Invalid party list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const store = resolveStore(options.store);
	const authorized = await requireMasterQueryPermission(options.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PARTY_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listParties({
		organizationId: parsed.data.organizationId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
		status: parsed.data.status,
		updatedSince: parsed.data.updatedSince,
	});
}

export function listActiveParties(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<Party[]>> {
	return resolveAsync(() => {
		const parsed = parseMasterInput(
			masterListOptionsSchema,
			input,
			"Invalid active party list input",
		);
		if (!parsed.ok) {
			return parsed;
		}
		return listParties({ ...parsed.data, status: "active" }, options);
	});
}

export function listPartiesByStatus(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<Party[]>> {
	return resolveAsync(() => {
		const parsed = parseMasterInput(
			listByStatusInputSchema,
			input,
			"Invalid party list-by-status input",
		);
		if (!parsed.ok) {
			return parsed;
		}
		return listParties(parsed.data, options);
	});
}

export function listPartiesUpdatedSince(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<Party[]>> {
	return resolveAsync(() => {
		const parsed = parseMasterInput(
			listUpdatedSinceInputSchema,
			input,
			"Invalid party updated-since list input",
		);
		if (!parsed.ok) {
			return parsed;
		}
		return listParties(parsed.data, options);
	});
}

export async function listPartiesByRole(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<Party[]>> {
	const parsed = parseMasterInput(
		listPartiesByRoleInputSchema,
		input,
		"Invalid party list-by-role input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const store = resolveStore(options.store);
	const authorized = await requireMasterQueryPermission(options.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PARTY_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listPartiesByRole({
		organizationId: parsed.data.organizationId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
		status: parsed.data.status,
		updatedSince: parsed.data.updatedSince,
		roleCode: parsed.data.roleCode,
		activeOnly: parsed.data.activeOnly,
	});
}

export async function findPartyByTaxRegistration(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<Party | null>> {
	const parsed = parseMasterInput(
		findPartyByTaxRegistrationInputSchema,
		input,
		"Invalid party tax-registration lookup input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const normalized = normalizeTaxRegistrationNumber(
		parsed.data.registrationNumber,
	);
	if (!normalized.ok) {
		return normalized;
	}
	const store = resolveStore(options.store);
	const authorized = await requireMasterQueryPermission(options.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PARTY_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.findPartyByTaxRegistration({
		organizationId: parsed.data.organizationId,
		jurisdictionCountryId: parsed.data.jurisdictionCountryId,
		registrationType: parsed.data.registrationType,
		normalizedRegistrationNumber: normalized.data.normalizedRegistrationNumber,
	});
}

export async function searchParties(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<Party[]>> {
	const parsed = parseMasterInput(
		searchPartiesInputSchema,
		input,
		"Invalid party search input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const store = resolveStore(options.store);
	const authorized = await requireMasterQueryPermission(options.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PARTY_SEARCH,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.searchParties({
		organizationId: parsed.data.organizationId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
		status: parsed.data.status,
		updatedSince: parsed.data.updatedSince,
		query: parsed.data.query,
	});
}
