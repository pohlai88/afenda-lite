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
	CA_COMMAND_CHARGE_CREATE,
	CA_COMMAND_CORPORATE_ASSET_CREATE,
	CA_COMMAND_INSURANCE_POLICY_CREATE,
	CA_COMMAND_INTELLECTUAL_PROPERTY_RIGHT_CREATE,
	CA_COMMAND_PROPERTY_HOLDING_CREATE,
	CA_QUERY_CHARGE_GET,
	CA_QUERY_CHARGE_LIST,
	CA_QUERY_CORPORATE_ASSET_GET,
	CA_QUERY_CORPORATE_ASSET_LIST,
	CA_QUERY_INSURANCE_POLICY_GET,
	CA_QUERY_INSURANCE_POLICY_LIST,
	CA_QUERY_INTELLECTUAL_PROPERTY_RIGHT_GET,
	CA_QUERY_INTELLECTUAL_PROPERTY_RIGHT_LIST,
	CA_QUERY_PROPERTY_HOLDING_GET,
	CA_QUERY_PROPERTY_HOLDING_LIST,
} from "./module-ids";
import { normalizeCompanyCode } from "./shared/code";
import {
	normalizeEntityCode,
	requireLegalCompany,
	resolvePartySnapshot,
} from "./slice-helpers";
import type {
	CaCharge,
	CaCorporateAsset,
	CaInsurancePolicy,
	CaIntellectualPropertyRight,
	CaPropertyHolding,
} from "./slice-types";
import {
	createChargeInputSchema,
	createCorporateAssetInputSchema,
	createInsurancePolicyInputSchema,
	createIntellectualPropertyRightInputSchema,
	createPropertyHoldingInputSchema,
	getChargeInputSchema,
	getCorporateAssetInputSchema,
	getInsurancePolicyInputSchema,
	getIntellectualPropertyRightInputSchema,
	getPropertyHoldingInputSchema,
	listChargesInputSchema,
	listCorporateAssetsInputSchema,
	listInsurancePoliciesInputSchema,
	listIntellectualPropertyRightsInputSchema,
	listPropertyHoldingsInputSchema,
} from "./slice-types";

export async function createPropertyHolding(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaPropertyHolding>> {
	const parsed = createPropertyHoldingInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid property holding create input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_PROPERTY_HOLDING_CREATE,
	});
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await store.getPropertyHoldingByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	if (existing.data) return ok(existing.data);
	const code = normalizeCompanyCode(parsed.data.code);
	if (!code.ok) return code;
	return store.createPropertyHolding({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		code: code.data.code,
		normalizedCode: code.data.normalizedCode,
		propertyType: parsed.data.propertyType,
		titleReference: parsed.data.titleReference,
		ownershipPercentage: parsed.data.ownershipPercentage,
		acquiredDate: parsed.data.acquiredDate ?? null,
		disposedDate: null,
		tenureType: parsed.data.tenureType ?? null,
		status: "active",
		createIdempotencyKey: parsed.data.idempotencyKey,
		createdBy: parsed.data.actorUserId,
		updatedBy: parsed.data.actorUserId,
	});
}

export async function getPropertyHolding(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaPropertyHolding>> {
	const parsed = getPropertyHoldingInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid property holding get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_PROPERTY_HOLDING_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getPropertyHoldingById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data) return fail("NOT_FOUND", "Property holding not found");
	return ok(row.data);
}

export async function listPropertyHoldings(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaPropertyHolding[]>> {
	const parsed = listPropertyHoldingsInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid property holding list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_PROPERTY_HOLDING_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listPropertyHoldings(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
}

export async function createCorporateAsset(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCorporateAsset>> {
	const parsed = createCorporateAssetInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid corporate asset create input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_CORPORATE_ASSET_CREATE,
	});
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await store.getCorporateAssetByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	if (existing.data) return ok(existing.data);
	const code = normalizeCompanyCode(parsed.data.code);
	if (!code.ok) return code;
	return store.createCorporateAsset({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		code: code.data.code,
		normalizedCode: code.data.normalizedCode,
		assetCategory: parsed.data.assetCategory,
		identifier: parsed.data.identifier ?? null,
		description: parsed.data.description,
		acquiredDate: parsed.data.acquiredDate ?? null,
		disposedDate: null,
		status: "active",
		createIdempotencyKey: parsed.data.idempotencyKey,
		createdBy: parsed.data.actorUserId,
		updatedBy: parsed.data.actorUserId,
	});
}

export async function getCorporateAsset(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCorporateAsset>> {
	const parsed = getCorporateAssetInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid corporate asset get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_CORPORATE_ASSET_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getCorporateAssetById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data) return fail("NOT_FOUND", "Corporate asset not found");
	return ok(row.data);
}

export async function listCorporateAssets(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCorporateAsset[]>> {
	const parsed = listCorporateAssetsInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid corporate asset list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_CORPORATE_ASSET_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listCorporateAssets(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
}

export async function createIntellectualPropertyRight(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaIntellectualPropertyRight>> {
	const parsed = createIntellectualPropertyRightInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail(
			"BAD_REQUEST",
			"Invalid intellectual property right create input",
			{
				issues: parsed.error.issues,
			},
		);
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_INTELLECTUAL_PROPERTY_RIGHT_CREATE,
	});
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await store.getIntellectualPropertyRightByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	if (existing.data) return ok(existing.data);
	const code = normalizeCompanyCode(parsed.data.code);
	if (!code.ok) return code;
	return store.createIntellectualPropertyRight({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		code: code.data.code,
		normalizedCode: code.data.normalizedCode,
		rightType: parsed.data.rightType,
		jurisdictionCode: parsed.data.jurisdictionCode ?? null,
		registrationNumber: parsed.data.registrationNumber ?? null,
		ownerPartyId: parsed.data.ownerPartyId ?? null,
		filingDate: parsed.data.filingDate ?? null,
		grantDate: parsed.data.grantDate ?? null,
		expiryDate: parsed.data.expiryDate ?? null,
		status: "pending",
		createIdempotencyKey: parsed.data.idempotencyKey,
		createdBy: parsed.data.actorUserId,
		updatedBy: parsed.data.actorUserId,
	});
}

export async function getIntellectualPropertyRight(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaIntellectualPropertyRight>> {
	const parsed = getIntellectualPropertyRightInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail(
			"BAD_REQUEST",
			"Invalid intellectual property right get input",
			{
				issues: parsed.error.issues,
			},
		);
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_INTELLECTUAL_PROPERTY_RIGHT_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getIntellectualPropertyRightById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data)
		return fail("NOT_FOUND", "Intellectual property right not found");
	return ok(row.data);
}

export async function listIntellectualPropertyRights(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaIntellectualPropertyRight[]>> {
	const parsed = listIntellectualPropertyRightsInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail(
			"BAD_REQUEST",
			"Invalid intellectual property right list input",
			{
				issues: parsed.error.issues,
			},
		);
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_INTELLECTUAL_PROPERTY_RIGHT_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listIntellectualPropertyRights(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
}

export async function createInsurancePolicy(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaInsurancePolicy>> {
	const parsed = createInsurancePolicyInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid insurance policy create input", {
			issues: parsed.error.issues,
		});
	}
	const { store, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_INSURANCE_POLICY_CREATE,
	});
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await store.getInsurancePolicyByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	if (existing.data) return ok(existing.data);
	const normalized = normalizeEntityCode(parsed.data.policyNumber);
	let insurerPartyNameSnapshot: string | null = null;
	if (parsed.data.insurerPartyId) {
		const party = await resolvePartySnapshot(masters, {
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			partyId: parsed.data.insurerPartyId,
		});
		if (!party.ok) return party;
		insurerPartyNameSnapshot = party.data.partyNameSnapshot;
	}
	return store.createInsurancePolicy({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		policyNumber: normalized.code,
		normalizedPolicyNumber: normalized.normalizedCode,
		insurerPartyId: parsed.data.insurerPartyId ?? null,
		insurerPartyNameSnapshot,
		coveredSubject: parsed.data.coveredSubject,
		effectiveFrom: parsed.data.effectiveFrom,
		effectiveTo: parsed.data.effectiveTo ?? null,
		limitAmount: parsed.data.limitAmount ?? null,
		currencyCode: parsed.data.currencyCode?.toUpperCase() ?? null,
		status: "active",
		createIdempotencyKey: parsed.data.idempotencyKey,
		createdBy: parsed.data.actorUserId,
		updatedBy: parsed.data.actorUserId,
	});
}

export async function getInsurancePolicy(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaInsurancePolicy>> {
	const parsed = getInsurancePolicyInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid insurance policy get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_INSURANCE_POLICY_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getInsurancePolicyById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data) return fail("NOT_FOUND", "Insurance policy not found");
	return ok(row.data);
}

export async function listInsurancePolicies(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaInsurancePolicy[]>> {
	const parsed = listInsurancePoliciesInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid insurance policy list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_INSURANCE_POLICY_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listInsurancePolicies(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
}

export async function createCharge(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCharge>> {
	const parsed = createChargeInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid charge create input", {
			issues: parsed.error.issues,
		});
	}
	const { store, masters, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_CHARGE_CREATE,
	});
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await store.getChargeByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	if (existing.data) return ok(existing.data);
	const code = normalizeCompanyCode(parsed.data.code);
	if (!code.ok) return code;
	let securedPartyNameSnapshot: string | null = null;
	if (parsed.data.securedPartyId) {
		const party = await resolvePartySnapshot(masters, {
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			partyId: parsed.data.securedPartyId,
		});
		if (!party.ok) return party;
		securedPartyNameSnapshot = party.data.partyNameSnapshot;
	}
	return store.createCharge({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		code: code.data.code,
		normalizedCode: code.data.normalizedCode,
		chargeType: parsed.data.chargeType,
		securedPartyId: parsed.data.securedPartyId ?? null,
		securedPartyNameSnapshot,
		affectedSubjectReference: parsed.data.affectedSubjectReference,
		amount: parsed.data.amount ?? null,
		currencyCode: parsed.data.currencyCode?.toUpperCase() ?? null,
		createdDate: parsed.data.createdDate,
		releasedDate: null,
		status: "active",
		createIdempotencyKey: parsed.data.idempotencyKey,
		createdBy: parsed.data.actorUserId,
		updatedBy: parsed.data.actorUserId,
	});
}

export async function getCharge(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCharge>> {
	const parsed = getChargeInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid charge get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_CHARGE_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getChargeById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data) return fail("NOT_FOUND", "Charge not found");
	return ok(row.data);
}

export async function listCharges(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCharge[]>> {
	const parsed = listChargesInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid charge list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_CHARGE_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listCharges(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
}
