import { opaqueCursorSchema } from "@afenda/corporate-administration";
import { describe, expect, it } from "vitest";
import {
	companiesByStatusCursorScope,
	companyActivityCursorScope,
	companyIdentifierCursorScope,
	companyNameCursorScope,
	decodeCompaniesByStatusCursor,
	decodeCompanyActivityCursor,
	decodeCompanyIdentifierCursor,
	decodeCompanyNameCursor,
	decodeLegalCompanyCursor,
	decodeLegalCompanyTimelineCursor,
	encodeCompaniesByStatusCursor,
	encodeCompanyActivityCursor,
	encodeCompanyNameCursor,
	encodeLegalCompanyCursor,
	encodeLegalCompanyTimelineCursor,
	legalCompanyCursorScope,
	legalCompanyTimelineCursorScope,
} from "../src/features/company/pagination";
import {
	companyActivityIdSchema,
	companyNameIdSchema,
	legalCompanyIdSchema,
	organizationIdSchema,
} from "../src/kernel/brands";
import {
	canonicalDateSchema,
	canonicalInstantSchema,
} from "../src/kernel/dates";

describe("Corporate Administration opaque pagination cursors", () => {
	it("round-trips a versioned operation-bound legal-company cursor", () => {
		const scope = legalCompanyCursorScope({
			organizationId: organizationIdSchema.parse("org-ca-cursor"),
			pagination: { limit: 10 },
		});
		const key = [
			"AFENDA",
			legalCompanyIdSchema.parse("00000000-0000-4000-8000-000000000601"),
		] as const;
		const decoded = decodeLegalCompanyCursor(
			encodeLegalCompanyCursor(scope, key),
			scope,
		);

		expect(decoded).toEqual({ ok: true, data: key });

		const statusScope = companiesByStatusCursorScope({
			organizationId: scope.organizationId,
			status: "draft",
			asOf: canonicalDateSchema.parse("2026-01-01"),
			pagination: { limit: 10 },
		});
		expect(
			decodeCompaniesByStatusCursor(
				encodeCompaniesByStatusCursor(statusScope, key),
				statusScope,
			),
		).toEqual({ ok: true, data: key });
		expect(
			decodeCompaniesByStatusCursor(
				encodeCompaniesByStatusCursor(statusScope, key),
				companiesByStatusCursorScope({
					organizationId: scope.organizationId,
					status: "active",
					asOf: canonicalDateSchema.parse("2026-01-01"),
					pagination: { limit: 10 },
				}),
			),
		).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
	});

	it("rejects malformed and cross-operation cursors", () => {
		const organizationId = organizationIdSchema.parse("org-ca-cursor");
		const legalCompanyId = legalCompanyIdSchema.parse(
			"00000000-0000-4000-8000-000000000601",
		);
		const nameScope = companyNameCursorScope({
			organizationId,
			legalCompanyId,
		});
		const nameCursor = encodeCompanyNameCursor(nameScope, [
			"legal",
			"en",
			canonicalDateSchema.parse("2026-01-01"),
			canonicalInstantSchema.parse("2026-01-01T00:00:00.000Z"),
			companyNameIdSchema.parse("00000000-0000-4000-8000-000000000602"),
		]);

		expect(
			decodeLegalCompanyCursor(
				nameCursor,
				legalCompanyCursorScope({
					organizationId,
					pagination: { limit: 10 },
				}),
			),
		).toMatchObject({
			ok: false,
			code: "VALIDATION_ERROR",
		});
		expect(
			decodeCompanyIdentifierCursor(
				opaqueCursorSchema.parse("not-a-cursor"),
				companyIdentifierCursorScope({
					organizationId,
					legalCompanyId,
				}),
			),
		).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
		const legalCursor = encodeLegalCompanyCursor(
			legalCompanyCursorScope({
				organizationId,
				pagination: { limit: 10 },
			}),
			["AFENDA", legalCompanyId],
		);
		expect(
			decodeLegalCompanyCursor(
				legalCursor,
				legalCompanyCursorScope({
					organizationId: organizationIdSchema.parse("org-ca-cursor-other"),
					pagination: { limit: 10 },
				}),
			),
		).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
		expect(decodeCompanyNameCursor(undefined, nameScope)).toEqual({
			ok: true,
			data: null,
		});
	});

	it("binds company-activity cursors to tenant, company, time and filters", () => {
		const organizationId = organizationIdSchema.parse("org-ca-activity-cursor");
		const legalCompanyId = legalCompanyIdSchema.parse(
			"00000000-0000-4000-8000-000000000611",
		);
		const scope = companyActivityCursorScope({
			organizationId,
			legalCompanyId,
			asOf: canonicalDateSchema.parse("2026-06-01"),
			classification: "operational",
			classificationSystem: "registered_activity",
			jurisdictionCode: "MY",
			primaryOnly: false,
		});
		const key = [
			"operational",
			"software_services",
			canonicalDateSchema.parse("2026-01-01"),
			companyActivityIdSchema.parse("00000000-0000-4000-8000-000000000612"),
		] as const;
		const cursor = encodeCompanyActivityCursor(scope, key);

		expect(decodeCompanyActivityCursor(cursor, scope)).toEqual({
			ok: true,
			data: key,
		});
		expect(
			decodeCompanyActivityCursor(
				cursor,
				companyActivityCursorScope({
					organizationId,
					legalCompanyId,
					asOf: canonicalDateSchema.parse("2026-06-01"),
					classification: "regulated",
					classificationSystem: "registered_activity",
					jurisdictionCode: "MY",
					primaryOnly: false,
				}),
			),
		).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
	});

	it("binds legal-company timeline cursors to tenant, company and known time", () => {
		const organizationId = organizationIdSchema.parse("org-ca-timeline-cursor");
		const legalCompanyId = legalCompanyIdSchema.parse(
			"00000000-0000-4000-8000-000000000621",
		);
		const scope = legalCompanyTimelineCursorScope({
			organizationId,
			legalCompanyId,
			knownAt: canonicalInstantSchema.parse("2026-06-01T00:00:00.000Z"),
		});
		const key = [
			canonicalInstantSchema.parse("2026-01-01T00:00:00.000Z"),
			"profile",
			legalCompanyId,
		] as const;
		const cursor = encodeLegalCompanyTimelineCursor(scope, key);

		expect(decodeLegalCompanyTimelineCursor(cursor, scope)).toEqual({
			ok: true,
			data: key,
		});
		expect(
			decodeLegalCompanyTimelineCursor(
				cursor,
				legalCompanyTimelineCursorScope({
					organizationId,
					legalCompanyId,
					knownAt: canonicalInstantSchema.parse("2026-07-01T00:00:00.000Z"),
				}),
			),
		).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
	});
});
