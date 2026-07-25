import type {
	CaCompanyIdentifier,
	CaCompanyName,
	CaLegalCompany,
} from "../company/types";
import type { CorporateAdministrationMutationReceipt } from "../store/company-store";

export function toLegalCompanyMutationReceipt(
	company: CaLegalCompany,
): CorporateAdministrationMutationReceipt<CaLegalCompany> {
	return {
		organizationId: company.organizationId,
		operationId: company.id,
		idempotencyKey: company.createIdempotencyKey,
		requestFingerprint: company.createRequestFingerprint,
		result: company,
		createdAt: company.createdAt,
	};
}

export function toCompanyNameMutationReceipt(
	name: CaCompanyName,
): CorporateAdministrationMutationReceipt<CaCompanyName> {
	return {
		organizationId: name.organizationId,
		operationId: name.id,
		idempotencyKey: name.idempotencyKey,
		requestFingerprint: name.requestFingerprint,
		result: name,
		createdAt: name.createdAt,
	};
}

export function toCompanyIdentifierMutationReceipt(
	identifier: CaCompanyIdentifier,
): CorporateAdministrationMutationReceipt<CaCompanyIdentifier> {
	return {
		organizationId: identifier.organizationId,
		operationId: identifier.id,
		idempotencyKey: identifier.idempotencyKey,
		requestFingerprint: identifier.requestFingerprint,
		result: identifier,
		createdAt: identifier.createdAt,
	};
}
