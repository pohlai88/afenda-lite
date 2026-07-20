import { fail, type Result } from "@afenda/errors/result";

import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "./authorization";
import {
	type MasterCommandOptions,
	resolveCommandDeps,
} from "./command-options";
import type { MasterFailureDetails } from "./contracts/reasons";
import {
	MASTER_COMMAND_TAX_REGISTRATION_ACTIVATE,
	MASTER_COMMAND_TAX_REGISTRATION_BLOCK,
	MASTER_COMMAND_TAX_REGISTRATION_CREATE,
	MASTER_COMMAND_TAX_REGISTRATION_RESTORE,
	MASTER_COMMAND_TAX_REGISTRATION_RETIRE,
	MASTER_COMMAND_TAX_REGISTRATION_UPDATE,
	MASTER_QUERY_TAX_REGISTRATION_FIND_BY_PARTY,
	MASTER_QUERY_TAX_REGISTRATION_GET_BY_ID,
	MASTER_QUERY_TAX_REGISTRATION_LIST,
	type MasterCommandId,
} from "./module-ids";
import { parseMasterInput } from "./parse-input";
import {
	createTaxRegistrationInputSchema,
	findTaxRegistrationsByPartyInputSchema,
	getByIdInputSchema,
	listTaxRegistrationsInputSchema,
	taxRegistrationLifecycleInputSchema,
	updateTaxRegistrationInputSchema,
} from "./schemas";
import {
	assertLifecycleTransition,
	restoreTargetStatus,
} from "./shared/lifecycle";
import { normalizeTaxRegistrationNumber } from "./shared/tax-registration-number";
import {
	isInvalidValidityRange,
	validityRangesOverlap,
} from "./shared/validity-overlap";
import type { TaxRegistration } from "./types";

async function assertPartyInOrg(
	organizationId: string,
	partyId: string,
	options: MasterCommandOptions,
): Promise<Result<true>> {
	const { store } = resolveCommandDeps(options);
	const party = await store.getPartyById(organizationId, partyId);
	if (!party.ok) {
		return party;
	}
	if (party.data === null) {
		return fail("NOT_FOUND", "Party not found", {
			reason: "MASTER_NOT_FOUND",
		} satisfies MasterFailureDetails);
	}
	return { ok: true, data: true };
}

const OVERLAP_LIST_PAGE_SIZE = 100;

async function assertNoActiveOverlap(
	candidate: TaxRegistration,
	options: MasterCommandOptions,
): Promise<Result<true>> {
	const { store } = resolveCommandDeps(options);
	let page = 1;
	for (;;) {
		const siblings = await store.listTaxRegistrations({
			organizationId: candidate.organizationId,
			partyId: candidate.partyId,
			status: "active",
			page,
			pageSize: OVERLAP_LIST_PAGE_SIZE,
		});
		if (!siblings.ok) {
			return siblings;
		}
		for (const sibling of siblings.data) {
			if (sibling.id === candidate.id) {
				continue;
			}
			if (
				sibling.jurisdictionCountryId !== candidate.jurisdictionCountryId ||
				sibling.registrationType !== candidate.registrationType
			) {
				continue;
			}
			if (
				validityRangesOverlap(
					{
						validFrom: candidate.validFrom,
						validTo: candidate.validTo,
					},
					{
						validFrom: sibling.validFrom,
						validTo: sibling.validTo,
					},
				)
			) {
				return fail(
					"CONFLICT",
					"Active tax registration validity ranges overlap",
					{
						reason: "MASTER_VALIDITY_OVERLAP",
						conflictingId: sibling.id,
					} satisfies MasterFailureDetails,
				);
			}
		}
		if (siblings.data.length < OVERLAP_LIST_PAGE_SIZE) {
			return { ok: true, data: true };
		}
		page += 1;
	}
}

function assertValidity(range: {
	validFrom: Date | null;
	validTo: Date | null;
}): Result<true> {
	if (isInvalidValidityRange(range)) {
		return fail("BAD_REQUEST", "valid_to must be after valid_from", {
			reason: "MASTER_VALIDATION_FAILED",
		} satisfies MasterFailureDetails);
	}
	return { ok: true, data: true };
}

export async function createTaxRegistration(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<TaxRegistration>> {
	const parsed = parseMasterInput(
		createTaxRegistrationInputSchema,
		input,
		"Invalid tax registration create input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_TAX_REGISTRATION_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const numberResult = normalizeTaxRegistrationNumber(
		parsed.data.registrationNumber,
	);
	if (!numberResult.ok) {
		return numberResult;
	}
	const validFrom = parsed.data.validFrom ?? null;
	const validTo = parsed.data.validTo ?? null;
	const validity = assertValidity({ validFrom, validTo });
	if (!validity.ok) {
		return validity;
	}
	const partyOk = await assertPartyInOrg(
		parsed.data.organizationId,
		parsed.data.partyId,
		options,
	);
	if (!partyOk.ok) {
		return partyOk;
	}
	return store.createTaxRegistration(
		{
			organizationId: parsed.data.organizationId,
			partyId: parsed.data.partyId,
			jurisdictionCountryId: parsed.data.jurisdictionCountryId,
			registrationType: parsed.data.registrationType,
			registrationNumber: numberResult.data.registrationNumber,
			normalizedRegistrationNumber:
				numberResult.data.normalizedRegistrationNumber,
			name: parsed.data.name ?? null,
			validFrom,
			validTo,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function updateTaxRegistration(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<TaxRegistration>> {
	const parsed = parseMasterInput(
		updateTaxRegistrationInputSchema,
		input,
		"Invalid tax registration update input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_TAX_REGISTRATION_UPDATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const current = await store.getTaxRegistrationById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return fail("NOT_FOUND", "Tax registration not found", {
			reason: "MASTER_NOT_FOUND",
		} satisfies MasterFailureDetails);
	}
	const nextValidFrom =
		parsed.data.validFrom !== undefined
			? parsed.data.validFrom
			: current.data.validFrom;
	const nextValidTo =
		parsed.data.validTo !== undefined
			? parsed.data.validTo
			: current.data.validTo;
	const validity = assertValidity({
		validFrom: nextValidFrom,
		validTo: nextValidTo,
	});
	if (!validity.ok) {
		return validity;
	}
	if (current.data.status === "active") {
		const overlap = await assertNoActiveOverlap(
			{
				...current.data,
				validFrom: nextValidFrom,
				validTo: nextValidTo,
			},
			options,
		);
		if (!overlap.ok) {
			return overlap;
		}
	}
	return store.updateTaxRegistration(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			updatedBy: parsed.data.actorUserId,
			name: parsed.data.name,
			validFrom: parsed.data.validFrom,
			validTo: parsed.data.validTo,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

async function transitionTaxRegistrationStatus(
	input: unknown,
	toStatus: TaxRegistration["status"],
	eventSuffix: string,
	command: MasterCommandId,
	options: MasterCommandOptions,
): Promise<Result<TaxRegistration>> {
	const parsed = parseMasterInput(
		taxRegistrationLifecycleInputSchema,
		input,
		"Invalid tax registration lifecycle input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const current = await store.getTaxRegistrationById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return fail("NOT_FOUND", "Tax registration not found", {
			reason: "MASTER_NOT_FOUND",
		} satisfies MasterFailureDetails);
	}
	const lifecycle = assertLifecycleTransition(current.data.status, toStatus);
	if (!lifecycle.ok) {
		return lifecycle;
	}
	if (toStatus === "active") {
		if (current.data.validFrom === null) {
			return fail("CONFLICT", "Activation requires valid_from", {
				reason: "MASTER_INVALID_STATE",
				field: "validFrom",
			} satisfies MasterFailureDetails);
		}
		const validity = assertValidity({
			validFrom: current.data.validFrom,
			validTo: current.data.validTo,
		});
		if (!validity.ok) {
			return validity;
		}
		const overlap = await assertNoActiveOverlap(current.data, options);
		if (!overlap.ok) {
			return overlap;
		}
	}
	return store.transitionTaxRegistration(
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
}

export async function activateTaxRegistration(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<TaxRegistration>> {
	return transitionTaxRegistrationStatus(
		input,
		"active",
		"activated",
		MASTER_COMMAND_TAX_REGISTRATION_ACTIVATE,
		options,
	);
}

export async function blockTaxRegistration(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<TaxRegistration>> {
	return transitionTaxRegistrationStatus(
		input,
		"blocked",
		"blocked",
		MASTER_COMMAND_TAX_REGISTRATION_BLOCK,
		options,
	);
}

export async function retireTaxRegistration(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<TaxRegistration>> {
	return transitionTaxRegistrationStatus(
		input,
		"retired",
		"retired",
		MASTER_COMMAND_TAX_REGISTRATION_RETIRE,
		options,
	);
}

export async function restoreTaxRegistration(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<TaxRegistration>> {
	return transitionTaxRegistrationStatus(
		input,
		restoreTargetStatus(),
		"restored",
		MASTER_COMMAND_TAX_REGISTRATION_RESTORE,
		options,
	);
}

export async function getTaxRegistrationById(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<TaxRegistration | null>> {
	const parsed = parseMasterInput(
		getByIdInputSchema,
		input,
		"Invalid tax registration get-by-id input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_TAX_REGISTRATION_GET_BY_ID,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.getTaxRegistrationById(
		parsed.data.organizationId,
		parsed.data.id,
	);
}

export async function listTaxRegistrations(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<TaxRegistration[]>> {
	const parsed = parseMasterInput(
		listTaxRegistrationsInputSchema,
		input,
		"Invalid tax registration list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_TAX_REGISTRATION_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listTaxRegistrations({
		organizationId: parsed.data.organizationId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
		status: parsed.data.status,
		partyId: parsed.data.partyId,
	});
}

export async function findTaxRegistrationsByParty(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<TaxRegistration[]>> {
	const parsed = parseMasterInput(
		findTaxRegistrationsByPartyInputSchema,
		input,
		"Invalid tax registration find-by-party input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_TAX_REGISTRATION_FIND_BY_PARTY,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.findTaxRegistrationsByParty(
		parsed.data.organizationId,
		parsed.data.partyId,
	);
}
