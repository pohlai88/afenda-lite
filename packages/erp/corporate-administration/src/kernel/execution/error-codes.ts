import {
	type CanonicalErrorCode,
	errorResult,
	type Result,
} from "@afenda/errors";
import { z } from "zod";

export const CORPORATE_ADMINISTRATION_ERROR_CODES = [
	"CORPORATE_ADMINISTRATION_VALIDATION_FAILED",
	"CORPORATE_ADMINISTRATION_NOT_FOUND",
	"CORPORATE_ADMINISTRATION_FORBIDDEN",
	"CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
	"CORPORATE_ADMINISTRATION_REFERENCE_INACTIVE",
	"CORPORATE_ADMINISTRATION_CONFLICT",
	"CORPORATE_ADMINISTRATION_STALE_VERSION",
	"CORPORATE_ADMINISTRATION_IDEMPOTENCY_CONFLICT",
	"CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
	"CORPORATE_ADMINISTRATION_INVALID_TRANSITION",
	"CORPORATE_ADMINISTRATION_CHRONOLOGY_INVALID",
	"CORPORATE_ADMINISTRATION_LEDGER_UNBALANCED",
	"CORPORATE_ADMINISTRATION_INSUFFICIENT_HOLDING",
	"CORPORATE_ADMINISTRATION_GRAPH_CYCLE",
	"CORPORATE_ADMINISTRATION_APPROVAL_REQUIRED",
	"CORPORATE_ADMINISTRATION_APPROVAL_INVALID",
	"CORPORATE_ADMINISTRATION_SEGREGATION_OF_DUTIES",
	"CORPORATE_ADMINISTRATION_SENSITIVE_DATA_REJECTED",
	"CORPORATE_ADMINISTRATION_RULE_PACK_INVALID",
	"CORPORATE_ADMINISTRATION_RECONCILIATION_FAILED",
	"CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
] as const;

export const corporateAdministrationErrorCodeSchema = z.enum(
	CORPORATE_ADMINISTRATION_ERROR_CODES,
);

export type CorporateAdministrationErrorCode = z.infer<
	typeof corporateAdministrationErrorCodeSchema
>;

export const CORPORATE_ADMINISTRATION_RESULT_CODE_BY_REASON = {
	CORPORATE_ADMINISTRATION_VALIDATION_FAILED: "VALIDATION_ERROR",
	CORPORATE_ADMINISTRATION_NOT_FOUND: "NOT_FOUND",
	CORPORATE_ADMINISTRATION_FORBIDDEN: "FORBIDDEN",
	CORPORATE_ADMINISTRATION_REFERENCE_INVALID: "VALIDATION_ERROR",
	CORPORATE_ADMINISTRATION_REFERENCE_INACTIVE: "CONFLICT",
	CORPORATE_ADMINISTRATION_CONFLICT: "CONFLICT",
	CORPORATE_ADMINISTRATION_STALE_VERSION: "CONFLICT",
	CORPORATE_ADMINISTRATION_IDEMPOTENCY_CONFLICT: "CONFLICT",
	CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP: "CONFLICT",
	CORPORATE_ADMINISTRATION_INVALID_TRANSITION: "CONFLICT",
	CORPORATE_ADMINISTRATION_CHRONOLOGY_INVALID: "CONFLICT",
	CORPORATE_ADMINISTRATION_LEDGER_UNBALANCED: "CONFLICT",
	CORPORATE_ADMINISTRATION_INSUFFICIENT_HOLDING: "CONFLICT",
	CORPORATE_ADMINISTRATION_GRAPH_CYCLE: "CONFLICT",
	CORPORATE_ADMINISTRATION_APPROVAL_REQUIRED: "FORBIDDEN",
	CORPORATE_ADMINISTRATION_APPROVAL_INVALID: "FORBIDDEN",
	CORPORATE_ADMINISTRATION_SEGREGATION_OF_DUTIES: "FORBIDDEN",
	CORPORATE_ADMINISTRATION_SENSITIVE_DATA_REJECTED: "VALIDATION_ERROR",
	CORPORATE_ADMINISTRATION_RULE_PACK_INVALID: "VALIDATION_ERROR",
	CORPORATE_ADMINISTRATION_RECONCILIATION_FAILED: "CONFLICT",
	CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE:
		"SERVICE_UNAVAILABLE",
} as const satisfies Record<
	CorporateAdministrationErrorCode,
	CanonicalErrorCode
>;

const safeMetadataValueSchema = z
	.string()
	.min(1)
	.max(128)
	.regex(
		/^[A-Za-z0-9._:@/-]+$/,
		"Failure metadata contains unsupported characters",
	);

const safeFieldPathSchema = z
	.string()
	.min(1)
	.max(128)
	.regex(
		/^[A-Za-z_][A-Za-z0-9_]*(?:(?:\.[A-Za-z_][A-Za-z0-9_]*)|(?:\[\d+\]))*$/,
		"Failure field path contains unsupported characters",
	);

const failureMetadataShape = {
	field: safeFieldPathSchema.optional(),
	entityType: safeMetadataValueSchema.optional(),
	owner: safeMetadataValueSchema.optional(),
	permission: safeMetadataValueSchema.optional(),
	surface: safeMetadataValueSchema.optional(),
	expectedVersion: z.number().int().nonnegative().optional(),
	actualVersion: z.number().int().nonnegative().optional(),
	correlationId: safeMetadataValueSchema.optional(),
};

export const corporateAdministrationFailureMetadataSchema = z
	.object(failureMetadataShape)
	.strict()
	.readonly();

export type CorporateAdministrationFailureMetadata = z.infer<
	typeof corporateAdministrationFailureMetadataSchema
>;

export const corporateAdministrationFailureDetailsSchema = z
	.object({
		reason: corporateAdministrationErrorCodeSchema,
		...failureMetadataShape,
	})
	.strict()
	.readonly();

export type CorporateAdministrationFailureDetails = z.infer<
	typeof corporateAdministrationFailureDetailsSchema
>;

export function corporateAdministrationErrorDetails(
	reason: CorporateAdministrationErrorCode,
	metadata: CorporateAdministrationFailureMetadata = {},
): CorporateAdministrationFailureDetails {
	return corporateAdministrationFailureDetailsSchema.parse({
		reason,
		...metadata,
	});
}

export function corporateAdministrationResultCode(
	reason: CorporateAdministrationErrorCode,
): CanonicalErrorCode {
	return CORPORATE_ADMINISTRATION_RESULT_CODE_BY_REASON[reason];
}

export function corporateAdministrationEffectiveRangeOverlapResult(): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage:
			"Corporate Administration jurisdiction profile overlaps an existing profile.",
	});
}
