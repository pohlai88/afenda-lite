import { fail, ok, type Result } from "@afenda/errors/result";
import {
	CA_BENEFICIAL_OWNER_CHANGED_EVENT,
	CA_SHARE_TRANSACTION_POSTED_EVENT,
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
	CA_COMMAND_BENEFICIAL_OWNER_DISCLOSURE_CREATE,
	CA_COMMAND_SHARE_CERTIFICATE_CREATE,
	CA_COMMAND_SHARE_CLASS_CREATE,
	CA_COMMAND_SHARE_TRANSACTION_CREATE,
	CA_QUERY_BENEFICIAL_OWNER_DISCLOSURE_GET,
	CA_QUERY_BENEFICIAL_OWNER_DISCLOSURE_LIST,
	CA_QUERY_BENEFICIAL_OWNER_DISCLOSURE_LIST_AS_OF,
	CA_QUERY_SHARE_CERTIFICATE_GET,
	CA_QUERY_SHARE_CERTIFICATE_LIST,
	CA_QUERY_SHARE_CLASS_GET,
	CA_QUERY_SHARE_CLASS_LIST,
	CA_QUERY_SHARE_HOLDING_GET_AS_OF,
	CA_QUERY_SHARE_HOLDING_LIST_AS_OF,
	CA_QUERY_SHARE_TRANSACTION_GET,
	CA_QUERY_SHARE_TRANSACTION_LIST,
} from "./module-ids";
import { normalizeCompanyCode } from "./shared/code";
import { requireLegalCompany, resolvePartySnapshot } from "./slice-helpers";
import type {
	CaBeneficialOwnerDisclosure,
	CaShareCertificate,
	CaShareClass,
	CaShareHolding,
	CaShareTransaction,
	CaShareTransactionDetail,
} from "./slice-types";
import {
	createBeneficialOwnerDisclosureInputSchema,
	createShareCertificateInputSchema,
	createShareClassInputSchema,
	createShareTransactionInputSchema,
	getBeneficialOwnerDisclosureInputSchema,
	getShareCertificateInputSchema,
	getShareClassInputSchema,
	getShareHoldingAsOfInputSchema,
	getShareTransactionInputSchema,
	listBeneficialOwnerDisclosuresAsOfInputSchema,
	listBeneficialOwnerDisclosuresInputSchema,
	listShareCertificatesInputSchema,
	listShareClassesInputSchema,
	listShareHoldingsAsOfInputSchema,
	listShareTransactionsInputSchema,
} from "./slice-types";

export async function createShareClass(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaShareClass>> {
	const parsed = createShareClassInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid share class create input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization, ports } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_SHARE_CLASS_CREATE,
	});
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await store.getShareClassByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	if (existing.data) return ok(existing.data);
	const code = normalizeCompanyCode(parsed.data.code);
	if (!code.ok) return code;
	return store.createShareClass(
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			code: code.data.code,
			normalizedCode: code.data.normalizedCode,
			classType: parsed.data.classType,
			currencyCode: parsed.data.currencyCode.toUpperCase(),
			parValue: parsed.data.parValue,
			authorizedQuantity: parsed.data.authorizedQuantity,
			status: "active",
			createIdempotencyKey: parsed.data.idempotencyKey,
			createdBy: parsed.data.actorUserId,
			updatedBy: parsed.data.actorUserId,
		},
		{
			ports,
			meta: {
				correlationId: parsed.data.correlationId,
				eventType: CA_SHARE_TRANSACTION_POSTED_EVENT,
			},
		},
	);
}

export async function getShareClass(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaShareClass>> {
	const parsed = getShareClassInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid share class get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_SHARE_CLASS_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getShareClassById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data) return fail("NOT_FOUND", "Share class not found");
	return ok(row.data);
}

export async function listShareClasses(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaShareClass[]>> {
	const parsed = listShareClassesInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid share class list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_SHARE_CLASS_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listShareClasses(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
}

export async function createShareTransaction(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaShareTransactionDetail>> {
	const parsed = createShareTransactionInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid share transaction create input", {
			issues: parsed.error.issues,
		});
	}
	const { store, masters, authorization, ports } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_SHARE_TRANSACTION_CREATE,
	});
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await store.getShareTransactionByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	if (existing.data) {
		const detail = await store.getShareTransactionById(
			parsed.data.organizationId,
			existing.data.id,
		);
		if (!detail.ok) return detail;
		if (!detail.data) {
			return fail("NOT_FOUND", "Share transaction not found");
		}
		return ok(detail.data);
	}
	const legs = [];
	for (const leg of parsed.data.legs) {
		const party = await resolvePartySnapshot(masters, {
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			partyId: leg.holderPartyId,
		});
		if (!party.ok) return party;
		legs.push({
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			shareClassId: parsed.data.shareClassId,
			holderPartyId: leg.holderPartyId,
			holderPartyCodeSnapshot: party.data.partyCodeSnapshot,
			holderPartyNameSnapshot: party.data.partyNameSnapshot,
			quantityDelta: leg.quantityDelta,
		});
	}
	return store.createShareTransaction(
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			shareClassId: parsed.data.shareClassId,
			transactionReference: parsed.data.transactionReference,
			transactionType: parsed.data.transactionType,
			transactionDate: parsed.data.transactionDate,
			status: "posted",
			reversalOfId: null,
			createIdempotencyKey: parsed.data.idempotencyKey,
			createdBy: parsed.data.actorUserId,
		},
		legs,
		{
			ports,
			meta: {
				correlationId: parsed.data.correlationId,
				eventType: CA_SHARE_TRANSACTION_POSTED_EVENT,
			},
		},
	);
}

export async function getShareTransaction(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaShareTransactionDetail>> {
	const parsed = getShareTransactionInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid share transaction get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_SHARE_TRANSACTION_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getShareTransactionById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data) return fail("NOT_FOUND", "Share transaction not found");
	return ok(row.data);
}

export async function listShareTransactions(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaShareTransaction[]>> {
	const parsed = listShareTransactionsInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid share transaction list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_SHARE_TRANSACTION_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listShareTransactions(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
}

export async function createShareCertificate(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaShareCertificate>> {
	const parsed = createShareCertificateInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid share certificate create input", {
			issues: parsed.error.issues,
		});
	}
	const { store, masters, authorization, ports } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_SHARE_CERTIFICATE_CREATE,
	});
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await store.getShareCertificateByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	if (existing.data) return ok(existing.data);
	const number = normalizeCompanyCode(parsed.data.certificateNumber);
	if (!number.ok) return number;
	const party = await resolvePartySnapshot(masters, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		partyId: parsed.data.holderPartyId,
	});
	if (!party.ok) return party;
	return store.createShareCertificate(
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			shareClassId: parsed.data.shareClassId,
			shareTransactionId: parsed.data.shareTransactionId ?? null,
			certificateNumber: number.data.code,
			normalizedCertificateNumber: number.data.normalizedCode,
			holderPartyId: parsed.data.holderPartyId,
			holderPartyCodeSnapshot: party.data.partyCodeSnapshot,
			holderPartyNameSnapshot: party.data.partyNameSnapshot,
			issuedDate: parsed.data.issuedDate,
			status: "active",
			createIdempotencyKey: parsed.data.idempotencyKey,
			createdBy: parsed.data.actorUserId,
			updatedBy: parsed.data.actorUserId,
		},
		{
			ports,
			meta: {
				correlationId: parsed.data.correlationId,
				eventType: CA_SHARE_TRANSACTION_POSTED_EVENT,
			},
		},
	);
}

export async function getShareCertificate(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaShareCertificate>> {
	const parsed = getShareCertificateInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid share certificate get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_SHARE_CERTIFICATE_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getShareCertificateById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data) return fail("NOT_FOUND", "Share certificate not found");
	return ok(row.data);
}

export async function listShareCertificates(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaShareCertificate[]>> {
	const parsed = listShareCertificatesInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid share certificate list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_SHARE_CERTIFICATE_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listShareCertificates(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
}

export async function createBeneficialOwnerDisclosure(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaBeneficialOwnerDisclosure>> {
	const parsed = createBeneficialOwnerDisclosureInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail(
			"BAD_REQUEST",
			"Invalid beneficial owner disclosure create input",
			{
				issues: parsed.error.issues,
			},
		);
	}
	const { store, masters, authorization, ports } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_BENEFICIAL_OWNER_DISCLOSURE_CREATE,
	});
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await store.getBeneficialOwnerDisclosureByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	if (existing.data) return ok(existing.data);
	const party = await resolvePartySnapshot(masters, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		partyId: parsed.data.partyId,
	});
	if (!party.ok) return party;
	return store.createBeneficialOwnerDisclosure(
		{
			organizationId: parsed.data.organizationId,
			legalCompanyId: parsed.data.legalCompanyId,
			partyId: parsed.data.partyId,
			partyCodeSnapshot: party.data.partyCodeSnapshot,
			partyNameSnapshot: party.data.partyNameSnapshot,
			natureOfControlCodes: parsed.data.natureOfControlCodes,
			effectiveFrom: parsed.data.effectiveFrom,
			effectiveTo: null,
			verificationStatus: "pending",
			evidenceReference: parsed.data.evidenceReference ?? null,
			createIdempotencyKey: parsed.data.idempotencyKey,
			createdBy: parsed.data.actorUserId,
			updatedBy: parsed.data.actorUserId,
		},
		{
			ports,
			meta: {
				correlationId: parsed.data.correlationId,
				eventType: CA_BENEFICIAL_OWNER_CHANGED_EVENT,
			},
		},
	);
}

export async function getBeneficialOwnerDisclosure(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaBeneficialOwnerDisclosure>> {
	const parsed = getBeneficialOwnerDisclosureInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail(
			"BAD_REQUEST",
			"Invalid beneficial owner disclosure get input",
			{
				issues: parsed.error.issues,
			},
		);
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_BENEFICIAL_OWNER_DISCLOSURE_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getBeneficialOwnerDisclosureById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data)
		return fail("NOT_FOUND", "Beneficial owner disclosure not found");
	return ok(row.data);
}

export async function listBeneficialOwnerDisclosures(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaBeneficialOwnerDisclosure[]>> {
	const parsed = listBeneficialOwnerDisclosuresInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail(
			"BAD_REQUEST",
			"Invalid beneficial owner disclosure list input",
			{
				issues: parsed.error.issues,
			},
		);
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_BENEFICIAL_OWNER_DISCLOSURE_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listBeneficialOwnerDisclosures(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
}

export async function listShareHoldingsAsOf(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaShareHolding[]>> {
	const parsed = listShareHoldingsAsOfInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid share holdings as-of input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_SHARE_HOLDING_LIST_AS_OF,
	});
	if (!authorized.ok) return authorized;
	return store.listShareHoldingsAsOf(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
		parsed.data.asOf,
		parsed.data.shareClassId,
	);
}

export async function getShareHoldingAsOf(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaShareHolding>> {
	const parsed = getShareHoldingAsOfInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid share holding as-of input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_SHARE_HOLDING_GET_AS_OF,
	});
	if (!authorized.ok) return authorized;
	const holdings = await store.listShareHoldingsAsOf(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
		parsed.data.asOf,
		parsed.data.shareClassId,
	);
	if (!holdings.ok) return holdings;
	const match = holdings.data.find(
		(row) => row.holderPartyId === parsed.data.holderPartyId,
	);
	if (!match) {
		return fail("NOT_FOUND", "Share holding not found for as-of date");
	}
	return ok(match);
}

export async function listBeneficialOwnerDisclosuresAsOf(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaBeneficialOwnerDisclosure[]>> {
	const parsed = listBeneficialOwnerDisclosuresAsOfInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail(
			"BAD_REQUEST",
			"Invalid beneficial owner disclosure as-of list input",
			{ issues: parsed.error.issues },
		);
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_BENEFICIAL_OWNER_DISCLOSURE_LIST_AS_OF,
	});
	if (!authorized.ok) return authorized;
	return store.listBeneficialOwnerDisclosuresAsOf(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
		parsed.data.asOf,
	);
}
