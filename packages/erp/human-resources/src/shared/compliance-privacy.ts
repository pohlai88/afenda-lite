import { createHash } from "node:crypto";

import type {
	EmployeeDocument,
	EmployeeDocumentListItem,
	EmployeeDocumentSensitiveDetail,
} from "../types";

export function normalizeDocumentIdentifier(value: string): string {
	return value.replace(/\s+/g, "").toUpperCase();
}

export function fingerprintDocumentIdentifier(value: string): string {
	const normalized = normalizeDocumentIdentifier(value);
	return createHash("sha256").update(normalized).digest("hex");
}

export function last4DocumentIdentifier(value: string): string {
	const normalized = normalizeDocumentIdentifier(value);
	return normalized.slice(-4);
}

export function toEmployeeDocumentListItem(
	document: EmployeeDocument,
): EmployeeDocumentListItem {
	return {
		id: document.id,
		organizationId: document.organizationId,
		employeeId: document.employeeId,
		requirementId: document.requirementId,
		documentType: document.documentType,
		issuingJurisdiction: document.issuingJurisdiction,
		issuedOn: document.issuedOn,
		expiresOn: document.expiresOn,
		verificationStatus: document.verificationStatus,
		verifiedAt: document.verifiedAt,
		version: document.version,
		createdAt: document.createdAt,
		updatedAt: document.updatedAt,
	};
}

export function toEmployeeDocumentSensitiveDetail(
	document: EmployeeDocument,
): EmployeeDocumentSensitiveDetail {
	return {
		...toEmployeeDocumentListItem(document),
		identifierLast4: document.identifierLast4,
		documentRef: document.documentRef,
		metadata: document.metadata,
		rejectionReason: document.rejectionReason,
		verifiedBy: document.verifiedBy,
	};
}
