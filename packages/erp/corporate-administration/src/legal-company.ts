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
	type CaCommandId,
} from "./module-ids";
import type { CaLegalCompanyId } from "./brands";
import type { CorporateAdministrationMasterLookupPort } from "./ports";
import {
	activateLegalCompanyInputSchema,
	addCompanyIdentifierInputSchema,
	addCompanyNameInputSchema,
	archiveLegalCompanyInputSchema,
	type CaCompanyIdentifier,
	type CaCompanyName,
	type CaCompanyStatusHistory,
	type CaLegalCompany,
	type CaLegalCompanyAsOf,
	type CaLegalCompanyDetail,
	type CaLegalCompanyStatus,
	createLegalCompanyInputSchema,
	dissolveLegalCompanyInputSchema,
	endCompanyNameInputSchema,
	getLegalCompanyAsOfInputSchema,
	getLegalCompanyInputSchema,
	listCompanyIdentifiersInputSchema,
	listCompanyNamesInputSchema,
	listCompanyStatusHistoryInputSchema,
	listLegalCompaniesInputSchema,
	retireCompanyIdentifierInputSchema,
	suspendLegalCompanyInputSchema,
	type ActivateLegalCompanyInput,
	type ArchiveLegalCompanyInput,
	type CaLegalCompanyListPage,
	type DissolveLegalCompanyInput,
	type SuspendLegalCompanyInput,
	updateCompanyIdentifierInputSchema,
	updateLegalCompanyInputSchema,
} from "./schemas";
import { evaluateCompanyActivationReadiness } from "./shared/activation-readiness";
import { buildLegalCompanyAsOfView } from "./shared/as-of";
import {
	isRegistrationIdentifierType,
	isTaxIdentifierType,
	normalizeCompanyCode,
	normalizeCorporateCode,
	normalizeDisplayName,
	normalizeIdentifierValue,
} from "./shared/code";
import {
	buildMutationMeta,
	loadLegalCompanyDetail,
} from "./shared/company-detail";
import { deriveCaCommandFingerprint } from "./shared/fingerprint";
import {
	idempotencyFingerprintConflict,
	replayIdempotencyFingerprintMapped,
} from "./shared/idempotency-replay";
import {
	canTransitionLegalCompany,
	canUpdateLegalCompanyProfile,
} from "./shared/lifecycle";
import type {
	LegalCompanyStatusTransitionRecord,
	LegalCompanyTransitionPatch,
} from "./store/company-store";

type LifecycleMutationInput =
	| SuspendLegalCompanyInput
	| DissolveLegalCompanyInput
	| ArchiveLegalCompanyInput;

function lifecycleAuditFields(
	command:
		| typeof CA_COMMAND_COMPANY_ACTIVATE
		| typeof CA_COMMAND_COMPANY_ARCHIVE
		| typeof CA_COMMAND_COMPANY_SUSPEND
		| typeof CA_COMMAND_COMPANY_DISSOLVE,
	data: ActivateLegalCompanyInput | LifecycleMutationInput,
): {
	reasonCode: string | null;
	reason: string | null;
	resolutionReference: string | null;
	evidenceDocumentReference: string | null;
} {
	if (command === CA_COMMAND_COMPANY_ACTIVATE) {
		return {
			reasonCode: null,
			reason: null,
			resolutionReference: null,
			evidenceDocumentReference: null,
		};
	}
	const lifecycle = data as LifecycleMutationInput;
	return {
		reasonCode: lifecycle.reasonCode,
		reason: lifecycle.reason,
		resolutionReference: lifecycle.resolutionReference ?? null,
		evidenceDocumentReference: lifecycle.evidenceDocumentReference ?? null,
	};
}

async function requireMasters(
	masters: CorporateAdministrationMasterLookupPort | undefined,
): Promise<Result<CorporateAdministrationMasterLookupPort>> {
	if (!masters) {
		return fail("INTERNAL_ERROR", "Master lookup port is required");
	}
	return ok(masters);
}

function companyCommandFingerprint(
	command: CaCommandId,
	data: Record<string, unknown>,
): string {
	return deriveCaCommandFingerprint({ command }, data);
}

async function resolveOrganizationParty(
	masters: CorporateAdministrationMasterLookupPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		legalPartyId: string | null | undefined;
		requireActive?: boolean;
	},
): Promise<
	Result<{
		legalPartyId: string | null;
		legalPartyCodeSnapshot: string | null;
		legalPartyNameSnapshot: string | null;
	}>
> {
	if (input.legalPartyId === undefined) {
		return ok({
			legalPartyId: null,
			legalPartyCodeSnapshot: null,
			legalPartyNameSnapshot: null,
		});
	}
	if (input.legalPartyId === null) {
		return ok({
			legalPartyId: null,
			legalPartyCodeSnapshot: null,
			legalPartyNameSnapshot: null,
		});
	}
	const masterPort = await requireMasters(masters);
	if (!masterPort.ok) return masterPort;
	const party = await masterPort.data.getPartyById({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		partyId: input.legalPartyId,
	});
	if (!party.ok) return party;
	if (
		party.data?.partyKind !== "organization" ||
		(input.requireActive === true && party.data?.status !== "active")
	) {
		return fail(
			"CONFLICT",
			input.requireActive
				? "Active organization party is required"
				: "Organization party is required",
			caErrorDetails(CA_ERROR_PARTY_INVALID),
		);
	}
	return ok({
		legalPartyId: input.legalPartyId,
		legalPartyCodeSnapshot: party.data.code,
		legalPartyNameSnapshot: party.data.name,
	});
}

async function resolvePrimaryLegalNameFlag(
	store: CorporateAdministrationCommandOptions["store"],
	input: {
		organizationId: string;
		legalCompanyId: CaLegalCompany["id"];
		nameType: CaCompanyName["nameType"];
		isPrimary: boolean;
		effectiveFrom: string;
	},
): Promise<Result<boolean>> {
	if (input.nameType !== "legal" || input.isPrimary) {
		return ok(input.isPrimary);
	}
	const resolved = resolveCommandDeps({ store });
	const count = await resolved.store.countEffectivePrimaryLegalNames(
		input.organizationId,
		input.legalCompanyId,
		input.effectiveFrom,
	);
	if (!count.ok) return count;
	return ok(count.data === 0);
}

async function resolvePrimaryRegistrationIdentifierFlag(
	store: CorporateAdministrationCommandOptions["store"],
	input: {
		organizationId: string;
		legalCompanyId: CaLegalCompany["id"];
		identifierType: string;
		isPrimary: boolean;
		effectiveFrom: string;
	},
): Promise<Result<boolean>> {
	if (!isRegistrationIdentifierType(input.identifierType) || input.isPrimary) {
		return ok(input.isPrimary);
	}
	const resolved = resolveCommandDeps({ store });
	const identifiers = await resolved.store.listCompanyIdentifiers({
		organizationId: input.organizationId,
		legalCompanyId: input.legalCompanyId,
		asOf: input.effectiveFrom,
		status: "active",
	});
	if (!identifiers.ok) return identifiers;
	const hasPrimary = identifiers.data.some(
		(row) =>
			row.isPrimary &&
			isRegistrationIdentifierType(row.identifierType) &&
			row.status === "active",
	);
	return ok(!hasPrimary);
}

function buildTransitionPatch(
	current: CaLegalCompany,
	targetStatus: CaLegalCompanyStatus,
	actorUserId: string,
): LegalCompanyTransitionPatch {
	const now = new Date();
	return {
		status: targetStatus,
		activatedAt: targetStatus === "active" ? now : current.activatedAt,
		activatedBy:
			targetStatus === "active" ? actorUserId : current.activatedBy,
		suspendedAt: targetStatus === "suspended" ? now : current.suspendedAt,
		suspendedBy:
			targetStatus === "suspended" ? actorUserId : current.suspendedBy,
		dissolvedAt: targetStatus === "dissolved" ? now : current.dissolvedAt,
		dissolvedBy:
			targetStatus === "dissolved" ? actorUserId : current.dissolvedBy,
		archivedAt: targetStatus === "archived" ? now : current.archivedAt,
		archivedBy:
			targetStatus === "archived" ? actorUserId : current.archivedBy,
		updatedBy: actorUserId,
	};
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
	const { store, uow, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_COMPANY_CREATE,
	});
	if (!authorized.ok) return authorized;

	const requestFingerprint = companyCommandFingerprint(
		CA_COMMAND_COMPANY_CREATE,
		parsed.data,
	);
	const existing = await store.findCreateLegalCompanyReceipt(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	if (existing.data) {
		return replayIdempotencyFingerprintMapped(
			existing.data,
			requestFingerprint,
			(receipt) => receipt.result,
		);
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
	const legalEntity = dimension.data;
	if (!legalEntity || legalEntity.kind !== "legal_entity") {
		return fail(
			"CONFLICT",
			"Legal entity dimension is not effective",
			caErrorDetails(CA_ERROR_LEGAL_ENTITY_INVALID),
		);
	}

	const party = await resolveOrganizationParty(masters, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		legalPartyId: parsed.data.legalPartyId,
	});
	if (!party.ok) return party;

	const meta = buildMutationMeta({
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		causationId: parsed.data.causationId,
		idempotencyKey: parsed.data.idempotencyKey,
		requestFingerprint,
		eventType: CA_COMPANY_CREATED_EVENT,
		legalCompanyCode: code.data.code,
	});

	return uow.run((context) => store.createLegalCompany(
			{
				organizationId: parsed.data.organizationId,
				code: code.data.code,
				normalizedCode: code.data.normalizedCode,
				legalEntityDimensionId: legalEntity.id,
				legalEntityKeySnapshot: legalEntity.key,
				legalEntityNameSnapshot: legalEntity.name,
				legalPartyId: party.data.legalPartyId,
				legalPartyCodeSnapshot: party.data.legalPartyCodeSnapshot,
				legalPartyNameSnapshot: party.data.legalPartyNameSnapshot,
				jurisdictionCountryId: parsed.data.jurisdictionCountryId ?? null,
				legalFormCode: parsed.data.legalFormCode ?? null,
				legalFormNameSnapshot:
					parsed.data.legalFormNameSnapshot ??
					parsed.data.legalFormCode ??
					null,
				incorporationDate: parsed.data.incorporationDate ?? null,
				commencementDate: parsed.data.commencementDate ?? null,
				fiscalYearEndMonth: parsed.data.fiscalYearEndMonth ?? null,
				fiscalYearEndDay: parsed.data.fiscalYearEndDay ?? null,
				status: "draft",
				version: 1,
				createIdempotencyKey: parsed.data.idempotencyKey,
				createRequestFingerprint: requestFingerprint,
				createdBy: parsed.data.actorUserId,
				updatedBy: parsed.data.actorUserId,
			}, context, meta));
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
	const { store, uow, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_COMPANY_UPDATE,
	});
	if (!authorized.ok) return authorized;

	const current = await store.getLegalCompany(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!current.ok) return current;
	if (!current.data) {
		return fail("NOT_FOUND", "Legal company not found");
	}
	const company = current.data;
	if (company.version !== parsed.data.expectedVersion) {
		return fail(
			"CONFLICT",
			"Legal company version conflict",
			caErrorDetails(CA_ERROR_VERSION_CONFLICT),
		);
	}
	if (!canUpdateLegalCompanyProfile(company.status)) {
		return fail(
			"CONFLICT",
			"Invalid status transition",
			caErrorDetails(CA_ERROR_INVALID_STATUS),
		);
	}

	let nextCode = company.code;
	let nextNormalizedCode = company.normalizedCode;
	if (parsed.data.code !== undefined) {
		const code = normalizeCompanyCode(parsed.data.code);
		if (!code.ok) return code;
		nextCode = code.data.code;
		nextNormalizedCode = code.data.normalizedCode;
	}

	let legalPartyId = company.legalPartyId;
	let legalPartyCodeSnapshot = company.legalPartyCodeSnapshot;
	let legalPartyNameSnapshot = company.legalPartyNameSnapshot;
	if (parsed.data.legalPartyId !== undefined) {
		const party = await resolveOrganizationParty(masters, {
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			legalPartyId: parsed.data.legalPartyId,
		});
		if (!party.ok) return party;
		legalPartyId = party.data.legalPartyId;
		legalPartyCodeSnapshot = party.data.legalPartyCodeSnapshot;
		legalPartyNameSnapshot = party.data.legalPartyNameSnapshot;
	}

	const requestFingerprint = companyCommandFingerprint(
		CA_COMMAND_COMPANY_UPDATE,
		parsed.data,
	);
	const meta = buildMutationMeta({
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		causationId: parsed.data.causationId,
		idempotencyKey: parsed.data.idempotencyKey,
		requestFingerprint,
		eventType: CA_COMPANY_UPDATED_EVENT,
		legalCompanyCode: nextCode,
	});

	return uow.run(async (context) => {
		const updated = await store.updateLegalCompany(
			parsed.data.organizationId,
			parsed.data.legalCompanyId,
			parsed.data.expectedVersion,
			{
				code: nextCode,
				normalizedCode: nextNormalizedCode,
				legalPartyId,
				legalPartyCodeSnapshot,
				legalPartyNameSnapshot,
				jurisdictionCountryId:
					parsed.data.jurisdictionCountryId === undefined
						? company.jurisdictionCountryId
						: parsed.data.jurisdictionCountryId,
				legalFormCode:
					parsed.data.legalFormCode === undefined
						? company.legalFormCode
						: parsed.data.legalFormCode,
				legalFormNameSnapshot:
					parsed.data.legalFormNameSnapshot === undefined
						? company.legalFormNameSnapshot
						: parsed.data.legalFormNameSnapshot,
				incorporationDate:
					parsed.data.incorporationDate === undefined
						? company.incorporationDate
						: parsed.data.incorporationDate,
				commencementDate:
					parsed.data.commencementDate === undefined
						? company.commencementDate
						: parsed.data.commencementDate,
				fiscalYearEndMonth:
					parsed.data.fiscalYearEndMonth === undefined
						? company.fiscalYearEndMonth
						: parsed.data.fiscalYearEndMonth,
				fiscalYearEndDay:
					parsed.data.fiscalYearEndDay === undefined
						? company.fiscalYearEndDay
						: parsed.data.fiscalYearEndDay,
				updatedBy: parsed.data.actorUserId,
			}, context, meta);
		if (!updated.ok) return updated;
		if (!updated.data) {
			return fail("NOT_FOUND", "Legal company not found");
		}
		return ok(updated.data);
	});
}

async function transitionLegalCompanyStatus(
	input: unknown,
	targetStatus: CaLegalCompanyStatus,
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
	const schema =
		command === CA_COMMAND_COMPANY_ACTIVATE
			? activateLegalCompanyInputSchema
			: command === CA_COMMAND_COMPANY_ARCHIVE
				? archiveLegalCompanyInputSchema
				: command === CA_COMMAND_COMPANY_SUSPEND
					? suspendLegalCompanyInputSchema
					: dissolveLegalCompanyInputSchema;
	const parsed = schema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid lifecycle input", {
			issues: parsed.error.issues,
		});
	}
	const { store, uow, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command,
	});
	if (!authorized.ok) return authorized;

	const requestFingerprint = companyCommandFingerprint(command, parsed.data);
	const replayHistory = await store.findStatusHistoryByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!replayHistory.ok) return replayHistory;
	if (replayHistory.data) {
		if (replayHistory.data.requestFingerprint !== requestFingerprint) {
			return idempotencyFingerprintConflict({
				organizationId: parsed.data.organizationId,
				idempotencyKey: parsed.data.idempotencyKey,
			});
		}
		const replayCompany = await store.getLegalCompany(
			parsed.data.organizationId,
			replayHistory.data.legalCompanyId,
		);
		if (!replayCompany.ok) return replayCompany;
		if (!replayCompany.data) {
			return fail("NOT_FOUND", "Legal company not found");
		}
		return ok(replayCompany.data);
	}

	const detail = await loadLegalCompanyDetail(
		store,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!detail.ok) return detail;
	if (!detail.data) {
		return fail("NOT_FOUND", "Legal company not found");
	}
	const companyDetail = detail.data;
	if (companyDetail.version !== parsed.data.expectedVersion) {
		return fail(
			"CONFLICT",
			"Legal company version conflict",
			caErrorDetails(CA_ERROR_VERSION_CONFLICT),
		);
	}

	const fromStatus = detail.data.status;
	if (!canTransitionLegalCompany(fromStatus, targetStatus)) {
		return fail(
			"CONFLICT",
			"Invalid status transition",
			caErrorDetails(CA_ERROR_INVALID_STATUS),
		);
	}

	const effectiveDate = parsed.data.effectiveAt.slice(0, 10);
	if (targetStatus === "active") {
		const masterPort = await requireMasters(masters);
		if (!masterPort.ok) return masterPort;
		const dimension = await masterPort.data.getEffectiveLegalEntity({
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			id: detail.data.legalEntityDimensionId,
			asOf: effectiveDate,
		});
		const legalEntityEffective =
			dimension.ok &&
			dimension.data?.kind === "legal_entity";
		const party = detail.data.legalPartyId
			? await masterPort.data.getPartyById({
					organizationId: parsed.data.organizationId,
					actorUserId: parsed.data.actorUserId,
					partyId: detail.data.legalPartyId,
				})
			: null;
		const partyActiveOrganization =
			party?.ok === true &&
			party.data?.status === "active" &&
			party.data?.partyKind === "organization";
		const readiness = evaluateCompanyActivationReadiness({
			detail: detail.data,
			effectiveDate,
			legalEntityEffective: legalEntityEffective === true,
			partyActiveOrganization: partyActiveOrganization === true,
		});
		if (!readiness.ready) {
			return fail(
				"CONFLICT",
				"Activation requires primary legal name and registration identifier",
				caErrorDetails(CA_ERROR_ACTIVATION_INCOMPLETE, {
					missing: readiness.missing,
				}),
			);
		}
	}

	const lifecycleFields = lifecycleAuditFields(command, parsed.data);

	const history: LegalCompanyStatusTransitionRecord = {
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		fromStatus,
		toStatus: targetStatus,
		effectiveAt: new Date(parsed.data.effectiveAt),
		reasonCode: lifecycleFields.reasonCode,
		reason: lifecycleFields.reason,
		resolutionReference: lifecycleFields.resolutionReference,
		evidenceDocumentReference: lifecycleFields.evidenceDocumentReference,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		causationId: parsed.data.causationId ?? null,
		idempotencyKey: parsed.data.idempotencyKey,
		requestFingerprint,
	};

	const meta = buildMutationMeta({
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		causationId: parsed.data.causationId,
		idempotencyKey: parsed.data.idempotencyKey,
		requestFingerprint,
		eventType,
		legalCompanyCode: detail.data.code,
	});

	const transitioned = await uow.run((context) => store.transitionLegalCompany(
			parsed.data.organizationId,
			parsed.data.legalCompanyId,
			parsed.data.expectedVersion,
			buildTransitionPatch(
				companyDetail,
				targetStatus,
				parsed.data.actorUserId,
			),
			history, context, meta));
	if (!transitioned.ok) return transitioned;
	if (!transitioned.data) {
		return fail("NOT_FOUND", "Legal company not found");
	}
	return ok(transitioned.data);
}

export async function archiveLegalCompany(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaLegalCompany>> {
	return transitionLegalCompanyStatus(
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
	return transitionLegalCompanyStatus(
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
	return transitionLegalCompanyStatus(
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
	return transitionLegalCompanyStatus(
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
	const detail = await loadLegalCompanyDetail(
		store,
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
): Promise<Result<CaLegalCompanyListPage>> {
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
	const page = await store.listLegalCompanies({
		organizationId: parsed.data.organizationId,
		status: parsed.data.status,
		normalizedQuery:
			parsed.data.query === undefined
				? undefined
				: normalizeCorporateCode(parsed.data.query),
		cursor: parsed.data.cursor,
		limit: parsed.data.limit,
	});
	if (!page.ok) return page;
	return ok(page.data);
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
	const { store, uow, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_COMPANY_NAME_ADD,
	});
	if (!authorized.ok) return authorized;

	const requestFingerprint = companyCommandFingerprint(
		CA_COMMAND_COMPANY_NAME_ADD,
		parsed.data,
	);
	const replay = await store.findCompanyNameReceipt(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!replay.ok) return replay;
	if (replay.data) {
		return replayIdempotencyFingerprintMapped(
			replay.data,
			requestFingerprint,
			(receipt) => receipt.result,
		);
	}

	const company = await store.getLegalCompany(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	if (!company.data) return fail("NOT_FOUND", "Legal company not found");

	const name = normalizeDisplayName(parsed.data.displayName);
	if (!name.ok) return name;

	const overlap = await store.hasOverlappingCompanyName(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
		parsed.data.nameType,
		parsed.data.effectiveFrom,
		parsed.data.effectiveTo ?? null,
	);
	if (!overlap.ok) return overlap;
	if (overlap.data) {
		return fail(
			"CONFLICT",
			"Legal name ranges cannot overlap",
			caErrorDetails(CA_ERROR_NAME_OVERLAP),
		);
	}

	const isPrimary = await resolvePrimaryLegalNameFlag(store, {
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		nameType: parsed.data.nameType,
		isPrimary: parsed.data.isPrimary,
		effectiveFrom: parsed.data.effectiveFrom,
	});
	if (!isPrimary.ok) return isPrimary;

	const meta = buildMutationMeta({
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		causationId: parsed.data.causationId,
		idempotencyKey: parsed.data.idempotencyKey,
		requestFingerprint,
		eventType: CA_COMPANY_UPDATED_EVENT,
		legalCompanyCode: company.data.code,
	});

	return uow.run((context) => store.createCompanyName(
			{
				organizationId: parsed.data.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				nameType: parsed.data.nameType,
				displayName: name.data.displayName,
				normalizedName: name.data.normalizedName,
				isPrimary: isPrimary.data,
				effectiveFrom: parsed.data.effectiveFrom,
				effectiveTo: parsed.data.effectiveTo ?? null,
				supersedesCompanyNameId: parsed.data.supersedesCompanyNameId ?? null,
				correctionReason: parsed.data.correctionReason ?? null,
				version: 1,
				idempotencyKey: parsed.data.idempotencyKey,
				requestFingerprint,
				createdBy: parsed.data.actorUserId,
				updatedBy: parsed.data.actorUserId,
			}, context, meta));
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
	if (isTaxIdentifierType(parsed.data.identifierType)) {
		return fail(
			"CONFLICT",
			"Tax registrations belong in master data",
			caErrorDetails(CA_ERROR_IDENTIFIER_TAX_TYPE),
		);
	}
	const { store, uow, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_COMPANY_IDENTIFIER_ADD,
	});
	if (!authorized.ok) return authorized;

	const requestFingerprint = companyCommandFingerprint(
		CA_COMMAND_COMPANY_IDENTIFIER_ADD,
		parsed.data,
	);
	const replay = await store.findCompanyIdentifierReceipt(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!replay.ok) return replay;
	if (replay.data) {
		return replayIdempotencyFingerprintMapped(
			replay.data,
			requestFingerprint,
			(receipt) => receipt.result,
		);
	}

	const company = await store.getLegalCompany(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	if (!company.data) return fail("NOT_FOUND", "Legal company not found");

	const value = normalizeIdentifierValue(
		parsed.data.identifierValue,
		parsed.data.identifierType,
	);
	if (!value.ok) return value;

	const isPrimary = await resolvePrimaryRegistrationIdentifierFlag(store, {
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		identifierType: parsed.data.identifierType,
		isPrimary: parsed.data.isPrimary,
		effectiveFrom: parsed.data.effectiveFrom,
	});
	if (!isPrimary.ok) return isPrimary;

	const meta = buildMutationMeta({
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		causationId: parsed.data.causationId,
		idempotencyKey: parsed.data.idempotencyKey,
		requestFingerprint,
		eventType: CA_COMPANY_UPDATED_EVENT,
		legalCompanyCode: company.data.code,
	});

	return uow.run((context) => store.createCompanyIdentifier(
			{
				organizationId: parsed.data.organizationId,
				legalCompanyId: parsed.data.legalCompanyId,
				identifierType: parsed.data.identifierType,
				jurisdictionCountryId: parsed.data.jurisdictionCountryId ?? null,
				authorityPartyId: parsed.data.authorityPartyId ?? null,
				identifierValue: value.data.value,
				normalizedIdentifierValue: value.data.normalizedValue,
				isPrimary: isPrimary.data,
				status: "active",
				effectiveFrom: parsed.data.effectiveFrom,
				effectiveTo: parsed.data.effectiveTo ?? null,
				version: 1,
				idempotencyKey: parsed.data.idempotencyKey,
				requestFingerprint,
				createdBy: parsed.data.actorUserId,
				updatedBy: parsed.data.actorUserId,
			}, context, meta));
}

export async function endCompanyName(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCompanyName>> {
	const parsed = endCompanyNameInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid end company name input", {
			issues: parsed.error.issues,
		});
	}
	const { store, uow, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_COMPANY_NAME_END,
	});
	if (!authorized.ok) return authorized;

	const name = await store.findCompanyNameById(
		parsed.data.organizationId,
		parsed.data.companyNameId,
	);
	if (!name.ok) return name;
	if (!name.data) {
		return fail("NOT_FOUND", "Company name not found");
	}
	if (name.data.version !== parsed.data.expectedVersion) {
		return fail(
			"CONFLICT",
			"Company name version conflict",
			caErrorDetails(CA_ERROR_VERSION_CONFLICT),
		);
	}

	const company = await store.getLegalCompany(
		parsed.data.organizationId,
		name.data.legalCompanyId,
	);
	if (!company.ok) return company;
	if (!company.data) return fail("NOT_FOUND", "Legal company not found");

	const requestFingerprint = companyCommandFingerprint(
		CA_COMMAND_COMPANY_NAME_END,
		parsed.data,
	);
	const meta = buildMutationMeta({
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		causationId: parsed.data.causationId,
		idempotencyKey: parsed.data.idempotencyKey,
		requestFingerprint,
		eventType: CA_COMPANY_UPDATED_EVENT,
		legalCompanyCode: company.data.code,
	});

	return uow.run(async (context) => {
		const ended = await store.endCompanyName(
			parsed.data.organizationId,
			parsed.data.companyNameId,
			parsed.data.expectedVersion,
			parsed.data.effectiveTo,
			parsed.data.reason, context, meta);
		if (!ended.ok) return ended;
		if (!ended.data) {
			return fail("NOT_FOUND", "Company name not found");
		}
		return ok(ended.data);
	});
}

export async function updateCompanyIdentifier(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCompanyIdentifier>> {
	const parsed = updateCompanyIdentifierInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid update company identifier input", {
			issues: parsed.error.issues,
		});
	}
	const { store, uow, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_COMPANY_IDENTIFIER_UPDATE,
	});
	if (!authorized.ok) return authorized;

	const identifier = await store.findCompanyIdentifierById(
		parsed.data.organizationId,
		parsed.data.companyIdentifierId,
	);
	if (!identifier.ok) return identifier;
	if (!identifier.data) {
		return fail("NOT_FOUND", "Company identifier not found");
	}
	const currentIdentifier = identifier.data;
	if (currentIdentifier.version !== parsed.data.expectedVersion) {
		return fail(
			"CONFLICT",
			"Company identifier version conflict",
			caErrorDetails(CA_ERROR_VERSION_CONFLICT),
		);
	}

	const company = await store.getLegalCompany(
		parsed.data.organizationId,
		currentIdentifier.legalCompanyId,
	);
	if (!company.ok) return company;
	if (!company.data) return fail("NOT_FOUND", "Legal company not found");

	let identifierValue = currentIdentifier.identifierValue;
	let normalizedIdentifierValue = currentIdentifier.normalizedIdentifierValue;
	if (parsed.data.identifierValue !== undefined) {
		const value = normalizeIdentifierValue(
			parsed.data.identifierValue,
			currentIdentifier.identifierType,
		);
		if (!value.ok) return value;
		identifierValue = value.data.value;
		normalizedIdentifierValue = value.data.normalizedValue;
	}

	const requestFingerprint = companyCommandFingerprint(
		CA_COMMAND_COMPANY_IDENTIFIER_UPDATE,
		parsed.data,
	);
	const meta = buildMutationMeta({
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		causationId: parsed.data.causationId,
		idempotencyKey: parsed.data.idempotencyKey,
		requestFingerprint,
		eventType: CA_COMPANY_UPDATED_EVENT,
		legalCompanyCode: company.data.code,
	});

	return uow.run(async (context) => {
		const updated = await store.updateCompanyIdentifier(
			parsed.data.organizationId,
			parsed.data.companyIdentifierId,
			parsed.data.expectedVersion,
			{
				jurisdictionCountryId:
					parsed.data.jurisdictionCountryId === undefined
						? currentIdentifier.jurisdictionCountryId
						: parsed.data.jurisdictionCountryId,
				authorityPartyId:
					parsed.data.authorityPartyId === undefined
						? currentIdentifier.authorityPartyId
						: parsed.data.authorityPartyId,
				identifierValue,
				normalizedIdentifierValue,
				isPrimary:
					parsed.data.isPrimary === undefined
						? currentIdentifier.isPrimary
						: parsed.data.isPrimary,
				effectiveFrom:
					parsed.data.effectiveFrom === undefined
						? currentIdentifier.effectiveFrom
						: parsed.data.effectiveFrom,
				effectiveTo:
					parsed.data.effectiveTo === undefined
						? currentIdentifier.effectiveTo
						: parsed.data.effectiveTo,
				updatedBy: parsed.data.actorUserId,
			}, context, meta);
		if (!updated.ok) return updated;
		if (!updated.data) {
			return fail("NOT_FOUND", "Company identifier not found");
		}
		return ok(updated.data);
	});
}

export async function retireCompanyIdentifier(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCompanyIdentifier>> {
	const parsed = retireCompanyIdentifierInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid retire company identifier input", {
			issues: parsed.error.issues,
		});
	}
	const { store, uow, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_COMPANY_IDENTIFIER_RETIRE,
	});
	if (!authorized.ok) return authorized;

	const identifier = await store.findCompanyIdentifierById(
		parsed.data.organizationId,
		parsed.data.companyIdentifierId,
	);
	if (!identifier.ok) return identifier;
	if (!identifier.data) {
		return fail("NOT_FOUND", "Company identifier not found");
	}
	if (identifier.data.version !== parsed.data.expectedVersion) {
		return fail(
			"CONFLICT",
			"Company identifier version conflict",
			caErrorDetails(CA_ERROR_VERSION_CONFLICT),
		);
	}

	const company = await store.getLegalCompany(
		parsed.data.organizationId,
		identifier.data.legalCompanyId,
	);
	if (!company.ok) return company;
	if (!company.data) return fail("NOT_FOUND", "Legal company not found");

	const requestFingerprint = companyCommandFingerprint(
		CA_COMMAND_COMPANY_IDENTIFIER_RETIRE,
		parsed.data,
	);
	const meta = buildMutationMeta({
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		causationId: parsed.data.causationId,
		idempotencyKey: parsed.data.idempotencyKey,
		requestFingerprint,
		eventType: CA_COMPANY_UPDATED_EVENT,
		legalCompanyCode: company.data.code,
	});

	return uow.run(async (context) => {
		const retired = await store.updateCompanyIdentifier(
			parsed.data.organizationId,
			parsed.data.companyIdentifierId,
			parsed.data.expectedVersion,
			{
				status: "retired",
				effectiveTo: parsed.data.effectiveTo,
				updatedBy: parsed.data.actorUserId,
			}, context, meta);
		if (!retired.ok) return retired;
		if (!retired.data) {
			return fail("NOT_FOUND", "Company identifier not found");
		}
		return ok(retired.data);
	});
}

export async function getLegalCompanyAsOf(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaLegalCompanyAsOf>> {
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
	const detail = await loadLegalCompanyDetail(
		store,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!detail.ok) return detail;
	if (!detail.data) return fail("NOT_FOUND", "Legal company not found");
	return ok(buildLegalCompanyAsOfView(detail.data, parsed.data.asOf.slice(0, 10)));
}

export async function listCompanyNames(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<readonly CaCompanyName[]>> {
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
	return store.listCompanyNames({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		asOf: parsed.data.asOf,
	});
}

export async function listCompanyIdentifiers(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<readonly CaCompanyIdentifier[]>> {
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
	return store.listCompanyIdentifiers({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		asOf: parsed.data.asOf,
		status: parsed.data.status,
	});
}

export async function listCompanyStatusHistory(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<readonly CaCompanyStatusHistory[]>> {
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
	return store.listCompanyStatusHistory({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
	});
}
