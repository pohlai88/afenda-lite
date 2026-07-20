/**
 * Domain failure reasons mapped onto `@afenda/errors` Result codes.
 * Do not expand ERROR_CODES — put MASTER_* in details.reason.
 */
export const MASTER_REASONS = [
	"MASTER_NOT_FOUND",
	"MASTER_CODE_CONFLICT",
	"MASTER_VERSION_CONFLICT",
	"MASTER_INVALID_STATE",
	"MASTER_DEPENDENCY_BLOCKED",
	"MASTER_CROSS_ORG_REFERENCE",
	"MASTER_INVALID_UOM_CONVERSION",
	"MASTER_VALIDATION_FAILED",
	"MASTER_VALIDITY_OVERLAP",
	"MASTER_CHANGE_REQUEST_REQUIRED",
	"MASTER_CHANGE_REQUEST_INVALID",
	"MASTER_MAKER_CHECKER_VIOLATION",
	"MASTER_IMPORT_NOT_APPROVED",
] as const;

export type MasterReason = (typeof MASTER_REASONS)[number];

export type MasterFailureDetails = {
	reason: MasterReason;
	fieldErrors?: Record<string, string[] | undefined>;
	[key: string]: unknown;
};
