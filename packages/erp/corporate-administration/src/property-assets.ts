import { fail, ok, type Result } from "@afenda/errors/result";
import {
	CA_ASSET_DISPOSED_EVENT,
	CA_ASSET_REGISTERED_EVENT,
	CA_ASSET_UPDATED_EVENT,
	CA_ASSET_WRITTEN_OFF_EVENT,
	CA_CHARGE_AMENDED_EVENT,
	CA_CHARGE_REGISTERED_EVENT,
	CA_CHARGE_RELEASED_EVENT,
	CA_INSURANCE_POLICY_CANCELLED_EVENT,
	CA_INSURANCE_POLICY_REGISTERED_EVENT,
	CA_INSURANCE_POLICY_RENEWED_EVENT,
	CA_INSURANCE_POLICY_UPDATED_EVENT,
	CA_INTELLECTUAL_PROPERTY_DISPOSED_EVENT,
	CA_INTELLECTUAL_PROPERTY_EXPIRED_EVENT,
	CA_INTELLECTUAL_PROPERTY_REGISTERED_EVENT,
	CA_INTELLECTUAL_PROPERTY_RENEWED_EVENT,
	CA_INTELLECTUAL_PROPERTY_UPDATED_EVENT,
	CA_PROPERTY_DISPOSED_EVENT,
	CA_PROPERTY_REGISTERED_EVENT,
	CA_PROPERTY_UPDATED_EVENT,
	type CorporateAdministrationEventType,
} from "@afenda/events/schemas";

import {
	requireCaCommandPermission,
	requireCaQueryPermission,
} from "./authorization";
import {
	type CorporateAdministrationCommandOptions,
	resolveCommandDeps,
} from "./command-options";
import { CA_ERROR_IDEMPOTENCY_CONFLICT, caErrorDetails } from "./error-codes";
import {
	CA_COMMAND_ASSET_DISPOSE,
	CA_COMMAND_ASSET_REGISTER,
	CA_COMMAND_ASSET_UPDATE,
	CA_COMMAND_ASSET_WRITE_OFF,
	CA_COMMAND_CHARGE_AMEND,
	CA_COMMAND_CHARGE_REGISTER,
	CA_COMMAND_CHARGE_RELEASE,
	CA_COMMAND_INSURANCE_POLICY_CANCEL,
	CA_COMMAND_INSURANCE_POLICY_REGISTER,
	CA_COMMAND_INSURANCE_POLICY_RENEW,
	CA_COMMAND_INSURANCE_POLICY_UPDATE,
	CA_COMMAND_INTELLECTUAL_PROPERTY_DISPOSE,
	CA_COMMAND_INTELLECTUAL_PROPERTY_EXPIRE,
	CA_COMMAND_INTELLECTUAL_PROPERTY_REGISTER,
	CA_COMMAND_INTELLECTUAL_PROPERTY_RENEW,
	CA_COMMAND_INTELLECTUAL_PROPERTY_UPDATE,
	CA_COMMAND_PROPERTY_DISPOSE,
	CA_COMMAND_PROPERTY_REGISTER,
	CA_COMMAND_PROPERTY_UPDATE,
	CA_QUERY_ASSET_GET,
	CA_QUERY_ASSET_LIST,
	CA_QUERY_ASSET_LIST_AS_OF,
	CA_QUERY_CHARGE_GET,
	CA_QUERY_CHARGE_LIST,
	CA_QUERY_CHARGE_LIST_AS_OF,
	CA_QUERY_INSURANCE_POLICY_GET,
	CA_QUERY_INSURANCE_POLICY_LIST,
	CA_QUERY_INSURANCE_POLICY_LIST_AS_OF,
	CA_QUERY_INSURANCE_POLICY_LIST_EXPIRING,
	CA_QUERY_INTELLECTUAL_PROPERTY_GET,
	CA_QUERY_INTELLECTUAL_PROPERTY_LIST,
	CA_QUERY_INTELLECTUAL_PROPERTY_LIST_AS_OF,
	CA_QUERY_INTELLECTUAL_PROPERTY_LIST_EXPIRING,
	CA_QUERY_PROPERTY_GET,
	CA_QUERY_PROPERTY_LIST,
	CA_QUERY_PROPERTY_LIST_AS_OF,
	type CaCommandId,
	type CaQueryId,
} from "./module-ids";
import type { Ca4MutationContext, CorporateAdministrationStore } from "./ports";
import {
	amendChargeInputSchema,
	cancelInsurancePolicyInputSchema,
	disposePropertyInputSchema,
	getCa4EntityInputSchema,
	listCa4EntitiesAsOfInputSchema,
	listCa4EntitiesExpiringInputSchema,
	listCa4EntitiesInputSchema,
	registerChargeInputSchema,
	registerCorporateAssetInputSchema,
	registerInsurancePolicyInputSchema,
	registerIntellectualPropertyInputSchema,
	registerPropertyInputSchema,
	releaseChargeInputSchema,
	renewInsurancePolicyInputSchema,
	renewIntellectualPropertyInputSchema,
	terminateCorporateAssetInputSchema,
	terminateIntellectualPropertyInputSchema,
	updateCorporateAssetInputSchema,
	updateInsurancePolicyInputSchema,
	updateIntellectualPropertyInputSchema,
	updatePropertyInputSchema,
} from "./property-assets-schemas";
import { normalizeCompanyCode, normalizeIdentifierValue } from "./shared/code";
import { compareDecimal, parseDecimalString } from "./shared/decimal";
import { createCorporateAdministrationRequestFingerprint } from "./shared/fingerprint";
import type {
	Ca4Subject,
	CaCharge,
	CaCorporateAsset,
	CaInsurancePolicy,
	CaIntellectualPropertyRight,
	CaPropertyHolding,
} from "./slice-types";

type CommandContext = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	idempotencyKey: string;
	legalCompanyId: string;
};

type PartySnapshot = {
	id: string;
	code: string | null;
	name: string | null;
};

function invalid(message: string, issues: unknown): Result<never> {
	return fail("BAD_REQUEST", message, { issues });
}

function normalizeText(value: string): string {
	return value.normalize("NFC").trim().toUpperCase();
}

function fingerprint<T extends CommandContext>(
	commandId: CaCommandId,
	input: T,
) {
	const {
		actorUserId: _actorUserId,
		correlationId: _correlationId,
		idempotencyKey: _idempotencyKey,
		...business
	} = input;
	return createCorporateAdministrationRequestFingerprint({
		commandId,
		...business,
	});
}

function mutation(
	input: CommandContext,
	commandId: CaCommandId,
	eventType: CorporateAdministrationEventType,
	requestFingerprint: string,
	options: CorporateAdministrationCommandOptions,
): Ca4MutationContext {
	const { ports } = resolveCommandDeps(options);
	return {
		ports,
		meta: {
			correlationId: input.correlationId,
			eventType,
			commandId,
			requestFingerprint,
			idempotencyKey: input.idempotencyKey,
		},
	};
}

async function authorizeCommand(
	command: CaCommandId,
	input: { organizationId: string; actorUserId: string },
	options: CorporateAdministrationCommandOptions,
) {
	return requireCaCommandPermission(options.authorization, {
		...input,
		command,
	});
}

async function authorizeQuery(
	query: CaQueryId,
	input: { organizationId: string; actorUserId: string },
	options: CorporateAdministrationCommandOptions,
) {
	return requireCaQueryPermission(options.authorization, { ...input, query });
}

async function requireCompany(
	store: CorporateAdministrationStore,
	organizationId: string,
	legalCompanyId: string,
) {
	const company = await store.getById(organizationId, legalCompanyId);
	if (!company.ok) return company;
	if (!company.data) return fail("NOT_FOUND", "Legal company not found");
	return company;
}

async function resolveParty(
	options: CorporateAdministrationCommandOptions,
	input: { organizationId: string; actorUserId: string; partyId: string },
): Promise<Result<PartySnapshot>> {
	if (!options.masters) {
		return fail("INTERNAL_ERROR", "Master-data lookup port is required");
	}
	const party = await options.masters.getPartyById(input);
	if (!party.ok) return party;
	if (!party.data) return fail("NOT_FOUND", "Party not found");
	return ok({
		id: party.data.id,
		code: party.data.code,
		name: party.data.name,
	});
}

async function validateCurrency(
	options: CorporateAdministrationCommandOptions,
	input: { organizationId: string; actorUserId: string; currencyCode: string },
): Promise<Result<string>> {
	if (!options.masters) {
		return fail("INTERNAL_ERROR", "Master-data lookup port is required");
	}
	const code = input.currencyCode.toUpperCase();
	const currency = await options.masters.getCurrencyByCode({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		code,
	});
	if (!currency.ok) return currency;
	if (!currency.data) return fail("BAD_REQUEST", "Currency code is invalid");
	return ok(code);
}

async function validateCountry(
	options: CorporateAdministrationCommandOptions,
	input: { organizationId: string; actorUserId: string; countryCode: string },
): Promise<Result<string>> {
	if (!options.masters) {
		return fail("INTERNAL_ERROR", "Master-data lookup port is required");
	}
	const code = input.countryCode.toUpperCase();
	const country = await options.masters.getCountryByCode({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		code,
	});
	if (!country.ok) return country;
	if (!country.data) return fail("BAD_REQUEST", "Country code is invalid");
	return ok(code);
}

async function validateSubject(
	store: CorporateAdministrationStore,
	organizationId: string,
	legalCompanyId: string,
	subject: Ca4Subject,
): Promise<Result<Ca4Subject>> {
	if (subject.kind === "company" || subject.kind === "other")
		return ok(subject);
	if (subject.kind === "property") {
		const row = await store.getPropertyHoldingById(
			organizationId,
			subject.propertyHoldingId,
		);
		if (!row.ok) return row;
		if (!row.data || row.data.legalCompanyId !== legalCompanyId) {
			return fail("NOT_FOUND", "Covered property not found");
		}
		return ok(subject);
	}
	if (subject.kind === "corporate-asset") {
		const row = await store.getCorporateAssetById(
			organizationId,
			subject.corporateAssetId,
		);
		if (!row.ok) return row;
		if (!row.data || row.data.legalCompanyId !== legalCompanyId) {
			return fail("NOT_FOUND", "Covered corporate asset not found");
		}
		return ok(subject);
	}
	const row = await store.getIntellectualPropertyRightById(
		organizationId,
		subject.intellectualPropertyRightId,
	);
	if (!row.ok) return row;
	if (!row.data || row.data.legalCompanyId !== legalCompanyId) {
		return fail("NOT_FOUND", "Covered intellectual property right not found");
	}
	return ok(subject);
}

function positiveDecimal(
	value: string,
	label: string,
	maximum?: string,
): Result<string> {
	const normalized = parseDecimalString(value);
	if (!normalized || compareDecimal(normalized, "0") <= 0) {
		return fail("BAD_REQUEST", `${label} must be positive`);
	}
	if (maximum && compareDecimal(normalized, maximum) > 0) {
		return fail("BAD_REQUEST", `${label} exceeds ${maximum}`);
	}
	return ok(normalized);
}

async function replayConflict(
	store: CorporateAdministrationStore,
	input: CommandContext,
	requestFingerprint: string,
): Promise<Result<string | null>> {
	const receipt = await store.getPropertyAssetMutationReceipt(
		input.organizationId,
		input.idempotencyKey,
	);
	if (!receipt.ok) return receipt;
	if (!receipt.data) return ok(null);
	if (receipt.data.requestFingerprint !== requestFingerprint) {
		return fail(
			"CONFLICT",
			"Idempotency key was already used for a different request",
			caErrorDetails(CA_ERROR_IDEMPOTENCY_CONFLICT),
		);
	}
	return ok(receipt.data.entityId);
}

async function replayEntity<T>(
	store: CorporateAdministrationStore,
	input: CommandContext,
	requestFingerprint: string,
	get: (organizationId: string, entityId: string) => Promise<Result<T | null>>,
): Promise<Result<T | null>> {
	const replay = await replayConflict(store, input, requestFingerprint);
	if (!replay.ok) return replay;
	if (!replay.data) return ok(null);
	const row = await get(input.organizationId, replay.data);
	if (!row.ok) return row;
	return row.data
		? ok(row.data)
		: fail("NOT_FOUND", "Replayed CA-4 record not found");
}

function requireActive<T extends { status: string }>(
	row: T,
	label: string,
): Result<T> {
	if (row.status !== "active" && row.status !== "pending") {
		return fail("CONFLICT", `${label} is terminal and cannot be changed`);
	}
	return ok(row);
}

export async function registerProperty(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaPropertyHolding>> {
	const parsed = registerPropertyInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid("Invalid property registration", parsed.error.issues);
	const authorized = await authorizeCommand(
		CA_COMMAND_PROPERTY_REGISTER,
		parsed.data,
		options,
	);
	if (!authorized.ok) return authorized;
	const { store } = resolveCommandDeps(options);
	const company = await requireCompany(
		store,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const ownership = positiveDecimal(
		parsed.data.ownershipPercentage,
		"Ownership percentage",
		"100",
	);
	if (!ownership.ok) return ownership;
	const code = normalizeCompanyCode(parsed.data.code);
	if (!code.ok) return code;
	const requestFingerprint = fingerprint(
		CA_COMMAND_PROPERTY_REGISTER,
		parsed.data,
	);
	const replay = await replayConflict(store, parsed.data, requestFingerprint);
	if (!replay.ok) return replay;
	if (replay.data) {
		const row = await store.getPropertyHoldingById(
			parsed.data.organizationId,
			replay.data,
		);
		return row.ok && row.data
			? ok(row.data)
			: fail("NOT_FOUND", "Property not found");
	}
	return store.createPropertyHolding(
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			code: code.data.code,
			normalizedCode: code.data.normalizedCode,
			propertyType: parsed.data.propertyType.trim(),
			titleReference: parsed.data.titleReference.trim(),
			normalizedTitleReference: normalizeText(parsed.data.titleReference),
			propertyDescription: parsed.data.propertyDescription.trim(),
			ownershipPercentage: ownership.data,
			acquisitionDate: parsed.data.acquisitionDate,
			disposalDate: null,
			tenureType: parsed.data.tenureType?.trim() ?? null,
			valuationReference: parsed.data.valuationReference ?? null,
			disposalReason: null,
			disposalEvidenceReference: null,
			status: "active",
			createIdempotencyKey: parsed.data.idempotencyKey,
			createRequestFingerprint: requestFingerprint,
			createdBy: parsed.data.actorUserId,
			updatedBy: parsed.data.actorUserId,
		},
		mutation(
			parsed.data,
			CA_COMMAND_PROPERTY_REGISTER,
			CA_PROPERTY_REGISTERED_EVENT,
			requestFingerprint,
			options,
		),
	);
}

export async function updateProperty(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaPropertyHolding>> {
	const parsed = updatePropertyInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid("Invalid property update", parsed.error.issues);
	const authorized = await authorizeCommand(
		CA_COMMAND_PROPERTY_UPDATE,
		parsed.data,
		options,
	);
	if (!authorized.ok) return authorized;
	const { store } = resolveCommandDeps(options);
	const current = await store.getPropertyHoldingById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) return current;
	if (
		!current.data ||
		current.data.legalCompanyId !== parsed.data.legalCompanyId
	) {
		return fail("NOT_FOUND", "Property not found");
	}
	const active = requireActive(current.data, "Property");
	if (!active.ok) return active;
	let ownership = current.data.ownershipPercentage;
	if (parsed.data.ownershipPercentage) {
		const checked = positiveDecimal(
			parsed.data.ownershipPercentage,
			"Ownership percentage",
			"100",
		);
		if (!checked.ok) return checked;
		ownership = checked.data;
	}
	const requestFingerprint = fingerprint(
		CA_COMMAND_PROPERTY_UPDATE,
		parsed.data,
	);
	return store.updatePropertyHolding(
		{
			...current.data,
			propertyDescription:
				parsed.data.propertyDescription ?? current.data.propertyDescription,
			ownershipPercentage: ownership,
			tenureType:
				parsed.data.tenureType === undefined
					? current.data.tenureType
					: parsed.data.tenureType,
			valuationReference:
				parsed.data.valuationReference === undefined
					? current.data.valuationReference
					: parsed.data.valuationReference,
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		mutation(
			parsed.data,
			CA_COMMAND_PROPERTY_UPDATE,
			CA_PROPERTY_UPDATED_EVENT,
			requestFingerprint,
			options,
		),
	);
}

export async function disposeProperty(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaPropertyHolding>> {
	const parsed = disposePropertyInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid("Invalid property disposal", parsed.error.issues);
	const authorized = await authorizeCommand(
		CA_COMMAND_PROPERTY_DISPOSE,
		parsed.data,
		options,
	);
	if (!authorized.ok) return authorized;
	const { store } = resolveCommandDeps(options);
	const current = await store.getPropertyHoldingById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) return current;
	if (
		!current.data ||
		current.data.legalCompanyId !== parsed.data.legalCompanyId
	) {
		return fail("NOT_FOUND", "Property not found");
	}
	if (current.data.status !== "active")
		return fail("CONFLICT", "Property is already disposed");
	if (parsed.data.disposalDate < current.data.acquisitionDate) {
		return fail("BAD_REQUEST", "Disposal date precedes acquisition date");
	}
	const requestFingerprint = fingerprint(
		CA_COMMAND_PROPERTY_DISPOSE,
		parsed.data,
	);
	return store.updatePropertyHolding(
		{
			...current.data,
			disposalDate: parsed.data.disposalDate,
			disposalReason: parsed.data.reason,
			disposalEvidenceReference: parsed.data.evidenceReference,
			status: "disposed",
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		mutation(
			parsed.data,
			CA_COMMAND_PROPERTY_DISPOSE,
			CA_PROPERTY_DISPOSED_EVENT,
			requestFingerprint,
			options,
		),
	);
}

export async function registerCorporateAsset(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCorporateAsset>> {
	const parsed = registerCorporateAssetInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid("Invalid corporate asset registration", parsed.error.issues);
	const authorized = await authorizeCommand(
		CA_COMMAND_ASSET_REGISTER,
		parsed.data,
		options,
	);
	if (!authorized.ok) return authorized;
	const { store } = resolveCommandDeps(options);
	const company = await requireCompany(
		store,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const code = normalizeCompanyCode(parsed.data.code);
	if (!code.ok) return code;
	let custodian: PartySnapshot | null = null;
	if (parsed.data.custodianPartyId) {
		const resolved = await resolveParty(options, {
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			partyId: parsed.data.custodianPartyId,
		});
		if (!resolved.ok) return resolved;
		custodian = resolved.data;
	}
	const requestFingerprint = fingerprint(
		CA_COMMAND_ASSET_REGISTER,
		parsed.data,
	);
	const replay = await replayEntity(
		store,
		parsed.data,
		requestFingerprint,
		(organizationId, entityId) =>
			store.getCorporateAssetById(organizationId, entityId),
	);
	if (!replay.ok) return replay;
	if (replay.data) return ok(replay.data);
	return store.createCorporateAsset(
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			code: code.data.code,
			normalizedCode: code.data.normalizedCode,
			assetCategory: parsed.data.assetCategory.trim(),
			identifier: parsed.data.identifier?.trim() ?? null,
			normalizedIdentifier: parsed.data.identifier
				? normalizeText(parsed.data.identifier)
				: null,
			description: parsed.data.description.trim(),
			custodianPartyId: custodian?.id ?? null,
			custodianPartyCodeSnapshot: custodian?.code ?? null,
			custodianPartyNameSnapshot: custodian?.name ?? null,
			acquisitionDate: parsed.data.acquisitionDate,
			disposalDate: null,
			writeOffDate: null,
			terminalReason: null,
			terminalEvidenceReference: null,
			status: "active",
			createIdempotencyKey: parsed.data.idempotencyKey,
			createRequestFingerprint: requestFingerprint,
			createdBy: parsed.data.actorUserId,
			updatedBy: parsed.data.actorUserId,
		},
		mutation(
			parsed.data,
			CA_COMMAND_ASSET_REGISTER,
			CA_ASSET_REGISTERED_EVENT,
			requestFingerprint,
			options,
		),
	);
}

export async function updateCorporateAsset(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCorporateAsset>> {
	const parsed = updateCorporateAssetInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid("Invalid corporate asset update", parsed.error.issues);
	const authorized = await authorizeCommand(
		CA_COMMAND_ASSET_UPDATE,
		parsed.data,
		options,
	);
	if (!authorized.ok) return authorized;
	const { store } = resolveCommandDeps(options);
	const current = await store.getCorporateAssetById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) return current;
	if (
		!current.data ||
		current.data.legalCompanyId !== parsed.data.legalCompanyId
	) {
		return fail("NOT_FOUND", "Corporate asset not found");
	}
	const active = requireActive(current.data, "Corporate asset");
	if (!active.ok) return active;
	let custodian: PartySnapshot | null | undefined;
	if (parsed.data.custodianPartyId === null) custodian = null;
	if (parsed.data.custodianPartyId) {
		const resolved = await resolveParty(options, {
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			partyId: parsed.data.custodianPartyId,
		});
		if (!resolved.ok) return resolved;
		custodian = resolved.data;
	}
	const requestFingerprint = fingerprint(CA_COMMAND_ASSET_UPDATE, parsed.data);
	return store.updateCorporateAsset(
		{
			...current.data,
			description: parsed.data.description ?? current.data.description,
			custodianPartyId:
				custodian === undefined
					? current.data.custodianPartyId
					: (custodian?.id ?? null),
			custodianPartyCodeSnapshot:
				custodian === undefined
					? current.data.custodianPartyCodeSnapshot
					: (custodian?.code ?? null),
			custodianPartyNameSnapshot:
				custodian === undefined
					? current.data.custodianPartyNameSnapshot
					: (custodian?.name ?? null),
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		mutation(
			parsed.data,
			CA_COMMAND_ASSET_UPDATE,
			CA_ASSET_UPDATED_EVENT,
			requestFingerprint,
			options,
		),
	);
}

async function terminateAsset(
	input: unknown,
	status: "disposed" | "written_off",
	commandId:
		| typeof CA_COMMAND_ASSET_DISPOSE
		| typeof CA_COMMAND_ASSET_WRITE_OFF,
	eventType: typeof CA_ASSET_DISPOSED_EVENT | typeof CA_ASSET_WRITTEN_OFF_EVENT,
	options: CorporateAdministrationCommandOptions,
): Promise<Result<CaCorporateAsset>> {
	const parsed = terminateCorporateAssetInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid("Invalid corporate asset termination", parsed.error.issues);
	const authorized = await authorizeCommand(commandId, parsed.data, options);
	if (!authorized.ok) return authorized;
	const { store } = resolveCommandDeps(options);
	const current = await store.getCorporateAssetById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) return current;
	if (
		!current.data ||
		current.data.legalCompanyId !== parsed.data.legalCompanyId
	) {
		return fail("NOT_FOUND", "Corporate asset not found");
	}
	if (current.data.status !== "active")
		return fail("CONFLICT", "Corporate asset is terminal");
	if (parsed.data.effectiveDate < current.data.acquisitionDate) {
		return fail("BAD_REQUEST", "Termination date precedes acquisition date");
	}
	const requestFingerprint = fingerprint(commandId, parsed.data);
	return store.updateCorporateAsset(
		{
			...current.data,
			status,
			disposalDate: status === "disposed" ? parsed.data.effectiveDate : null,
			writeOffDate: status === "written_off" ? parsed.data.effectiveDate : null,
			terminalReason: parsed.data.reason,
			terminalEvidenceReference: parsed.data.evidenceReference,
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		mutation(parsed.data, commandId, eventType, requestFingerprint, options),
	);
}

export function disposeCorporateAsset(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	return terminateAsset(
		input,
		"disposed",
		CA_COMMAND_ASSET_DISPOSE,
		CA_ASSET_DISPOSED_EVENT,
		options,
	);
}

export function writeOffCorporateAsset(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	return terminateAsset(
		input,
		"written_off",
		CA_COMMAND_ASSET_WRITE_OFF,
		CA_ASSET_WRITTEN_OFF_EVENT,
		options,
	);
}

function validateIpDates(input: {
	filingDate: string | null;
	grantDate: string | null;
	expiryDate: string | null;
}): Result<void> {
	if (
		input.filingDate &&
		input.grantDate &&
		input.grantDate < input.filingDate
	) {
		return fail("BAD_REQUEST", "Grant date precedes filing date");
	}
	if (
		input.grantDate &&
		input.expiryDate &&
		input.expiryDate < input.grantDate
	) {
		return fail("BAD_REQUEST", "Expiry date precedes grant date");
	}
	return ok(undefined);
}

export async function registerIntellectualProperty(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaIntellectualPropertyRight>> {
	const parsed = registerIntellectualPropertyInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid(
			"Invalid intellectual property registration",
			parsed.error.issues,
		);
	const authorized = await authorizeCommand(
		CA_COMMAND_INTELLECTUAL_PROPERTY_REGISTER,
		parsed.data,
		options,
	);
	if (!authorized.ok) return authorized;
	const { store } = resolveCommandDeps(options);
	const company = await requireCompany(
		store,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const dates = validateIpDates({
		filingDate: parsed.data.filingDate ?? null,
		grantDate: parsed.data.grantDate ?? null,
		expiryDate: parsed.data.expiryDate ?? null,
	});
	if (!dates.ok) return dates;
	const owner = await resolveParty(options, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		partyId: parsed.data.ownerPartyId,
	});
	if (!owner.ok) return owner;
	const jurisdiction = await validateCountry(options, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		countryCode: parsed.data.jurisdictionCode,
	});
	if (!jurisdiction.ok) return jurisdiction;
	const code = normalizeCompanyCode(parsed.data.code);
	if (!code.ok) return code;
	const rightNumber =
		parsed.data.registrationNumber ?? parsed.data.applicationNumber;
	if (!rightNumber) return fail("BAD_REQUEST", "IP right number is required");
	const requestFingerprint = fingerprint(
		CA_COMMAND_INTELLECTUAL_PROPERTY_REGISTER,
		parsed.data,
	);
	const replay = await replayEntity(
		store,
		parsed.data,
		requestFingerprint,
		(organizationId, entityId) =>
			store.getIntellectualPropertyRightById(organizationId, entityId),
	);
	if (!replay.ok) return replay;
	if (replay.data) return ok(replay.data);
	return store.createIntellectualPropertyRight(
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			code: code.data.code,
			normalizedCode: code.data.normalizedCode,
			rightType: parsed.data.rightType.trim(),
			jurisdictionCode: jurisdiction.data,
			applicationNumber: parsed.data.applicationNumber?.trim() ?? null,
			registrationNumber: parsed.data.registrationNumber?.trim() ?? null,
			normalizedRightNumber: normalizeText(rightNumber),
			ownerPartyId: owner.data.id,
			ownerPartyCodeSnapshot: owner.data.code,
			ownerPartyNameSnapshot: owner.data.name,
			filingDate: parsed.data.filingDate ?? null,
			grantDate: parsed.data.grantDate ?? null,
			expiryDate: parsed.data.expiryDate ?? null,
			lastRenewalDate: null,
			disposalDate: null,
			terminalReason: null,
			terminalEvidenceReference: null,
			status: parsed.data.grantDate ? "active" : "pending",
			createIdempotencyKey: parsed.data.idempotencyKey,
			createRequestFingerprint: requestFingerprint,
			createdBy: parsed.data.actorUserId,
			updatedBy: parsed.data.actorUserId,
		},
		mutation(
			parsed.data,
			CA_COMMAND_INTELLECTUAL_PROPERTY_REGISTER,
			CA_INTELLECTUAL_PROPERTY_REGISTERED_EVENT,
			requestFingerprint,
			options,
		),
	);
}

export async function updateIntellectualProperty(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaIntellectualPropertyRight>> {
	const parsed = updateIntellectualPropertyInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid("Invalid intellectual property update", parsed.error.issues);
	const authorized = await authorizeCommand(
		CA_COMMAND_INTELLECTUAL_PROPERTY_UPDATE,
		parsed.data,
		options,
	);
	if (!authorized.ok) return authorized;
	const { store } = resolveCommandDeps(options);
	const current = await store.getIntellectualPropertyRightById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) return current;
	if (
		!current.data ||
		current.data.legalCompanyId !== parsed.data.legalCompanyId
	) {
		return fail("NOT_FOUND", "Intellectual property right not found");
	}
	const active = requireActive(current.data, "Intellectual property right");
	if (!active.ok) return active;
	let owner: PartySnapshot | null = null;
	if (parsed.data.ownerPartyId) {
		const resolved = await resolveParty(options, {
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			partyId: parsed.data.ownerPartyId,
		});
		if (!resolved.ok) return resolved;
		owner = resolved.data;
	}
	const grantDate =
		parsed.data.grantDate === undefined
			? current.data.grantDate
			: parsed.data.grantDate;
	const expiryDate =
		parsed.data.expiryDate === undefined
			? current.data.expiryDate
			: parsed.data.expiryDate;
	const dates = validateIpDates({
		filingDate: current.data.filingDate,
		grantDate,
		expiryDate,
	});
	if (!dates.ok) return dates;
	const requestFingerprint = fingerprint(
		CA_COMMAND_INTELLECTUAL_PROPERTY_UPDATE,
		parsed.data,
	);
	return store.updateIntellectualPropertyRight(
		{
			...current.data,
			ownerPartyId: owner?.id ?? current.data.ownerPartyId,
			ownerPartyCodeSnapshot:
				owner?.code ?? current.data.ownerPartyCodeSnapshot,
			ownerPartyNameSnapshot:
				owner?.name ?? current.data.ownerPartyNameSnapshot,
			grantDate,
			expiryDate,
			status: grantDate ? "active" : "pending",
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		null,
		mutation(
			parsed.data,
			CA_COMMAND_INTELLECTUAL_PROPERTY_UPDATE,
			CA_INTELLECTUAL_PROPERTY_UPDATED_EVENT,
			requestFingerprint,
			options,
		),
	);
}

export async function renewIntellectualProperty(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaIntellectualPropertyRight>> {
	const parsed = renewIntellectualPropertyInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid(
			"Invalid intellectual property renewal",
			parsed.error.issues,
		);
	const authorized = await authorizeCommand(
		CA_COMMAND_INTELLECTUAL_PROPERTY_RENEW,
		parsed.data,
		options,
	);
	if (!authorized.ok) return authorized;
	const { store } = resolveCommandDeps(options);
	const current = await store.getIntellectualPropertyRightById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) return current;
	if (
		!current.data ||
		current.data.legalCompanyId !== parsed.data.legalCompanyId
	) {
		return fail("NOT_FOUND", "Intellectual property right not found");
	}
	if (current.data.status !== "active")
		return fail("CONFLICT", "Only active IP rights can be renewed");
	if (parsed.data.newExpiryDate <= parsed.data.renewalDate) {
		return fail("BAD_REQUEST", "New expiry date must follow renewal date");
	}
	if (
		current.data.expiryDate &&
		parsed.data.newExpiryDate <= current.data.expiryDate
	) {
		return fail("BAD_REQUEST", "Renewal must extend the current expiry date");
	}
	const requestFingerprint = fingerprint(
		CA_COMMAND_INTELLECTUAL_PROPERTY_RENEW,
		parsed.data,
	);
	return store.updateIntellectualPropertyRight(
		{
			...current.data,
			expiryDate: parsed.data.newExpiryDate,
			lastRenewalDate: parsed.data.renewalDate,
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			intellectualPropertyRightId: current.data.id,
			renewalDate: parsed.data.renewalDate,
			previousExpiryDate: current.data.expiryDate,
			newExpiryDate: parsed.data.newExpiryDate,
			evidenceReference: parsed.data.evidenceReference,
			idempotencyKey: parsed.data.idempotencyKey,
			requestFingerprint,
			actorUserId: parsed.data.actorUserId,
			correlationId: parsed.data.correlationId,
		},
		mutation(
			parsed.data,
			CA_COMMAND_INTELLECTUAL_PROPERTY_RENEW,
			CA_INTELLECTUAL_PROPERTY_RENEWED_EVENT,
			requestFingerprint,
			options,
		),
	);
}

async function terminateIp(
	input: unknown,
	status: "expired" | "disposed",
	commandId:
		| typeof CA_COMMAND_INTELLECTUAL_PROPERTY_EXPIRE
		| typeof CA_COMMAND_INTELLECTUAL_PROPERTY_DISPOSE,
	eventType:
		| typeof CA_INTELLECTUAL_PROPERTY_EXPIRED_EVENT
		| typeof CA_INTELLECTUAL_PROPERTY_DISPOSED_EVENT,
	options: CorporateAdministrationCommandOptions,
) {
	const parsed = terminateIntellectualPropertyInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid(
			"Invalid intellectual property termination",
			parsed.error.issues,
		);
	const authorized = await authorizeCommand(commandId, parsed.data, options);
	if (!authorized.ok) return authorized;
	const { store } = resolveCommandDeps(options);
	const current = await store.getIntellectualPropertyRightById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) return current;
	if (
		!current.data ||
		current.data.legalCompanyId !== parsed.data.legalCompanyId
	) {
		return fail("NOT_FOUND", "Intellectual property right not found");
	}
	const active = requireActive(current.data, "Intellectual property right");
	if (!active.ok) return active;
	if (
		status === "expired" &&
		current.data.expiryDate &&
		parsed.data.effectiveDate < current.data.expiryDate
	) {
		return fail("BAD_REQUEST", "IP right cannot expire before its expiry date");
	}
	const requestFingerprint = fingerprint(commandId, parsed.data);
	return store.updateIntellectualPropertyRight(
		{
			...current.data,
			status,
			disposalDate: status === "disposed" ? parsed.data.effectiveDate : null,
			terminalReason: parsed.data.reason,
			terminalEvidenceReference: parsed.data.evidenceReference,
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		null,
		mutation(parsed.data, commandId, eventType, requestFingerprint, options),
	);
}

export function expireIntellectualProperty(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	return terminateIp(
		input,
		"expired",
		CA_COMMAND_INTELLECTUAL_PROPERTY_EXPIRE,
		CA_INTELLECTUAL_PROPERTY_EXPIRED_EVENT,
		options,
	);
}

export function disposeIntellectualProperty(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	return terminateIp(
		input,
		"disposed",
		CA_COMMAND_INTELLECTUAL_PROPERTY_DISPOSE,
		CA_INTELLECTUAL_PROPERTY_DISPOSED_EVENT,
		options,
	);
}

export async function registerInsurancePolicy(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaInsurancePolicy>> {
	const parsed = registerInsurancePolicyInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid(
			"Invalid insurance policy registration",
			parsed.error.issues,
		);
	const authorized = await authorizeCommand(
		CA_COMMAND_INSURANCE_POLICY_REGISTER,
		parsed.data,
		options,
	);
	if (!authorized.ok) return authorized;
	const { store } = resolveCommandDeps(options);
	const company = await requireCompany(
		store,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	if (
		parsed.data.effectiveTo &&
		parsed.data.effectiveTo < parsed.data.effectiveFrom
	) {
		return fail("BAD_REQUEST", "Policy end date precedes start date");
	}
	const insurer = await resolveParty(options, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		partyId: parsed.data.insurerPartyId,
	});
	if (!insurer.ok) return insurer;
	const subject = await validateSubject(
		store,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
		parsed.data.coveredSubject,
	);
	if (!subject.ok) return subject;
	let limitAmount: string | null = null;
	let currencyCode: string | null = null;
	if (parsed.data.limitAmount && parsed.data.currencyCode) {
		const amount = positiveDecimal(parsed.data.limitAmount, "Policy limit");
		if (!amount.ok) return amount;
		const currency = await validateCurrency(options, {
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			currencyCode: parsed.data.currencyCode,
		});
		if (!currency.ok) return currency;
		limitAmount = amount.data;
		currencyCode = currency.data;
	}
	const policy = normalizeIdentifierValue(parsed.data.policyNumber);
	if (!policy.ok) return policy;
	const requestFingerprint = fingerprint(
		CA_COMMAND_INSURANCE_POLICY_REGISTER,
		parsed.data,
	);
	const replay = await replayEntity(
		store,
		parsed.data,
		requestFingerprint,
		(organizationId, entityId) =>
			store.getInsurancePolicyById(organizationId, entityId),
	);
	if (!replay.ok) return replay;
	if (replay.data) return ok(replay.data);
	return store.createInsurancePolicy(
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			policyNumber: policy.data.value,
			normalizedPolicyNumber: policy.data.normalizedValue,
			insurerPartyId: insurer.data.id,
			insurerPartyCodeSnapshot: insurer.data.code,
			insurerPartyNameSnapshot: insurer.data.name,
			coveredSubject: subject.data,
			effectiveFrom: parsed.data.effectiveFrom,
			effectiveTo: parsed.data.effectiveTo ?? null,
			limitAmount,
			currencyCode,
			documentReference: parsed.data.documentReference,
			cancellationDate: null,
			cancellationReason: null,
			cancellationEvidenceReference: null,
			status: "active",
			createIdempotencyKey: parsed.data.idempotencyKey,
			createRequestFingerprint: requestFingerprint,
			createdBy: parsed.data.actorUserId,
			updatedBy: parsed.data.actorUserId,
		},
		mutation(
			parsed.data,
			CA_COMMAND_INSURANCE_POLICY_REGISTER,
			CA_INSURANCE_POLICY_REGISTERED_EVENT,
			requestFingerprint,
			options,
		),
	);
}

export async function updateInsurancePolicy(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaInsurancePolicy>> {
	const parsed = updateInsurancePolicyInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid("Invalid insurance policy update", parsed.error.issues);
	const authorized = await authorizeCommand(
		CA_COMMAND_INSURANCE_POLICY_UPDATE,
		parsed.data,
		options,
	);
	if (!authorized.ok) return authorized;
	const { store } = resolveCommandDeps(options);
	const current = await store.getInsurancePolicyById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) return current;
	if (
		!current.data ||
		current.data.legalCompanyId !== parsed.data.legalCompanyId
	) {
		return fail("NOT_FOUND", "Insurance policy not found");
	}
	if (current.data.status !== "active")
		return fail("CONFLICT", "Cancelled policy cannot be updated");
	let subject = current.data.coveredSubject;
	if (parsed.data.coveredSubject) {
		const validated = await validateSubject(
			store,
			parsed.data.organizationId,
			parsed.data.legalCompanyId,
			parsed.data.coveredSubject,
		);
		if (!validated.ok) return validated;
		subject = validated.data;
	}
	const limitAmount =
		parsed.data.limitAmount === undefined
			? current.data.limitAmount
			: parsed.data.limitAmount;
	const currencyCode =
		parsed.data.currencyCode === undefined
			? current.data.currencyCode
			: parsed.data.currencyCode;
	if ((limitAmount === null) !== (currencyCode === null)) {
		return fail(
			"BAD_REQUEST",
			"Policy limit and currency must be provided together",
		);
	}
	let canonicalLimit = limitAmount;
	let canonicalCurrency = currencyCode;
	if (limitAmount !== null && currencyCode !== null) {
		const checked = positiveDecimal(limitAmount, "Policy limit");
		if (!checked.ok) return checked;
		const currency = await validateCurrency(options, {
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			currencyCode,
		});
		if (!currency.ok) return currency;
		canonicalLimit = checked.data;
		canonicalCurrency = currency.data;
	}
	const requestFingerprint = fingerprint(
		CA_COMMAND_INSURANCE_POLICY_UPDATE,
		parsed.data,
	);
	return store.updateInsurancePolicy(
		{
			...current.data,
			coveredSubject: subject,
			limitAmount: canonicalLimit,
			currencyCode: canonicalCurrency,
			documentReference:
				parsed.data.documentReference ?? current.data.documentReference,
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		null,
		mutation(
			parsed.data,
			CA_COMMAND_INSURANCE_POLICY_UPDATE,
			CA_INSURANCE_POLICY_UPDATED_EVENT,
			requestFingerprint,
			options,
		),
	);
}

export async function renewInsurancePolicy(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaInsurancePolicy>> {
	const parsed = renewInsurancePolicyInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid("Invalid insurance renewal", parsed.error.issues);
	const authorized = await authorizeCommand(
		CA_COMMAND_INSURANCE_POLICY_RENEW,
		parsed.data,
		options,
	);
	if (!authorized.ok) return authorized;
	const { store } = resolveCommandDeps(options);
	const current = await store.getInsurancePolicyById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) return current;
	if (
		!current.data ||
		current.data.legalCompanyId !== parsed.data.legalCompanyId
	) {
		return fail("NOT_FOUND", "Insurance policy not found");
	}
	if (current.data.status !== "active")
		return fail("CONFLICT", "Cancelled policy cannot be renewed");
	if (
		current.data.effectiveTo &&
		parsed.data.newEffectiveTo <= current.data.effectiveTo
	) {
		return fail(
			"BAD_REQUEST",
			"Renewal must extend the current policy end date",
		);
	}
	const nextLimit = parsed.data.limitAmount ?? current.data.limitAmount;
	const nextCurrency = parsed.data.currencyCode ?? current.data.currencyCode;
	if ((nextLimit === null) !== (nextCurrency === null)) {
		return fail(
			"BAD_REQUEST",
			"Policy limit and currency must be provided together",
		);
	}
	let canonicalLimit = nextLimit;
	let canonicalCurrency = nextCurrency;
	if (nextLimit !== null && nextCurrency !== null) {
		const checked = positiveDecimal(nextLimit, "Policy limit");
		if (!checked.ok) return checked;
		const currency = await validateCurrency(options, {
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			currencyCode: nextCurrency,
		});
		if (!currency.ok) return currency;
		canonicalLimit = checked.data;
		canonicalCurrency = currency.data;
	}
	const requestFingerprint = fingerprint(
		CA_COMMAND_INSURANCE_POLICY_RENEW,
		parsed.data,
	);
	return store.updateInsurancePolicy(
		{
			...current.data,
			effectiveTo: parsed.data.newEffectiveTo,
			limitAmount: canonicalLimit,
			currencyCode: canonicalCurrency,
			documentReference: parsed.data.documentReference,
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			insurancePolicyId: current.data.id,
			renewalDate: parsed.data.renewalDate,
			previousEffectiveTo: current.data.effectiveTo,
			newEffectiveTo: parsed.data.newEffectiveTo,
			limitAmount: canonicalLimit,
			currencyCode: canonicalCurrency,
			documentReference: parsed.data.documentReference,
			evidenceReference: parsed.data.evidenceReference,
			idempotencyKey: parsed.data.idempotencyKey,
			requestFingerprint,
			actorUserId: parsed.data.actorUserId,
			correlationId: parsed.data.correlationId,
		},
		mutation(
			parsed.data,
			CA_COMMAND_INSURANCE_POLICY_RENEW,
			CA_INSURANCE_POLICY_RENEWED_EVENT,
			requestFingerprint,
			options,
		),
	);
}

export async function cancelInsurancePolicy(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaInsurancePolicy>> {
	const parsed = cancelInsurancePolicyInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid("Invalid insurance cancellation", parsed.error.issues);
	const authorized = await authorizeCommand(
		CA_COMMAND_INSURANCE_POLICY_CANCEL,
		parsed.data,
		options,
	);
	if (!authorized.ok) return authorized;
	const { store } = resolveCommandDeps(options);
	const current = await store.getInsurancePolicyById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) return current;
	if (
		!current.data ||
		current.data.legalCompanyId !== parsed.data.legalCompanyId
	) {
		return fail("NOT_FOUND", "Insurance policy not found");
	}
	if (current.data.status !== "active")
		return fail("CONFLICT", "Policy is already cancelled");
	if (parsed.data.cancellationDate < current.data.effectiveFrom) {
		return fail("BAD_REQUEST", "Cancellation date precedes policy start");
	}
	const requestFingerprint = fingerprint(
		CA_COMMAND_INSURANCE_POLICY_CANCEL,
		parsed.data,
	);
	return store.updateInsurancePolicy(
		{
			...current.data,
			effectiveTo: parsed.data.cancellationDate,
			cancellationDate: parsed.data.cancellationDate,
			cancellationReason: parsed.data.reason,
			cancellationEvidenceReference: parsed.data.evidenceReference,
			status: "cancelled",
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		null,
		mutation(
			parsed.data,
			CA_COMMAND_INSURANCE_POLICY_CANCEL,
			CA_INSURANCE_POLICY_CANCELLED_EVENT,
			requestFingerprint,
			options,
		),
	);
}

export async function registerCharge(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCharge>> {
	const parsed = registerChargeInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid("Invalid charge registration", parsed.error.issues);
	const authorized = await authorizeCommand(
		CA_COMMAND_CHARGE_REGISTER,
		parsed.data,
		options,
	);
	if (!authorized.ok) return authorized;
	const { store } = resolveCommandDeps(options);
	const company = await requireCompany(
		store,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const party = await resolveParty(options, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		partyId: parsed.data.securedPartyId,
	});
	if (!party.ok) return party;
	const subject = await validateSubject(
		store,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
		parsed.data.affectedSubject,
	);
	if (!subject.ok) return subject;
	const code = normalizeCompanyCode(parsed.data.code);
	if (!code.ok) return code;
	let amount: string | null = null;
	let currencyCode: string | null = null;
	if (parsed.data.amount && parsed.data.currencyCode) {
		const checked = positiveDecimal(parsed.data.amount, "Charge amount");
		if (!checked.ok) return checked;
		const currency = await validateCurrency(options, {
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			currencyCode: parsed.data.currencyCode,
		});
		if (!currency.ok) return currency;
		amount = checked.data;
		currencyCode = currency.data;
	}
	const requestFingerprint = fingerprint(
		CA_COMMAND_CHARGE_REGISTER,
		parsed.data,
	);
	const replay = await replayEntity(
		store,
		parsed.data,
		requestFingerprint,
		(organizationId, entityId) => store.getChargeById(organizationId, entityId),
	);
	if (!replay.ok) return replay;
	if (replay.data) return ok(replay.data);
	return store.createCharge(
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			code: code.data.code,
			normalizedCode: code.data.normalizedCode,
			chargeType: parsed.data.chargeType.trim(),
			securedPartyId: party.data.id,
			securedPartyCodeSnapshot: party.data.code,
			securedPartyNameSnapshot: party.data.name,
			affectedSubject: subject.data,
			amount,
			currencyCode,
			priorityRank: parsed.data.priorityRank,
			createdDate: parsed.data.createdDate,
			releasedDate: null,
			creationEvidenceReference: parsed.data.evidenceReference,
			releaseReason: null,
			releaseEvidenceReference: null,
			status: "active",
			createIdempotencyKey: parsed.data.idempotencyKey,
			createRequestFingerprint: requestFingerprint,
			createdBy: parsed.data.actorUserId,
			updatedBy: parsed.data.actorUserId,
		},
		mutation(
			parsed.data,
			CA_COMMAND_CHARGE_REGISTER,
			CA_CHARGE_REGISTERED_EVENT,
			requestFingerprint,
			options,
		),
	);
}

export async function amendCharge(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCharge>> {
	const parsed = amendChargeInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid("Invalid charge amendment", parsed.error.issues);
	const authorized = await authorizeCommand(
		CA_COMMAND_CHARGE_AMEND,
		parsed.data,
		options,
	);
	if (!authorized.ok) return authorized;
	const { store } = resolveCommandDeps(options);
	const current = await store.getChargeById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) return current;
	if (
		!current.data ||
		current.data.legalCompanyId !== parsed.data.legalCompanyId
	) {
		return fail("NOT_FOUND", "Charge not found");
	}
	if (current.data.status !== "active")
		return fail("CONFLICT", "Released charge cannot be amended");
	if (parsed.data.variationDate < current.data.createdDate) {
		return fail("BAD_REQUEST", "Variation date precedes charge creation");
	}
	const amount =
		parsed.data.amount === undefined ? current.data.amount : parsed.data.amount;
	const currencyCode =
		parsed.data.currencyCode === undefined
			? current.data.currencyCode
			: parsed.data.currencyCode;
	if ((amount === null) !== (currencyCode === null)) {
		return fail(
			"BAD_REQUEST",
			"Charge amount and currency must be provided together",
		);
	}
	let canonicalAmount = amount;
	let canonicalCurrency = currencyCode;
	if (amount !== null && currencyCode !== null) {
		const checked = positiveDecimal(amount, "Charge amount");
		if (!checked.ok) return checked;
		const currency = await validateCurrency(options, {
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			currencyCode,
		});
		if (!currency.ok) return currency;
		canonicalAmount = checked.data;
		canonicalCurrency = currency.data;
	}
	const requestFingerprint = fingerprint(CA_COMMAND_CHARGE_AMEND, parsed.data);
	return store.updateCharge(
		{
			...current.data,
			amount: canonicalAmount,
			currencyCode: canonicalCurrency,
			priorityRank: parsed.data.priorityRank ?? current.data.priorityRank,
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			chargeId: current.data.id,
			variationDate: parsed.data.variationDate,
			amount: canonicalAmount,
			currencyCode: canonicalCurrency,
			priorityRank: parsed.data.priorityRank ?? current.data.priorityRank,
			evidenceReference: parsed.data.evidenceReference,
			idempotencyKey: parsed.data.idempotencyKey,
			requestFingerprint,
			actorUserId: parsed.data.actorUserId,
			correlationId: parsed.data.correlationId,
		},
		mutation(
			parsed.data,
			CA_COMMAND_CHARGE_AMEND,
			CA_CHARGE_AMENDED_EVENT,
			requestFingerprint,
			options,
		),
	);
}

export async function releaseCharge(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCharge>> {
	const parsed = releaseChargeInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid("Invalid charge release", parsed.error.issues);
	const authorized = await authorizeCommand(
		CA_COMMAND_CHARGE_RELEASE,
		parsed.data,
		options,
	);
	if (!authorized.ok) return authorized;
	const { store } = resolveCommandDeps(options);
	const current = await store.getChargeById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) return current;
	if (
		!current.data ||
		current.data.legalCompanyId !== parsed.data.legalCompanyId
	) {
		return fail("NOT_FOUND", "Charge not found");
	}
	if (current.data.status !== "active")
		return fail("CONFLICT", "Charge is already released");
	if (parsed.data.releasedDate < current.data.createdDate) {
		return fail("BAD_REQUEST", "Release date precedes charge creation");
	}
	const requestFingerprint = fingerprint(
		CA_COMMAND_CHARGE_RELEASE,
		parsed.data,
	);
	return store.updateCharge(
		{
			...current.data,
			releasedDate: parsed.data.releasedDate,
			releaseReason: parsed.data.reason,
			releaseEvidenceReference: parsed.data.evidenceReference,
			status: "released",
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		null,
		mutation(
			parsed.data,
			CA_COMMAND_CHARGE_RELEASE,
			CA_CHARGE_RELEASED_EVENT,
			requestFingerprint,
			options,
		),
	);
}

async function getEntity<T>(
	input: unknown,
	query: CaQueryId,
	label: string,
	get: (
		store: CorporateAdministrationStore,
		organizationId: string,
		id: string,
	) => Promise<Result<T | null>>,
	options: CorporateAdministrationCommandOptions,
): Promise<Result<T>> {
	const parsed = getCa4EntityInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid(`Invalid ${label} query`, parsed.error.issues);
	const authorized = await authorizeQuery(query, parsed.data, options);
	if (!authorized.ok) return authorized;
	const { store } = resolveCommandDeps(options);
	const row = await get(store, parsed.data.organizationId, parsed.data.id);
	if (!row.ok) return row;
	return row.data ? ok(row.data) : fail("NOT_FOUND", `${label} not found`);
}

async function listEntities<T>(
	input: unknown,
	query: CaQueryId,
	list: (
		store: CorporateAdministrationStore,
		organizationId: string,
		legalCompanyId: string,
	) => Promise<Result<T[]>>,
	options: CorporateAdministrationCommandOptions,
): Promise<Result<T[]>> {
	const parsed = listCa4EntitiesInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid("Invalid CA-4 list query", parsed.error.issues);
	const authorized = await authorizeQuery(query, parsed.data, options);
	if (!authorized.ok) return authorized;
	const { store } = resolveCommandDeps(options);
	return list(store, parsed.data.organizationId, parsed.data.legalCompanyId);
}

export function getProperty(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	return getEntity(
		input,
		CA_QUERY_PROPERTY_GET,
		"Property",
		(store, org, id) => store.getPropertyHoldingById(org, id),
		options,
	);
}
export function listProperties(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	return listEntities(
		input,
		CA_QUERY_PROPERTY_LIST,
		(store, org, company) => store.listPropertyHoldings(org, company),
		options,
	);
}
export async function listPropertiesAsOf(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	const parsed = listCa4EntitiesAsOfInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid("Invalid property as-of query", parsed.error.issues);
	const authorized = await authorizeQuery(
		CA_QUERY_PROPERTY_LIST_AS_OF,
		parsed.data,
		options,
	);
	if (!authorized.ok) return authorized;
	const rows = await resolveCommandDeps(options).store.listPropertyHoldings(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!rows.ok) return rows;
	return ok(
		rows.data.filter(
			(row) =>
				row.acquisitionDate <= parsed.data.asOf &&
				(!row.disposalDate || row.disposalDate >= parsed.data.asOf),
		),
	);
}
export function getCorporateAsset(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	return getEntity(
		input,
		CA_QUERY_ASSET_GET,
		"Corporate asset",
		(store, org, id) => store.getCorporateAssetById(org, id),
		options,
	);
}
export function listCorporateAssets(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	return listEntities(
		input,
		CA_QUERY_ASSET_LIST,
		(store, org, company) => store.listCorporateAssets(org, company),
		options,
	);
}
export async function listCorporateAssetsAsOf(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	const parsed = listCa4EntitiesAsOfInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid("Invalid asset as-of query", parsed.error.issues);
	const authorized = await authorizeQuery(
		CA_QUERY_ASSET_LIST_AS_OF,
		parsed.data,
		options,
	);
	if (!authorized.ok) return authorized;
	const rows = await resolveCommandDeps(options).store.listCorporateAssets(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!rows.ok) return rows;
	return ok(
		rows.data.filter(
			(row) =>
				row.acquisitionDate <= parsed.data.asOf &&
				(!row.disposalDate || row.disposalDate >= parsed.data.asOf) &&
				(!row.writeOffDate || row.writeOffDate >= parsed.data.asOf),
		),
	);
}
export function getIntellectualProperty(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	return getEntity(
		input,
		CA_QUERY_INTELLECTUAL_PROPERTY_GET,
		"Intellectual property right",
		(store, org, id) => store.getIntellectualPropertyRightById(org, id),
		options,
	);
}
export function listIntellectualProperty(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	return listEntities(
		input,
		CA_QUERY_INTELLECTUAL_PROPERTY_LIST,
		(store, org, company) => store.listIntellectualPropertyRights(org, company),
		options,
	);
}
export async function listIntellectualPropertyAsOf(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	const parsed = listCa4EntitiesAsOfInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid("Invalid IP as-of query", parsed.error.issues);
	const authorized = await authorizeQuery(
		CA_QUERY_INTELLECTUAL_PROPERTY_LIST_AS_OF,
		parsed.data,
		options,
	);
	if (!authorized.ok) return authorized;
	const rows = await resolveCommandDeps(
		options,
	).store.listIntellectualPropertyRights(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!rows.ok) return rows;
	return ok(
		rows.data.filter(
			(row) =>
				(!row.filingDate || row.filingDate <= parsed.data.asOf) &&
				(!row.disposalDate || row.disposalDate >= parsed.data.asOf),
		),
	);
}
export async function listExpiringIntellectualProperty(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	const parsed = listCa4EntitiesExpiringInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid("Invalid IP expiry query", parsed.error.issues);
	const authorized = await authorizeQuery(
		CA_QUERY_INTELLECTUAL_PROPERTY_LIST_EXPIRING,
		parsed.data,
		options,
	);
	if (!authorized.ok) return authorized;
	const rows = await resolveCommandDeps(
		options,
	).store.listIntellectualPropertyRights(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!rows.ok) return rows;
	return ok(
		rows.data.filter(
			(row) =>
				row.status === "active" &&
				row.expiryDate !== null &&
				row.expiryDate >= parsed.data.from &&
				row.expiryDate <= parsed.data.to,
		),
	);
}
export function getInsurancePolicy(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	return getEntity(
		input,
		CA_QUERY_INSURANCE_POLICY_GET,
		"Insurance policy",
		(store, org, id) => store.getInsurancePolicyById(org, id),
		options,
	);
}
export function listInsurancePolicies(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	return listEntities(
		input,
		CA_QUERY_INSURANCE_POLICY_LIST,
		(store, org, company) => store.listInsurancePolicies(org, company),
		options,
	);
}
export async function listInsurancePoliciesAsOf(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	const parsed = listCa4EntitiesAsOfInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid("Invalid insurance as-of query", parsed.error.issues);
	const authorized = await authorizeQuery(
		CA_QUERY_INSURANCE_POLICY_LIST_AS_OF,
		parsed.data,
		options,
	);
	if (!authorized.ok) return authorized;
	const rows = await resolveCommandDeps(options).store.listInsurancePolicies(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!rows.ok) return rows;
	return ok(
		rows.data.filter(
			(row) =>
				row.effectiveFrom <= parsed.data.asOf &&
				(!row.effectiveTo || row.effectiveTo >= parsed.data.asOf),
		),
	);
}
export async function listExpiringInsurancePolicies(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	const parsed = listCa4EntitiesExpiringInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid("Invalid insurance expiry query", parsed.error.issues);
	const authorized = await authorizeQuery(
		CA_QUERY_INSURANCE_POLICY_LIST_EXPIRING,
		parsed.data,
		options,
	);
	if (!authorized.ok) return authorized;
	const rows = await resolveCommandDeps(options).store.listInsurancePolicies(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!rows.ok) return rows;
	return ok(
		rows.data.filter(
			(row) =>
				row.status === "active" &&
				row.effectiveTo !== null &&
				row.effectiveTo >= parsed.data.from &&
				row.effectiveTo <= parsed.data.to,
		),
	);
}
export function getCharge(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	return getEntity(
		input,
		CA_QUERY_CHARGE_GET,
		"Charge",
		(store, org, id) => store.getChargeById(org, id),
		options,
	);
}
export function listCharges(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	return listEntities(
		input,
		CA_QUERY_CHARGE_LIST,
		(store, org, company) => store.listCharges(org, company),
		options,
	);
}
export async function listChargesAsOf(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	const parsed = listCa4EntitiesAsOfInputSchema.safeParse(input);
	if (!parsed.success)
		return invalid("Invalid charge as-of query", parsed.error.issues);
	const authorized = await authorizeQuery(
		CA_QUERY_CHARGE_LIST_AS_OF,
		parsed.data,
		options,
	);
	if (!authorized.ok) return authorized;
	const rows = await resolveCommandDeps(options).store.listCharges(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!rows.ok) return rows;
	return ok(
		rows.data.filter(
			(row) =>
				row.createdDate <= parsed.data.asOf &&
				(!row.releasedDate || row.releasedDate >= parsed.data.asOf),
		),
	);
}
