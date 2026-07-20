import { fail, type Result } from "@afenda/errors/result";
import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "./authorization";
import { assertApprovedChangeRequestForApply } from "./change-request";
import {
	type MasterCommandOptions,
	resolveCommandDeps,
} from "./command-options";
import type { MasterFailureDetails } from "./contracts/reasons";
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
	type MasterCommandId,
} from "./module-ids";
import { parseMasterInput } from "./parse-input";
import {
	activatePartyInputSchema,
	createPartyInputSchema,
	getByCodeInputSchema,
	getByIdInputSchema,
	masterListOptionsSchema,
	partyLifecycleInputSchema,
	updatePartyInputSchema,
} from "./schemas";
import {
	MASTER_SEARCH_ENTITY,
	syncMasterRootProjection,
} from "./search-projectors";
import { normalizeMasterCode } from "./shared/code";
import {
	assertLifecycleTransition,
	restoreTargetStatus,
} from "./shared/lifecycle";
import type { ActivatePartyChangePayload, Party } from "./types";

async function afterPartyMutation(
	result: Result<Party>,
	options: MasterCommandOptions,
): Promise<Result<Party>> {
	if (result.ok) {
		await syncMasterRootProjection(
			MASTER_SEARCH_ENTITY.party,
			result.data,
			options.searchStore,
		);
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
		return parsed;
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
		{ correlationId: parsed.data.correlationId },
	);
	return afterPartyMutation(result, options);
}

export async function updateParty(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Party>> {
	const parsed = parseMasterInput(
		updatePartyInputSchema,
		input,
		"Invalid party update input",
	);
	if (!parsed.ok) {
		return parsed;
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
		{ correlationId: parsed.data.correlationId },
	);
	return afterPartyMutation(result, options);
}

async function transitionPartyStatus(
	input: unknown,
	toStatus: Party["status"],
	eventSuffix: string,
	command: MasterCommandId,
	options: MasterCommandOptions,
): Promise<Result<Party>> {
	const parsed = parseMasterInput(
		partyLifecycleInputSchema,
		input,
		"Invalid party lifecycle input",
	);
	if (!parsed.ok) {
		return parsed;
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
	const lifecycle = assertLifecycleTransition(current.data.status, toStatus);
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
	const approved = await assertApprovedChangeRequestForApply(
		{
			organizationId: parsed.data.organizationId,
			changeRequestId: parsed.data.changeRequestId,
			commandKind: "activate_party",
			match: (payload) =>
				(payload as ActivatePartyChangePayload).partyId === parsed.data.id,
		},
		options,
	);
	if (!approved.ok) {
		return approved;
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
	const lifecycle = assertLifecycleTransition(current.data.status, "active");
	if (!lifecycle.ok) {
		return lifecycle;
	}
	const result = await store.transitionParty(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			toStatus: "active",
			changeRequestId: approved.data.id,
		},
		ports,
		{ correlationId: parsed.data.correlationId, eventSuffix: "activated" },
	);
	return afterPartyMutation(result, options);
}

export async function inactiveParty(
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

export async function blockParty(
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

export async function retireParty(
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

export async function restoreParty(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Party>> {
	return transitionPartyStatus(
		input,
		restoreTargetStatus(),
		"restored",
		MASTER_COMMAND_PARTY_RESTORE,
		options,
	);
}

export async function getPartyById(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Party | null>> {
	const parsed = parseMasterInput(
		getByIdInputSchema,
		input,
		"Invalid party get-by-id input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_PARTY_GET_BY_ID,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.getPartyById(parsed.data.organizationId, parsed.data.id);
}

export async function getPartyByCode(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Party | null>> {
	const parsed = parseMasterInput(
		getByCodeInputSchema,
		input,
		"Invalid party get-by-code input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
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

export async function listParties(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Party[]>> {
	const parsed = parseMasterInput(
		masterListOptionsSchema,
		input,
		"Invalid party list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
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
	});
}
