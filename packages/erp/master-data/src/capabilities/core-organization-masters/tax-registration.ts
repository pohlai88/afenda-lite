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
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import type { TaxRegistration } from "../../types";
import { assertNoLifecycleControlledFieldMutation } from "../lifecycle-governance";
import type { TaxRegistrationLifecycleEventSuffix } from "./core-master-events";
import {
	assertRestoreTransition,
	assertTaxRegistrationLifecycleTransition,
} from "./lifecycle";
import {
	createTaxRegistrationInputSchema,
	findTaxRegistrationsByPartyInputSchema,
	getByIdInputSchema,
	listTaxRegistrationsInputSchema,
	taxRegistrationLifecycleInputSchema,
	updateTaxRegistrationInputSchema,
} from "./schemas";
import type { MasterDataStore } from "./store";
import { normalizeTaxRegistrationNumber } from "./tax-registration-number";
import { isInvalidValidityRange } from "./validity-overlap";

async function assertPartyInOrg(
	store: Pick<MasterDataStore, "getPartyById">,
	organizationId: string,
	partyId: string,
): Promise<Result<true>> {
	const party = await store.getPartyById(organizationId, partyId);
	if (!party.ok) {
		return party;
	}
	if (party.data === null) {
		return fail("NOT_FOUND", "Party not found", {
			reason: "MASTER_NOT_FOUND",
		} satisfies MasterFailureDetails);
	}
	if (party.data.status === "retired") {
		return fail("CONFLICT", "Party is retired", {
			reason: "MASTER_INVALID_STATE",
			field: "partyId",
		} satisfies MasterFailureDetails);
	}
	return ok(true);
}

async function assertActiveCountry(
	store: Pick<MasterDataStore, "getRefCountryById">,
	jurisdictionCountryId: string,
): Promise<Result<true>> {
	const country = await store.getRefCountryById(jurisdictionCountryId);
	if (!country.ok) return country;
	if (country.data === null || !country.data.active) {
		return fail("BAD_REQUEST", "Active jurisdiction country not found", {
			reason: "MASTER_VALIDATION_FAILED",
			field: "jurisdictionCountryId",
		} satisfies MasterFailureDetails);
	}
	return ok(true);
}

async function assertNoActiveOverlap(
	store: Pick<MasterDataStore, "findOverlappingActiveTaxRegistration">,
	candidate: TaxRegistration,
): Promise<Result<true>> {
	if (candidate.validFrom === null) {
		return fail("CONFLICT", "Activation requires validFrom", {
			reason: "MASTER_INVALID_STATE",
			field: "validFrom",
		} satisfies MasterFailureDetails);
	}
	const conflict = await store.findOverlappingActiveTaxRegistration({
		organizationId: candidate.organizationId,
		partyId: candidate.partyId,
		jurisdictionCountryId: candidate.jurisdictionCountryId,
		registrationType: candidate.registrationType,
		validFrom: candidate.validFrom,
		validTo: candidate.validTo,
		excludeId: candidate.id,
	});
	if (!conflict.ok) return conflict;
	if (conflict.data !== null) {
		return fail("CONFLICT", "Active tax registration validity ranges overlap", {
			reason: "MASTER_VALIDITY_OVERLAP",
			conflictingId: conflict.data.id,
		} satisfies MasterFailureDetails);
	}
	return ok(true);
}

function assertValidity(range: {
	validFrom: Date | null;
	validTo: Date | null;
}): Result<true> {
	if (isInvalidValidityRange(range)) {
		return fail("BAD_REQUEST", "validTo must be after validFrom", {
			reason: "MASTER_VALIDATION_FAILED",
		} satisfies MasterFailureDetails);
	}
	return ok(true);
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
		store,
		parsed.data.organizationId,
		parsed.data.partyId,
	);
	if (!partyOk.ok) {
		return partyOk;
	}
	const countryOk = await assertActiveCountry(
		store,
		parsed.data.jurisdictionCountryId,
	);
	if (!countryOk.ok) return countryOk;
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
	const lifecycleFields = assertNoLifecycleControlledFieldMutation(input, {
		entityType: "tax_registration",
	});
	if (!lifecycleFields.ok) {
		return lifecycleFields;
	}
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
		const overlap = await assertNoActiveOverlap(store, {
			...current.data,
			validFrom: nextValidFrom,
			validTo: nextValidTo,
		});
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
	toStatus: "active" | "blocked" | "retired",
	eventSuffix: TaxRegistrationLifecycleEventSuffix,
	command: MasterCommandId,
	options: MasterCommandOptions,
	transitionKind: "lifecycle" | "restore" = "lifecycle",
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
	const lifecycle =
		transitionKind === "restore"
			? assertRestoreTransition(current.data.status, "blocked")
			: assertTaxRegistrationLifecycleTransition(current.data.status, toStatus);
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
		const partyOk = await assertPartyInOrg(
			store,
			current.data.organizationId,
			current.data.partyId,
		);
		if (!partyOk.ok) return partyOk;
		const countryOk = await assertActiveCountry(
			store,
			current.data.jurisdictionCountryId,
		);
		if (!countryOk.ok) return countryOk;
		const overlap = await assertNoActiveOverlap(store, current.data);
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
		"blocked",
		"restored",
		MASTER_COMMAND_TAX_REGISTRATION_RESTORE,
		options,
		"restore",
	);
}

export async function getTaxRegistrationById(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<TaxRegistration | null>> {
	const parsed = parseMasterInput(
		getByIdInputSchema,
		input,
		"Invalid tax registration get-by-id input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const store = resolveStore(options.store);
	const { authorization } = options;
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
	options: MasterQueryOptions = {},
): Promise<Result<TaxRegistration[]>> {
	const parsed = parseMasterInput(
		listTaxRegistrationsInputSchema,
		input,
		"Invalid tax registration list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const store = resolveStore(options.store);
	const { authorization } = options;
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
	options: MasterQueryOptions = {},
): Promise<Result<TaxRegistration[]>> {
	const parsed = parseMasterInput(
		findTaxRegistrationsByPartyInputSchema,
		input,
		"Invalid tax registration find-by-party input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const store = resolveStore(options.store);
	const { authorization } = options;
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
