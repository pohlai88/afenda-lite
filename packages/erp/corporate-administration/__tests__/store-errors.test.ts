import { describe, expect, it } from "vitest";

import {
	CA_ERROR_COMPANY_NOT_FOUND,
	CA_ERROR_IDEMPOTENCY_CONFLICT,
	CA_ERROR_VERSION_CONFLICT,
} from "../src/error-codes";
import {
	CORPORATE_ADMINISTRATION_STORE_ERROR_CODES,
	CorporateAdministrationIdempotencyConflictError,
	CorporateAdministrationStoreError,
	CorporateAdministrationVersionConflictError,
	isCorporateAdministrationStoreError,
	mapCorporateAdministrationStoreError,
} from "../src/store/store-errors";

describe("CorporateAdministration store errors", () => {
	it("exposes store error codes aligned with CA_ERROR_* SSOT", () => {
		expect(CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.notFound).toBe(
			CA_ERROR_COMPANY_NOT_FOUND,
		);
		expect(CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.versionConflict).toBe(
			CA_ERROR_VERSION_CONFLICT,
		);
		expect(CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.idempotencyConflict).toBe(
			CA_ERROR_IDEMPOTENCY_CONFLICT,
		);
	});

	it("type-guards store error instances", () => {
		const error = new CorporateAdministrationStoreError({
			code: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.notFound,
			message: "Legal company not found",
		});
		expect(isCorporateAdministrationStoreError(error)).toBe(true);
		expect(isCorporateAdministrationStoreError(new Error("other"))).toBe(false);
	});

	it("maps version conflict to CONFLICT with semantic reason and fields", () => {
		const mapped = mapCorporateAdministrationStoreError(
			new CorporateAdministrationVersionConflictError({
				organizationId: "org-1",
				aggregateId: "company-1",
				expectedVersion: 3,
			}),
		);
		expect(mapped.ok).toBe(false);
		if (mapped.ok) return;
		expect(mapped.code).toBe("CONFLICT");
		expect(mapped.details).toMatchObject({
			reason: CA_ERROR_VERSION_CONFLICT,
			organizationId: "org-1",
			aggregateId: "company-1",
			expectedVersion: 3,
		});
	});

	it("maps idempotency conflict to CONFLICT with semantic reason", () => {
		const mapped = mapCorporateAdministrationStoreError(
			new CorporateAdministrationIdempotencyConflictError({
				organizationId: "org-1",
				idempotencyKey: "key-1",
			}),
		);
		expect(mapped.ok).toBe(false);
		if (mapped.ok) return;
		expect(mapped.code).toBe("CONFLICT");
		expect(mapped.details).toMatchObject({
			reason: CA_ERROR_IDEMPOTENCY_CONFLICT,
			organizationId: "org-1",
			idempotencyKey: "key-1",
		});
	});

	it("maps not found to NOT_FOUND", () => {
		const mapped = mapCorporateAdministrationStoreError(
			new CorporateAdministrationStoreError({
				code: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.notFound,
				message: "Legal company not found",
			}),
		);
		expect(mapped.ok).toBe(false);
		if (mapped.ok) return;
		expect(mapped.code).toBe("NOT_FOUND");
		expect(mapped.details).toMatchObject({
			reason: CA_ERROR_COMPANY_NOT_FOUND,
		});
	});

	it("maps transaction failure to INTERNAL_ERROR", () => {
		const mapped = mapCorporateAdministrationStoreError(
			new CorporateAdministrationStoreError({
				code: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.transactionFailed,
				message: "Company registry transaction failed",
			}),
		);
		expect(mapped.ok).toBe(false);
		if (mapped.ok) return;
		expect(mapped.code).toBe("INTERNAL_ERROR");
		expect(mapped.details).toMatchObject({
			reason: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.transactionFailed,
		});
	});
});
