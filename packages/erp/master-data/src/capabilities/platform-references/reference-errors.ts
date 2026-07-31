import { errorResult } from "@afenda/errors";
import type { MasterReason } from "../../contracts/reasons";

export const PLATFORM_REFERENCE_ERROR_REASONS = [
	"MASTER_DATA_REFERENCE_NOT_FOUND",
	"MASTER_DATA_REFERENCE_INACTIVE",
	"MASTER_DATA_REFERENCE_INVALID",
	"MASTER_DATA_REFERENCE_DIMENSION_MISMATCH",
] as const;

export type PlatformReferenceErrorReason =
	(typeof PLATFORM_REFERENCE_ERROR_REASONS)[number];

function failReference(
	_reason: MasterReason,
	_platformReferenceReason: PlatformReferenceErrorReason,
	_message: string,
	_referenceFamily?: string,
) {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "The request is invalid",
	});
}

export function failReferenceNotFound(referenceFamily: string) {
	return failReference(
		"MASTER_NOT_FOUND",
		"MASTER_DATA_REFERENCE_NOT_FOUND",
		"The selected platform reference was not found.",
		referenceFamily,
	);
}

export function failInactiveReference(referenceFamily: string) {
	return failReference(
		"MASTER_INVALID_STATE",
		"MASTER_DATA_REFERENCE_INACTIVE",
		"The selected platform reference is not active.",
		referenceFamily,
	);
}

export function failInvalidReference(referenceFamily: string) {
	return failReference(
		"MASTER_VALIDATION_FAILED",
		"MASTER_DATA_REFERENCE_INVALID",
		"Enter a valid platform reference.",
		referenceFamily,
	);
}

export function failReferenceDimensionMismatch() {
	return failReference(
		"MASTER_INVALID_UOM_CONVERSION",
		"MASTER_DATA_REFERENCE_DIMENSION_MISMATCH",
		"UoMs must share the same dimension for this conversion policy.",
	);
}
