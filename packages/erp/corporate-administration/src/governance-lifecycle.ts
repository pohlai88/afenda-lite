import { fail, ok, type Result } from "@afenda/errors/result";
import {
	CA_AUTHORITY_MANDATE_AMENDED_EVENT,
	CA_AUTHORITY_MANDATE_REVOKED_EVENT,
	CA_GOVERNANCE_BODY_RETIRED_EVENT,
	CA_GOVERNANCE_BODY_UPDATED_EVENT,
	CA_GOVERNANCE_MEMBERSHIP_ENDED_EVENT,
	CA_MEETING_CLOSED_EVENT,
	CA_OFFICER_AMENDED_EVENT,
	CA_OFFICER_ENDED_EVENT,
	CA_PREMISE_RETIRED_EVENT,
	CA_PREMISE_UPDATED_EVENT,
	CA_RESOLUTION_APPROVED_EVENT,
	CA_RESOLUTION_REVOKED_EVENT,
	CA_RESOLUTION_SUPERSEDED_EVENT,
} from "@afenda/events/schemas";

import { requireCaCommandPermission } from "./authorization";
import {
	type CorporateAdministrationCommandOptions,
	resolveCommandDeps,
} from "./command-options";
import {
	CA_ERROR_IDEMPOTENCY_CONFLICT,
	CA_ERROR_VERSION_CONFLICT,
	caErrorDetails,
} from "./error-codes";
import {
	CA_COMMAND_AUTHORITY_MANDATE_AMEND,
	CA_COMMAND_AUTHORITY_MANDATE_REVOKE,
	CA_COMMAND_GOVERNANCE_BODY_RETIRE,
	CA_COMMAND_GOVERNANCE_BODY_UPDATE,
	CA_COMMAND_GOVERNANCE_MEETING_CLOSE,
	CA_COMMAND_GOVERNANCE_MEMBERSHIP_END,
	CA_COMMAND_OFFICER_AMEND,
	CA_COMMAND_OFFICER_END,
	CA_COMMAND_PREMISE_RETIRE,
	CA_COMMAND_PREMISE_UPDATE,
	CA_COMMAND_RESOLUTION_APPROVE,
	CA_COMMAND_RESOLUTION_REVOKE,
	type CaCommandId,
} from "./module-ids";
import type {
	CorporateAdministrationMasterLookupPort,
	GovernanceStore,
} from "./ports";
import {
	amendAuthorityMandateInputSchema,
	amendOfficerInputSchema,
	approveResolutionInputSchema,
	type CaAuthorityMandateDetail,
	type CaAuthorityMandateHolder,
	type CaCompanyPremise,
	type CaOfficerAppointment,
	type CaResolution,
	closeGovernanceMeetingInputSchema,
	endGovernanceMembershipInputSchema,
	endOfficerInputSchema,
	retireCompanyPremiseInputSchema,
	retireGovernanceBodyInputSchema,
	revokeAuthorityMandateInputSchema,
	revokeResolutionInputSchema,
	updateCompanyPremiseInputSchema,
	updateGovernanceBodyInputSchema,
} from "./schemas";
import { createCorporateAdministrationRequestFingerprint } from "./shared/fingerprint";

type ExistingContext = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	idempotencyKey: string;
	legalCompanyId: string;
	id: string;
	expectedVersion: number;
	reason: string;
};

async function authorize(
	options: CorporateAdministrationCommandOptions,
	input: ExistingContext,
	command: CaCommandId,
) {
	const deps = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(deps.authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		command,
	});
	return { deps, authorized };
}

function fingerprint(command: string, input: ExistingContext) {
	const {
		actorUserId: _actor,
		correlationId: _correlation,
		idempotencyKey: _key,
		...business
	} = input;
	return createCorporateAdministrationRequestFingerprint({
		command,
		...business,
	});
}

function stale() {
	return fail(
		"CONFLICT",
		"Record version is stale",
		caErrorDetails(CA_ERROR_VERSION_CONFLICT),
	);
}

function requireVersion<T extends { version: number; legalCompanyId: string }>(
	record: T | null,
	input: ExistingContext,
): Result<T> {
	if (!record || record.legalCompanyId !== input.legalCompanyId) {
		return fail("NOT_FOUND", "Governance record not found");
	}
	return record.version === input.expectedVersion ? ok(record) : stale();
}

function replayConflict() {
	return fail(
		"CONFLICT",
		"Idempotency key was already used with a different request",
		caErrorDetails(CA_ERROR_IDEMPOTENCY_CONFLICT),
	);
}

async function resolveHolders(
	store: GovernanceStore,
	masters: CorporateAdministrationMasterLookupPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		legalCompanyId: string;
		effectiveFrom: string;
		holders: ReadonlyArray<
			| { kind: "party"; partyId: string }
			| { kind: "officer"; officerAppointmentId: string }
		>;
	},
): Promise<
	Result<
		Array<
			Omit<CaAuthorityMandateHolder, "id" | "authorityMandateId" | "createdAt">
		>
	>
> {
	if (!masters) return fail("INTERNAL_ERROR", "Master lookup port is required");
	const rows: Array<
		Omit<CaAuthorityMandateHolder, "id" | "authorityMandateId" | "createdAt">
	> = [];
	for (const holder of input.holders) {
		if (holder.kind === "party") {
			const party = await masters.getPartyById({
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				partyId: holder.partyId,
			});
			if (!party.ok) return party;
			if (!party.data || party.data.status !== "active") {
				return fail("CONFLICT", "Active mandate holder party is required");
			}
			rows.push({
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				holderKind: "party",
				partyId: holder.partyId,
				partyCodeSnapshot: party.data.code,
				partyNameSnapshot: party.data.name,
				officerAppointmentId: null,
				effectiveFrom: input.effectiveFrom,
				effectiveTo: null,
				createdBy: input.actorUserId,
			});
			continue;
		}
		const officer = await store.getOfficerAppointmentById(
			input.organizationId,
			holder.officerAppointmentId,
		);
		if (
			!officer.ok ||
			!officer.data ||
			officer.data.legalCompanyId !== input.legalCompanyId ||
			officer.data.status !== "active"
		) {
			return officer.ok
				? fail("NOT_FOUND", "Active officer appointment not found")
				: officer;
		}
		rows.push({
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			holderKind: "officer",
			partyId: null,
			partyCodeSnapshot: null,
			partyNameSnapshot: null,
			officerAppointmentId: holder.officerAppointmentId,
			effectiveFrom: input.effectiveFrom,
			effectiveTo: null,
			createdBy: input.actorUserId,
		});
	}
	return ok(rows);
}

async function resolvePremiseAddress(
	masters: CorporateAdministrationMasterLookupPort | undefined,
	legalPartyId: string | null,
	input: {
		organizationId: string;
		actorUserId: string;
		addressSource:
			| { kind: "master"; partyAddressId: string }
			| {
					kind: "manual";
					line1: string;
					line2?: string;
					city: string;
					region?: string;
					postalCode?: string;
					countryCode: string;
			  };
	},
): Promise<
	Result<
		Pick<
			CaCompanyPremise,
			| "partyAddressId"
			| "addressLine1Snapshot"
			| "addressLine2Snapshot"
			| "citySnapshot"
			| "regionSnapshot"
			| "postalCodeSnapshot"
			| "countryCodeSnapshot"
		>
	>
> {
	if (!masters) return fail("INTERNAL_ERROR", "Master lookup port is required");
	if (input.addressSource.kind === "master") {
		if (!legalPartyId)
			return fail("CONFLICT", "Legal company has no legal party");
		const address = await masters.getPartyAddressById({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			partyId: legalPartyId,
			partyAddressId: input.addressSource.partyAddressId,
		});
		if (!address.ok) return address;
		if (!address.data) return fail("NOT_FOUND", "Party address not found");
		return ok({
			partyAddressId: address.data.id,
			addressLine1Snapshot: address.data.line1,
			addressLine2Snapshot: address.data.line2,
			citySnapshot: address.data.city,
			regionSnapshot: address.data.region,
			postalCodeSnapshot: address.data.postalCode,
			countryCodeSnapshot: address.data.countryId,
		});
	}
	const code = input.addressSource.countryCode.toUpperCase();
	const country = await masters.getCountryByCode({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		code,
	});
	if (!country.ok) return country;
	if (!country.data) return fail("CONFLICT", "Country is required");
	return ok({
		partyAddressId: null,
		addressLine1Snapshot: input.addressSource.line1,
		addressLine2Snapshot: input.addressSource.line2 ?? null,
		citySnapshot: input.addressSource.city,
		regionSnapshot: input.addressSource.region ?? null,
		postalCodeSnapshot: input.addressSource.postalCode ?? null,
		countryCodeSnapshot: code,
	});
}

export async function amendOfficer(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaOfficerAppointment>> {
	const parsed = amendOfficerInputSchema.safeParse(input);
	if (!parsed.success)
		return fail("BAD_REQUEST", "Invalid officer amendment", {
			issues: parsed.error.issues,
		});
	const { deps, authorized } = await authorize(
		options,
		parsed.data,
		CA_COMMAND_OFFICER_AMEND,
	);
	if (!authorized.ok) return authorized;
	const loaded = await deps.store.getOfficerAppointmentById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!loaded.ok) return loaded;
	const current = requireVersion(loaded.data, parsed.data);
	if (!current.ok) return current;
	if (
		current.data.status !== "active" ||
		parsed.data.effectiveFrom <= current.data.appointedDate
	) {
		return fail(
			"CONFLICT",
			"Officer amendment must supersede an active earlier appointment",
		);
	}
	const requestFingerprint = fingerprint(CA_COMMAND_OFFICER_AMEND, parsed.data);
	const replay = await deps.store.getOfficerByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!replay.ok) return replay;
	if (replay.data)
		return replay.data.requestFingerprint === requestFingerprint
			? ok(replay.data)
			: replayConflict();
	return deps.store.supersedeOfficerAppointment(
		{
			...current.data,
			resignedDate: parsed.data.effectiveFrom,
			status: "removed",
			endReason: parsed.data.reason,
			updatedBy: parsed.data.actorUserId,
		},
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			officerRole: parsed.data.officerRole ?? current.data.officerRole,
			partyId: current.data.partyId,
			partyCodeSnapshot: current.data.partyCodeSnapshot,
			partyNameSnapshot: current.data.partyNameSnapshot,
			appointedDate: parsed.data.effectiveFrom,
			resignedDate: null,
			authorityLimits:
				parsed.data.authorityLimits === undefined
					? current.data.authorityLimits
					: parsed.data.authorityLimits,
			status: "active",
			createIdempotencyKey: parsed.data.idempotencyKey,
			requestFingerprint,
			supersedesOfficerAppointmentId: current.data.id,
			amendmentReason: parsed.data.reason,
			endReason: null,
			endEvidenceReference: null,
			createdBy: parsed.data.actorUserId,
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		deps.ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_OFFICER_AMENDED_EVENT,
		},
	);
}

export async function endOfficer(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	const parsed = endOfficerInputSchema.safeParse(input);
	if (!parsed.success)
		return fail("BAD_REQUEST", "Invalid officer end", {
			issues: parsed.error.issues,
		});
	const { deps, authorized } = await authorize(
		options,
		parsed.data,
		CA_COMMAND_OFFICER_END,
	);
	if (!authorized.ok) return authorized;
	const loaded = await deps.store.getOfficerAppointmentById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!loaded.ok) return loaded;
	const current = requireVersion(loaded.data, parsed.data);
	if (!current.ok) return current;
	if (
		current.data.status !== "active" ||
		parsed.data.effectiveTo < current.data.appointedDate
	)
		return fail("CONFLICT", "Officer cannot be ended");
	return deps.store.endOfficerAppointment(
		{
			...current.data,
			resignedDate: parsed.data.effectiveTo,
			status: parsed.data.endKind,
			endReason: parsed.data.reason,
			endEvidenceReference: parsed.data.evidenceReference ?? null,
			requestFingerprint: fingerprint(CA_COMMAND_OFFICER_END, parsed.data),
			createIdempotencyKey: parsed.data.idempotencyKey,
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		deps.ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_OFFICER_ENDED_EVENT,
		},
	);
}

export async function updateGovernanceBody(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	const parsed = updateGovernanceBodyInputSchema.safeParse(input);
	if (!parsed.success)
		return fail("BAD_REQUEST", "Invalid governance body update", {
			issues: parsed.error.issues,
		});
	const { deps, authorized } = await authorize(
		options,
		parsed.data,
		CA_COMMAND_GOVERNANCE_BODY_UPDATE,
	);
	if (!authorized.ok) return authorized;
	const loaded = await deps.store.getGovernanceBodyById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!loaded.ok) return loaded;
	const current = requireVersion(loaded.data, parsed.data);
	if (!current.ok) return current;
	if (current.data.status !== "active")
		return fail("CONFLICT", "Retired governance body is immutable");
	return deps.store.updateGovernanceBody(
		{
			...current.data,
			displayName: parsed.data.displayName ?? current.data.displayName,
			bodyType: parsed.data.bodyType ?? current.data.bodyType,
			requestFingerprint: fingerprint(
				CA_COMMAND_GOVERNANCE_BODY_UPDATE,
				parsed.data,
			),
			createIdempotencyKey: parsed.data.idempotencyKey,
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		deps.ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_GOVERNANCE_BODY_UPDATED_EVENT,
		},
	);
}

export async function retireGovernanceBody(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	const parsed = retireGovernanceBodyInputSchema.safeParse(input);
	if (!parsed.success)
		return fail("BAD_REQUEST", "Invalid governance body retirement", {
			issues: parsed.error.issues,
		});
	const { deps, authorized } = await authorize(
		options,
		parsed.data,
		CA_COMMAND_GOVERNANCE_BODY_RETIRE,
	);
	if (!authorized.ok) return authorized;
	const loaded = await deps.store.getGovernanceBodyById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!loaded.ok) return loaded;
	const current = requireVersion(loaded.data, parsed.data);
	if (!current.ok) return current;
	if (current.data.status !== "active")
		return fail("CONFLICT", "Governance body is already retired");
	return deps.store.updateGovernanceBody(
		{
			...current.data,
			status: "retired",
			retiredAt: new Date(),
			retiredBy: parsed.data.actorUserId,
			retirementReason: parsed.data.reason,
			requestFingerprint: fingerprint(
				CA_COMMAND_GOVERNANCE_BODY_RETIRE,
				parsed.data,
			),
			createIdempotencyKey: parsed.data.idempotencyKey,
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		deps.ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_GOVERNANCE_BODY_RETIRED_EVENT,
		},
	);
}

export async function endGovernanceMembership(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	const parsed = endGovernanceMembershipInputSchema.safeParse(input);
	if (!parsed.success)
		return fail("BAD_REQUEST", "Invalid governance membership end", {
			issues: parsed.error.issues,
		});
	const { deps, authorized } = await authorize(
		options,
		parsed.data,
		CA_COMMAND_GOVERNANCE_MEMBERSHIP_END,
	);
	if (!authorized.ok) return authorized;
	const loaded = await deps.store.getGovernanceMembershipById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!loaded.ok) return loaded;
	const current = requireVersion(loaded.data, parsed.data);
	if (!current.ok) return current;
	if (
		current.data.effectiveTo ||
		parsed.data.effectiveTo < current.data.effectiveFrom
	)
		return fail("CONFLICT", "Membership cannot be ended");
	return deps.store.endGovernanceMembership(
		{
			...current.data,
			effectiveTo: parsed.data.effectiveTo,
			endReason: parsed.data.reason,
			requestFingerprint: fingerprint(
				CA_COMMAND_GOVERNANCE_MEMBERSHIP_END,
				parsed.data,
			),
			createIdempotencyKey: parsed.data.idempotencyKey,
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		deps.ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_GOVERNANCE_MEMBERSHIP_ENDED_EVENT,
		},
	);
}

export async function amendAuthorityMandate(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaAuthorityMandateDetail>> {
	const parsed = amendAuthorityMandateInputSchema.safeParse(input);
	if (!parsed.success)
		return fail("BAD_REQUEST", "Invalid authority mandate amendment", {
			issues: parsed.error.issues,
		});
	if (
		(parsed.data.amountLimit === undefined) !==
		(parsed.data.currencyCode === undefined)
	)
		return fail("BAD_REQUEST", "Amount and currency must be paired");
	if (
		(parsed.data.signingRule === "single" &&
			(parsed.data.holders.length !== 1 ||
				parsed.data.minimumSignatories !== 1)) ||
		(parsed.data.signingRule === "joint" &&
			(parsed.data.holders.length < 2 ||
				parsed.data.minimumSignatories < 2 ||
				parsed.data.minimumSignatories > parsed.data.holders.length))
	)
		return fail("BAD_REQUEST", "Mandate signatory rules are invalid");
	const { deps, authorized } = await authorize(
		options,
		parsed.data,
		CA_COMMAND_AUTHORITY_MANDATE_AMEND,
	);
	if (!authorized.ok) return authorized;
	const loaded = await deps.store.getAuthorityMandateById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!loaded.ok) return loaded;
	const current = requireVersion(loaded.data, parsed.data);
	if (!current.ok) return current;
	if (
		current.data.status !== "active" ||
		parsed.data.effectiveFrom <= current.data.effectiveFrom
	)
		return fail("CONFLICT", "Mandate amendment range is invalid");
	const holders = await resolveHolders(deps.store, deps.masters, parsed.data);
	if (!holders.ok) return holders;
	return deps.store.supersedeAuthorityMandate(
		{
			...current.data,
			effectiveTo: parsed.data.effectiveFrom,
			updatedBy: parsed.data.actorUserId,
		},
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			mandateType: parsed.data.mandateType,
			scopeDescription: parsed.data.scopeDescription,
			amountLimit: parsed.data.amountLimit ?? null,
			currencyCode: parsed.data.currencyCode ?? null,
			signingRule: parsed.data.signingRule,
			minimumSignatories: parsed.data.minimumSignatories,
			effectiveFrom: parsed.data.effectiveFrom,
			effectiveTo: null,
			grantEvidenceReference: parsed.data.grantEvidenceReference,
			revocationEvidenceReference: null,
			status: "active",
			createIdempotencyKey: parsed.data.idempotencyKey,
			requestFingerprint: fingerprint(
				CA_COMMAND_AUTHORITY_MANDATE_AMEND,
				parsed.data,
			),
			supersedesAuthorityMandateId: current.data.id,
			amendmentReason: parsed.data.reason,
			revocationReason: null,
			createdBy: parsed.data.actorUserId,
			updatedBy: parsed.data.actorUserId,
		},
		holders.data,
		parsed.data.expectedVersion,
		deps.ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_AUTHORITY_MANDATE_AMENDED_EVENT,
		},
	);
}

export async function revokeAuthorityMandate(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	const parsed = revokeAuthorityMandateInputSchema.safeParse(input);
	if (!parsed.success)
		return fail("BAD_REQUEST", "Invalid authority mandate revocation", {
			issues: parsed.error.issues,
		});
	const { deps, authorized } = await authorize(
		options,
		parsed.data,
		CA_COMMAND_AUTHORITY_MANDATE_REVOKE,
	);
	if (!authorized.ok) return authorized;
	const loaded = await deps.store.getAuthorityMandateById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!loaded.ok) return loaded;
	const current = requireVersion(loaded.data, parsed.data);
	if (!current.ok) return current;
	if (
		current.data.status !== "active" ||
		parsed.data.effectiveTo < current.data.effectiveFrom
	)
		return fail("CONFLICT", "Mandate cannot be revoked");
	return deps.store.revokeAuthorityMandate(
		{
			...current.data,
			status: "revoked",
			effectiveTo: parsed.data.effectiveTo,
			revocationReason: parsed.data.reason,
			revocationEvidenceReference: parsed.data.evidenceReference,
			requestFingerprint: fingerprint(
				CA_COMMAND_AUTHORITY_MANDATE_REVOKE,
				parsed.data,
			),
			createIdempotencyKey: parsed.data.idempotencyKey,
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		deps.ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_AUTHORITY_MANDATE_REVOKED_EVENT,
		},
	);
}

export async function updateCompanyPremise(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	const parsed = updateCompanyPremiseInputSchema.safeParse(input);
	if (!parsed.success)
		return fail("BAD_REQUEST", "Invalid company premise update", {
			issues: parsed.error.issues,
		});
	const { deps, authorized } = await authorize(
		options,
		parsed.data,
		CA_COMMAND_PREMISE_UPDATE,
	);
	if (!authorized.ok) return authorized;
	const loaded = await deps.store.getCompanyPremiseById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!loaded.ok) return loaded;
	const current = requireVersion(loaded.data, parsed.data);
	if (!current.ok) return current;
	if (
		current.data.status !== "active" ||
		parsed.data.effectiveFrom <= current.data.effectiveFrom
	)
		return fail("CONFLICT", "Premise update range is invalid");
	const company = await deps.store.getById(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	if (!company.data) return fail("NOT_FOUND", "Legal company not found");
	const address = await resolvePremiseAddress(
		deps.masters,
		company.data.legalPartyId,
		parsed.data,
	);
	if (!address.ok) return address;
	return deps.store.supersedeCompanyPremise(
		{
			...current.data,
			effectiveTo: parsed.data.effectiveFrom,
			updatedBy: parsed.data.actorUserId,
		},
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			premiseType: parsed.data.premiseType,
			...address.data,
			isPrimary: parsed.data.isPrimary,
			effectiveFrom: parsed.data.effectiveFrom,
			effectiveTo: null,
			status: "active",
			createIdempotencyKey: parsed.data.idempotencyKey,
			requestFingerprint: fingerprint(CA_COMMAND_PREMISE_UPDATE, parsed.data),
			supersedesCompanyPremiseId: current.data.id,
			amendmentReason: parsed.data.reason,
			retirementReason: null,
			createdBy: parsed.data.actorUserId,
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		deps.ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_PREMISE_UPDATED_EVENT,
		},
	);
}

export async function retireCompanyPremise(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	const parsed = retireCompanyPremiseInputSchema.safeParse(input);
	if (!parsed.success)
		return fail("BAD_REQUEST", "Invalid company premise retirement", {
			issues: parsed.error.issues,
		});
	const { deps, authorized } = await authorize(
		options,
		parsed.data,
		CA_COMMAND_PREMISE_RETIRE,
	);
	if (!authorized.ok) return authorized;
	const loaded = await deps.store.getCompanyPremiseById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!loaded.ok) return loaded;
	const current = requireVersion(loaded.data, parsed.data);
	if (!current.ok) return current;
	if (
		current.data.status !== "active" ||
		parsed.data.effectiveTo < current.data.effectiveFrom
	)
		return fail("CONFLICT", "Premise cannot be retired");
	return deps.store.retireCompanyPremise(
		{
			...current.data,
			status: "retired",
			effectiveTo: parsed.data.effectiveTo,
			retirementReason: parsed.data.reason,
			requestFingerprint: fingerprint(CA_COMMAND_PREMISE_RETIRE, parsed.data),
			createIdempotencyKey: parsed.data.idempotencyKey,
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		deps.ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_PREMISE_RETIRED_EVENT,
		},
	);
}

export async function closeGovernanceMeeting(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	const parsed = closeGovernanceMeetingInputSchema.safeParse(input);
	if (!parsed.success)
		return fail("BAD_REQUEST", "Invalid governance meeting close", {
			issues: parsed.error.issues,
		});
	const { deps, authorized } = await authorize(
		options,
		parsed.data,
		CA_COMMAND_GOVERNANCE_MEETING_CLOSE,
	);
	if (!authorized.ok) return authorized;
	const loaded = await deps.store.getGovernanceMeetingById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!loaded.ok) return loaded;
	const current = requireVersion(loaded.data, parsed.data);
	if (!current.ok) return current;
	if (!["scheduled", "held"].includes(current.data.status))
		return fail("CONFLICT", "Meeting cannot be closed");
	return deps.store.closeGovernanceMeeting(
		{
			...current.data,
			status: "closed",
			quorumResult: parsed.data.quorumResult,
			minutesDocumentReference: parsed.data.minutesDocumentReference,
			closedAt: new Date(),
			closedBy: parsed.data.actorUserId,
			requestFingerprint: fingerprint(
				CA_COMMAND_GOVERNANCE_MEETING_CLOSE,
				parsed.data,
			),
			createIdempotencyKey: parsed.data.idempotencyKey,
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		deps.ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_MEETING_CLOSED_EVENT,
		},
	);
}

export async function approveResolution(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaResolution>> {
	const parsed = approveResolutionInputSchema.safeParse(input);
	if (!parsed.success)
		return fail("BAD_REQUEST", "Invalid resolution approval", {
			issues: parsed.error.issues,
		});
	const { deps, authorized } = await authorize(
		options,
		parsed.data,
		CA_COMMAND_RESOLUTION_APPROVE,
	);
	if (!authorized.ok) return authorized;
	const loaded = await deps.store.getResolutionById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!loaded.ok) return loaded;
	const current = requireVersion(loaded.data, parsed.data);
	if (!current.ok) return current;
	if (current.data.status !== "draft")
		return fail("CONFLICT", "Only draft resolutions can be approved");
	let predecessor: CaResolution | undefined;
	if (current.data.supersedesResolutionId) {
		const prior = await deps.store.getResolutionById(
			parsed.data.organizationId,
			current.data.supersedesResolutionId,
		);
		if (!prior.ok) return prior;
		if (
			!prior.data ||
			prior.data.status !== "approved" ||
			prior.data.legalCompanyId !== parsed.data.legalCompanyId
		)
			return fail("CONFLICT", "Approved predecessor is required");
		predecessor = {
			...prior.data,
			status: "superseded",
			supersededById: current.data.id,
			supersededAt: new Date(),
			updatedBy: parsed.data.actorUserId,
		};
	}
	return deps.store.approveResolution(
		{
			...current.data,
			status: "approved",
			approvedDate: parsed.data.approvedDate,
			approvalEvidenceReference: parsed.data.evidenceReference,
			requestFingerprint: fingerprint(
				CA_COMMAND_RESOLUTION_APPROVE,
				parsed.data,
			),
			createIdempotencyKey: parsed.data.idempotencyKey,
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		deps.ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_RESOLUTION_APPROVED_EVENT,
		},
		predecessor,
		predecessor
			? {
					correlationId: parsed.data.correlationId,
					eventType: CA_RESOLUTION_SUPERSEDED_EVENT,
				}
			: undefined,
	);
}

export async function revokeResolution(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
) {
	const parsed = revokeResolutionInputSchema.safeParse(input);
	if (!parsed.success)
		return fail("BAD_REQUEST", "Invalid resolution revocation", {
			issues: parsed.error.issues,
		});
	const { deps, authorized } = await authorize(
		options,
		parsed.data,
		CA_COMMAND_RESOLUTION_REVOKE,
	);
	if (!authorized.ok) return authorized;
	const loaded = await deps.store.getResolutionById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!loaded.ok) return loaded;
	const current = requireVersion(loaded.data, parsed.data);
	if (!current.ok) return current;
	if (current.data.status !== "approved")
		return fail("CONFLICT", "Only approved resolutions can be revoked");
	return deps.store.revokeResolution(
		{
			...current.data,
			status: "revoked",
			revokedDate: parsed.data.revokedDate,
			revocationReason: parsed.data.reason,
			revocationEvidenceReference: parsed.data.evidenceReference ?? null,
			requestFingerprint: fingerprint(
				CA_COMMAND_RESOLUTION_REVOKE,
				parsed.data,
			),
			createIdempotencyKey: parsed.data.idempotencyKey,
			updatedBy: parsed.data.actorUserId,
		},
		parsed.data.expectedVersion,
		deps.ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_RESOLUTION_REVOKED_EVENT,
		},
	);
}
