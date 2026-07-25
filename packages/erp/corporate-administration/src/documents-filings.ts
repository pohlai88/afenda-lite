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
	CA_COMMAND_CORPORATE_DOCUMENT_CREATE,
	CA_COMMAND_FILING_OBLIGATION_CREATE,
	CA_COMMAND_FILING_SUBMISSION_CREATE,
	CA_QUERY_CORPORATE_DOCUMENT_GET,
	CA_QUERY_CORPORATE_DOCUMENT_LIST,
	CA_QUERY_FILING_OBLIGATION_GET,
	CA_QUERY_FILING_OBLIGATION_LIST,
	CA_QUERY_FILING_SUBMISSION_GET,
	CA_QUERY_FILING_SUBMISSION_LIST,
} from "./module-ids";
import { normalizeCompanyCode } from "./shared/code";
import { requireLegalCompany } from "./slice-helpers";
import type {
	CaCorporateDocument,
	CaFilingObligation,
	CaFilingSubmission,
} from "./slice-types";
import {
	createCorporateDocumentInputSchema,
	createFilingObligationInputSchema,
	createFilingSubmissionInputSchema,
	getCorporateDocumentInputSchema,
	getFilingObligationInputSchema,
	getFilingSubmissionInputSchema,
	listCorporateDocumentsInputSchema,
	listFilingObligationsInputSchema,
	listFilingSubmissionsInputSchema,
} from "./slice-types";

export async function createCorporateDocument(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCorporateDocument>> {
	const parsed = createCorporateDocumentInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid corporate document create input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_CORPORATE_DOCUMENT_CREATE,
	});
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await store.getCorporateDocumentByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	if (existing.data) return ok(existing.data);
	const code = normalizeCompanyCode(parsed.data.documentCode);
	if (!code.ok) return code;
	return store.createCorporateDocument({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		documentCode: code.data.code,
		normalizedDocumentCode: code.data.normalizedCode,
		documentType: parsed.data.documentType,
		title: parsed.data.title,
		externalReference: parsed.data.externalReference,
		checksum: parsed.data.checksum ?? null,
		classification: parsed.data.classification ?? null,
		effectiveDate: parsed.data.effectiveDate ?? null,
		expiryDate: parsed.data.expiryDate ?? null,
		supersedesId: null,
		createIdempotencyKey: parsed.data.idempotencyKey,
		createdBy: parsed.data.actorUserId,
		updatedBy: parsed.data.actorUserId,
	});
}

export async function getCorporateDocument(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCorporateDocument>> {
	const parsed = getCorporateDocumentInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid corporate document get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_CORPORATE_DOCUMENT_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getCorporateDocumentById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data) return fail("NOT_FOUND", "Corporate document not found");
	return ok(row.data);
}

export async function listCorporateDocuments(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaCorporateDocument[]>> {
	const parsed = listCorporateDocumentsInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid corporate document list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_CORPORATE_DOCUMENT_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listCorporateDocuments(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
}

export async function createFilingObligation(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaFilingObligation>> {
	const parsed = createFilingObligationInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid filing obligation create input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_FILING_OBLIGATION_CREATE,
	});
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await store.getFilingObligationByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	if (existing.data) return ok(existing.data);
	const code = normalizeCompanyCode(parsed.data.obligationCode);
	if (!code.ok) return code;
	return store.createFilingObligation({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		obligationCode: code.data.code,
		normalizedObligationCode: code.data.normalizedCode,
		filingType: parsed.data.filingType,
		jurisdictionCode: parsed.data.jurisdictionCode ?? null,
		authorityName: parsed.data.authorityName,
		periodLabel: parsed.data.periodLabel,
		dueDate: parsed.data.dueDate,
		extensionDate: null,
		status: "pending",
		createIdempotencyKey: parsed.data.idempotencyKey,
		createdBy: parsed.data.actorUserId,
		updatedBy: parsed.data.actorUserId,
	});
}

export async function getFilingObligation(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaFilingObligation>> {
	const parsed = getFilingObligationInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid filing obligation get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_FILING_OBLIGATION_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getFilingObligationById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data) return fail("NOT_FOUND", "Filing obligation not found");
	return ok(row.data);
}

export async function listFilingObligations(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaFilingObligation[]>> {
	const parsed = listFilingObligationsInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid filing obligation list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_FILING_OBLIGATION_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listFilingObligations(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
}

export async function createFilingSubmission(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaFilingSubmission>> {
	const parsed = createFilingSubmissionInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid filing submission create input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: CA_COMMAND_FILING_SUBMISSION_CREATE,
	});
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await store.getFilingSubmissionByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	if (existing.data) return ok(existing.data);
	return store.createFilingSubmission({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		filingObligationId: parsed.data.filingObligationId,
		submissionReference: parsed.data.submissionReference,
		submittedAt: new Date(parsed.data.submittedAt),
		status: parsed.data.status,
		acknowledgementReference: parsed.data.acknowledgementReference ?? null,
		rejectionReason: parsed.data.rejectionReason ?? null,
		evidenceReference: parsed.data.evidenceReference ?? null,
		createIdempotencyKey: parsed.data.idempotencyKey,
		createdBy: parsed.data.actorUserId,
	});
}

export async function getFilingSubmission(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaFilingSubmission>> {
	const parsed = getFilingSubmissionInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid filing submission get input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_FILING_SUBMISSION_GET,
	});
	if (!authorized.ok) return authorized;
	const row = await store.getFilingSubmissionById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!row.ok) return row;
	if (!row.data) return fail("NOT_FOUND", "Filing submission not found");
	return ok(row.data);
}

export async function listFilingSubmissions(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaFilingSubmission[]>> {
	const parsed = listFilingSubmissionsInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid filing submission list input", {
			issues: parsed.error.issues,
		});
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireCaQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: CA_QUERY_FILING_SUBMISSION_LIST,
	});
	if (!authorized.ok) return authorized;
	return store.listFilingSubmissions(
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
}
