import { fail, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	humanResourcesErrorDetails,
} from "../error-codes";
import type {
	DocumentRequirementStatus,
	EmployeeDocumentVerificationStatus,
	PolicyAcknowledgementStatus,
	WorkEligibilityStatus,
} from "./compliance-status";

export function assertValidDocumentDateRange(input: {
	issuedOn: string;
	expiresOn: string | null;
}): Result<void> {
	if (input.expiresOn !== null && input.expiresOn < input.issuedOn) {
		return fail(
			"VALIDATION_ERROR",
			"Expiry date cannot precede issue date.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return { ok: true, data: undefined };
}

export function assertRejectionReasonProvided(
	reason: string | null | undefined,
): Result<void> {
	const trimmed = reason?.trim() ?? "";
	if (trimmed.length === 0) {
		return fail(
			"VALIDATION_ERROR",
			"Rejection reason is required.",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return { ok: true, data: undefined };
}

export function assertDocumentRequirementStatusTransition(
	from: DocumentRequirementStatus,
	to: DocumentRequirementStatus,
): Result<void> {
	const allowed: Record<
		DocumentRequirementStatus,
		DocumentRequirementStatus[]
	> = {
		draft: ["published", "retired"],
		published: ["retired"],
		retired: [],
	};
	if (!allowed[from].includes(to)) {
		return fail(
			"CONFLICT",
			`Cannot transition document requirement from ${from} to ${to}.`,
			humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			),
		);
	}
	return { ok: true, data: undefined };
}

export function assertEmployeeDocumentVerificationTransition(
	from: EmployeeDocumentVerificationStatus,
	to: EmployeeDocumentVerificationStatus,
): Result<void> {
	const allowed: Record<
		EmployeeDocumentVerificationStatus,
		EmployeeDocumentVerificationStatus[]
	> = {
		pending: ["verified", "rejected", "expired"],
		verified: ["revoked", "expired"],
		rejected: ["pending"],
		revoked: ["pending", "verified"],
		expired: [],
	};
	if (!allowed[from].includes(to)) {
		return fail(
			"CONFLICT",
			`Cannot transition employee document from ${from} to ${to}.`,
			humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			),
		);
	}
	return { ok: true, data: undefined };
}

export function assertWorkEligibilityStatusTransition(
	from: WorkEligibilityStatus,
	to: WorkEligibilityStatus,
): Result<void> {
	const allowed: Record<WorkEligibilityStatus, WorkEligibilityStatus[]> = {
		pending: ["active", "closed"],
		active: ["suspended", "expired", "closed"],
		suspended: ["active", "expired", "closed"],
		expired: ["closed"],
		closed: [],
	};
	if (!allowed[from].includes(to)) {
		return fail(
			"CONFLICT",
			`Cannot transition work eligibility from ${from} to ${to}.`,
			humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			),
		);
	}
	return { ok: true, data: undefined };
}

export function assertPolicyAcknowledgementStatusTransition(
	from: PolicyAcknowledgementStatus,
	to: PolicyAcknowledgementStatus,
): Result<void> {
	const allowed: Record<
		PolicyAcknowledgementStatus,
		PolicyAcknowledgementStatus[]
	> = {
		outstanding: ["acknowledged", "revoked", "superseded"],
		acknowledged: ["revoked", "superseded"],
		revoked: [],
		superseded: [],
	};
	if (!allowed[from].includes(to)) {
		return fail(
			"CONFLICT",
			`Cannot transition policy acknowledgement from ${from} to ${to}.`,
			humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
			),
		);
	}
	return { ok: true, data: undefined };
}

export const COMPLIANCE_NEARING_EXPIRY_DAYS = 30;

export function isNearingExpiry(input: {
	expiresOn: string | null;
	asOf: string;
}): boolean {
	if (input.expiresOn === null) {
		return false;
	}
	const asOfDate = new Date(`${input.asOf}T00:00:00.000Z`);
	const expiresDate = new Date(`${input.expiresOn}T00:00:00.000Z`);
	const diffMs = expiresDate.getTime() - asOfDate.getTime();
	const diffDays = diffMs / (1000 * 60 * 60 * 24);
	return diffDays >= 0 && diffDays <= COMPLIANCE_NEARING_EXPIRY_DAYS;
}
