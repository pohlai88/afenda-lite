import { fail, ok, type Result } from "@afenda/errors/result";
import {
	CA_COMPANY_ACTIVATED_EVENT,
	CA_COMPANY_ARCHIVED_EVENT,
	CA_COMPANY_CREATED_EVENT,
	CA_COMPANY_DISSOLVED_EVENT,
	CA_COMPANY_SUSPENDED_EVENT,
	CA_COMPANY_UPDATED_EVENT,
} from "@afenda/events/schemas";

import {
	requireCaCommandPermission,
	requireCaQueryPermission,
} from "./authorization";
import {
	type CorporateAdministrationCommandOptions,
	resolveCommandDeps,
} from "./command-options";
import {
	CA_ERROR_ACTIVATION_INCOMPLETE,
	CA_ERROR_IDEMPOTENCY_CONFLICT,
	CA_ERROR_IDENTIFIER_TAX_TYPE,
	CA_ERROR_INVALID_STATUS,
	CA_ERROR_LEGAL_ENTITY_INVALID,
	CA_ERROR_NAME_OVERLAP,
	CA_ERROR_PARTY_INVALID,
	CA_ERROR_VERSION_CONFLICT,
	caErrorDetails,
} from "./error-codes";
import {
	CA_COMMAND_COMPANY_ACTIVATE,
	CA_COMMAND_COMPANY_ARCHIVE,
	CA_COMMAND_COMPANY_CREATE,
	CA_COMMAND_COMPANY_DISSOLVE,
	CA_COMMAND_COMPANY_IDENTIFIER_ADD,
	CA_COMMAND_COMPANY_IDENTIFIER_RETIRE,
	CA_COMMAND_COMPANY_IDENTIFIER_UPDATE,
	CA_COMMAND_COMPANY_NAME_ADD,
	CA_COMMAND_COMPANY_NAME_END,
	CA_COMMAND_COMPANY_SUSPEND,
	CA_COMMAND_COMPANY_UPDATE,
	CA_QUERY_COMPANY_GET,
	CA_QUERY_COMPANY_GET_AS_OF,
	CA_QUERY_COMPANY_IDENTIFIER_LIST,
	CA_QUERY_COMPANY_LIST,
	CA_QUERY_COMPANY_NAME_LIST,
	CA_QUERY_COMPANY_STATUS_LIST,
} from "./module-ids";
import type { CorporateAdministrationMasterLookupPort } from "./ports";
import {
	addCompanyIdentifierInputSchema,
	addCompanyNameInputSchema,
	type CaCompanyIdentifier,
	type CaCompanyName,
	type CaCompanyStatusHistory,
	type CaLegalCompany,
	type CaLegalCompanyDetail,
	createLegalCompanyInputSchema,
	endCompanyNameInputSchema,
	getLegalCompanyAsOfInputSchema,
	getLegalCompanyInputSchema,
	lifecycleLegalCompanyInputSchema,
	listCompanyIdentifiersInputSchema,
	listCompanyNamesInputSchema,
	listCompanyStatusHistoryInputSchema,
	listLegalCompaniesInputSchema,
	retireCompanyIdentifierInputSchema,
	updateCompanyIdentifierInputSchema,
	updateLegalCompanyInputSchema,
} from "./schemas";
import { buildLegalCompanyAsOfView } from "./shared/as-of";
import {
	normalizeCompanyCode,
	normalizeDisplayName,
	normalizeIdentifierValue,
} from "./shared/code";
import { hasOverlappingRange, isEffectiveAsOf } from "./shared/effective-range";
import { isAllowedCompanyStatusTransition } from "./shared/lifecycle";

const TAX_IDENTIFIER_TYPES = new Set(["tin", "vat", "gst", "tax_registration"]);

function idempotencyFingerprintConflict(): Result<never> {
	return fail(
		"CONFLICT",
		"Idempotency key was already used for a different request",
		caErrorDetails(CA_ERROR_IDEMPOTENCY_CONFLICT),
	);
}

async function requireMasters(
	masters: CorporateAdministrationMasterLookupPort | undefined,
): Promise<Result<CorporateAdministrationMasterLookupPort>> {
	if (!masters) {
		return fail("INTERNAL_ERROR", "Master lookup port is required");
	}
	return ok(masters);
}

export async function createLegalCompany(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaLegalCompany>> {
	const parsed = createLegalCompanyInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid legal company create input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_COMPANY_CREATE,
	});
	if (!authorized.ok) return authorized;

	const existing = await store.getByCreateIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	if (existing.data) {
		if (
			existing.data.createRequestFingerprint !== parsed.data.requestFingerprint
		) {
			return fail(
				"CONFLICT",
				"Idempotency key was already used for a different request",
				caErrorDetails(CA_ERROR_IDEMPOTENCY_CONFLICT),
			);
		}
		return ok(existing.data);
	}

	const code = normalizeCompanyCode(parsed.data.code);
	if (!code.ok) return code;

	const masterPort = await requireMasters(masters);
	if (!masterPort.ok) return masterPort;

	const asOf =
		parsed.data.incorporationDate ?? new Date().toISOString().slice(0, 10);
	const dimension = await masterPort.data.getEffectiveLegalEntity({
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		id: parsed.data.legalEntityDimensionId,
		asOf,
	});
	if (!dimension.ok) return dimension;
	if (!dimension.data) {
		return fail(
			"CONFLICT",
			"Legal entity dimension is not effective",
			caErrorDetails(CA_ERROR_LEGAL_ENTITY_INVALID),
		);
	}

	let partyCode: string | null = null;
	let partyName: string | null = null;
	if (parsed.data.legalPartyId) {
		const party = await masterPort.data.getPartyById({
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			partyId: parsed.data.legalPartyId,
		});
		if (!party.ok) return party;
		if (party.data?.partyKind !== "organization") {
			return fail(
				"CONFLICT",
				"Organization party is required",
				caErrorDetails(CA_ERROR_PARTY_INVALID),
			);
		}
		partyCode = party.data.code;
		partyName = party.data.name;
	}

	return store.createCompany(
		{
			organizationId: parsed.data.organizationId,
			code: code.data.code,
			normalizedCode: code.data.normalizedCode,
			legalEntityDimensionId: dimension.data.id,
			legalEntityKeySnapshot: dimension.data.key,
			legalEntityNameSnapshot: dimension.data.name,
			legalPartyId: parsed.data.legalPartyId ?? null,
			legalPartyCodeSnapshot: partyCode,
			legalPartyNameSnapshot: partyName,
			jurisdictionCountryId: parsed.data.jurisdictionCountryId ?? null,
			legalFormCode: parsed.data.legalFormCode ?? null,
			legalFormNameSnapshot: parsed.data.legalFormCode ?? null,
			incorporationDate: parsed.data.incorporationDate ?? null,
			commencementDate: parsed.data.commencementDate ?? null,
			fiscalYearEndMonth: parsed.data.fiscalYearEndMonth ?? null,
			fiscalYearEndDay: parsed.data.fiscalYearEndDay ?? null,
			status: "draft",
			createIdempotencyKey: parsed.data.idempotencyKey,
			createRequestFingerprint: parsed.data.requestFingerprint,
			createdBy: parsed.data.actorUserId,
			updatedBy: parsed.data.actorUserId,
		},
		ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_COMPANY_CREATED_EVENT,
		},
	);
}

export async function updateLegalCompany(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaLegalCompany>> {
	const parsed = updateLegalCompanyInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid legal company update input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_COMPANY_UPDATE,
	});
	if (!authorized.ok) return authorized;

	const current = await store.getById(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!current.ok) return current;
	if (!current.data) {
		return fail("NOT_FOUND", "Legal company not found");
	}
	if (current.data.version !== parsed.data.expectedVersion) {
		return fail(
			"CONFLICT",
			"Legal company version conflict",
			caErrorDetails(CA_ERROR_VERSION_CONFLICT),
		);
	}

	let partyCode = current.data.legalPartyCodeSnapshot;
	let partyName = current.data.legalPartyNameSnapshot;
	if (parsed.data.legalPartyId !== undefined) {
		const masterPort = await requireMasters(masters);
		if (!masterPort.ok) return masterPort;
		const party = await masterPort.data.getPartyById({
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			partyId: parsed.data.legalPartyId,
		});
		if (!party.ok) return party;
		if (party.data?.partyKind !== "organization") {
			return fail(
				"CONFLICT",
				"Organization party is required",
				caErrorDetails(CA_ERROR_PARTY_INVALID),
			);
		}
		partyCode = party.data.code;
		partyName = party.data.name;
	}

	return store.updateCompany(
		{
			...current.data,
			legalPartyId: parsed.data.legalPartyId ?? current.data.legalPartyId,
			legalPartyCodeSnapshot: partyCode,
			legalPartyNameSnapshot: partyName,
			jurisdictionCountryId:
				parsed.data.jurisdictionCountryId === undefined
					? current.data.jurisdictionCountryId
					: parsed.data.jurisdictionCountryId,
			legalFormCode:
				parsed.data.legalFormCode === undefined
					? current.data.legalFormCode
					: parsed.data.legalFormCode,
			legalFormNameSnapshot:
				parsed.data.legalFormCode === undefined
					? current.data.legalFormNameSnapshot
					: parsed.data.legalFormCode,
			incorporationDate:
				parsed.data.incorporationDate === undefined
					? current.data.incorporationDate
					: parsed.data.incorporationDate,
			commencementDate:
				parsed.data.commencementDate === undefined
					? current.data.commencementDate
					: parsed.data.commencementDate,
			fiscalYearEndMonth:
				parsed.data.fiscalYearEndMonth === undefined
					? current.data.fiscalYearEndMonth
					: parsed.data.fiscalYearEndMonth,
			fiscalYearEndDay:
				parsed.data.fiscalYearEndDay === undefined
					? current.data.fiscalYearEndDay
					: parsed.data.fiscalYearEndDay,
			version: parsed.data.expectedVersion,
			updatedBy: parsed.data.actorUserId,
		},
		ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_COMPANY_UPDATED_EVENT,
		},
	);
}

async function transitionCompanyStatus(
	input: unknown,
	targetStatus: CaLegalCompany["status"],
	eventType:
		| typeof CA_COMPANY_ACTIVATED_EVENT
		| typeof CA_COMPANY_ARCHIVED_EVENT
		| typeof CA_COMPANY_SUSPENDED_EVENT
		| typeof CA_COMPANY_DISSOLVED_EVENT,
	command:
		| typeof CA_COMMAND_COMPANY_ACTIVATE
		| typeof CA_COMMAND_COMPANY_ARCHIVE
		| typeof CA_COMMAND_COMPANY_SUSPEND
		| typeof CA_COMMAND_COMPANY_DISSOLVE,
	options: CorporateAdministrationCommandOptions,
): Promise<Result<CaLegalCompany>> {
	const parsed = lifecycleLegalCompanyInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid lifecycle input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command,
	});
	if (!authorized.ok) return authorized;

	const replayHistory = await store.getStatusHistoryByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!replayHistory.ok) return replayHistory;
	if (replayHistory.data) {
		if (
			replayHistory.data.requestFingerprint !== parsed.data.requestFingerprint
		) {
			return idempotencyFingerprintConflict();
		}
		const replayCompany = await store.getById(
			parsed.data.organizationId,
			replayHistory.data.legalCompanyId,
		);
		if (!replayCompany.ok) return replayCompany;
		if (!replayCompany.data) {
			return fail("NOT_FOUND", "Legal company not found");
		}
		return ok(replayCompany.data);
	}

	const current = await store.getDetail(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!current.ok) return current;
	if (!current.data) {
		return fail("NOT_FOUND", "Legal company not found");
	}
	if (current.data.version !== parsed.data.expectedVersion) {
		return fail(
			"CONFLICT",
			"Legal company version conflict",
			caErrorDetails(CA_ERROR_VERSION_CONFLICT),
		);
	}

	if (targetStatus === "active") {
		if (!current.data.legalPartyId) {
			return fail(
				"CONFLICT",
				"Activation requires organization party",
				caErrorDetails(CA_ERROR_ACTIVATION_INCOMPLETE),
			);
		}
		const hasLegalName = current.data.names.some(
			(name) =>
				name.nameType === "legal" &&
				isEffectiveAsOf(name, parsed.data.effectiveDate),
		);
		const hasRegistration = current.data.identifiers.some(
			(id) =>
				id.status === "active" &&
				id.identifierType === "company_registration" &&
				isEffectiveAsOf(id, parsed.data.effectiveDate),
		);
		if (!hasLegalName || !hasRegistration) {
			return fail(
				"CONFLICT",
				"Activation requires primary legal name and registration identifier",
				caErrorDetails(CA_ERROR_ACTIVATION_INCOMPLETE),
			);
		}
		const masterPort = await requireMasters(masters);
		if (!masterPort.ok) return masterPort;
		const dimension = await masterPort.data.getEffectiveLegalEntity({
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			id: current.data.legalEntityDimensionId,
			asOf: parsed.data.effectiveDate,
		});
		if (!dimension.ok) return dimension;
		if (dimension.data?.kind !== "legal_entity") {
			return fail(
				"CONFLICT",
				"Legal entity dimension is not effective",
				caErrorDetails(CA_ERROR_LEGAL_ENTITY_INVALID),
			);
		}
		const party = await masterPort.data.getPartyById({
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			partyId: current.data.legalPartyId,
		});
		if (!party.ok) return party;
		if (
			party.data?.status !== "active" ||
			party.data?.partyKind !== "organization"
		) {
			return fail(
				"CONFLICT",
				"Active organization party is required",
				caErrorDetails(CA_ERROR_PARTY_INVALID),
			);
		}
	}

	const fromStatus = current.data.status;
	if (!isAllowedCompanyStatusTransition(fromStatus, targetStatus)) {
		return fail(
			"CONFLICT",
			"Invalid status transition",
			caErrorDetails(CA_ERROR_INVALID_STATUS),
		);
	}

	return store.updateCompany(
		{
			...current.data,
			status: targetStatus,
			version: parsed.data.expectedVersion,
			updatedBy: parsed.data.actorUserId,
			activatedAt:
				targetStatus === "active" ? new Date() : current.data.activatedAt,
			activatedBy:
				targetStatus === "active"
					? parsed.data.actorUserId
					: current.data.activatedBy,
			suspendedAt:
				targetStatus === "suspended" ? new Date() : current.data.suspendedAt,
			suspendedBy:
				targetStatus === "suspended"
					? parsed.data.actorUserId
					: current.data.suspendedBy,
			dissolvedAt:
				targetStatus === "dissolved" ? new Date() : current.data.dissolvedAt,
			dissolvedBy:
				targetStatus === "dissolved"
					? parsed.data.actorUserId
					: current.data.dissolvedBy,
			archivedAt:
				targetStatus === "archived" ? new Date() : current.data.archivedAt,
			archivedBy:
				targetStatus === "archived"
					? parsed.data.actorUserId
					: current.data.archivedBy,
		},
		ports,
		{
			correlationId: parsed.data.correlationId,
			eventType,
			statusHistory: {
				organizationId: parsed.data.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				fromStatus,
				toStatus: targetStatus,
				effectiveDate: parsed.data.effectiveDate,
				reason: parsed.data.reason ?? null,
				evidenceReference: parsed.data.evidenceReference ?? null,
				correlationId: parsed.data.correlationId,
				actorUserId: parsed.data.actorUserId,
				idempotencyKey: parsed.data.idempotencyKey,
				requestFingerprint: parsed.data.requestFingerprint,
			},
		},
	);
}

export async function archiveLegalCompany(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaLegalCompany>> {
	return transitionCompanyStatus(
		input,
		"archived",
		CA_COMPANY_ARCHIVED_EVENT,
		CA_COMMAND_COMPANY_ARCHIVE,
		options,
	);
}

export async function activateLegalCompany(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaLegalCompany>> {
	return transitionCompanyStatus(
		input,
		"active",
		CA_COMPANY_ACTIVATED_EVENT,
		CA_COMMAND_COMPANY_ACTIVATE,
		options,
	);
}

export async function suspendLegalCompany(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaLegalCompany>> {
	return transitionCompanyStatus(
		input,
		"suspended",
		CA_COMPANY_SUSPENDED_EVENT,
		CA_COMMAND_COMPANY_SUSPEND,
		options,
	);
}

export async function dissolveLegalCompany(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaLegalCompany>> {
	return transitionCompanyStatus(
		input,
		"dissolved",
		CA_COMPANY_DISSOLVED_EVENT,
		CA_COMMAND_COMPANY_DISSOLVE,
		options,
	);
}

export async function getLegalCompany(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaLegalCompanyDetail>> {
	const parsed = getLegalCompanyInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid legal company get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_COMPANY_GET,
	});
	if (!authorized.ok) return authorized;
	const detail = await store.getDetail(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!detail.ok) return detail;
	if (!detail.data) {
		return fail("NOT_FOUND", "Legal company not found");
	}
	return ok(detail.data);
}

export async function listLegalCompanies(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<{ items: CaLegalCompany[]; total: number }>> {
	const parsed = listLegalCompaniesInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid legal company list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_COMPANY_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.list(parsed.data.organizationId, {
		status: parsed.data.status,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
	});
}

export async function addCompanyName(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCompanyName>> {
	const parsed = addCompanyNameInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid company name input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_COMPANY_NAME_ADD,
	});
	if (!authorized.ok) return authorized;

	const replay = await store.getNameByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!replay.ok) return replay;
	if (replay.data) {
		if (replay.data.requestFingerprint !== parsed.data.requestFingerprint) {
			return idempotencyFingerprintConflict();
		}
		return ok(replay.data);
	}

	const company = await store.getById(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	if (!company.data) return fail("NOT_FOUND", "Legal company not found");
	const name = normalizeDisplayName(parsed.data.displayName);
	if (!name.ok) return name;

	const existingNames = await store.listNames(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!existingNames.ok) return existingNames;
	if (parsed.data.nameType === "legal") {
		const candidate = {
			effectiveFrom: parsed.data.effectiveFrom,
			effectiveTo: null,
		};
		const legalNames = existingNames.data.filter(
			(row) => row.nameType === "legal",
		);
		if (hasOverlappingRange(legalNames, candidate)) {
			return fail(
				"CONFLICT",
				"Legal name ranges cannot overlap",
				caErrorDetails(CA_ERROR_NAME_OVERLAP),
			);
		}
	}

	return store.addName(
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			nameType: parsed.data.nameType,
			displayName: name.data.displayName,
			normalizedName: name.data.normalizedName,
			effectiveFrom: parsed.data.effectiveFrom,
			effectiveTo: null,
			supersedesId: null,
			idempotencyKey: parsed.data.idempotencyKey,
			requestFingerprint: parsed.data.requestFingerprint,
			createdBy: parsed.data.actorUserId,
			updatedBy: parsed.data.actorUserId,
		},
		ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_COMPANY_UPDATED_EVENT,
			legalCompanyCode: company.data.code,
		},
	);
}

export async function addCompanyIdentifier(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCompanyIdentifier>> {
	const parsed = addCompanyIdentifierInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid company identifier input", {
			issues: parsed.error.issues,
		});
	}
	if (TAX_IDENTIFIER_TYPES.has(parsed.data.identifierType.toLowerCase())) {
		return fail(
			"CONFLICT",
			"Tax registrations belong in master data",
			caErrorDetails(CA_ERROR_IDENTIFIER_TAX_TYPE),
		);
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_COMPANY_IDENTIFIER_ADD,
	});
	if (!authorized.ok) return authorized;

	const replay = await store.getIdentifierByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!replay.ok) return replay;
	if (replay.data) {
		if (replay.data.requestFingerprint !== parsed.data.requestFingerprint) {
			return idempotencyFingerprintConflict();
		}
		return ok(replay.data);
	}

	const company = await store.getById(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	if (!company.data) return fail("NOT_FOUND", "Legal company not found");
	const value = normalizeIdentifierValue(parsed.data.identifierValue);
	if (!value.ok) return value;
	return store.addIdentifier(
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			identifierType: parsed.data.identifierType,
			jurisdictionCode: parsed.data.jurisdictionCode ?? null,
			issuingAuthority: parsed.data.issuingAuthority ?? null,
			identifierValue: value.data.value,
			normalizedValue: value.data.normalizedValue,
			status: "active",
			effectiveFrom: parsed.data.effectiveFrom,
			effectiveTo: null,
			idempotencyKey: parsed.data.idempotencyKey,
			requestFingerprint: parsed.data.requestFingerprint,
			createdBy: parsed.data.actorUserId,
			updatedBy: parsed.data.actorUserId,
		},
		ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_COMPANY_UPDATED_EVENT,
			legalCompanyCode: company.data.code,
		},
	);
}

export async function endCompanyName(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<import("./schemas").CaCompanyName>> {
	const parsed = endCompanyNameInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid end company name input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_COMPANY_NAME_END,
	});
	if (!authorized.ok) return authorized;
	const name = await store.getNameById(
		parsed.data.organizationId,
		parsed.data.companyNameId,
	);
	if (!name.ok) return name;
	if (!name.data || name.data.legalCompanyId !== parsed.data.legalCompanyId) {
		return fail("NOT_FOUND", "Company name not found");
	}
	if (name.data.version !== parsed.data.expectedVersion) {
		return fail(
			"CONFLICT",
			"Company name version conflict",
			caErrorDetails(CA_ERROR_VERSION_CONFLICT),
		);
	}
	const company = await store.getById(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	if (!company.data) return fail("NOT_FOUND", "Legal company not found");
	return store.endName(
		{
			...name.data,
			effectiveTo: parsed.data.effectiveTo,
			version: parsed.data.expectedVersion,
			updatedBy: parsed.data.actorUserId,
		},
		ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_COMPANY_UPDATED_EVENT,
			legalCompanyCode: company.data.code,
		},
	);
}

export async function updateCompanyIdentifier(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<import("./schemas").CaCompanyIdentifier>> {
	const parsed = updateCompanyIdentifierInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid update company identifier input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_COMPANY_IDENTIFIER_UPDATE,
	});
	if (!authorized.ok) return authorized;
	const identifier = await store.getIdentifierById(
		parsed.data.organizationId,
		parsed.data.companyIdentifierId,
	);
	if (!identifier.ok) return identifier;
	if (
		!identifier.data ||
		identifier.data.legalCompanyId !== parsed.data.legalCompanyId
	) {
		return fail("NOT_FOUND", "Company identifier not found");
	}
	if (identifier.data.version !== parsed.data.expectedVersion) {
		return fail(
			"CONFLICT",
			"Company identifier version conflict",
			caErrorDetails(CA_ERROR_VERSION_CONFLICT),
		);
	}
	const company = await store.getById(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	if (!company.data) return fail("NOT_FOUND", "Legal company not found");
	let identifierValue = identifier.data.identifierValue;
	let normalizedValue = identifier.data.normalizedValue;
	if (parsed.data.identifierValue !== undefined) {
		const value = normalizeIdentifierValue(parsed.data.identifierValue);
		if (!value.ok) return value;
		identifierValue = value.data.value;
		normalizedValue = value.data.normalizedValue;
	}
	return store.updateIdentifier(
		{
			...identifier.data,
			jurisdictionCode:
				parsed.data.jurisdictionCode === undefined
					? identifier.data.jurisdictionCode
					: parsed.data.jurisdictionCode,
			issuingAuthority:
				parsed.data.issuingAuthority === undefined
					? identifier.data.issuingAuthority
					: parsed.data.issuingAuthority,
			identifierValue,
			normalizedValue,
			version: parsed.data.expectedVersion,
			updatedBy: parsed.data.actorUserId,
		},
		ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_COMPANY_UPDATED_EVENT,
			legalCompanyCode: company.data.code,
		},
	);
}

export async function retireCompanyIdentifier(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<import("./schemas").CaCompanyIdentifier>> {
	const parsed = retireCompanyIdentifierInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid retire company identifier input", {
			issues: parsed.error.issues,
		});
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_COMPANY_IDENTIFIER_RETIRE,
	});
	if (!authorized.ok) return authorized;
	const identifier = await store.getIdentifierById(
		parsed.data.organizationId,
		parsed.data.companyIdentifierId,
	);
	if (!identifier.ok) return identifier;
	if (
		!identifier.data ||
		identifier.data.legalCompanyId !== parsed.data.legalCompanyId
	) {
		return fail("NOT_FOUND", "Company identifier not found");
	}
	if (identifier.data.version !== parsed.data.expectedVersion) {
		return fail(
			"CONFLICT",
			"Company identifier version conflict",
			caErrorDetails(CA_ERROR_VERSION_CONFLICT),
		);
	}
	const company = await store.getById(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	if (!company.data) return fail("NOT_FOUND", "Legal company not found");
	return store.updateIdentifier(
		{
			...identifier.data,
			status: "retired",
			effectiveTo: parsed.data.effectiveTo,
			version: parsed.data.expectedVersion,
			updatedBy: parsed.data.actorUserId,
		},
		ports,
		{
			correlationId: parsed.data.correlationId,
			eventType: CA_COMPANY_UPDATED_EVENT,
			legalCompanyCode: company.data.code,
		},
	);
}

export async function getLegalCompanyAsOf(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaLegalCompanyDetail>> {
	const parsed = getLegalCompanyAsOfInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid legal company as-of input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_COMPANY_GET_AS_OF,
	});
	if (!authorized.ok) return authorized;
	const detail = await store.getDetail(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!detail.ok) return detail;
	if (!detail.data) return fail("NOT_FOUND", "Legal company not found");
	return ok(buildLegalCompanyAsOfView(detail.data, parsed.data.asOf));
}

export async function listCompanyNames(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCompanyName[]>> {
	const parsed = listCompanyNamesInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid list company names input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_COMPANY_NAME_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listNames(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
}

export async function listCompanyIdentifiers(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCompanyIdentifier[]>> {
	const parsed = listCompanyIdentifiersInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid list company identifiers input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_COMPANY_IDENTIFIER_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listIdentifiers(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
}

export async function listCompanyStatusHistory(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCompanyStatusHistory[]>> {
	const parsed = listCompanyStatusHistoryInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid list company status history input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_COMPANY_STATUS_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listStatusHistory(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
}
