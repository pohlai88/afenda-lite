import { fail, ok, type Result } from "@afenda/errors/result";

import {
	requireCaCommandPermission,
	requireCaQueryPermission,
} from "./authorization";
import {
	type CorporateAdministrationCommandOptions,
	resolveCommandDeps,
} from "./command-options";
import {
	CA_COMMAND_BANK_ACCOUNT_REGISTRATION_CREATE,
	CA_COMMAND_BANK_MANDATE_CREATE,
	CA_COMMAND_GROUP_CONTROL_RELATIONSHIP_CREATE,
	CA_COMMAND_LICENCE_PERMIT_CREATE,
	CA_COMMAND_MATERIAL_AGREEMENT_CREATE,
	CA_QUERY_BANK_ACCOUNT_REGISTRATION_GET,
	CA_QUERY_BANK_ACCOUNT_REGISTRATION_LIST,
	CA_QUERY_BANK_MANDATE_GET,
	CA_QUERY_BANK_MANDATE_LIST,
	CA_QUERY_GROUP_CONTROL_RELATIONSHIP_GET,
	CA_QUERY_GROUP_CONTROL_RELATIONSHIP_LIST,
	CA_QUERY_LICENCE_PERMIT_GET,
	CA_QUERY_LICENCE_PERMIT_LIST,
	CA_QUERY_MATERIAL_AGREEMENT_GET,
	CA_QUERY_MATERIAL_AGREEMENT_LIST,
} from "./module-ids";
import { normalizeCompanyCode } from "./shared/code";
import { tokenizeBankAccountIdentity } from "./shared/mask-bank";
import {
	normalizeEntityCode,
	requireLegalCompany,
	resolvePartySnapshot,
} from "./slice-helpers";
import type {
	CaBankAccountRegistrationPublic,
	CaBankMandate,
	CaGroupControlRelationship,
	CaLicencePermit,
	CaMaterialAgreement,
} from "./slice-types";
import {
	createBankAccountRegistrationInputSchema,
	createBankMandateInputSchema,
	createGroupControlRelationshipInputSchema,
	createLicencePermitInputSchema,
	createMaterialAgreementInputSchema,
	getBankAccountRegistrationInputSchema,
	getBankMandateInputSchema,
	getGroupControlRelationshipInputSchema,
	getLicencePermitInputSchema,
	getMaterialAgreementInputSchema,
	listBankAccountRegistrationsInputSchema,
	listBankMandatesInputSchema,
	listGroupControlRelationshipsInputSchema,
	listLicencePermitsInputSchema,
	listMaterialAgreementsInputSchema,
} from "./slice-types";

export async function createLicencePermit(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaLicencePermit>> {
	const parsed = createLicencePermitInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid licence permit create input", {
			issues: parsed.error.issues,
		});
	}
	const { store, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_LICENCE_PERMIT_CREATE,
	});
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await store.getLicencePermitByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	if (existing.data) return ok(existing.data);
	const normalized = normalizeEntityCode(parsed.data.licenceNumber);
	let authorityNameSnapshot: string | null = null;
	if (parsed.data.authorityPartyId) {
		const party = await resolvePartySnapshot(masters, {
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			partyId: parsed.data.authorityPartyId,
		});
		if (!party.ok) return party;
		authorityNameSnapshot = party.data.partyNameSnapshot;
	}
	return store.createLicencePermit({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		licenceNumber: normalized.code,
		normalizedLicenceNumber: normalized.normalizedCode,
		licenceType: parsed.data.licenceType,
		authorityPartyId: parsed.data.authorityPartyId ?? null,
		authorityNameSnapshot,
		jurisdictionCode: parsed.data.jurisdictionCode ?? null,
		scopeDescription: parsed.data.scopeDescription ?? null,
		validFrom: parsed.data.validFrom,
		validTo: parsed.data.validTo ?? null,
		status: "active",
		createIdempotencyKey: parsed.data.idempotencyKey,
		createdBy: parsed.data.actorUserId,
		updatedBy: parsed.data.actorUserId,
	});
}

export async function getLicencePermit(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaLicencePermit>> {
	const parsed = getLicencePermitInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid licence permit get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_LICENCE_PERMIT_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getLicencePermitById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data) return fail("NOT_FOUND", "Licence permit not found");
	return ok(row.data);
}

export async function listLicencePermits(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaLicencePermit[]>> {
	const parsed = listLicencePermitsInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid licence permit list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_LICENCE_PERMIT_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listLicencePermits(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
}

export async function createBankAccountRegistration(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaBankAccountRegistrationPublic>> {
	const parsed = createBankAccountRegistrationInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail(
			"BAD_REQUEST",
			"Invalid bank account registration create input",
			{
				issues: parsed.error.issues,
			},
		);
	}
	const { store, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_BANK_ACCOUNT_REGISTRATION_CREATE,
	});
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await store.getBankAccountRegistrationByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	if (existing.data) {
		const { accountIdentityToken: _token, ...publicRow } = existing.data;
		return ok(publicRow);
	}
	const tokenized = tokenizeBankAccountIdentity(parsed.data.accountIdentity);
	let bankPartyNameSnapshot: string | null = null;
	if (parsed.data.bankPartyId) {
		const party = await resolvePartySnapshot(masters, {
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			partyId: parsed.data.bankPartyId,
		});
		if (!party.ok) return party;
		bankPartyNameSnapshot = party.data.partyNameSnapshot;
	}
	const created = await store.createBankAccountRegistration({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		bankPartyId: parsed.data.bankPartyId ?? null,
		bankPartyNameSnapshot,
		accountIdentityToken: tokenized.accountIdentityToken,
		displayMaskedAccount: tokenized.displayMaskedAccount,
		countryCode: parsed.data.countryCode.toUpperCase(),
		currencyCode: parsed.data.currencyCode.toUpperCase(),
		accountPurpose: parsed.data.accountPurpose,
		openedDate: parsed.data.openedDate,
		closedDate: null,
		status: "active",
		createIdempotencyKey: parsed.data.idempotencyKey,
		createdBy: parsed.data.actorUserId,
		updatedBy: parsed.data.actorUserId,
	});
	if (!created.ok) return created;
	const { accountIdentityToken: _token, ...publicRow } = created.data;
	return ok(publicRow);
}

export async function getBankAccountRegistration(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaBankAccountRegistrationPublic>> {
	const parsed = getBankAccountRegistrationInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid bank account registration get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_BANK_ACCOUNT_REGISTRATION_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getBankAccountRegistrationById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data)
		return fail("NOT_FOUND", "Bank account registration not found");
	const { accountIdentityToken: _token, ...publicRow } = row.data;
	return ok(publicRow);
}

export async function listBankAccountRegistrations(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaBankAccountRegistrationPublic[]>> {
	const parsed = listBankAccountRegistrationsInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid bank account registration list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_BANK_ACCOUNT_REGISTRATION_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listBankAccountRegistrations(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
}

export async function createBankMandate(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaBankMandate>> {
	const parsed = createBankMandateInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid bank mandate create input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_BANK_MANDATE_CREATE,
	});
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await store.getBankMandateByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	if (existing.data) return ok(existing.data);
	return store.createBankMandate({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		bankAccountRegistrationId: parsed.data.bankAccountRegistrationId,
		mandateDescription: parsed.data.mandateDescription,
		signingRule: parsed.data.signingRule,
		effectiveFrom: parsed.data.effectiveFrom,
		effectiveTo: null,
		status: "active",
		createIdempotencyKey: parsed.data.idempotencyKey,
		createdBy: parsed.data.actorUserId,
		updatedBy: parsed.data.actorUserId,
	});
}

export async function getBankMandate(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaBankMandate>> {
	const parsed = getBankMandateInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid bank mandate get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_BANK_MANDATE_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getBankMandateById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data) return fail("NOT_FOUND", "Bank mandate not found");
	return ok(row.data);
}

export async function listBankMandates(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaBankMandate[]>> {
	const parsed = listBankMandatesInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid bank mandate list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_BANK_MANDATE_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listBankMandates(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
}

export async function createGroupControlRelationship(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaGroupControlRelationship>> {
	const parsed = createGroupControlRelationshipInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail(
			"BAD_REQUEST",
			"Invalid group control relationship create input",
			{
				issues: parsed.error.issues,
			},
		);
	}
	const { store, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_GROUP_CONTROL_RELATIONSHIP_CREATE,
	});
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await store.getGroupControlRelationshipByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	if (existing.data) return ok(existing.data);
	let counterpartyNameSnapshot: string | null = null;
	if (parsed.data.counterpartyPartyId) {
		const party = await resolvePartySnapshot(masters, {
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			partyId: parsed.data.counterpartyPartyId,
		});
		if (!party.ok) return party;
		counterpartyNameSnapshot = party.data.partyNameSnapshot;
	}
	return store.createGroupControlRelationship({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		relationshipType: parsed.data.relationshipType,
		counterpartyLegalCompanyId: parsed.data.counterpartyLegalCompanyId ?? null,
		counterpartyPartyId: parsed.data.counterpartyPartyId ?? null,
		counterpartyNameSnapshot,
		controlPercentage: parsed.data.controlPercentage ?? null,
		effectiveFrom: parsed.data.effectiveFrom,
		effectiveTo: null,
		status: "active",
		createIdempotencyKey: parsed.data.idempotencyKey,
		createdBy: parsed.data.actorUserId,
		updatedBy: parsed.data.actorUserId,
	});
}

export async function getGroupControlRelationship(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaGroupControlRelationship>> {
	const parsed = getGroupControlRelationshipInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid group control relationship get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_GROUP_CONTROL_RELATIONSHIP_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getGroupControlRelationshipById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data)
		return fail("NOT_FOUND", "Group control relationship not found");
	return ok(row.data);
}

export async function listGroupControlRelationships(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaGroupControlRelationship[]>> {
	const parsed = listGroupControlRelationshipsInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail(
			"BAD_REQUEST",
			"Invalid group control relationship list input",
			{
				issues: parsed.error.issues,
			},
		);
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_GROUP_CONTROL_RELATIONSHIP_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listGroupControlRelationships(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
}

export async function createMaterialAgreement(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaMaterialAgreement>> {
	const parsed = createMaterialAgreementInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid material agreement create input", {
			issues: parsed.error.issues,
		});
	}
	const { store, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_MATERIAL_AGREEMENT_CREATE,
	});
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await store.getMaterialAgreementByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	if (existing.data) return ok(existing.data);
	const code = normalizeCompanyCode(parsed.data.agreementCode);
	if (!code.ok) return code;
	let counterpartyNameSnapshot: string | null = null;
	if (parsed.data.counterpartyPartyId) {
		const party = await resolvePartySnapshot(masters, {
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			partyId: parsed.data.counterpartyPartyId,
		});
		if (!party.ok) return party;
		counterpartyNameSnapshot = party.data.partyNameSnapshot;
	}
	return store.createMaterialAgreement({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		agreementCode: code.data.code,
		normalizedAgreementCode: code.data.normalizedCode,
		agreementType: parsed.data.agreementType,
		title: parsed.data.title,
		counterpartyPartyId: parsed.data.counterpartyPartyId ?? null,
		counterpartyNameSnapshot,
		effectiveFrom: parsed.data.effectiveFrom,
		effectiveTo: parsed.data.effectiveTo ?? null,
		valueAmount: parsed.data.valueAmount ?? null,
		currencyCode: parsed.data.currencyCode?.toUpperCase() ?? null,
		documentReference: parsed.data.documentReference ?? null,
		status: "active",
		createIdempotencyKey: parsed.data.idempotencyKey,
		createdBy: parsed.data.actorUserId,
		updatedBy: parsed.data.actorUserId,
	});
}

export async function getMaterialAgreement(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaMaterialAgreement>> {
	const parsed = getMaterialAgreementInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid material agreement get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_MATERIAL_AGREEMENT_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getMaterialAgreementById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data) return fail("NOT_FOUND", "Material agreement not found");
	return ok(row.data);
}

export async function listMaterialAgreements(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaMaterialAgreement[]>> {
	const parsed = listMaterialAgreementsInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid material agreement list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_MATERIAL_AGREEMENT_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listMaterialAgreements(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
}
