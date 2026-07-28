import { describe, expect, it } from "vitest";

import {
	MASTER_DATA_ERROR_CODES,
	MASTER_REASON_TO_ERROR_CODE,
	MASTER_REASONS,
	type MasterDataErrorCode,
	masterDataErrorCodeForFailureDetails,
	masterDataErrorCodeForReason,
} from "../src";

const expectedMasterDataErrorCodes = [
	"MASTER_DATA_INVALID_INPUT",
	"MASTER_DATA_NOT_FOUND",
	"MASTER_DATA_ALREADY_EXISTS",
	"MASTER_DATA_VERSION_CONFLICT",
	"MASTER_DATA_INVALID_STATE",
	"MASTER_DATA_CODE_CONFLICT",
	"MASTER_DATA_EXTERNAL_ID_CONFLICT",
	"MASTER_DATA_CROSS_ORGANIZATION_ACCESS",
	"MASTER_DATA_PERMISSION_DENIED",
	"MASTER_DATA_REFERENCE_NOT_FOUND",
	"MASTER_DATA_DEPENDENCY_EXISTS",
	"MASTER_DATA_DUPLICATE_CANDIDATE",
	"MASTER_DATA_CHANGE_REQUEST_REQUIRED",
	"MASTER_DATA_IMPORT_NOT_APPROVED",
	"MASTER_DATA_IMPORT_ROW_INVALID",
	"MASTER_DATA_IDEMPOTENCY_CONFLICT",
	"MASTER_DATA_MERGE_NOT_ALLOWED",
] as const satisfies readonly MasterDataErrorCode[];

describe("@afenda/master-data error taxonomy", () => {
	it("publishes the stable MD-0.2 error code set exactly", () => {
		expect(MASTER_DATA_ERROR_CODES).toEqual(expectedMasterDataErrorCodes);
	});

	it("maps every internal reason to one stable master-data error code", () => {
		expect(Object.keys(MASTER_REASON_TO_ERROR_CODE).sort()).toEqual(
			[...MASTER_REASONS].sort(),
		);
		for (const reason of MASTER_REASONS) {
			expect(MASTER_DATA_ERROR_CODES).toContain(
				masterDataErrorCodeForReason(reason),
			);
		}
	});

	it("uses shared error names for equivalent failures instead of aggregate-specific names", () => {
		const aggregateSpecificCanonicalPattern =
			/^MASTER_DATA_(PARTY|ITEM|WAREHOUSE|PAYMENT_TERM|TAX_REGISTRATION|ITEM_GROUP|ITEM_TEMPLATE|ITEM_VARIANT)_/;

		expect(
			MASTER_DATA_ERROR_CODES.filter((code) =>
				aggregateSpecificCanonicalPattern.test(code),
			),
		).toEqual([]);

		expect(masterDataErrorCodeForReason("MASTER_NOT_FOUND")).toBe(
			"MASTER_DATA_NOT_FOUND",
		);
		expect(masterDataErrorCodeForReason("MASTER_CODE_CONFLICT")).toBe(
			"MASTER_DATA_CODE_CONFLICT",
		);
		expect(masterDataErrorCodeForReason("MASTER_VERSION_CONFLICT")).toBe(
			"MASTER_DATA_VERSION_CONFLICT",
		);
	});

	it("normalizes legacy detail reasons onto requested canonical categories", () => {
		expect(masterDataErrorCodeForReason("MASTER_VALIDATION_FAILED")).toBe(
			"MASTER_DATA_INVALID_INPUT",
		);
		expect(masterDataErrorCodeForReason("MASTER_CROSS_ORG_REFERENCE")).toBe(
			"MASTER_DATA_CROSS_ORGANIZATION_ACCESS",
		);
		expect(masterDataErrorCodeForReason("MASTER_DEPENDENCY_BLOCKED")).toBe(
			"MASTER_DATA_DEPENDENCY_EXISTS",
		);
		expect(masterDataErrorCodeForReason("MASTER_IMPORT_NOT_APPROVED")).toBe(
			"MASTER_DATA_IMPORT_NOT_APPROVED",
		);
		expect(masterDataErrorCodeForReason("MASTER_RELATIONSHIP_CYCLE")).toBe(
			"MASTER_DATA_MERGE_NOT_ALLOWED",
		);
	});

	it("promotes existing reference, import, and merge sub-details to canonical codes", () => {
		expect(
			masterDataErrorCodeForFailureDetails({
				reason: "MASTER_NOT_FOUND",
				platformReferenceReason: "MASTER_DATA_REFERENCE_NOT_FOUND",
			}),
		).toBe("MASTER_DATA_REFERENCE_NOT_FOUND");

		expect(
			masterDataErrorCodeForFailureDetails({
				reason: "MASTER_VALIDATION_FAILED",
				governanceCode: "MASTER_DATA_IMPORT_VALIDATION_FAILED",
			}),
		).toBe("MASTER_DATA_IMPORT_ROW_INVALID");

		expect(
			masterDataErrorCodeForFailureDetails({
				reason: "MASTER_CHANGE_REQUEST_INVALID",
				governanceCode: "MASTER_DATA_GOVERNANCE_MERGE_NOT_AUTHORIZED",
			}),
		).toBe("MASTER_DATA_MERGE_NOT_ALLOWED");
	});
});
