import { fail, ok, type Result } from "@afenda/errors/result";
import {
	CA_BENEFICIAL_OWNER_CHANGED_EVENT,
	CA_SHARE_TRANSACTION_POSTED_EVENT,
	CA_SHARE_TRANSACTION_REVERSED_EVENT,
} from "@afenda/events/schemas";

import { requireCaCommandPermission } from "./authorization";
import {
	type CorporateAdministrationCommandOptions,
	resolveCommandDeps,
} from "./command-options";
import {
	CA_ERROR_IDEMPOTENCY_CONFLICT,
	CA_ERROR_SHARE_CERTIFICATE_CONFLICT,
	CA_ERROR_SHARE_CLASS_CLOSED,
	CA_ERROR_VERSION_CONFLICT,
	caErrorDetails,
} from "./error-codes";
import {
	CA_COMMAND_BENEFICIAL_OWNER_DISCLOSURE_END,
	CA_COMMAND_BENEFICIAL_OWNER_DISCLOSURE_UPDATE,
	CA_COMMAND_SHARE_CERTIFICATE_CANCEL,
	CA_COMMAND_SHARE_CERTIFICATE_REPLACE,
	CA_COMMAND_SHARE_CLASS_CLOSE,
	CA_COMMAND_SHARE_CLASS_UPDATE,
	CA_COMMAND_SHARE_TRANSACTION_REVERSE,
	type CaCommandId,
} from "./module-ids";
import type { ShareCapitalMutationContext } from "./ports";
import { normalizeCompanyCode } from "./shared/code";
import { requireLegalCompany } from "./slice-helpers";
import type {
	CaBeneficialOwnerDisclosure,
	CaShareCertificate,
	CaShareClass,
	CaShareTransactionDetail,
} from "./slice-types";
import {
	cancelShareCertificateInputSchema,
	closeShareClassInputSchema,
	endBeneficialOwnerDisclosureInputSchema,
	replaceShareCertificateInputSchema,
	reverseShareTransactionInputSchema,
	updateBeneficialOwnerDisclosureInputSchema,
	updateShareClassInputSchema,
} from "./slice-types";

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
		return fail("NOT_FOUND", "Share capital record not found");
	}
	return record.version === input.expectedVersion ? ok(record) : stale();
}

function mutationContext(
	input: { organizationId: string; actorUserId: string; correlationId: string },
	eventType: ShareCapitalMutationContext["meta"]["eventType"],
	ports: ShareCapitalMutationContext["ports"],
): ShareCapitalMutationContext {
	return {
		ports,
		meta: { correlationId: input.correlationId, eventType },
	};
}

export async function updateShareClass(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaShareClass>> {
	const parsed = updateShareClassInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid share class update input", {
			issues: parsed.error.issues,
		});
	}
	const { deps, authorized } = await authorize(
		options,
		parsed.data,
		CA_COMMAND_SHARE_CLASS_UPDATE,
	);
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await deps.store.getShareClassById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!existing.ok) return existing;
	const current = requireVersion(existing.data, parsed.data);
	if (!current.ok) return current;
	if (current.data.status === "closed") {
		return fail(
			"CONFLICT",
			"Share class is closed",
			caErrorDetails(CA_ERROR_SHARE_CLASS_CLOSED),
		);
	}
	const updated: CaShareClass = {
		...current.data,
		classType: parsed.data.classType ?? current.data.classType,
		parValue: parsed.data.parValue ?? current.data.parValue,
		authorizedQuantity:
			parsed.data.authorizedQuantity ?? current.data.authorizedQuantity,
		updatedBy: parsed.data.actorUserId,
	};
	return deps.store.updateShareClass(
		updated,
		parsed.data.expectedVersion,
		mutationContext(parsed.data, CA_SHARE_TRANSACTION_POSTED_EVENT, deps.ports),
	);
}

export async function closeShareClass(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaShareClass>> {
	const parsed = closeShareClassInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid share class close input", {
			issues: parsed.error.issues,
		});
	}
	const { deps, authorized } = await authorize(
		options,
		parsed.data,
		CA_COMMAND_SHARE_CLASS_CLOSE,
	);
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await deps.store.getShareClassById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!existing.ok) return existing;
	const current = requireVersion(existing.data, parsed.data);
	if (!current.ok) return current;
	if (current.data.status === "closed") return ok(current.data);
	const closed: CaShareClass = {
		...current.data,
		status: "closed",
		updatedBy: parsed.data.actorUserId,
	};
	return deps.store.closeShareClass(
		closed,
		parsed.data.expectedVersion,
		mutationContext(parsed.data, CA_SHARE_TRANSACTION_POSTED_EVENT, deps.ports),
	);
}

export async function reverseShareTransaction(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaShareTransactionDetail>> {
	const parsed = reverseShareTransactionInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid share transaction reverse input", {
			issues: parsed.error.issues,
		});
	}
	const { deps, authorized } = await authorize(
		options,
		{
			...parsed.data,
			id: parsed.data.shareTransactionId,
			expectedVersion: 1,
			reason: "reverse",
		},
		CA_COMMAND_SHARE_TRANSACTION_REVERSE,
	);
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await deps.store.getShareTransactionByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (!existing.ok) return existing;
	if (existing.data) {
		const detail = await deps.store.getShareTransactionById(
			parsed.data.organizationId,
			existing.data.id,
		);
		if (!detail.ok) return detail;
		if (!detail.data) return fail("NOT_FOUND", "Share transaction not found");
		return ok(detail.data);
	}
	const original = await deps.store.getShareTransactionById(
		parsed.data.organizationId,
		parsed.data.shareTransactionId,
	);
	if (!original.ok) return original;
	if (
		!original.data ||
		original.data.legalCompanyId !== parsed.data.legalCompanyId
	) {
		return fail("NOT_FOUND", "Share transaction not found");
	}
	if (original.data.status !== "posted" || original.data.reversalOfId) {
		return fail("CONFLICT", "Share transaction cannot be reversed");
	}
	return deps.store.reverseShareTransaction({
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		originalTransactionId: parsed.data.shareTransactionId,
		reversalReference: parsed.data.reversalReference,
		reversalDate: parsed.data.reversalDate,
		createIdempotencyKey: parsed.data.idempotencyKey,
		createdBy: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		mutation: mutationContext(
			parsed.data,
			CA_SHARE_TRANSACTION_REVERSED_EVENT,
			deps.ports,
		),
	});
}

export async function replaceShareCertificate(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaShareCertificate>> {
	const parsed = replaceShareCertificateInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid share certificate replace input", {
			issues: parsed.error.issues,
		});
	}
	const { deps, authorized } = await authorize(
		options,
		{
			...parsed.data,
			id: parsed.data.priorCertificateId,
			expectedVersion: 1,
			reason: "replace",
		},
		CA_COMMAND_SHARE_CERTIFICATE_REPLACE,
	);
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await deps.store.getShareCertificateByIdempotencyKey(
		parsed.data.organizationId,
		parsed.data.idempotencyKey,
	);
	if (existing.ok && existing.data) return ok(existing.data);
	const prior = await deps.store.getShareCertificateById(
		parsed.data.organizationId,
		parsed.data.priorCertificateId,
	);
	if (!prior.ok) return prior;
	if (
		!prior.data ||
		prior.data.legalCompanyId !== parsed.data.legalCompanyId ||
		prior.data.status !== "active"
	) {
		return fail("NOT_FOUND", "Share certificate not found");
	}
	const number = normalizeCompanyCode(parsed.data.certificateNumber);
	if (!number.ok) return number;
	const replacement: Omit<
		CaShareCertificate,
		"id" | "version" | "createdAt" | "updatedAt"
	> = {
		organizationId: parsed.data.organizationId,
		legalCompanyId: parsed.data.legalCompanyId,
		shareClassId: prior.data.shareClassId,
		shareTransactionId: prior.data.shareTransactionId,
		certificateNumber: number.data.code,
		normalizedCertificateNumber: number.data.normalizedCode,
		holderPartyId: prior.data.holderPartyId,
		holderPartyCodeSnapshot: prior.data.holderPartyCodeSnapshot,
		holderPartyNameSnapshot: prior.data.holderPartyNameSnapshot,
		issuedDate: parsed.data.issuedDate,
		status: "active",
		createIdempotencyKey: parsed.data.idempotencyKey,
		createdBy: parsed.data.actorUserId,
		updatedBy: parsed.data.actorUserId,
	};
	return deps.store.replaceShareCertificate({
		prior: prior.data,
		replacement,
		mutation: mutationContext(
			parsed.data,
			CA_SHARE_TRANSACTION_POSTED_EVENT,
			deps.ports,
		),
	});
}

export async function cancelShareCertificate(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaShareCertificate>> {
	const parsed = cancelShareCertificateInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid share certificate cancel input", {
			issues: parsed.error.issues,
		});
	}
	const { deps, authorized } = await authorize(
		options,
		parsed.data,
		CA_COMMAND_SHARE_CERTIFICATE_CANCEL,
	);
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await deps.store.getShareCertificateById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!existing.ok) return existing;
	const current = requireVersion(existing.data, parsed.data);
	if (!current.ok) return current;
	if (current.data.status !== "active") {
		return fail(
			"CONFLICT",
			"Share certificate is not active",
			caErrorDetails(CA_ERROR_SHARE_CERTIFICATE_CONFLICT),
		);
	}
	const cancelled: CaShareCertificate = {
		...current.data,
		status: "cancelled",
		updatedBy: parsed.data.actorUserId,
	};
	return deps.store.cancelShareCertificate(
		cancelled,
		parsed.data.expectedVersion,
		mutationContext(parsed.data, CA_SHARE_TRANSACTION_POSTED_EVENT, deps.ports),
	);
}

export async function updateBeneficialOwnerDisclosure(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaBeneficialOwnerDisclosure>> {
	const parsed = updateBeneficialOwnerDisclosureInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail(
			"BAD_REQUEST",
			"Invalid beneficial owner disclosure update input",
			{ issues: parsed.error.issues },
		);
	}
	const { deps, authorized } = await authorize(
		options,
		parsed.data,
		CA_COMMAND_BENEFICIAL_OWNER_DISCLOSURE_UPDATE,
	);
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await deps.store.getBeneficialOwnerDisclosureById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!existing.ok) return existing;
	const current = requireVersion(existing.data, parsed.data);
	if (!current.ok) return current;
	const updated: CaBeneficialOwnerDisclosure = {
		...current.data,
		natureOfControlCodes:
			parsed.data.natureOfControlCodes ?? current.data.natureOfControlCodes,
		evidenceReference:
			parsed.data.evidenceReference ?? current.data.evidenceReference,
		verificationStatus:
			parsed.data.verificationStatus ?? current.data.verificationStatus,
		updatedBy: parsed.data.actorUserId,
	};
	return deps.store.updateBeneficialOwnerDisclosure(
		updated,
		parsed.data.expectedVersion,
		mutationContext(parsed.data, CA_BENEFICIAL_OWNER_CHANGED_EVENT, deps.ports),
	);
}

export async function endBeneficialOwnerDisclosure(
	input: unknown,
	options: CorporateAdministrationCommandOptions = {},
): Promise<Result<CaBeneficialOwnerDisclosure>> {
	const parsed = endBeneficialOwnerDisclosureInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail(
			"BAD_REQUEST",
			"Invalid beneficial owner disclosure end input",
			{
				issues: parsed.error.issues,
			},
		);
	}
	const { deps, authorized } = await authorize(
		options,
		parsed.data,
		CA_COMMAND_BENEFICIAL_OWNER_DISCLOSURE_END,
	);
	if (!authorized.ok) return authorized;
	const company = await requireLegalCompany(
		options,
		parsed.data.organizationId,
		parsed.data.legalCompanyId,
	);
	if (!company.ok) return company;
	const existing = await deps.store.getBeneficialOwnerDisclosureById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!existing.ok) return existing;
	const current = requireVersion(existing.data, parsed.data);
	if (!current.ok) return current;
	if (current.data.effectiveTo) {
		return fail("CONFLICT", "Beneficial owner disclosure is already ended");
	}
	if (parsed.data.effectiveTo < current.data.effectiveFrom) {
		return fail("CONFLICT", "Effective end date is before start date");
	}
	const ended: CaBeneficialOwnerDisclosure = {
		...current.data,
		effectiveTo: parsed.data.effectiveTo,
		updatedBy: parsed.data.actorUserId,
	};
	return deps.store.endBeneficialOwnerDisclosure(
		ended,
		parsed.data.expectedVersion,
		mutationContext(parsed.data, CA_BENEFICIAL_OWNER_CHANGED_EVENT, deps.ports),
	);
}
